# 使用作用域容器

TypeDI 支持多容器系统,允许你为不同的上下文(如 HTTP 请求、用户会话等)创建独立的服务容器。这对于隔离状态、管理生命周期和实现请求级依赖注入非常有用。

## 基础概念

### 默认容器

TypeDI 提供一个全局默认容器,所有使用 `@Service()` 装饰的类都会注册到这个容器中:

```ts
import { Container, Service } from 'typedi';

@Service()
class GlobalService {}

// Container 是默认容器的别名
const service = Container.get(GlobalService);
```

### 创建作用域容器

使用 `Container.of()` 方法创建或获取作用域容器:

```ts
import { Container } from 'typedi';

// 创建请求作用域容器
const requestContainer = Container.of('request-123');

// 创建用户会话容器
const sessionContainer = Container.of('session-abc');

// 如果容器已存在,返回现有容器
const sameContainer = Container.of('request-123');
console.log(requestContainer === sameContainer); // true
```

## 容器层级与继承

### 父子容器关系

容器可以形成层级结构,子容器可以从父容器继承服务:

```ts
import { Container, Service } from 'typedi';

@Service()
class SharedService {
  getName() {
    return 'Shared across containers';
  }
}

// 父容器中获取服务(会注册到默认容器)
const sharedService = Container.get(SharedService);

// 创建子容器(默认继承父容器)
const childContainer = Container.of('child');

// 子容器可以访问父容器的服务
const inheritedService = childContainer.get(SharedService);
console.log(inheritedService === sharedService); // false (不同实例)
```

### 显式指定父容器

你可以在创建容器时显式指定父容器:

```ts
import { Container } from 'typedi';

// 创建父容器
const parentContainer = Container.of('parent');

// 创建子容器,指定父容器
const childContainer = Container.of('child', { inherit: true }, 'parent');

console.log(childContainer.getParent() === parentContainer); // true
```

### 获取父容器和根容器

```ts
import { Container } from 'typedi';

const grandparent = Container.of('grandparent');
const parent = grandparent.of('parent');
const child = parent.of('child');

// 获取直接父容器
console.log(child.getParent() === parent); // true
console.log(parent.getParent() === grandparent); // true

// 获取根容器
console.log(child.getRoot() === grandparent); // true
console.log(parent.getRoot() === grandparent); // true
console.log(grandparent.getRoot() === grandparent); // true
```

## 容器选项

### `inherit` - 控制继承行为

`inherit` 选项控制容器是否可以从父容器查找服务:

```ts
import { Container, Service } from 'typedi';

@Service()
class ParentService {}

// 注册服务到默认容器
Container.get(ParentService);

// 创建继承的子容器(默认)
const inheritedContainer = Container.of('inherited', { inherit: true });
console.log(inheritedContainer.has(ParentService)); // true

// 创建隔离的子容器
const isolatedContainer = Container.of('isolated', { inherit: false });
console.log(isolatedContainer.has(ParentService)); // false
```

### 获取容器选项

```ts
import { Container } from 'typedi';

const container = Container.of('test', { inherit: false });
const options = container.getOptions();
console.log(options); // { inherit: false }
```

## 服务作用域与容器交互

服务的 `scope` 选项决定了它在容器层级中的行为:

### Singleton 作用域

Singleton 服务始终存储在根容器中,所有容器共享同一实例:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class ConfigService {
  constructor() {
    console.log('ConfigService created');
  }
}

const container1 = Container.of('container-1');
const container2 = Container.of('container-2');

const config1 = container1.get(ConfigService); // 输出: ConfigService created
const config2 = container2.get(ConfigService); // 不输出
const config3 = Container.get(ConfigService); // 不输出

console.log(config1 === config2 && config2 === config3); // true
```

**特点:**

- 在根容器中创建和缓存
- 所有容器获取相同实例
- 适合全局配置、连接池等

### Container 作用域

Container 作用域服务在每个容器中独立缓存(默认行为):

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'container' }) // 或 @Service() (默认)
class RequestContext {
  constructor(public id = Math.random()) {
    console.log(`RequestContext created: ${this.id}`);
  }
}

const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const ctx1a = container1.get(RequestContext); // 输出: RequestContext created: 0.123
const ctx1b = container1.get(RequestContext); // 不输出(复用实例)
const ctx2 = container2.get(RequestContext); // 输出: RequestContext created: 0.456

console.log(ctx1a === ctx1b); // true (同一容器内共享)
console.log(ctx1a === ctx2); // false (不同容器独立)
```

**特点:**

- 每个容器维护独立实例
- 容器内多次获取返回相同实例
- 适合请求上下文、事务管理等

### Transient 作用域

Transient 服务每次获取都创建新实例,不缓存:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class CommandHandler {
  constructor(public id = Math.random()) {
    console.log(`CommandHandler created: ${this.id}`);
  }
}

const container = Container.of('test');

const handler1 = container.get(CommandHandler); // 输出: CommandHandler created: 0.123
const handler2 = container.get(CommandHandler); // 输出: CommandHandler created: 0.456

console.log(handler1 === handler2); // false
```

**特点:**

- 不缓存实例
- 每次都创建新对象
- 适合命令对象、原型模式等

## 服务解析优先级

当从容器中获取服务时,解析顺序为:

1. **本地容器**: 检查当前容器的 `metadataMap` 和 `multiServiceIds`
2. **根容器的 Singleton**: 检查根容器中的 singleton 服务
3. **父容器继承**: 如果 `inherit: true`,递归向上查找父容器

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class SingletonService {}

@Service({ scope: 'container' })
class ContainerService {}

// 在默认容器注册服务
Container.get(SingletonService);
Container.set({ id: 'local-only', value: 'local value' });

// 创建子容器
const childContainer = Container.of('child');

// 1. Singleton 从根容器获取
const singleton = childContainer.get(SingletonService); // ✓ 找到

// 2. 从父容器继承的 container 服务会在子容器创建新实例
const containerService = childContainer.get(ContainerService); // ✓ 创建新实例

// 3. 继承父容器的服务
const localValue = childContainer.get('local-only'); // ✓ 从父容器继承

// 如果禁用继承
const isolatedContainer = Container.of('isolated', { inherit: false });
const singleton2 = isolatedContainer.get(SingletonService); // ✓ singleton 仍然可访问
const containerService2 = isolatedContainer.get(ContainerService); // ✗ 抛出 ServiceNotFoundError
```

## 实际应用场景

### HTTP 请求作用域

为每个 HTTP 请求创建独立容器:

```ts
import { Container, Service } from 'typedi';
import express from 'express';

@Service({ scope: 'container' })
class RequestContext {
  constructor(
    public requestId: string,
    public user: any,
    public startTime: number = Date.now(),
  ) {}
}

@Service()
class UserService {
  constructor(private context: RequestContext) {}

  getCurrentUser() {
    console.log(`Request ${this.context.requestId} - User: ${this.context.user?.name}`);
    return this.context.user;
  }
}

const app = express();

app.use((req, res, next) => {
  // 为每个请求创建容器
  const requestContainer = Container.of(Symbol('request'));

  // 注册请求上下文
  requestContainer.set({
    id: RequestContext,
    value: new RequestContext(req.id, req.user),
  });

  // 将容器附加到请求对象
  (req as any).container = requestContainer;

  // 请求结束后清理
  res.on('finish', async () => {
    await requestContainer.dispose();
  });

  next();
});

app.get('/user', (req, res) => {
  const userService = (req as any).container.get(UserService);
  const user = userService.getCurrentUser();
  res.json(user);
});
```

### 测试隔离

为每个测试创建独立容器:

```ts
import { Container, Service } from 'typedi';

@Service()
class DatabaseService {
  query() {
    return 'production data';
  }
}

describe('UserService', () => {
  let testContainer: ContainerInstance;

  beforeEach(() => {
    // 每个测试创建独立容器
    testContainer = Container.of(Symbol('test'));

    // 使用 mock 服务
    testContainer.set({
      id: DatabaseService,
      value: {
        query: () => 'test data',
      },
    });
  });

  afterEach(async () => {
    // 测试后清理
    await testContainer.dispose();
  });

  it('should use mocked database', () => {
    const db = testContainer.get(DatabaseService);
    expect(db.query()).toBe('test data');
  });
});
```

### 多租户系统

为每个租户创建独立容器:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class GlobalConfig {
  readonly appName = 'Multi-Tenant App';
}

@Service({ scope: 'container' })
class TenantConfig {
  constructor(
    public tenantId: string,
    public database: string,
    public features: string[],
  ) {}
}

@Service()
class TenantService {
  constructor(
    private globalConfig: GlobalConfig,
    private tenantConfig: TenantConfig,
  ) {}

  getInfo() {
    return {
      app: this.globalConfig.appName,
      tenant: this.tenantConfig.tenantId,
      db: this.tenantConfig.database,
    };
  }
}

class TenantManager {
  private containers = new Map<string, ContainerInstance>();

  getTenantContainer(tenantId: string) {
    if (!this.containers.has(tenantId)) {
      const container = Container.of(`tenant-${tenantId}`);

      // 配置租户特定服务
      container.set({
        id: TenantConfig,
        value: new TenantConfig(tenantId, `db_${tenantId}`, ['feature-a', 'feature-b']),
      });

      this.containers.set(tenantId, container);
    }

    return this.containers.get(tenantId)!;
  }

  async removeTenant(tenantId: string) {
    const container = this.containers.get(tenantId);
    if (container) {
      await container.dispose();
      this.containers.delete(tenantId);
    }
  }
}

// 使用
const manager = new TenantManager();

const tenant1Container = manager.getTenantContainer('tenant-1');
const tenant2Container = manager.getTenantContainer('tenant-2');

const service1 = tenant1Container.get(TenantService);
const service2 = tenant2Container.get(TenantService);

console.log(service1.getInfo()); // { app: 'Multi-Tenant App', tenant: 'tenant-1', db: 'db_tenant-1' }
console.log(service2.getInfo()); // { app: 'Multi-Tenant App', tenant: 'tenant-2', db: 'db_tenant-2' }
```

## 容器生命周期管理

### 重置容器

```ts
import { Container, Service } from 'typedi';

@Service()
class CacheService {
  private cache = new Map();

  dispose() {
    console.log('Clearing cache...');
    this.cache.clear();
  }
}

const container = Container.of('temp');
container.get(CacheService);

// 仅重置服务值(调用 dispose,但保留注册信息)
container.reset({ strategy: 'resetValue' });

// 完全清除服务注册
container.reset({ strategy: 'resetServices' });
```

### 销毁容器

```ts
import { Container } from 'typedi';

const requestContainer = Container.of('request-123');

// 使用容器...

// 清理容器
await requestContainer.dispose();

// 容器已销毁,无法再使用
try {
  requestContainer.get(SomeService);
} catch (error) {
  console.log(error.message); // "Cannot use container after it has been disposed."
}
```

### 实现服务清理

为服务实现 `dispose` 方法,在容器销毁时自动调用:

```ts
import { Service } from 'typedi';

@Service()
class DatabaseConnection {
  private connection: any;

  connect() {
    this.connection = createConnection();
  }

  // 容器销毁时自动调用
  dispose() {
    if (this.connection) {
      this.connection.close();
      console.log('Database connection closed');
    }
  }
}
```

## 静态容器注册表

`ContainerRegistry` 类管理所有容器(内部 API,可能变更):

```ts
import { ContainerRegistry } from 'typedi';

// 创建容器
const container = ContainerRegistry.create('my-container', { inherit: true });

// 检查容器是否存在
const exists = ContainerRegistry.hasContainer('my-container'); // true

// 获取容器
const retrieved = ContainerRegistry.getContainer('my-container');

// 移除容器
await ContainerRegistry.removeContainer(container);
```

## 最佳实践

1. **为每个请求创建容器**: 在 HTTP 服务器中为每个请求创建独立容器
2. **及时清理容器**: 使用 `dispose()` 清理不再需要的容器,防止内存泄漏
3. **合理使用作用域**:
   - 全局配置 → `singleton`
   - 请求相关 → `container`
   - 需要隔离 → `transient`
4. **实现 dispose 方法**: 为需要清理资源的服务实现 `dispose()`
5. **使用 Symbol 作为容器 ID**: 避免 ID 冲突
6. **利用容器继承**: 子容器可以访问父容器的服务,减少重复注册
7. **文档化容器层级**: 复杂的容器层级应该有清晰的文档说明

## 常见问题

### 子容器能否修改父容器的服务?

不能。子容器获取父容器的服务时,会创建自己的副本(取决于 scope):

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'container' })
class SharedService {
  value = 'original';
}

const parent = Container.of('parent');
const child = parent.of('child');

const parentService = parent.get(SharedService);
const childService = child.get(SharedService);

childService.value = 'modified';

console.log(parentService.value); // 'original' (未受影响)
console.log(childService.value); // 'modified'
```

### 禁用继承后还能访问 singleton 吗?

可以。Singleton 服务存储在根容器中,即使禁用继承也能访问:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class GlobalService {}

const isolated = Container.of('isolated', { inherit: false });
const service = isolated.get(GlobalService); // ✓ 可以访问
```

### 如何在容器间共享服务?

使用 `singleton` 作用域,或在父容器中注册服务让子容器继承:

```ts
import { Container, Service } from 'typedi';

// 方式1: 使用 singleton
@Service({ scope: 'singleton' })
class SharedSingleton {}

// 方式2: 在父容器注册,子容器继承
const parent = Container.of('parent');
parent.set({ id: 'shared-data', value: { key: 'value' } });

const child1 = parent.of('child1');
const child2 = parent.of('child2');

child1.get('shared-data'); // ✓ 可以访问
child2.get('shared-data'); // ✓ 可以访问
```
