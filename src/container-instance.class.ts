import { ServiceNotFoundError } from './error/service-not-found.error';
import { CannotInstantiateValueError } from './error/cannot-instantiate-value.error';
import { Token } from './token.class';
import { Constructable } from './types/constructable.type';
import { ServiceIdentifier } from './types/service-identifier.type';
import { ServiceMetadata } from './interfaces/service-metadata.interface';
import { ServiceOptions } from './interfaces/service-options.interface';
import { EMPTY_VALUE } from './empty.const';
import { ContainerIdentifier } from './types/container-identifier.type';
import { Handler } from './interfaces/handler.interface';
import { ContainerRegistry } from './container-registry.class';
import { ContainerScope } from './types/container-scope.type';
import { ContainerOptions } from './interfaces/container-options.interface';

/**
 * TypeDI can have multiple containers.
 * One container is ContainerInstance.
 */
export class ContainerInstance {
  /** Container instance id. */
  public readonly id!: ContainerIdentifier;

  /** Metadata for all registered services in this container. */
  private metadataMap: Map<ServiceIdentifier, ServiceMetadata<unknown>> = new Map();

  /**
   * Services registered with 'multiple: true' are saved as simple services
   * with a generated token and the mapping between the original ID and the
   * generated one is stored here. This is handled like this to allow simplifying
   * the inner workings of the service instance.
   */
  private multiServiceIds: Map<ServiceIdentifier, { tokens: Token<unknown>[]; scope: ContainerScope }> = new Map();

  /**
   * All registered handlers. The @Inject() decorator uses handlers internally to mark a property for injection.
   **/
  private readonly handlers: Handler[] = [];

  /**
   * Indicates if the container has been disposed or not.
   * Any function call should fail when called after being disposed.
   *
   * NOTE: Currently not in used
   */
  private disposed: boolean = false;

  /** Parent container for inheritance. */
  private parentContainer: ContainerInstance | null = null;

  /** Container options. */
  private options: ContainerOptions = { inherit: true };

  /** Cached root container to avoid repeated traversal. */
  private cachedRootContainer: ContainerInstance | null = null;

  constructor(id: ContainerIdentifier, options?: Partial<ContainerOptions>, parentContainer?: ContainerInstance) {
    this.id = id;
    this.options = { inherit: true, ...options };
    this.parentContainer = parentContainer || null;

    ContainerRegistry.registerContainer(this);

    /**
     * TODO: This is to replicate the old functionality. This should be copied only
     * TODO: if the container decides to inherit registered classes from a parent container.
     */
    this.handlers = ContainerRegistry.defaultContainer?.handlers || [];
  }

  /**
   * Gets the parent container.
   */
  public getParent(): ContainerInstance | null {
    return this.parentContainer;
  }

  /**
   * Gets the root container.
   */
  public getRoot(): ContainerInstance {
    if (this.cachedRootContainer) {
      return this.cachedRootContainer;
    }

    let current: ContainerInstance = this;
    while (current.parentContainer) {
      current = current.parentContainer;
    }

    this.cachedRootContainer = current;
    return current;
  }

  /**
   * Gets the container options.
   */
  public getOptions(): Readonly<ContainerOptions> {
    return { ...this.options };
  }

  /**
   * Checks if the service with given name or type is registered service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  public has<T = unknown>(identifier: ServiceIdentifier<T>): boolean {
    this.throwIfDisposed();

    // 1. Check local container
    if (this.metadataMap.has(identifier) || this.multiServiceIds.has(identifier)) {
      return true;
    }

    // 2. Check root container's singleton
    const root = this.getRoot();
    if (root !== this) {
      const metadata = root.metadataMap.get(identifier);
      if (metadata && metadata.scope === 'singleton') {
        return true;
      }
    }

    // 3. Check parent container if inheritance is enabled
    if (this.options.inherit && this.parentContainer) {
      return this.parentContainer.has(identifier);
    }

    return false;
  }

  /**
   * Retrieves the service with given name or type from the service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  public get<T = unknown>(identifier: ServiceIdentifier<T>): T {
    this.throwIfDisposed();

    // ===== Step 1: Check local container's definition =====
    let metadata = this.metadataMap.get(identifier);
    if (metadata && !metadata.multiple) {
      return this.getServiceValue(metadata);
    }

    // ===== Step 2: Check local container's multi-services =====
    if (this.multiServiceIds.has(identifier)) {
      return this.getMany(identifier) as any;
    }

    // ===== Step 3: Check root container's singleton (global priority) =====
    const root = this.getRoot();
    if (root !== this) {
      const rootMetadata = root.metadataMap.get(identifier);
      if (rootMetadata && rootMetadata.scope === 'singleton') {
        return this.getServiceValue(rootMetadata);
      }
    }

    // ===== Step 4: Resolve from parent if inheritance is enabled =====
    if (this.options.inherit && this.parentContainer) {
      return this.resolveFromParent<T>(identifier);
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Resolves a service from parent container.
   *
   * Key rules:
   * - Singleton: cached in root container (already handled in step 3)
   * - Container scope: cached in the calling container (this)
   * - Transient: not cached, create directly
   */
  private resolveFromParent<T = unknown>(identifier: ServiceIdentifier<T>): T {
    // Try to get definition directly from parent's metadataMap
    const parentMetadata = this.parentContainer!.metadataMap.get(identifier);

    if (parentMetadata) {
      // If it's singleton, should already be handled in step 3
      // Check again for defensive programming
      if (parentMetadata.scope === 'singleton') {
        const root = this.getRoot();
        return this.getServiceValue(parentMetadata);
      }

      // If it's container scope, we need to cache instance in THIS container
      // Create a copy of metadata without the value, so it will be instantiated and cached here
      if (parentMetadata.scope === 'container') {
        // Check if we already have a local copy (cached instance)
        let localMetadata = this.metadataMap.get(identifier);
        if (!localMetadata) {
          // Create a new metadata entry in this container with the same definition but no value yet
          localMetadata = {
            ...parentMetadata,
            value: EMPTY_VALUE,
            referencedBy: new Map([[this.id, this]]),
          };
          this.metadataMap.set(identifier, localMetadata);
        }
        return this.getServiceValue(localMetadata);
      }

      // If it's transient, create directly using parent's metadata (no cache anywhere)
      if (parentMetadata.scope === 'transient') {
        return this.getServiceValue(parentMetadata);
      }
    }

    // No definition in parent's metadataMap, continue recursing upward
    return this.parentContainer!.get<T>(identifier);
  }

  /**
   * Gets all instances registered in the container of the given service identifier.
   * Used when service defined with multiple: true flag.
   */
  public getMany<T = unknown>(identifier: ServiceIdentifier<T>): T[] {
    this.throwIfDisposed();

    // 1. Check local container
    const localIdMap = this.multiServiceIds.get(identifier);
    if (localIdMap) {
      return localIdMap.tokens.map((generatedId) => this.get<T>(generatedId));
    }

    // 2. Check root container's singleton
    const root = this.getRoot();
    if (root !== this) {
      const rootIdMap = root.multiServiceIds.get(identifier);
      if (rootIdMap && rootIdMap.scope === 'singleton') {
        return rootIdMap.tokens.map((generatedId) => root.get<T>(generatedId));
      }
    }

    // 3. Check parent container if inheritance is enabled
    if (this.options.inherit && this.parentContainer) {
      return this.parentContainer.getMany<T>(identifier);
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Sets a value for the given type or service name in the container.
   */
  public set<T = unknown>(serviceOptions: ServiceOptions<T>): this {
    this.throwIfDisposed();

    // Singleton is always registered in root container
    const targetContainer = serviceOptions.scope === 'singleton' ? this.getRoot() : this;

    if (targetContainer !== this) {
      targetContainer.set(serviceOptions);
      return this;
    }

    const newMetadata: ServiceMetadata<T> = {
      /**
       * Typescript cannot understand that if ID doesn't exists then type must exists based on the
       * typing so we need to explicitly cast this to a `ServiceIdentifier`
       */
      id: ((serviceOptions as any).id || (serviceOptions as any).type) as ServiceIdentifier,
      type: (serviceOptions as ServiceMetadata<T>).type || null,
      factory: (serviceOptions as ServiceMetadata<T>).factory,
      value: (serviceOptions as ServiceMetadata<T>).value || EMPTY_VALUE,
      multiple: serviceOptions.multiple || false,
      scope: serviceOptions.scope || 'container',
      /** We allow overriding the above options via the received config object. */
      ...serviceOptions,
      referencedBy: new Map().set(this.id, this),
    };

    /** If the incoming metadata is marked as multiple we mask the ID and continue saving as single value. */
    if (serviceOptions.multiple) {
      const maskedToken = new Token(`MultiMaskToken-${newMetadata.id.toString()}`);
      const existingMultiGroup = this.multiServiceIds.get(newMetadata.id);

      if (existingMultiGroup) {
        existingMultiGroup.tokens.push(maskedToken);
      } else {
        this.multiServiceIds.set(newMetadata.id, { scope: newMetadata.scope, tokens: [maskedToken] });
      }

      /**
       * We mask the original metadata with this generated ID, mark the service
       * as  and continue multiple: false and continue. Marking it as
       * non-multiple is important otherwise Container.get would refuse to
       * resolve the value.
       */
      newMetadata.id = maskedToken;
      newMetadata.multiple = false;
    }

    const existingMetadata = this.metadataMap.get(newMetadata.id);

    if (existingMetadata) {
      /** Service already exists, we overwrite it. (This is legacy behavior.) */
      // TODO: Here we should differentiate based on the received set option.
      Object.assign(existingMetadata, newMetadata);
    } else {
      /** This service hasn't been registered yet, so we register it. */
      this.metadataMap.set(newMetadata.id, newMetadata);
    }

    return this;
  }

  /**
   * Removes services with a given service identifiers.
   */
  public remove(identifierOrIdentifierArray: ServiceIdentifier | ServiceIdentifier[]): this {
    this.throwIfDisposed();

    if (Array.isArray(identifierOrIdentifierArray)) {
      identifierOrIdentifierArray.forEach((id) => this.remove(id));
    } else {
      const serviceMetadata = this.metadataMap.get(identifierOrIdentifierArray);

      if (serviceMetadata) {
        this.disposeServiceInstance(serviceMetadata);
        this.metadataMap.delete(identifierOrIdentifierArray);
      }
    }

    return this;
  }

  /**
   * Gets or creates a separate container instance for the given instance id.
   *
   * @param containerId The ID for the container
   * @param options Optional container options
   * @param parentId Optional parent container ID. If not provided and this is the root container, uses this as parent.
   */
  public of(
    containerId: ContainerIdentifier = 'default',
    options?: Partial<ContainerOptions>,
    parentId?: ContainerIdentifier,
  ): ContainerInstance {
    this.throwIfDisposed();

    if (containerId === 'default') {
      return ContainerRegistry.defaultContainer;
    }

    // If container already exists, return existing container
    if (ContainerRegistry.hasContainer(containerId)) {
      return ContainerRegistry.getContainer(containerId);
    }

    // Determine parent container
    let parentContainer: ContainerInstance | undefined;
    if (parentId !== undefined) {
      // If parentId is explicitly provided, use it
      parentContainer = ContainerRegistry.hasContainer(parentId)
        ? ContainerRegistry.getContainer(parentId)
        : new ContainerInstance(parentId);
    } else {
      // If no parentId specified:
      // - If this is the root container (has no parent), use this as parent for backward compatibility
      // - If this is not root (has a parent), don't set parent to avoid unintended nesting
      parentContainer = this.parentContainer === null ? this : undefined;
    }

    // Create new container
    return new ContainerInstance(containerId, options, parentContainer);
  }

  /**
   * Registers a new handler.
   */
  public registerHandler(handler: Handler): ContainerInstance {
    this.handlers.push(handler);
    return this;
  }

  /**
   * Helper method that imports given services.
   */

  public import(services: Function[]): ContainerInstance {
    this.throwIfDisposed();

    return this;
  }

  /**
   * Completely resets the container by removing all previously registered services from it.
   */
  public reset(options: { strategy: 'resetValue' | 'resetServices' } = { strategy: 'resetValue' }): this {
    this.throwIfDisposed();

    switch (options.strategy) {
      case 'resetValue':
        // Only dispose services exclusively owned by this container
        this.metadataMap.forEach((service) => {
          if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
            this.disposeServiceInstance(service);
          }
        });
        break;
      case 'resetServices':
        // Only dispose services exclusively owned by this container
        this.metadataMap.forEach((service) => {
          if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
            this.disposeServiceInstance(service);
          }
        });
        this.metadataMap.clear();
        this.multiServiceIds.clear();
        break;
      default:
        throw new Error('Received invalid reset strategy.');
    }
    return this;
  }

  public async dispose(): Promise<void> {
    this.throwIfDisposed();

    // Only dispose services exclusively owned by this container
    this.metadataMap.forEach((service) => {
      if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
        this.disposeServiceInstance(service, true);
      }
    });

    // Clear all metadata and multi-service IDs
    this.metadataMap.clear();
    this.multiServiceIds.clear();

    /** We mark the container as disposed, forbidding any further interaction with it. */
    this.disposed = true;

    /**
     * Placeholder, this function returns a promise in preparation to support async services.
     */
    await Promise.resolve();
  }

  private throwIfDisposed() {
    if (this.disposed) {
      // TODO: Use custom error.
      throw new Error('Cannot use container after it has been disposed.');
    }
  }

  /**
   * Gets the value belonging to passed in `ServiceMetadata` instance.
   *
   * - if `serviceMetadata.value` is already set it is immediately returned
   * - otherwise the requested type is resolved to the value saved to `serviceMetadata.value` and returned
   */
  private getServiceValue(serviceMetadata: ServiceMetadata<unknown>): any {
    let value: unknown = EMPTY_VALUE;

    /**
     * If the service value has been set to anything prior to this call we return that value.
     * NOTE: This part builds on the assumption that transient dependencies has no value set ever.
     */
    if (serviceMetadata.value !== EMPTY_VALUE) {
      return serviceMetadata.value;
    }

    /** If both factory and type is missing, we cannot resolve the requested ID. */
    if (!serviceMetadata.factory && !serviceMetadata.type) {
      throw new CannotInstantiateValueError(serviceMetadata.id);
    }

    /**
     * If a factory is defined it takes priority over creating an instance via `new`.
     * The return value of the factory is not checked, we believe by design that the user knows what he/she is doing.
     */
    if (serviceMetadata.factory) {
      /**
       * If we received the factory in the [Constructable<Factory>, "functionName"] format, we need to create the
       * factory first and then call the specified function on it.
       */
      if (serviceMetadata.factory instanceof Array) {
        let factoryInstance;

        try {
          /** Try to get the factory from TypeDI first, if failed, fall back to simply initiating the class. */
          factoryInstance = this.get<any>(serviceMetadata.factory[0]);
        } catch (error) {
          if (error instanceof ServiceNotFoundError) {
            factoryInstance = new serviceMetadata.factory[0]();
          } else {
            throw error;
          }
        }

        value = factoryInstance[serviceMetadata.factory[1]](this, serviceMetadata.id);
      } else {
        /** If only a simple function was provided we simply call it. */
        value = serviceMetadata.factory(this, serviceMetadata.id);
      }
    }

    /**
     * If no factory was provided and only then, we create the instance from the type if it was set.
     */
    if (!serviceMetadata.factory && serviceMetadata.type) {
      const constructableTargetType: Constructable<unknown> = serviceMetadata.type;
      // setup constructor parameters for a newly initialized service
      const paramTypes: unknown[] = (Reflect as any)?.getMetadata('design:paramtypes', constructableTargetType) || [];
      const params = this.initializeParams(constructableTargetType, paramTypes);

      // "extra feature" - always pass container instance as the last argument to the service function
      // this allows us to support javascript where we don't have decorators and emitted metadata about dependencies
      // need to be injected, and user can use provided container to get instances he needs
      params.push(this);

      value = new constructableTargetType(...params);

      // TODO: Calling this here, leads to infinite loop, because @Inject decorator registerds a handler
      // TODO: which calls Container.get, which will check if the requested type has a value set and if not
      // TODO: it will start the instantiation process over. So this is currently called outside of the if branch
      // TODO: after the current value has been assigned to the serviceMetadata.
      // this.applyPropertyHandlers(constructableTargetType, value as Constructable<unknown>);
    }

    /** If this is not a transient service, and we resolved something, then we set it as the value. */
    if (serviceMetadata.scope !== 'transient' && value !== EMPTY_VALUE) {
      serviceMetadata.value = value;
    }

    if (value === EMPTY_VALUE) {
      /** This branch should never execute, but better to be safe than sorry. */
      throw new CannotInstantiateValueError(serviceMetadata.id);
    }

    if (serviceMetadata.type) {
      this.applyPropertyHandlers(serviceMetadata.type, value as Record<string, any>);
    }

    return value;
  }

  /**
   * Initializes all parameter types for a given target service class.
   */
  private initializeParams(target: Function, paramTypes: any[]): unknown[] {
    return paramTypes.map((paramType, index) => {
      // 1. Check local container
      let paramHandler = this.handlers.find((handler) => handler.object === target && handler.index === index);

      if (paramHandler) return paramHandler.value(this);

      // 2. Recursively check parent containers (supports multi-level inheritance)
      if (!paramHandler && this.parentContainer) {
        paramHandler = this.findHandlerInParent(target, index);
        if (paramHandler) return paramHandler.value(this);
      }

      // 3. Single level parent check (handles class inheritance)
      paramHandler = this.handlers.find(
        (handler) => handler.object === Object.getPrototypeOf(target) && handler.index === index,
      );

      if (paramHandler) return paramHandler.value(this);

      // 4. Auto-injection
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (paramType && paramType.name && !this.isPrimitiveParamType(paramType.name)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return this.get(paramType);
      }

      return undefined;
    });
  }

  /**
   * Checks if given parameter type is primitive type or not.
   */
  private isPrimitiveParamType(paramTypeName: string): boolean {
    return ['string', 'boolean', 'number', 'object'].includes(paramTypeName.toLowerCase());
  }

  /**
   * Recursively searches for a handler in parent containers.
   */
  private findHandlerInParent(target: Function, index: number): Handler | undefined {
    if (!this.parentContainer) return undefined;

    const handler = this.parentContainer.handlers.find((h) => h.object === target && h.index === index);

    if (handler) return handler;

    return this.parentContainer.findHandlerInParent(target, index);
  }

  /**
   * Applies all registered handlers on a given target class.
   */
  private applyPropertyHandlers(target: Function, instance: { [key: string]: any }) {
    this.handlers.forEach((handler) => {
      if (typeof handler.index === 'number') return;
      if (handler.object.constructor !== target && !(target.prototype instanceof handler.object.constructor)) return;

      if (handler.propertyName) {
        instance[handler.propertyName] = handler.value(this);
      }
    });
  }

  /**
   * Checks if the given service metadata contains a destroyable service instance and destroys it in place. If the service
   * contains a callable function named `destroy` it is called but not awaited and the return value is ignored..
   *
   * @param serviceMetadata the service metadata containing the instance to destroy
   * @param force when true the service will be always destroyed even if it's cannot be re-created
   */
  /**
   * Disposes a service instance by calling its dispose method (if exists) and resetting its value.
   *
   * @param serviceMetadata The service metadata to dispose
   * @param force Force reset value even if type or factory doesn't exist
   */
  private disposeServiceInstance(serviceMetadata: ServiceMetadata, force = false) {
    this.throwIfDisposed();

    /** We reset value only if we can re-create it (aka type or factory exists) or force is true. */
    const shouldResetValue = force || !!serviceMetadata.type || !!serviceMetadata.factory;

    if (shouldResetValue) {
      /** If the service has a dispose method, call it. */
      if (
        serviceMetadata.value !== EMPTY_VALUE &&
        typeof (serviceMetadata?.value as Record<string, unknown>)['dispose'] === 'function'
      ) {
        try {
          (serviceMetadata.value as { dispose: CallableFunction }).dispose();
        } catch (error) {
          /** We simply ignore the errors from the dispose function. */
        }
      }

      serviceMetadata.value = EMPTY_VALUE;
    }
  }
}
