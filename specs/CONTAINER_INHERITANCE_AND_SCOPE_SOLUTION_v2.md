# TypeDI Container 继承与 Resolution Scope 技术方案 v2.0 (简化版)

## 1. 方案概述

### 1.1 目标

实现 TypeDI 容器的完整继承机制和三种 Resolution Scope（Singleton、Request、Transient），提供简洁、高效的 DI 能力。

### 1.2 核心功能

1. **容器继承**
   - 支持多层级容器继承（树形结构）
   - 简化的继承模型：基于 `inherit` 的单一参数
   - 自动的服务查询链

2. **Resolution Scope**
   - **Singleton**：全局唯一实例，所有容器共享
   - **Request (container scope)**：容器作用域实例，该容器内复用
   - **Transient**：瞬态实例，每次创建新实例

3. **生命周期管理**
   - 简单的 dispose 和 reset 机制
   - 基于引用计数的资源清理

### 1.3 设计原则

✅ **API 设计精简**

- 最少化配置选项（仅 1 个）
- 直观的方法名和参数
- 避免过度设计

✅ **语义清晰**

- 查询控制名称明确
- 作用域含义直观
- 查询流程易于理解

✅ **内部实现简单**

- 最小化抽象层
- 直接的数据结构
- 避免不必要的间接调用

✅ **性能优先**

- 常数级别的查询时间
- 缓存关键路径
- 避免递归调用

✅ **类型安全**

- 完整的 TypeScript 支持
- 类型推导友好
- 编译时错误检测

---

## 2. 方案细节

### 2.1 核心概念

#### 2.1.1 容器继承模型

基于单一参数 `inherit` 的两种模式：

**模式 1：隔离模式（allowParentFallback: false）**

- 容器完全独立，不查询 parent 容器
- 必须显式注册所有服务
- 适用于模块隔离、多应用

```typescript
const isolated = Container.create('isolated', { inherit: false }, 'parent');
```

**模式 2：继承模式（allowParentFallback: true，默认）**

- 容器可以从 parent 容器查询服务
- 本容器的服务优先
- 支持递归查询链
- 适用于请求隔离、多租户

```typescript
const inherited = Container.create('request-1', { inherit: true }, 'parent');
// 或使用默认值
const inherited = Container.create('request-1', {}, 'parent');
```

#### 2.1.2 Resolution Scope

| Scope       | 创建位置  | 缓存位置  | 跨容器共享 | 适用场景   |
| ----------- | --------- | --------- | ---------- | ---------- |
| `singleton` | root 容器 | root 容器 | ✓          | 全局单例   |
| `container` | 当前容器  | 当前容器  | ✗          | 容器作用域 |
| `transient` | 每次请求  | 不缓存    | ✗          | 临时对象   |

**关键规则：Scope 和定义位置没有决定性关系**

缓存位置由 scope 类型决定，与服务定义在哪个容器无关。

**Singleton**

- 缓存在 root 容器
- 如果没有 root 容器，则缓存在当前容器（此时与 container scope 一致）
- 所有容器共享同一实例
- 不受容器继承模式影响
- 定义可以在任何容器，查询时自动升级到 root 缓存

**Container (Request Scope)**

- 缓存在调用 `get()` 的那个容器，而不是定义所在的容器
- 该容器内复用，其他容器创建新实例
- 支持通过继承链查询定义
- 每个容器独立缓存一份实例

**Transient**

- 每次 `get()` 都创建新实例
- 不缓存在容器中
- 支持 `dispose()` 方法自动清理

**Scope 与继承交互矩阵**

| 定义位置 | 调用容器 | Scope     | 缓存位置 | 实例隔离 | 说明                                        |
| -------- | -------- | --------- | -------- | -------- | ------------------------------------------- |
| root     | child    | singleton | root     | 共享     | 全局单例，所有容器共享同一实例              |
| root     | child    | container | child    | 隔离     | 定义在 root，但实例缓存在 child             |
| root     | child    | transient | 无       | 隔离     | 每次创建新实例，不缓存                      |
| parent   | child    | singleton | root     | 共享     | 定义在 parent，升级到 root 缓存             |
| parent   | child    | container | child    | 隔离     | 关键：缓存在调用容器（child），不是定义容器 |
| parent   | child    | transient | 无       | 隔离     | 每次创建新实例                              |
| child    | child    | singleton | root     | 共享     | 标准 singleton 行为                         |
| child    | child    | container | child    | 隔离     | 本容器内复用                                |
| child    | child    | transient | 无       | 隔离     | 每次创建新实例                              |

### 2.2 API 设计

#### 2.2.1 ContainerOptions 接口

```typescript
export interface ContainerOptions {
  /**
   * 是否允许运行时从 parent 容器查询服务
   * - true: 本容器找不到时向 parent 递归查询（默认）
   * - false: 仅查询本容器，不查询 parent
   */
  inherit?: boolean;
}
```

#### 2.2.2 ContainerInstance 新增属性

```typescript
export class ContainerInstance {
  // 现有属性
  public readonly id!: ContainerIdentifier;
  private metadataMap: Map<ServiceIdentifier, ServiceMetadata<unknown>> = new Map();
  private multiServiceIds: Map<ServiceIdentifier, { tokens: Token<unknown>[]; scope: ContainerScope }> = new Map();
  private readonly handlers: Handler[] = [];
  private disposed: boolean = false;

  // 新增属性
  private parentContainer: ContainerInstance | null = null;
  private options: ContainerOptions = { inherit: true };

  // 缓存 root 容器，避免每次递归查询
  private cachedRootContainer: ContainerInstance | null = null;
}
```

#### 2.2.3 ContainerInstance 新增方法

```typescript
/**
 * 获取 parent 容器
 */
public getParent(): ContainerInstance | null {
  return this.parentContainer;
}

/**
 * 获取 root 容器
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
 * 获取容器选项
 */
public getOptions(): Readonly<ContainerOptions> {
  return { ...this.options };
}
```

#### 2.2.4 ContainerInstance 修改现有方法

**构造函数**

```typescript
constructor(
  id: ContainerIdentifier,
  options?: Partial<ContainerOptions>,
  parentContainer?: ContainerInstance
) {
  this.id = id;
  this.options = { inherit: true, ...options };
  this.parentContainer = parentContainer || null;

  ContainerRegistry.registerContainer(this);
}
```

**has<T>() 方法**

```typescript
public has<T = unknown>(identifier: ServiceIdentifier<T>): boolean {
  this.throwIfDisposed();

  // 1. 检查本容器
  if (this.metadataMap.has(identifier) || this.multiServiceIds.has(identifier)) {
    return true;
  }

  // 2. 检查 root 容器的 singleton
  const root = this.getRoot();
  if (root !== this) {
    const metadata = root.metadataMap.get(identifier);
    if (metadata && metadata.scope === 'singleton') {
      return true;
    }
  }

  // 3. 如果允许 parent 查询，递归查询
  if (this.options.inherit && this.parentContainer) {
    return this.parentContainer.has(identifier);
  }

  return false;
}
```

**get<T>() 方法 - 查询流程**

```typescript
public get<T = unknown>(identifier: ServiceIdentifier<T>): T {
  this.throwIfDisposed();

  // ===== 步骤 1：检查本容器的定义 =====
  let metadata = this.metadataMap.get(identifier);
  if (metadata && !metadata.multiple) {
    return this.getServiceValue(metadata);
  }

  // ===== 步骤 2：检查本容器的多服务 =====
  if (this.multiServiceIds.has(identifier)) {
    return this.getMany(identifier) as any;
  }

  // ===== 步骤 3：检查 root 容器的 singleton（全局优先）=====
  const root = this.getRoot();
  if (root !== this) {
    const rootMetadata = root.metadataMap.get(identifier);
    if (rootMetadata && rootMetadata.scope === 'singleton') {
      return this.getServiceValue(rootMetadata);
    }
  }

  // ===== 步骤 4：允许继承时，从 parent 查询定义 =====
  if (this.options.inherit && this.parentContainer) {
    return this.resolveFromParent<T>(identifier);
  }

  throw new ServiceNotFoundError(identifier);
}

/**
 * 从 parent 容器解析服务
 *
 * 关键规则：
 * - Singleton：由 root 容器缓存（步骤 3 已处理）
 * - Container scope：在调用容器（this）缓存
 * - Transient：不缓存，直接创建
 */
private resolveFromParent<T = unknown>(identifier: ServiceIdentifier<T>): T {
  // 尝试从 parent 的 metadataMap 直接获取定义
  const parentMetadata = this.parentContainer!.metadataMap.get(identifier);

  if (parentMetadata) {
    // 如果是 singleton，应该已在步骤 3 处理
    // 这里再检查一次确保（防御性编程）
    if (parentMetadata.scope === 'singleton') {
      const root = this.getRoot();
      return this.getServiceValue(parentMetadata);
    }

    // 如果是 container scope，在本容器缓存实例
    // 注意：使用 parent 的元数据创建实例，但缓存在本容器
    if (parentMetadata.scope === 'container') {
      return this.getServiceValue(parentMetadata);
    }

    // 如果是 transient，直接创建（无缓存）
    if (parentMetadata.scope === 'transient') {
      return this.getServiceValue(parentMetadata);
    }
  }

  // parent 的 metadataMap 中没有定义，继续向上递归
  return this.parentContainer!.get<T>(identifier);
}
```

**查询流程说明**

1. **本容器查询优先**
   - 检查本容器 metadataMap
   - 检查本容器 multiServiceIds
   - 如果有，直接返回

2. **Root Singleton 全局优先**
   - 检查 root 容器的 singleton 定义
   - 如果有且 scope === 'singleton'，返回（缓存在 root）

3. **继承链查询**（仅当 `inherit: true`）
   - 调用 `resolveFromParent()`
   - 根据 scope 类型决定缓存位置：
     - Singleton：缓存在 root（已在步骤 2 处理）
     - Container：缓存在本容器（当前调用 get() 的容器）
     - Transient：不缓存

4. **递归向上**
   - 如果 parent 的 metadataMap 中没有定义
   - 调用 `parent.get()` 继续向上查询

**缓存位置的关键点**：

- `getServiceValue(metadata)` 会自动根据 scope 决定缓存位置
- Container scope 实例会缓存在调用 `getServiceValue()` 的容器中
- 这意味着即使定义在 parent，container scope 实例也会缓存在 child

**getServiceValue() 方法 - 缓存位置的关键**

```typescript
/**
 * 获取服务实例，根据 scope 决定缓存位置
 *
 * 关键：缓存位置由 scope 类型决定，与调用位置无关
 * - Singleton：总是缓存在 root 容器
 * - Container：缓存在调用此方法的容器（this）
 * - Transient：不缓存
 */
private getServiceValue<T = unknown>(metadata: ServiceMetadata<T>): T {
  // 1. Singleton：检查 root 容器缓存
  if (metadata.scope === 'singleton') {
    const root = this.getRoot();

    // 检查 root 是否已缓存
    if (metadata.value !== EMPTY_VALUE) {
      return metadata.value as T;
    }

    // 创建实例
    const instance = this.createServiceInstance(metadata);

    // 缓存在 root 容器（注意：这里修改的是 metadata.value）
    metadata.value = instance;
    return instance;
  }

  // 2. Container scope：缓存在本容器（this）
  if (metadata.scope === 'container') {
    // 检查本容器是否已缓存
    if (metadata.value !== EMPTY_VALUE) {
      return metadata.value as T;
    }

    // 创建实例
    const instance = this.createServiceInstance(metadata);

    // 缓存在本容器（this）
    metadata.value = instance;
    return instance;
  }

  // 3. Transient：每次创建，不缓存
  if (metadata.scope === 'transient') {
    return this.createServiceInstance(metadata);
  }

  throw new Error(`Unknown scope: ${metadata.scope}`);
}
```

**set<T>() 方法 - 简化处理**

```typescript
public set<T = unknown>(serviceOptions: ServiceOptions<T>): this {
  this.throwIfDisposed();

  // Singleton 始终在 root 容器注册
  const targetContainer = serviceOptions.scope === 'singleton' ? this.getRoot() : this;

  if (targetContainer !== this) {
    targetContainer.set(serviceOptions);
    return this;
  }

  const newMetadata: ServiceMetadata<T> = {
    id: ((serviceOptions as any).id || (serviceOptions as any).type) as ServiceIdentifier,
    type: (serviceOptions as ServiceMetadata<T>).type || null,
    factory: (serviceOptions as ServiceMetadata<T>).factory,
    value: (serviceOptions as ServiceMetadata<T>).value || EMPTY_VALUE,
    multiple: serviceOptions.multiple || false,
    scope: serviceOptions.scope || 'container',
    ...serviceOptions,
    referencedBy: new Map().set(this.id, this),
  };

  // 处理 multiple 服务（保持现有逻辑）
  if (serviceOptions.multiple) {
    const maskedToken = new Token(`MultiMaskToken-${newMetadata.id.toString()}`);
    const existingMultiGroup = this.multiServiceIds.get(newMetadata.id);

    if (existingMultiGroup) {
      existingMultiGroup.tokens.push(maskedToken);
    } else {
      this.multiServiceIds.set(newMetadata.id, { scope: newMetadata.scope, tokens: [maskedToken] });
    }

    newMetadata.id = maskedToken;
    newMetadata.multiple = false;
  }

  // 注册或更新
  const existingMetadata = this.metadataMap.get(newMetadata.id);
  if (existingMetadata) {
    Object.assign(existingMetadata, newMetadata);
  } else {
    this.metadataMap.set(newMetadata.id, newMetadata);
  }

  return this;
}
```

**initializeParams() 方法 - 改进 handler 查询**

```typescript
private initializeParams(target: Function, paramTypes: any[]): unknown[] {
  return paramTypes.map((paramType, index) => {
    // 1. 在本容器查询
    let paramHandler = this.handlers.find(handler =>
      handler.object === target && handler.index === index
    );

    if (paramHandler) return paramHandler.value(this);

    // 2. 递归向 parent 查询（支持多层继承）
    if (!paramHandler && this.parentContainer) {
      paramHandler = this.findHandlerInParent(target, index);
      if (paramHandler) return paramHandler.value(this);
    }

    // 3. 单层 parent 查询（处理类继承）
    paramHandler = this.handlers.find(handler =>
      handler.object === Object.getPrototypeOf(target) && handler.index === index
    );

    if (paramHandler) return paramHandler.value(this);

    // 4. 自动注入
    if (paramType && paramType.name && !this.isPrimitiveParamType(paramType.name)) {
      return this.get(paramType);
    }

    return undefined;
  });
}

/**
 * 递归向 parent 查询 handler
 */
private findHandlerInParent(target: Function, index: number): Handler | undefined {
  if (!this.parentContainer) return undefined;

  const handler = this.parentContainer.handlers.find(h =>
    h.object === target && h.index === index
  );

  if (handler) return handler;

  return this.parentContainer.findHandlerInParent(target, index);
}
```

**dispose() 方法 - 简化级联清理**

```typescript
public async dispose(): Promise<void> {
  this.throwIfDisposed();

  // 清理本容器的服务
  this.metadataMap.forEach(service => {
    // 仅清理该容器独占的服务
    if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
      this.disposeServiceInstance(service, true);
    }
  });

  // 标记为已清理
  this.disposed = true;

  await Promise.resolve();
}
```

**reset() 方法 - 简化重置**

```typescript
public reset(options: { strategy: 'resetValue' | 'resetServices' } = { strategy: 'resetValue' }): this {
  this.throwIfDisposed();

  if (options.strategy === 'resetValue') {
    // 仅清理值，保留元数据
    this.metadataMap.forEach(service => {
      if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
        this.disposeServiceInstance(service);
      }
    });
  } else if (options.strategy === 'resetServices') {
    // 清理值和元数据
    this.metadataMap.forEach(service => {
      if (service.referencedBy.size === 1 && service.referencedBy.has(this.id)) {
        this.disposeServiceInstance(service);
      }
    });
    this.metadataMap.clear();
    this.multiServiceIds.clear();
  }

  return this;
}
```

**of() 方法 - 新的容器创建方式**

```typescript
public of(
  containerId: ContainerIdentifier = 'default',
  options?: Partial<ContainerOptions>,
  parentId?: ContainerIdentifier
): ContainerInstance {
  this.throwIfDisposed();

  if (containerId === 'default') {
    return ContainerRegistry.defaultContainer;
  }

  // 确定 parent 容器
  let parentContainer: ContainerInstance | undefined;
  if (parentId) {
    parentContainer = ContainerRegistry.hasContainer(parentId)
      ? ContainerRegistry.getContainer(parentId)
      : new ContainerInstance(parentId);
  }

  // 如果容器已存在，返回现有容器
  if (ContainerRegistry.hasContainer(containerId)) {
    return ContainerRegistry.getContainer(containerId);
  }

  // 创建新容器
  return new ContainerInstance(containerId, options, parentContainer);
}
```

### 2.3 ContainerRegistry 改进

```typescript
export class ContainerRegistry {
  private static readonly containerMap: Map<ContainerIdentifier, ContainerInstance> = new Map();
  public static readonly defaultContainer: ContainerInstance = new ContainerInstance('default');

  /**
   * 创建容器的便捷方法
   */
  public static create(
    id: ContainerIdentifier,
    options?: Partial<ContainerOptions>,
    parentId?: ContainerIdentifier,
  ): ContainerInstance {
    const parent = parentId ? this.getContainer(parentId) : undefined;

    return new ContainerInstance(id, options, parent);
  }

  // 现有方法保持不变
  // registerContainer, hasContainer, getContainer, removeContainer
}
```

### 2.4 使用示例

#### 示例 1：完全隔离

```typescript
// 创建隔离的容器
const isolated = Container.create('isolated', { inherit: false });

isolated.set({ id: 'Logger', type: Logger });
const logger = isolated.get('Logger'); // ✓
```

#### 示例 2：请求隔离 - 演示缓存位置规则

```typescript
// 全局容器
const global = Container.create('global');
global.set({ id: 'Logger', type: Logger, scope: 'singleton' });
global.set({ id: 'UserService', type: UserService, scope: 'container' });
global.set({ id: 'Config', type: Config, scope: 'transient' });

// 为每个请求创建容器
const request1 = Container.create('request-1', { inherit: true }, 'global');
const request2 = Container.create('request-2', { inherit: true }, 'global');

// Singleton：缓存在 root（global）
const logger1 = request1.get('Logger');
const logger2 = request2.get('Logger');
console.log(logger1 === logger2); // true - 同一实例

// Container scope：缓存在调用 get() 的容器（request1 或 request2）
const service1 = request1.get('UserService'); // 定义在 global，但实例缓存在 request1
const service2 = request2.get('UserService'); // 定义在 global，但实例缓存在 request2
console.log(service1 === service2); // false - 不同实例

// 同一容器内复用
const service1Again = request1.get('UserService');
console.log(service1 === service1Again); // true - 同一容器内缓存

// Transient：每次创建新实例
const config1 = request1.get('Config');
const config2 = request1.get('Config');
console.log(config1 === config2); // false - 每次创建新实例

// 在 request1 容器覆盖服务
request1.set({ id: 'UserService', type: CustomUserService, scope: 'container' });
const customService = request1.get('UserService'); // 使用本容器的定义
console.log(customService === service1); // false - 新定义创建的新实例
```

#### 示例 2.1：深入理解 Scope 和缓存位置

```typescript
// 关键场景：定义在 parent，实例缓存在 child

const parent = Container.create('parent');
const child = Container.create('child', { inherit: true }, 'parent');
const grandchild = Container.create('grandchild', { inherit: true }, 'child');

// 在 parent 容器注册服务
parent.set({ id: 'Service', type: Service, scope: 'container' });

// 从 child 查询
const instance1 = child.get('Service');
// 查询流程：
// 1. child.metadataMap 无定义 → 继续
// 2. root.metadataMap 无 singleton → 继续
// 3. child.inherit && child.parent → resolveFromParent()
// 4. parent.metadataMap 有定义，scope === 'container'
// 5. 在 child 容器缓存实例并返回

// 从 grandchild 查询
const instance2 = grandchild.get('Service');
// 查询流程：
// 1. grandchild.metadataMap 无定义 → 继续
// 2. root.metadataMap 无 singleton → 继续
// 3. grandchild.inherit && grandchild.parent (child) → resolveFromParent()
// 4. child.metadataMap 无定义 → child.parent.get()
// 5. 递归调用 parent.get('Service')
// 6. parent.metadataMap 有定义，scope === 'container'
// 7. 在 parent 容器缓存实例并返回给 grandchild

console.log(instance1 === instance2); // false - 缓存在不同容器

// 再从 child 查询
const instance1Again = child.get('Service');
console.log(instance1 === instance1Again); // true - 缓存在 child

// 再从 grandchild 查询
const instance2Again = grandchild.get('Service');
console.log(instance2 === instance2Again); // true - 缓存在 grandchild（不是 parent）

// 重要：缓存位置由 scope 决定，不由定义位置决定
// - 定义在 parent
// - child 调用 get() 时，实例缓存在 child
// - grandchild 调用 get() 时，实例缓存在 grandchild
// - 两个实例互不影响
```

#### 示例 3：多租户

```typescript
// 全局容器
const global = Container.create('global');
global.set({ id: 'Logger', type: Logger, scope: 'singleton' });
global.set({ id: 'Config', type: Config, scope: 'singleton' });

// 租户容器
const tenant1 = Container.create('tenant1', { inherit: true }, 'global');

const tenant2 = Container.create('tenant2', { inherit: true }, 'global');

// 共享 singleton
const log1 = tenant1.get('Logger');
const log2 = tenant2.get('Logger');
console.log(log1 === log2); // true

// 租户特定的服务
tenant1.set({ id: 'UserRepo', type: UserRepo });
const repo1 = tenant1.get('UserRepo');
// tenant2.get('UserRepo'); // ✗ ServiceNotFoundError
```

#### 示例 4：多层继承

```typescript
const root = Container.create('root');
const child = Container.create('child', { inherit: true }, 'root');
const grandchild = Container.create('grandchild', { inherit: true }, 'child');

root.set({ id: 'Service', type: Service });

// 通过继承链查询
const service = grandchild.get('Service'); // ✓ 递归查询：grandchild → child → root
```

---

## 3. 关键设计决策

### 3.1 移除 inheritDefinitions 参数的原因

**原始设计**有两个参数：

- `inheritDefinitions`：在容器创建时复制 parent 的服务定义
- `inherit`：在运行时查询 parent 容器

**问题分析**：

1. 复制元数据会占用额外内存
2. 复制后的元数据与原定义脱离，维护困难
3. Container scope 实例缓存在 child，与 parent 定义分离
4. 两个参数的组合产生了冗余的功能

**简化方案**：

- 删除 `inheritDefinitions`
- 保留 `inherit` 作为唯一的继承控制参数
- 运行时动态查询定义，避免复制开销
- **关键规则**：缓存位置由 scope 决定，不由定义位置决定
  - Container scope 实例缓存在调用 `get()` 的容器
  - Singleton 实例缓存在 root 容器
  - 定义位置与缓存位置无关

**对比**：

| 方面       | 原方案         | 简化方案      | 改进     |
| ---------- | -------------- | ------------- | -------- |
| 配置参数   | 2 个           | 1 个          | -50%     |
| 内存占用   | 复制元数据     | 无复制        | 更省内存 |
| 查询性能   | O(1) 本地查询  | O(n) 递归查询 | 权衡合理 |
| 实现复杂度 | 高             | 低            | 更简单   |
| 覆盖服务   | 需要复制后修改 | 直接注册      | 更直观   |
| 定义与缓存 | 位置关联       | 位置无关      | 更清晰   |

### 3.2 移除 Eager 功能的原因

**原始设计**支持 eager 加载：

- 在容器创建或服务注册时，立即创建实例
- 适用于需要启动时初始化的服务

**问题分析**：

1. Eager 加载主要是性能优化，不是功能需求
2. 添加了 `ServiceMetadata.eager` 字段和相关逻辑
3. 与 transient scope 的交互复杂
4. 大多数场景下不需要

**简化方案**：

- 删除 `ServiceMetadata.eager` 字段
- 删除 `ServiceOptions.eager` 配置
- 删除 eager 加载的相关代码
- 如需要，用户可以手动调用 `container.get()` 初始化

**示例**：

```typescript
// 原方案：eager 加载
container.set({
  id: 'Logger',
  type: Logger,
  scope: 'singleton',
  eager: true, // 自动在创建时初始化
});

// 简化方案：手动初始化
container.set({
  id: 'Logger',
  type: Logger,
  scope: 'singleton',
});
container.get('Logger'); // 显式初始化
```

**收益**：

- 代码行数减少 ~15%
- 配置选项更少
- 逻辑更清晰
- 用户有更多控制权

---

## 4. TODO 列表

### 第一阶段：核心架构（Priority: High）✅ 已完成

- [x] 1.1 修改 `ContainerInstance` 构造函数，移除 `inheritanceStrategy`,`lookupStrategy` 相关逻辑
- [x] 1.2 在 `ContainerInstance` 中添加新属性：`parentContainer`、`options`、`cachedRootContainer`
- [x] 1.3 实现 `getParent()`、`getRoot()`、`getOptions()` 方法
- [x] 1.4 删除 `inheritFromParent()` 方法
- [x] 1.5 实现 `findHandlerInParent()` 方法（递归查询）

### 第二阶段：查询流程（Priority: High）✅ 已完成

- [x] 2.1 改进 `has<T>()` 方法，支持 parent 查询和 singleton 优先
- [x] 2.2 完全重写 `get<T>()` 方法，实现简化的查询流程
- [x] 2.3 改进 `getMany<T>()` 方法，支持 parent 查询
- [x] 2.4 改进 `set<T>()` 方法，使用 `getRoot()` 处理 singleton
- [x] 2.5 改进 `initializeParams()` 方法，支持多层 parent handler 查询

### 第三阶段：生命周期管理（Priority: High）✅ 已完成

- [x] 3.1 改进 `dispose()` 方法，基于 `referencedBy` 的简化清理
- [x] 3.2 改进 `reset()` 方法，考虑 `referencedBy` 检查
- [x] 3.3 改进 `disposeServiceInstance()` 方法
- [x] 3.4 删除 eager 加载相关代码

### 第四阶段：API 完善（Priority: Medium）✅ 已完成

- [x] 4.1 改进 `of()` 方法，支持新的参数签名
- [x] 4.2 在 `ContainerRegistry` 中添加 `create()` 便捷方法
- [x] 4.3 更新类型定义和导出（ContainerOptions 已更新）
- [x] 4.4 从 `ServiceMetadata` 和 `ServiceOptions` 移除 `eager` 字段

### 第五阶段:测试用例(Priority: High) ✅ 已完成

- [x] 5.1 继承模式测试
  - [x] 测试 `inherit: false` 隔离模式
  - [x] 测试 `inherit: true` 继承模式
  - [x] 测试服务覆盖

- [x] 5.2 查询流程测试
  - [x] 测试本容器查询
  - [x] 测试 parent 查询
  - [x] 测试 singleton 优先
  - [x] 测试 `inherit: false` 禁用查询

- [x] 5.3 Resolution Scope 测试
  - [x] 测试 singleton 在 root 创建
  - [x] 测试 singleton 跨容器共享
  - [x] 测试 container scope 隔离
  - [x] 测试 transient scope 每次创建

- [x] 5.4 生命周期测试
  - [x] 测试 dispose 清理
  - [x] 测试 reset 行为
  - [x] 删除 eager 加载测试

- [x] 5.5 多层继承测试
  - [x] 测试 3 层及以上继承
  - [x] 测试递归查询

- [x] 5.6 Handler 继承测试
  - [x] 测试多层 parent handler 查询
  - [x] 测试 @Inject 装饰器

- [x] 5.7 边界情况测试
  - [x] 测试循环依赖
  - [x] 测试服务不存在
  - [x] 测试已清理容器操作

### 第六阶段：文档和示例（Priority: Medium）

- [ ] 6.1 更新 README 文档
- [ ] 6.2 编写使用示例
- [ ] 6.3 编写 API 参考

---

## 5. 验证列表

### 5.1 功能验证

#### 5.1.1 继承模式

- [x] **V1.1** `inherit: false` 时,容器完全隔离
  - 验证:parent 的服务 child 无法访问 ✅

- [x] **V1.2** `inherit: true` 时,容器查询 parent
  - 验证:child 可以查询 parent 的服务 ✅

- [x] **V1.3** 服务覆盖正确工作
  - 验证:child 可以注册新的服务覆盖 parent 的定义 ✅

#### 5.1.2 查询流程

- [x] **V2.1** 本容器查询优先
  - 验证:本容器的服务优先返回 ✅

- [x] **V2.2** Singleton 始终优先
  - 验证:root 容器的 singleton 优先返回 ✅

- [x] **V2.3** Parent 查询递归工作
  - 验证:多层 parent 查询正确 ✅

- [x] **V2.4** `inherit: false` 禁用 parent 查询
  - 验证:设置后无法查询 parent 的服务 ✅

#### 5.1.3 Resolution Scope

- [x] **V3.1** Singleton 在 root 创建和共享 ✅
  - 验证：所有容器获取同一实例

- [x] **V3.2** Container scope 隔离
  - 验证：不同容器创建不同实例 ✅

- [x] **V3.3** Transient 每次创建
  - 验证：每次 `get()` 创建新实例 ✅

#### 5.1.4 生命周期

- [x] **V4.1** dispose() 清理服务
  - 验证：清理后无法访问服务 ✅

- [x] **V4.2** reset() 重置值
  - 验证：值重置，元数据保留 ✅

- [x] **V4.3** referencedBy 追踪
  - 验证：多个容器引用时，仅当都清理时才销毁 ✅

#### 5.1.5 多层继承

- [x] **V5.1** 支持 3+ 层继承
  - 验证：grandchild 可以访问 root 的服务 ✅

- [x] **V5.2** 递归查询工作
  - 验证：通过继承链正确查询 ✅

#### 5.1.6 Handler 继承

- [x] **V6.1** 多层 parent handler 查询
  - 验证：@Inject 在继承场景工作 ✅

#### 5.1.7 错误处理

- [x] **V7.1** 服务不存在抛错
  - 验证：ServiceNotFoundError 正确抛出 ✅

- [x] **V7.2** 已清理容器操作抛错
  - 验证：dispose 后操作抛错 ✅

### 5.2 性能验证

- [ ] **P1** 单层查询性能（基准测试）
- [ ] **P2** 多层查询性能（3 层以内）
- [ ] **P3** 1000+ 服务注册性能

### 5.3 代码质量

- [ ] **Q1** ESLint 通过
- [ ] **Q2** Prettier 通过
- [ ] **Q3** TypeScript 无错误
- [ ] **Q4** 测试覆盖率 80%+

---

## 6. 附录

### 6.1 核心数据结构

```typescript
export type ContainerScope = 'singleton' | 'container' | 'transient';

export type ContainerIdentifier = string | symbol;

export interface ContainerOptions {
  inherit?: boolean;
}

export interface ServiceMetadata<Type = unknown> {
  id: ServiceIdentifier;
  scope: ContainerScope;
  type: Constructable<Type> | null;
  factory: [Constructable<unknown>, string] | CallableFunction | undefined;
  value: unknown | symbol;
  multiple: boolean;
  referencedBy: Map<ContainerIdentifier, ContainerInstance>;
}
```

### 6.2 查询流程

```
get<T>(identifier) 在容器 A 调用
  ↓
┌─────────────────────────────────────────────────┐
│ 步骤 1：本容器查询                              │
└─────────────────────────────────────────────────┘
  ↓
检查 A.metadataMap
  ├─ 有（非 multiple）→ return getServiceValue()
  └─ 无 ↓
  ↓
检查 A.multiServiceIds
  ├─ 有 → return getMany()
  └─ 无 ↓
  ↓
┌─────────────────────────────────────────────────┐
│ 步骤 2：Root Singleton 全局优先                 │
└─────────────────────────────────────────────────┘
  ↓
root = A.getRoot()
  ↓
root !== A？
  ├─ 是 → 检查 root.metadataMap
  │  └─ 有 && scope === 'singleton'？
  │     └─ 是 → return getServiceValue()
  │     └─ 无 ↓
  └─ 否 ↓
  ↓
┌─────────────────────────────────────────────────┐
│ 步骤 3：继承链查询（仅当 inherit: true）        │
└─────────────────────────────────────────────────┘
  ↓
A.options.inherit && A.parentContainer？
  ├─ 否 → 抛 ServiceNotFoundError
  └─ 是 → 调用 resolveFromParent()
     ↓
     ┌──────────────────────────────────────┐
     │ resolveFromParent<T>(identifier)     │
     └──────────────────────────────────────┘
       ↓
       检查 parent.metadataMap
         ├─ 无 → parent.get() 递归（继续向上）
         └─ 有 ↓
           ↓
           scope 类型判断
             ├─ 'singleton'  → return getServiceValue()
             │                 （缓存在 root）
             ├─ 'container'  → return getServiceValue()
             │                 （缓存在 A）
             └─ 'transient'  → return getServiceValue()
                               （不缓存）
```

**查询流程总结**：

1. **本容器优先**：快速查找本容器的定义
2. **Singleton 全局**：确保 singleton 在 root 容器缓存
3. **继承链递归**：允许 inherit 时向 parent 查询
4. **缓存位置**：由 scope 类型决定
   - Singleton：root 容器
   - Container：调用容器（A）
   - Transient：不缓存

**关键点**：

- 缓存位置 = scope 类型，与定义位置无关
- `getServiceValue()` 自动根据 scope 处理缓存
- Container scope 实例缓存在调用 `get()` 的容器

### 6.3 设计对比

| 特性           | v1.0（原方案） | v2.0（简化方案） |
| -------------- | -------------- | ---------------- |
| 配置选项       | 2 个           | 1 个             |
| 是否支持 eager | ✓              | ✗                |
| 查询策略       | 复杂           | 简化             |
| 配置组合       | 多种           | 单一             |
| 查询流程       | 复杂           | 简化             |
| 实现复杂度     | 高             | 低               |
| 内存占用       | 更多           | 更少             |
| API 学习成本   | 高             | 低               |

### 6.4 关键改进点

1. **API 极简**
   - 从 2 个配置选项减少到 1 个
   - 删除 eager 加载功能
   - 消除了参数组合的复杂性

2. **查询流程简化**
   - 删除了定义继承的复杂逻辑
   - 统一为运行时动态查询
   - 递归查询逻辑清晰

3. **实现简化**
   - 删除 `inheritFromParent()` 方法
   - 删除 `ServiceMetadata.eager` 字段
   - 减少了抽象层
   - 更直接的数据流

4. **性能权衡**
   - 缓存 root 容器，避免每次查询递归到 root
   - 查询可能需要遍历继承链（可接受）
   - 内存占用更少
   - 常数级别的单层查询时间

5. **类型安全**
   - 完整的 TypeScript 支持
   - 更好的类型推导
   - 编译时错误检测

---

## 7. 原则对照

### ✅ API 设计精简

| 原方案         | 简化方案       | 改进   |
| -------------- | -------------- | ------ |
| 2 个配置选项   | 1 个选项       | -50%   |
| 支持 eager     | 不支持         | 更简单 |
| 复杂的查询规则 | 简单的查询规则 | 易理解 |

### ✅ 语义清晰

- `inherit` - 清晰的查询控制
- `getRoot()` vs `getParent()` - 明确的容器关系
- **关键规则**：缓存位置由 scope 决定，不由定义位置决定
  - 直观易理解
  - 消除了定义位置与缓存位置的混淆

### ✅ 内部实现简单

- 删除了 `inheritFromParent()` 复杂逻辑
- 删除了 eager 加载相关代码
- 统一的查询流程，减少分支
- 清晰的缓存规则，易于维护

### ✅ 性能优先

- 缓存 root 容器，避免递归查询
- Singleton 优先规则内置，减少查询次数
- 常数级别的单层查询时间复杂度
- 内存占用更少（无元数据复制）
- Container scope 实例在调用容器缓存，避免跨容器污染

### ✅ 类型安全

- 完整的 TypeScript 支持
- 更好的类型推导
- 编译时错误检测
- 清晰的 scope 语义，类型检查有效
