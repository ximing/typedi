---
id: container-api
title: Container API
sidebar_label: Container API
---

# Container API

TypeDI 的核心是 `ContainerInstance` 类,它提供了完整的依赖注入容器功能。默认情况下,`Container` 是全局默认容器的别名。

## 基础方法

### `Container.get<T>(identifier: ServiceIdentifier<T>): T`

从容器中获取服务实例。如果服务尚未初始化,容器会自动创建并缓存实例(取决于服务的作用域)。

```ts
import { Container, Service } from 'typedi';

@Service()
class UserService {
  getUsers() {
    return ['Alice', 'Bob'];
  }
}

const userService = Container.get(UserService);
console.log(userService.getUsers()); // ['Alice', 'Bob']
```

**服务解析规则:**

1. 首先检查当前容器的 `metadataMap`
2. 如果当前容器未找到,检查根容器的 singleton 服务
3. 如果启用了继承(`inherit: true`),则递归查找父容器
4. 如果都未找到,抛出 `ServiceNotFoundError`

### `Container.getMany<T>(identifier: ServiceIdentifier<T>): T[]`

获取使用 `multiple: true` 注册的所有服务实例。

```ts
import { Container, Service, Token } from 'typedi';

interface Logger {
  log(message: string): void;
}

const LoggerToken = new Token<Logger>('logger');

@Service({ id: LoggerToken, multiple: true })
class ConsoleLogger implements Logger {
  log(message: string) {
    console.log('[Console]', message);
  }
}

@Service({ id: LoggerToken, multiple: true })
class FileLogger implements Logger {
  log(message: string) {
    console.log('[File]', message);
  }
}

const loggers = Container.getMany(LoggerToken);
loggers.forEach((logger) => logger.log('Hello'));
// 输出: [Console] Hello
//      [File] Hello
```

### `Container.has<T>(identifier: ServiceIdentifier<T>): boolean`

检查容器中是否存在指定的服务。

```ts
import { Container, Service } from 'typedi';

@Service()
class UserService {}

console.log(Container.has(UserService)); // true
console.log(Container.has('non-existent')); // false
```

**检查规则:**

1. 检查当前容器的 `metadataMap` 或 `multiServiceIds`
2. 检查根容器的 singleton 服务
3. 如果启用继承,递归检查父容器

### `Container.set<T>(options: ServiceOptions<T>): ContainerInstance`

手动注册服务到容器中。

```ts
import { Container, Token } from 'typedi';

// 注册原始值
Container.set('api.url', 'https://api.example.com');
Container.set('api.timeout', 5000);

// 使用 Token 注册
const ConfigToken = new Token<{ debug: boolean }>('config');
Container.set({ id: ConfigToken, value: { debug: true } });

// 注册类实例
class DatabaseService {
  connect() {
    /* ... */
  }
}
Container.set({ id: DatabaseService, value: new DatabaseService() });

// 使用工厂函数
Container.set({
  id: 'random',
  factory: () => Math.random(),
});
```

**ServiceOptions 选项:**

- `id`: 服务标识符(类、Token 或字符串)
- `type`: 服务的类定义(用于实例化)
- `value`: 预先创建的服务实例
- `factory`: 工厂函数或 `[FactoryClass, 'methodName']` 元组
- `multiple`: 是否允许多个实例(默认 `false`)
- `scope`: 服务作用域,可选值:
  - `'singleton'`: 全局单例,存储在根容器中
  - `'container'`: 容器作用域,每个容器一个实例(默认)
  - `'transient'`: 临时的,每次获取都创建新实例

### `Container.remove(identifier: ServiceIdentifier | ServiceIdentifier[]): ContainerInstance`

从容器中移除服务。如果服务有 `dispose` 方法,会自动调用。

```ts
import { Container, Service } from 'typedi';

@Service()
class TempService {
  dispose() {
    console.log('Cleaning up...');
  }
}

Container.get(TempService);
Container.remove(TempService); // 输出: Cleaning up...

// 批量移除
Container.remove([ServiceA, ServiceB, ServiceC]);
```

### `Container.reset(options?: { strategy: 'resetValue' | 'resetServices' }): ContainerInstance`

重置容器。根据策略不同:

- `'resetValue'`: 仅重置服务实例的值(调用 `dispose` 方法),但保留服务注册信息
- `'resetServices'`: 完全清除服务注册信息和实例

```ts
import { Container, Service } from 'typedi';

@Service()
class UserService {
  private cache = new Map();

  dispose() {
    this.cache.clear();
  }
}

// 仅重置实例值
Container.reset({ strategy: 'resetValue' });

// 完全清除所有服务
Container.reset({ strategy: 'resetServices' });
```

### `Container.dispose(): Promise<void>`

销毁容器及其所有服务。调用后容器将无法再使用。

```ts
import { Container } from 'typedi';

const scopedContainer = Container.of('request-123');
// 使用容器...

// 清理容器
await scopedContainer.dispose();
// 容器已销毁,无法再使用
```

**注意:** 只有专属于该容器的服务才会被销毁。共享的服务(如 singleton)不会受影响。

## 容器层级方法

### `Container.of(containerId?: ContainerIdentifier, options?: Partial<ContainerOptions>, parentId?: ContainerIdentifier): ContainerInstance`

获取或创建指定 ID 的子容器。

```ts
import { Container } from 'typedi';

// 创建请求作用域容器
const requestContainer = Container.of('request-123');

// 创建带选项的容器
const isolatedContainer = Container.of('isolated', { inherit: false });

// 创建指定父容器的子容器
const childContainer = Container.of('child', { inherit: true }, 'parent-id');
```

**参数说明:**

- `containerId`: 容器标识符,默认返回默认容器
- `options`: 容器选项
  - `inherit`: 是否从父容器继承服务(默认 `true`)
- `parentId`: 父容器 ID,如果未提供且当前是根容器,则使用当前容器作为父容器

### `container.getParent(): ContainerInstance | null`

获取当前容器的父容器。

```ts
const parent = Container.of('parent');
const child = parent.of('child');

console.log(child.getParent() === parent); // true
console.log(Container.getParent()); // null (默认容器没有父容器)
```

### `container.getRoot(): ContainerInstance`

获取容器层级的根容器。

```ts
const grandparent = Container.of('grandparent');
const parent = grandparent.of('parent');
const child = parent.of('child');

console.log(child.getRoot() === grandparent); // true
```

### `container.getOptions(): Readonly<ContainerOptions>`

获取容器的配置选项。

```ts
const container = Container.of('test', { inherit: false });
console.log(container.getOptions()); // { inherit: false }
```

## 高级方法

### `Container.registerHandler(handler: Handler): ContainerInstance`

注册自定义处理器,用于创建自定义装饰器。

```ts
import { Container } from 'typedi';

function Logger() {
  return function (object: Object, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: (containerInstance) => {
        return new ConsoleLogger();
      },
    });
  };
}

// 使用自定义装饰器
@Service()
class UserController {
  constructor(@Logger() private logger: any) {}
}
```

**Handler 接口:**

```ts
interface Handler {
  object: Constructable<unknown>;
  propertyName?: string;
  index?: number;
  value: (container: ContainerInstance) => any;
}
```

### `Container.import(services: Array<Record<string, any>>): ContainerInstance`

导入服务模块(为未来功能预留)。

```ts
import { Container } from 'typedi';
import * as services from './services';

Container.import([services]);
```

## 容器继承与作用域

TypeDI 支持容器层级结构和服务继承:

### 服务解析优先级

当从子容器获取服务时,解析顺序为:

1. **本地容器**: 检查当前容器的服务注册
2. **根容器的 singleton**: 所有 singleton 服务都存储在根容器中
3. **父容器继承**: 如果 `inherit: true`,递归向上查找父容器

### 作用域行为

```ts
import { Container, Service } from 'typedi';

// Singleton: 全局共享,存储在根容器
@Service({ scope: 'singleton' })
class ConfigService {}

// Container: 每个容器一个实例
@Service({ scope: 'container' })
class RequestService {}

// Transient: 每次都创建新实例
@Service({ scope: 'transient' })
class TemporaryService {}

const container1 = Container.of('container-1');
const container2 = Container.of('container-2');

const config1 = container1.get(ConfigService);
const config2 = container2.get(ConfigService);
console.log(config1 === config2); // true (singleton 全局共享)

const request1 = container1.get(RequestService);
const request2 = container2.get(RequestService);
console.log(request1 === request2); // false (每个容器独立实例)

const temp1 = container1.get(TemporaryService);
const temp2 = container1.get(TemporaryService);
console.log(temp1 === temp2); // false (transient 每次创建新实例)
```

### 禁用继承

```ts
import { Container, Service } from 'typedi';

@Service()
class ParentService {}

// 在父容器注册服务
Container.set({ id: ParentService, value: new ParentService() });

// 创建禁用继承的子容器
const isolatedContainer = Container.of('isolated', { inherit: false });

console.log(Container.has(ParentService)); // true
console.log(isolatedContainer.has(ParentService)); // false (不继承父容器)
```

## 静态注册表方法

`ContainerRegistry` 类管理所有容器实例(仅用于内部,API 可能变更):

### `ContainerRegistry.create(id, options?, parentId?): ContainerInstance`

创建新容器实例。

### `ContainerRegistry.hasContainer(id): boolean`

检查容器是否存在。

### `ContainerRegistry.getContainer(id): ContainerInstance`

获取指定 ID 的容器。

### `ContainerRegistry.removeContainer(container): Promise<void>`

移除并销毁容器。

## 最佳实践

1. **使用 Token 替代字符串**: Token 提供类型安全
2. **合理选择作用域**:
   - 无状态服务使用 `singleton`
   - 请求相关服务使用 `container`
   - 需要隔离状态的服务使用 `transient`
3. **及时清理容器**: 使用 `dispose()` 清理不再需要的作用域容器
4. **利用容器继承**: 在请求容器中可以访问全局服务
5. **实现 dispose 方法**: 为需要清理资源的服务实现 `dispose()` 方法
