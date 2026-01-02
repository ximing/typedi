import { ContainerRegistry } from '../container-registry.class';
import { ServiceMetadata } from '../interfaces/service-metadata.interface';
import { ServiceOptions } from '../interfaces/service-options.interface';
import { EMPTY_VALUE } from '../empty.const';
import { Constructable } from '../types/constructable.type';

/**
 * Marks class as a service that can be injected using Container.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function Service<T = unknown>(): ClassDecorator;
export function Service<T = unknown>(options: ServiceOptions<T>): ClassDecorator;
export function Service<T>(options: ServiceOptions<T> = {}): ClassDecorator {
  return (targetConstructor) => {
    const serviceMetadata: ServiceMetadata<T> = {
      /**
       * Service identifier - used as the lookup key in the container.
       * Defaults to the class itself if not explicitly provided.
       * Can be: class, string ID, or Token instance.
       */
      id: options.id || targetConstructor,

      /**
       * The class constructor used to instantiate the service.
       *
       * This property is crucial for:
       * 1. Creating instances: When Container.get() is called, the container uses this type
       *    to instantiate the service via `new targetConstructor(...params)` (line 513 in container-instance.class.ts)
       *
       * 2. Dependency injection: The container uses Reflect metadata on this type to get constructor
       *    parameter types, enabling automatic dependency resolution (line 505 in container-instance.class.ts)
       *
       * 3. Property injection: The container applies @Inject() decorated properties on this type
       *    to inject dependencies (line 533 in container-instance.class.ts)
       *
       * 4. Service overriding: Allows replacing the service implementation with a different class
       *    Example: Container.set({ id: DataService, type: FakeDataService })
       *    This enables testing and mock implementations
       *
       * Note: This is only used if no factory function is provided.
       * If both factory and type are missing, instantiation will fail (line 465 in container-instance.class.ts)
       */
      type: targetConstructor as unknown as Constructable<T>,

      /**
       * Optional factory function to create the service instance.
       * If provided, takes priority over using the type constructor.
       * Can be: a simple function, or [FactoryClass, 'methodName'] tuple.
       */
      factory: (options as any).factory || undefined,

      /**
       * Whether this service can have multiple instances registered under the same ID.
       * When true, each registration creates a separate masked token.
       */
      multiple: options.multiple || false,

      /**
       * Determines the lifecycle and caching behavior of the service:
       * - 'singleton': Created once in root container, shared across all containers
       * - 'container': Created once per container, cached in that specific container
       * - 'transient': Created fresh every time it's requested, never cached
       */
      scope: options.scope || 'container',

      /**
       * Tracks which containers reference this metadata.
       * Used for lifecycle management - a service can only be disposed if it's
       * exclusively owned by the disposing container.
       */
      referencedBy: new Map().set(ContainerRegistry.defaultContainer.id, ContainerRegistry.defaultContainer),

      /**
       * Cached instance of the service.
       * Starts as EMPTY_VALUE and gets populated when the service is first instantiated
       * (depending on its scope). Transient services never cache a value.
       */
      value: EMPTY_VALUE,
    };

    ContainerRegistry.defaultContainer.set(serviceMetadata);
  };
}
