# TypeDI

![Build Status](https://github.com/ximing/typedi/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/ximing/typedi/branch/develop/graph/badge.svg)](https://codecov.io/gh/ximing/typedi)
[![npm version](https://badge.fury.io/js/%40rabjs%2Ftypedi.svg)](https://badge.fury.io/js/%40rabjs%2Ftypedi)

中文文档 | [English](./README.md)

TypeDI 是一个为 TypeScript 和 JavaScript 设计的[依赖注入](https://en.wikipedia.org/wiki/Dependency_injection)工具。它能帮助你在 Node 或浏览器环境中构建结构清晰、易于测试的应用程序。

## 主要特性

- 🎯 **属性注入和构造函数注入** - 灵活的依赖注入方式
- 🔄 **多种服务作用域** - 支持 singleton、container 和 transient 三种生命周期
- 📦 **多容器支持** - 支持容器继承和隔离，适用于多租户、请求隔离等场景
- 🔍 **Token 支持** - 使用 Token 进行类型安全的接口注入
- 🌲 **容器继承** - 支持多层级容器继承，灵活的服务查询机制
- 🎭 **多实例服务** - 同一标识符下注册多个服务实现

## 安装

使用 npm 安装所需的包：

```bash
npm install @rabjs/typedi reflect-metadata
```

在你的应用程序**第一行**导入 `reflect-metadata`：

```ts
import 'reflect-metadata';

// 在导入 reflect-metadata 之后
// 再进行其他导入和初始化代码
```

在 `tsconfig.json` 的 `compilerOptions` 中启用装饰器元数据：

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

现在你已准备好使用 TypeDI！

## 基础用法

### 简单的服务注入

```ts
import { Container, Service } from '@rabjs/typedi';

@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

@Service()
class ExampleService {
  constructor(
    // TypeDI 会自动注入 ExampleInjectedService 的实例
    public injectedService: ExampleInjectedService,
  ) {}
}

const serviceInstance = Container.get(ExampleService);
serviceInstance.injectedService.printMessage();
// 输出: "I am alive!"
```

### 属性注入

```ts
import { Container, Service, Inject } from '@rabjs/typedi';

@Service()
class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}

@Service()
class UserService {
  @Inject()
  database!: DatabaseService;

  getUsers() {
    this.database.connect();
    // 获取用户逻辑...
  }
}

const userService = Container.get(UserService);
userService.getUsers();
```

### 使用 Token 进行接口注入

```ts
import { Container, Service, Inject, Token } from '@rabjs/typedi';

interface Logger {
  log(message: string): void;
}

const LoggerToken = new Token<Logger>('logger');

@Service()
class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(message);
  }
}

// 注册服务
Container.set({ id: LoggerToken, type: ConsoleLogger });

@Service()
class UserService {
  constructor(@Inject(() => LoggerToken) private logger: Logger) {}

  createUser() {
    this.logger.log('User created');
  }
}
```

### 服务作用域

TypeDI 支持三种服务作用域：

```ts
import { Container, Service } from '@rabjs/typedi';

// Singleton - 全局单例，所有容器共享同一实例
@Service({ scope: 'singleton' })
class ConfigService {
  appName = 'MyApp';
}

// Container - 容器作用域（默认），每个容器一个实例
@Service({ scope: 'container' })
class RequestContext {
  requestId = Math.random();
}

// Transient - 瞬态，每次获取都创建新实例
@Service({ scope: 'transient' })
class TempData {
  timestamp = Date.now();
}

const config1 = Container.get(ConfigService);
const config2 = Container.get(ConfigService);
console.log(config1 === config2); // true - singleton

const context1 = Container.get(RequestContext);
const context2 = Container.get(RequestContext);
console.log(context1 === context2); // true - 同一容器内复用

const temp1 = Container.get(TempData);
const temp2 = Container.get(TempData);
console.log(temp1 === temp2); // false - 每次都是新实例
```

### 多容器和容器继承

```ts
import { Container, Service } from '@rabjs/typedi';

@Service({ scope: 'singleton' })
class LoggerService {
  log(msg: string) {
    console.log(msg);
  }
}

@Service({ scope: 'container' })
class DatabaseService {
  connect() {
    console.log('Connected');
  }
}

// 为每个 HTTP 请求创建独立容器（自动继承默认容器）
const request1Container = Container.of('request-1');
const request2Container = Container.of('request-2');

// 每个请求容器有独立的 Database 实例
const db1 = request1Container.get(DatabaseService);
const db2 = request2Container.get(DatabaseService);
console.log(db1 === db2); // false - 不同容器的不同实例

// 但共享同一个 Logger 实例（singleton）
const logger1 = request1Container.get(LoggerService);
const logger2 = request2Container.get(LoggerService);
console.log(logger1 === logger2); // true - 所有容器共享

// 清理请求容器
await request1Container.dispose();
await request2Container.dispose();
```

### 多实例服务

```ts
import { Container, Service, Token, InjectMany } from '@rabjs/typedi';

interface Plugin {
  execute(): void;
}

const PluginToken = new Token<Plugin>('plugin');

@Service({ id: PluginToken, multiple: true })
class PluginA implements Plugin {
  execute() {
    console.log('Plugin A');
  }
}

@Service({ id: PluginToken, multiple: true })
class PluginB implements Plugin {
  execute() {
    console.log('Plugin B');
  }
}

// 获取所有插件
const plugins = Container.getMany<Plugin>(PluginToken);
plugins.forEach((plugin) => plugin.execute());

// 或使用 InjectMany 装饰器
@Service()
class PluginManager {
  @InjectMany(() => PluginToken)
  plugins!: Plugin[];

  executeAll() {
    this.plugins.forEach((plugin) => plugin.execute());
  }
}
```

### 工厂函数

```ts
import { Container, Service, Token, ContainerInstance } from '@rabjs/typedi';

const DatabaseToken = new Token<Database>('database');

// 使用工厂函数创建服务
Container.set({
  id: DatabaseToken,
  factory: (container) => {
    const config = container.get(ConfigService);
    return new Database(config.dbUrl);
  },
});

// 使用类方法作为工厂
@Service()
class DatabaseFactory {
  create(container: ContainerInstance) {
    return new Database('mongodb://localhost');
  }
}

Container.set({
  id: 'Database',
  factory: [DatabaseFactory, 'create'],
});
```

## 高级用法

### 容器继承选项

```ts
import { Container, ContainerInstance } from '@rabjs/typedi';

// 创建完全隔离的容器（不继承父容器的服务）
const isolatedContainer = new ContainerInstance('isolated', { inherit: false });

// 创建继承父容器的容器（默认行为）
const parentContainer = new ContainerInstance('parent');
const childContainer = new ContainerInstance('child', { inherit: true }, parentContainer);

// child 可以访问 parent 的服务
parentContainer.set({ id: 'SharedService', type: SharedService });
const service = childContainer.get('SharedService'); // ✅ 可以访问
```

### 服务重置和清理

```ts
import { Container, Service } from '@rabjs/typedi';

@Service()
class CacheService {
  data = new Map();

  // 实现 dispose 方法，容器清理时会自动调用
  dispose() {
    this.data.clear();
    console.log('Cache cleared');
  }
}

// 重置服务值（保留注册信息）
Container.reset({ strategy: 'resetValue' });

// 完全清除服务（包括注册信息）
Container.reset({ strategy: 'resetServices' });

// 清理容器
await Container.dispose();
```

### 手动注册服务

```ts
import { Container, Token } from '@rabjs/typedi';

// 注册类
Container.set({ id: 'MyService', type: MyService });

// 注册值
Container.set({ id: 'API_KEY', value: 'secret-key-123' });

// 使用 Token
const ConfigToken = new Token<Config>('config');
Container.set({
  id: ConfigToken,
  value: { apiUrl: 'https://api.example.com' },
});

// 自定义作用域
Container.set({
  id: 'Logger',
  type: ConsoleLogger,
  scope: 'singleton',
});
```

## API 文档

### Container (ContainerInstance)

- `get<T>(identifier: ServiceIdentifier<T>): T` - 获取服务实例
- `getMany<T>(identifier: ServiceIdentifier<T>): T[]` - 获取多个服务实例
- `set<T>(options: ServiceOptions<T>): this` - 注册服务
- `has<T>(identifier: ServiceIdentifier<T>): boolean` - 检查服务是否存在
- `remove(identifier: ServiceIdentifier | ServiceIdentifier[]): this` - 移除服务
- `of(id: ContainerIdentifier, options?, parentId?): ContainerInstance` - 创建或获取子容器
- `reset(options?: { strategy: 'resetValue' | 'resetServices' }): this` - 重置容器
- `dispose(): Promise<void>` - 清理容器

### 装饰器

- `@Service(options?: ServiceOptions)` - 标记类为可注入的服务
- `@Inject(typeOrToken?)` - 注入依赖到属性或构造函数参数
- `@InjectMany(typeOrToken?)` - 注入多个服务实例

### 类型

- `ServiceIdentifier<T>` - 服务标识符（类、字符串或 Token）
- `ContainerScope` - 服务作用域：'singleton' | 'container' | 'transient'
- `ServiceOptions<T>` - 服务配置选项
- `Token<T>` - 类型安全的服务标识符

## 文档

### 📖 在线文档

- 📘 [GitHub Pages 文档](https://ximing.github.io/typedi/) (推荐)
- 📂 [本地文档](./docs) - 查看 `./docs` 目录

### 🛠️ 本地运行文档

```bash
# 安装 GitBook CLI
npm install -g gitbook-cli

# 安装文档插件
npm run docs:install

# 启动文档服务器
npm run docs:serve

# 访问 http://localhost:4000
```

### 📝 文档开发

查看 [文档设置指南](./DOCS_SETUP.md) 了解如何:

- 编辑和新增文档
- 本地预览文档
- 自定义样式和插件
- 部署到 GitHub Pages

## 贡献

请阅读我们的[贡献指南](./CONTRIBUTING.md)开始贡献。

## License

MIT
