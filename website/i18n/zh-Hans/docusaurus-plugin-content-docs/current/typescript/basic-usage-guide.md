---
id: basic-usage-guide
title: 基本用法指南
sidebar_label: 基本用法
---

# 基本用法指南

> **重要提示:**
> 不要忘记**使用 `@Service` 装饰器注解你的类**！被注入的类和请求依赖的类都应该被注解。

## 注册依赖

有三种方式来注册你的依赖：

- 使用 `@Service()` 装饰器注解类（[文档](./service-decorator.md)）
- 使用 `Token` 注册值
- 使用字符串标识符注册值

`Token` 和字符串标识符可以用来注册除类以外的其他值。Token 和字符串标识符都可以注册任何类型的值，包括原始值（除了 `undefined`）。它们必须在容器中使用 `Container.set()` 函数设置，然后才能通过 `Container.get()` 请求。

```ts
import 'reflect-metadata';
import { Container, Inject, Service, Token } from 'typedi';

const myToken = new Token('SECRET_VALUE_KEY');

Container.set(myToken, 'my-secret-value');
Container.set('my-config-key', 'value-for-config-key');
Container.set('default-pagination', 30);

// 在应用程序的其他地方
const tokenValue = Container.get(myToken);
const configValue = Container.get('my-config-key');
const defaultPagination = Container.get('default-pagination');
```

_有关 `@Service` 装饰器的详细文档，请阅读 [@Service 装饰器](./service-decorator.md) 页面。_

## 注入依赖

有三种方式来注入你的依赖：

- 自动类构造函数参数注入
- 使用 `@Inject()` 装饰器注解类属性
- 直接使用 `Container.get()` 来请求类、`Token` 或字符串标识符的实例

### 构造函数参数注入

任何使用 `@Service()` 装饰器标记的类都会自动将正确的依赖注入到其构造函数属性中。

**TypeDI 会将用于解析依赖的容器实例**作为**构造函数的最后一个参数**插入。

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
// 输出 true，因为 TypeDI 将 InjectedClass 的实例分配给了属性
```

### 属性注入

任何使用 `@Inject` 装饰器标记的属性都会在父类被 TypeDI 初始化时自动分配类的实例。

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
// 输出 true，因为 InjectedClass 的实例已经被 TypeDI 分配给了 `injectedClass` 属性
```

_有关 `@Inject` 装饰器的详细文档，请阅读 [@Inject 装饰器](./inject-decorator.md) 页面。_

### 使用 `Container.get()`

`Container.get()` 函数可以直接用来请求目标类型的实例。TypeDI 会解析并初始化目标类的所有依赖。`Container.get()` 可以用来请求：

- 可构造的值（类定义），将返回类实例
- `Token`，将返回为该 `Token` 注册的值
- 字符串，将返回使用该名称注册的值

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

/** Token 必须在容器中显式设置所需的值。 */
Container.set(myToken, 'my-secret-value');
/** 字符串标识符必须在容器中显式设置所需的值。 */
Container.set('my-dependency-name-A', InjectedClass);
Container.set('my-dependency-name-B', 'primitive-value');

const injectedClassInstance = Container.get(InjectedClass);
// 可以请求没有依赖的类
const exampleClassInstance = Container.get(ExampleClass);
// 可以请求有依赖的类，依赖会被解析
const tokenValue = Container.get(myToken);
// tokenValue 将是 'my-secret-value'
const stringIdentifierValueA = Container.get('my-dependency-name-A');
// stringIdentifierValueA 将是 InjectedClass 的实例
const stringIdentifierValueB = Container.get('my-dependency-name-B');
// stringIdentifierValueB 将是 'primitive-value'
```

_有关 `Token` 类的详细文档，请阅读[服务令牌](./service-tokens.md)页面。_

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
