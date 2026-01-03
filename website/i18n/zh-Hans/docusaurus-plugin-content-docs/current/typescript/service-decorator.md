---
id: service-decorator
title: '@Service 装饰器'
sidebar_label: '@Service 装饰器'
---

# `@Service` 装饰器

`@Service` 装饰器用于将类标记为可注入的服务。被标记的类会自动注册到 TypeDI 容器中,并可以通过 `Container.get()` 获取实例。

## 基础用法

最简单的用法是不带任何参数的 `@Service()` 装饰器:

```ts
import { Container, Service } from 'typedi';

@Service()
class UserService {
  getUsers() {
    return ['Alice', 'Bob', 'Charlie'];
  }
}

const userService = Container.get(UserService);
console.log(userService.getUsers()); // ['Alice', 'Bob', 'Charlie']
```

## ServiceOptions 配置

`@Service` 装饰器接受一个可选的配置对象,用于自定义服务的行为:

```ts
interface ServiceOptions<T> {
  id?: ServiceIdentifier<T>;
  type?: Constructable<T>;
  factory?: FactoryFunction<T> | [Constructable<any>, string];
  value?: T;
  multiple?: boolean;
  scope?: 'singleton' | 'container' | 'transient';
}
```

### `id` - 服务标识符

指定服务的唯一标识符。如果不提供,默认使用类本身作为标识符。

```ts
import { Container, Service, Token } from 'typedi';

// 使用字符串 ID
@Service({ id: 'user.service' })
class UserService {}

const userService = Container.get('user.service');

// 使用 Token
const UserServiceToken = new Token<UserService>('UserService');

@Service({ id: UserServiceToken })
class UserService {}

const userService = Container.get(UserServiceToken);
```

**使用场景:**

- 接口驱动开发:为没有具体类的接口提供实现
- 多实现切换:同一个接口的不同实现
- 配置值注入:使用字符串或 Token 标识配置项

### `scope` - 服务作用域

控制服务实例的生命周期和缓存行为。可选值:

#### `'singleton'` - 全局单例(存储在根容器)

服务在整个应用中只有一个实例,存储在根容器中,所有容器共享。

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class ConfigService {
  constructor() {
    console.log('ConfigService created');
  }

  getConfig() {
    return { apiUrl: 'https://api.example.com' };
  }
}

const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const config1 = container1.get(ConfigService); // 输出: ConfigService created
const config2 = container2.get(ConfigService); // 不输出(使用已有实例)

console.log(config1 === config2); // true
```

**适用场景:**

- 应用配置
- 数据库连接池
- 缓存管理器
- 无状态工具类

#### `'container'` - 容器作用域(默认)

每个容器维护独立的服务实例。这是默认行为。

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'container' }) // 或 @Service() (默认就是 container)
class RequestContext {
  constructor(public requestId: string = Math.random().toString()) {
    console.log(`RequestContext created: ${this.requestId}`);
  }
}

const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const ctx1a = container1.get(RequestContext); // 输出: RequestContext created: 0.123...
const ctx1b = container1.get(RequestContext); // 不输出(使用已有实例)
const ctx2 = container2.get(RequestContext); // 输出: RequestContext created: 0.456...

console.log(ctx1a === ctx1b); // true (同一容器内共享)
console.log(ctx1a === ctx2); // false (不同容器独立)
```

**适用场景:**

- HTTP 请求上下文
- 事务管理器
- 用户会话
- 需要容器级隔离的有状态服务

#### `'transient'` - 临时作用域

每次调用 `Container.get()` 都会创建新实例,不缓存。

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class UniqueIdGenerator {
  public id: string;

  constructor() {
    this.id = Math.random().toString(36);
    console.log(`UniqueIdGenerator created: ${this.id}`);
  }
}

const gen1 = Container.get(UniqueIdGenerator); // 输出: UniqueIdGenerator created: abc123
const gen2 = Container.get(UniqueIdGenerator); // 输出: UniqueIdGenerator created: def456

console.log(gen1 === gen2); // false
console.log(gen1.id !== gen2.id); // true
```

**适用场景:**

- 需要隔离状态的服务
- 原型模式
- 命令对象
- 一次性任务处理器

### `multiple` - 多实例注册

允许多个服务注册到同一个标识符下,使用 `Container.getMany()` 获取所有实例。

```ts
import { Container, Service, Token } from 'typedi';

interface Plugin {
  name: string;
  execute(): void;
}

const PluginToken = new Token<Plugin>('plugin');

@Service({ id: PluginToken, multiple: true })
class LoggerPlugin implements Plugin {
  name = 'Logger';
  execute() {
    console.log('Logging...');
  }
}

@Service({ id: PluginToken, multiple: true })
class MetricsPlugin implements Plugin {
  name = 'Metrics';
  execute() {
    console.log('Recording metrics...');
  }
}

@Service({ id: PluginToken, multiple: true })
class CachePlugin implements Plugin {
  name = 'Cache';
  execute() {
    console.log('Caching...');
  }
}

const plugins = Container.getMany(PluginToken);
console.log(plugins.length); // 3

plugins.forEach((plugin) => {
  console.log(`Executing ${plugin.name}`);
  plugin.execute();
});
// 输出:
// Executing Logger
// Logging...
// Executing Metrics
// Recording metrics...
// Executing Cache
// Caching...
```

**注意事项:**

- 必须使用 `Container.getMany()` 获取多实例服务
- `multiple: true` 可以与 `scope` 结合使用
- 每个实例都有独立的生命周期

### `factory` - 工厂函数

使用自定义函数或工厂类方法创建服务实例,而不是直接实例化类。

#### 函数工厂

```ts
import { Container, Service } from 'typedi';

@Service({
  factory: (container, serviceId) => {
    console.log('Factory called for:', serviceId);
    return new DatabaseConnection('mongodb://localhost:27017');
  },
})
class DatabaseConnection {
  constructor(public connectionString: string) {}
}

const db = Container.get(DatabaseConnection);
// 输出: Factory called for: [class DatabaseConnection]
console.log(db.connectionString); // mongodb://localhost:27017
```

**工厂函数签名:**

```ts
type FactoryFunction<T> = (container: ContainerInstance, serviceId: ServiceIdentifier<T>) => T;
```

#### 工厂类

使用另一个类的方法作为工厂:

```ts
import { Container, Service } from 'typedi';

@Service()
class CarFactory {
  private counter = 0;

  createCar() {
    this.counter++;
    return new Car(`Car-${this.counter}`);
  }
}

@Service({ factory: [CarFactory, 'createCar'] })
class Car {
  constructor(public name: string) {}
}

const car1 = Container.get(Car); // name: 'Car-1'
const car2 = Container.get(Car); // name: 'Car-1' (缓存的实例,scope 默认是 container)

// 如果想每次都创建新实例,结合 transient:
@Service({
  factory: [CarFactory, 'createCar'],
  scope: 'transient',
})
class TransientCar {
  constructor(public name: string) {}
}
```

**使用场景:**

- 复杂的初始化逻辑
- 需要依赖其他服务来构建
- 动态配置
- 条件性实例创建

### `type` - 类型覆盖

指定用于实例化的类(通常在运行时替换实现时使用)。

```ts
import { Container, Service } from 'typedi';

class ProductionDatabase {
  query() {
    return 'real data';
  }
}

class MockDatabase {
  query() {
    return 'mock data';
  }
}

// 生产环境
@Service({ type: ProductionDatabase })
class Database {}

// 测试环境可以这样覆盖:
if (process.env.NODE_ENV === 'test') {
  Container.set({ id: Database, type: MockDatabase });
}

const db = Container.get(Database);
console.log(db.query()); // 根据环境返回不同结果
```

### `value` - 预设值

直接提供服务实例,而不是让容器创建。

```ts
import { Container, Service } from 'typedi';

const configInstance = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
};

@Service({ value: configInstance })
class AppConfig {}

const config = Container.get(AppConfig);
console.log(config === configInstance); // true
```

**注意:** 使用 `value` 时,`factory` 和 `type` 会被忽略。

## 装饰器行为详解

当类被 `@Service()` 装饰时,TypeDI 会:

1. **创建服务元数据**:包含 id、type、scope、factory 等信息
2. **注册到默认容器**:将元数据存储到 `ContainerRegistry.defaultContainer`
3. **启用依赖注入**:
   - 构造函数参数自动注入
   - 支持 `@Inject()` 属性注入
   - 支持继承的属性注入

## 完整示例

```ts
import { Container, Service, Inject, Token } from 'typedi';

// 1. 简单服务
@Service()
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

// 2. Singleton 配置服务
@Service({ scope: 'singleton' })
class AppConfig {
  readonly apiUrl = 'https://api.example.com';
  readonly debug = true;
}

// 3. 使用 Token 的接口服务
interface ICache {
  get(key: string): any;
  set(key: string, value: any): void;
}

const CacheToken = new Token<ICache>('cache');

@Service({ id: CacheToken })
class RedisCache implements ICache {
  private store = new Map();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: any) {
    this.store.set(key, value);
  }
}

// 4. 使用工厂的复杂服务
@Service({
  factory: (container) => {
    const config = container.get(AppConfig);
    return new DatabaseConnection(config.apiUrl);
  },
})
class DatabaseConnection {
  constructor(private url: string) {}

  connect() {
    console.log(`Connecting to ${this.url}`);
  }
}

// 5. Transient 服务
@Service({ scope: 'transient' })
class RequestHandler {
  private id = Math.random();

  handle() {
    console.log(`Handling with ID: ${this.id}`);
  }
}

// 6. 使用所有服务
@Service()
class Application {
  constructor(
    private logger: Logger,
    private config: AppConfig,
    @Inject(CacheToken) private cache: ICache,
    private db: DatabaseConnection,
  ) {}

  start() {
    this.logger.log('App starting...');
    console.log('Debug mode:', this.config.debug);
    this.cache.set('started', true);
    this.db.connect();
  }
}

const app = Container.get(Application);
app.start();
```

## 与 Container.set() 的区别

`@Service()` 装饰器在类定义时注册服务,而 `Container.set()` 在运行时注册:

```ts
// 使用装饰器(在模块加载时注册)
@Service()
class UserService {}

// 使用 Container.set()(在代码执行时注册)
Container.set({
  id: 'config',
  value: { debug: true },
});
```

**何时使用 `Container.set()`:**

- 注册原始值(字符串、数字、对象等)
- 运行时动态注册
- 测试时替换实现
- 注册第三方库实例

**何时使用 `@Service()`:**

- 注册自己编写的类
- 需要自动依赖注入
- 声明式配置
- 大多数常规服务

## 最佳实践

1. **优先使用默认配置**: 大多数情况下 `@Service()` 就足够了
2. **合理选择作用域**:
   - 无状态服务 → `singleton`
   - 请求相关 → `container`(默认)
   - 需要隔离 → `transient`
3. **使用 Token 而非字符串**: 获得类型安全
4. **工厂函数用于复杂初始化**: 简单服务直接用构造函数
5. **文档化自定义 ID**: 如果不使用类本身作为 ID,添加注释说明
6. **避免循环依赖**: 使用 `@Inject(type => ...)` 或重构代码

## TypeScript 配置

确保 `tsconfig.json` 中启用了装饰器支持:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

这两个选项是 TypeDI 正常工作的必要条件。
