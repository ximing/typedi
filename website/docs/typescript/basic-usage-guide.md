# Basic Usage

> **IMPORTANT NOTE:**  
> Don't forget to **annotate your classes with the `@Service` decorator**! Both the ones being injected and those which
> requests the dependencies should be annotated.

## Registering dependencies

There are three ways to register your dependencies:

- annotating a class with the `@Service()` decorator ([documentation](./service-decorator.md))
- registering a value with a `Token`
- registering a value with a string identifier

The `Token` and string identifier can be used to register other values than classes. Both tokens and string identifiers
can register any type of value including primitive values except `undefined`. They must be set on the container with the
`Container.set()` function before they can be requested via `Container.get()`.

```ts
import 'reflect-metadata';
import { Container, Inject, Service, Token } from 'typedi';

const myToken = new Token('SECRET_VALUE_KEY');

Container.set(myToken, 'my-secret-value');
Container.set('my-config-key', 'value-for-config-key');
Container.set('default-pagination', 30);

// somewhere else in your application
const tokenValue = Container.get(myToken);
const configValue = Container.get('my-config-key');
const defaultPagination = Container.get('default-pagination');
```

_For detailed documentation about `@Service` decorator please read the [@Service decorator](./service-decorator.md) page._

## Injecting dependencies

There are three ways to inject your dependencies:

- automatic class constructor parameter injection
- annotating class properties with the `@Inject()` decorator
- directly using `Container.get()` to request an instance of a class, `Token` or string identifier

### Constructor argument injection

Any class which has been marked with the `@Service()` decorator will have its constructor properties automatically
injected with the correct dependency.

**TypeDI inserts the container instance** which was used to resolve the dependencies **as the last parameter in the constructor**.

```ts
import 'reflect-metadata';
import { Container, Inject, Service } from 'typedi';

@Service()
class InjectedClass {}

@Service()
class ExampleClass {
  constructor(public injectedClass: InjectedClass) {}
}

const instance = Container.get(ExampleClass);

console.log(instance.injectedClass instanceof InjectedClass);
// prints true as TypeDI assigned the instance of InjectedClass to the property
```

### Property injection

Any property which has been marked with the `@Inject` decorator will be automatically assigned the instance of the class
when the parent class is initialized by TypeDI.

```ts
import 'reflect-metadata';
import { Container, Inject, Service } from 'typedi';

@Service()
class InjectedClass {}

@Service()
class ExampleClass {
  @Inject()
  injectedClass: InjectedClass;
}

const instance = Container.get(ExampleClass);

console.log(instance.injectedClass instanceof InjectedClass);
// prints true as the instance of InjectedClass has been assigned to the `injectedClass` property by TypeDI
```

_For detailed documentation about `@Inject` decorator please read the [@Inject decorator](./inject-decorator.md) page._

### Using `Container.get()`

The `Container.get()` function can be used directly to request an instance of the target type. TypeDI will resolve and
initialize all dependency on the target class. `Container.get()` can be used to request:

- a constructable value (class definition) which will return the class instance
- a `Token` which will return the value registered for that `Token`
- a string which will return the value registered with that name

```ts
import 'reflect-metadata';
import { Container, Inject, Service, Token } from 'typedi';

const myToken = new Token('SECRET_VALUE_KEY');

@Service()
class InjectedClass {}

@Service()
class ExampleClass {
  @Inject()
  injectedClass: InjectedClass;
}

/** Tokens must be explicity set in the Container with the desired value. */
Container.set(myToken, 'my-secret-value');
/** String identifier must be explicity set in the Container with the desired value. */
Container.set('my-dependency-name-A', InjectedClass);
Container.set('my-dependency-name-B', 'primitive-value');

const injectedClassInstance = Container.get(InjectedClass);
// a class without dependencies can be required
const exampleClassInstance = Container.get(ExampleClass);
// a class with dependencies can be required and dependencies will be resolved
const tokenValue = Container.get(myToken);
// tokenValue will be 'my-secret-value'
const stringIdentifierValueA = Container.get('my-dependency-name-A');
// stringIdentifierValueA will be instance of InjectedClass
const stringIdentifierValueB = Container.get('my-dependency-name-B');
// stringIdentifierValueB will be 'primitive-value'
```

_For detailed documentation about `Token` class please read the [Service Tokens](./service-tokens.md) page._

## 服务作用域:Singleton、Container 和 Transient

TypeDI 支持三种服务作用域,用于控制服务实例的生命周期和缓存行为:

### Container 作用域(默认)

默认情况下,每个服务都是容器作用域的。这意味着每个容器会维护独立的服务实例:

```ts
import 'reflect-metadata';
import { Container, Service } from 'typedi';

@Service() // 等同于 @Service({ scope: 'container' })
class UserService {
  constructor() {
    console.log('UserService created');
  }
}

// 在默认容器中获取
const service1 = Container.get(UserService); // 输出: UserService created
const service2 = Container.get(UserService); // 不输出(使用缓存的实例)
console.log(service1 === service2); // true (同一容器内共享)

// 在不同的容器中获取
const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const service3 = container1.get(UserService); // 输出: UserService created
const service4 = container2.get(UserService); // 输出: UserService created
console.log(service3 === service4); // false (不同容器独立实例)
```

**适用场景:**

- HTTP 请求上下文
- 用户会话管理
- 事务处理
- 需要容器级隔离的有状态服务

### Singleton 作用域

Singleton 服务在整个应用中只有一个实例,存储在根容器中,所有容器共享:

```ts
import 'reflect-metadata';
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

const config1 = Container.get(ConfigService); // 输出: ConfigService created
const config2 = Container.get(ConfigService); // 不输出

const container1 = Container.of('test-1');
const container2 = Container.of('test-2');

const config3 = container1.get(ConfigService); // 不输出
const config4 = container2.get(ConfigService); // 不输出

console.log(config1 === config2 && config2 === config3 && config3 === config4);
// prints true (所有容器共享同一实例)
```

**适用场景:**

- 应用配置
- 数据库连接池
- 日志记录器
- 缓存管理器
- 无状态工具类

### Transient 作用域

Transient 服务每次调用 `Container.get()` 都会创建新实例,不缓存:

```ts
import 'reflect-metadata';
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class CommandHandler {
  constructor() {
    console.log('CommandHandler created');
  }
}

const handler1 = Container.get(CommandHandler); // 输出: CommandHandler created
const handler2 = Container.get(CommandHandler); // 输出: CommandHandler created

console.log(handler1 !== handler2);
// prints true (每次都是新实例)
```

**适用场景:**

- 命令对象模式
- 原型模式
- 需要完全隔离状态的服务
- 一次性任务处理器

### 作用域对比

| 特性       | Singleton | Container    | Transient    |
| ---------- | --------- | ------------ | ------------ |
| 实例数量   | 全局唯一  | 每个容器一个 | 每次创建新的 |
| 缓存位置   | 根容器    | 当前容器     | 不缓存       |
| 跨容器共享 | 是        | 否           | 否           |
| 性能       | 最快      | 中等         | 较慢         |
| 状态隔离   | 全局共享  | 容器级隔离   | 完全隔离     |

### 选择合适的作用域

```ts
import 'reflect-metadata';
import { Container, Service, Inject } from 'typedi';

// Singleton: 应用配置
@Service({ scope: 'singleton' })
class AppConfig {
  readonly apiUrl = 'https://api.example.com';
  readonly timeout = 5000;
}

// Container: 请求上下文
@Service({ scope: 'container' })
class RequestContext {
  constructor(public requestId: string = Math.random().toString()) {}
}

// Transient: 一次性命令
@Service({ scope: 'transient' })
class SendEmailCommand {
  execute(to: string, subject: string) {
    console.log(`Sending email to ${to}: ${subject}`);
  }
}

// 组合使用
@Service()
class UserController {
  constructor(
    private config: AppConfig, // 全局共享的配置
    private context: RequestContext, // 请求级的上下文
    private emailCmd: SendEmailCommand, // 每次都是新的命令实例
  ) {}

  sendWelcomeEmail() {
    console.log(`Request ID: ${this.context.requestId}`);
    console.log(`API URL: ${this.config.apiUrl}`);
    this.emailCmd.execute('user@example.com', 'Welcome!');
  }
}

const controller = Container.get(UserController);
controller.sendWelcomeEmail();
```
