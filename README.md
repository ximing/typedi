# TypeDI

![Build Status](https://github.com/ximing/typedi/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/ximing/typedi/branch/develop/graph/badge.svg)](https://codecov.io/gh/ximing/typedi)
[![npm version](https://badge.fury.io/js/%40rabjs%2Ftypedi.svg)](https://badge.fury.io/js/%40rabjs%2Ftypedi)

[中文文档](./README.zh-CN.md) | English

TypeDI is a [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection) tool for TypeScript and JavaScript. It helps you build well-structured and easily testable applications in Node or browser environments.

## Features

- 🎯 **Property and Constructor Injection** - Flexible dependency injection approaches
- 🔄 **Multiple Service Scopes** - Support for singleton, container, and transient lifecycles
- 📦 **Multiple Containers** - Container inheritance and isolation for multi-tenant and request isolation scenarios
- 🔍 **Token Support** - Type-safe interface injection using Tokens
- 🌲 **Container Inheritance** - Multi-level container inheritance with flexible service resolution
- 🎭 **Multiple Service Instances** - Register multiple implementations under the same identifier

## Installation

Install the required packages via npm:

```bash
npm install @rabjs/typedi reflect-metadata
```

Import `reflect-metadata` at the **first line** of your application:

```ts
import 'reflect-metadata';

// Your other imports and initialization code
// comes here after you imported the reflect-metadata package
```

Enable decorator metadata in your `tsconfig.json` under `compilerOptions`:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

Now you're ready to use TypeDI!

## Basic Usage

### Simple Service Injection

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
    // TypeDI will automatically inject an instance of ExampleInjectedService
    public injectedService: ExampleInjectedService,
  ) {}
}

const serviceInstance = Container.get(ExampleService);
serviceInstance.injectedService.printMessage();
// Output: "I am alive!"
```

### Property Injection

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
    // User fetching logic...
  }
}

const userService = Container.get(UserService);
userService.getUsers();
```

### Interface Injection with Tokens

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

// Register the service
Container.set({ id: LoggerToken, type: ConsoleLogger });

@Service()
class UserService {
  constructor(@Inject(() => LoggerToken) private logger: Logger) {}

  createUser() {
    this.logger.log('User created');
  }
}
```

### Service Scopes

TypeDI supports three service scopes:

```ts
import { Container, Service } from '@rabjs/typedi';

// Singleton - Global singleton, shared across all containers
@Service({ scope: 'singleton' })
class ConfigService {
  appName = 'MyApp';
}

// Container - Container scoped (default), one instance per container
@Service({ scope: 'container' })
class RequestContext {
  requestId = Math.random();
}

// Transient - Create a new instance on each request
@Service({ scope: 'transient' })
class TempData {
  timestamp = Date.now();
}

const config1 = Container.get(ConfigService);
const config2 = Container.get(ConfigService);
console.log(config1 === config2); // true - singleton

const context1 = Container.get(RequestContext);
const context2 = Container.get(RequestContext);
console.log(context1 === context2); // true - reused within the same container

const temp1 = Container.get(TempData);
const temp2 = Container.get(TempData);
console.log(temp1 === temp2); // false - new instance each time
```

### Multiple Containers and Inheritance

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

// Create separate containers for each HTTP request (automatically inherits from default container)
const request1Container = Container.of('request-1');
const request2Container = Container.of('request-2');

// Each request container has its own Database instance
const db1 = request1Container.get(DatabaseService);
const db2 = request2Container.get(DatabaseService);
console.log(db1 === db2); // false - different instances for different containers

// But share the same Logger instance (singleton)
const logger1 = request1Container.get(LoggerService);
const logger2 = request2Container.get(LoggerService);
console.log(logger1 === logger2); // true - shared across all containers

// Cleanup request containers
await request1Container.dispose();
await request2Container.dispose();
```

### Multiple Service Instances

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

// Get all plugins
const plugins = Container.getMany<Plugin>(PluginToken);
plugins.forEach((plugin) => plugin.execute());

// Or use InjectMany decorator
@Service()
class PluginManager {
  @InjectMany(() => PluginToken)
  plugins!: Plugin[];

  executeAll() {
    this.plugins.forEach((plugin) => plugin.execute());
  }
}
```

### Factory Functions

```ts
import { Container, Service, Token, ContainerInstance } from '@rabjs/typedi';

const DatabaseToken = new Token<Database>('database');

// Use a factory function to create the service
Container.set({
  id: DatabaseToken,
  factory: (container) => {
    const config = container.get(ConfigService);
    return new Database(config.dbUrl);
  },
});

// Use a class method as factory
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

## Advanced Usage

### Container Inheritance Options

```ts
import { Container, ContainerInstance } from '@rabjs/typedi';

// Create a completely isolated container (does not inherit parent's services)
const isolatedContainer = new ContainerInstance('isolated', { inherit: false });

// Create a container that inherits from parent (default behavior)
const parentContainer = new ContainerInstance('parent');
const childContainer = new ContainerInstance('child', { inherit: true }, parentContainer);

// child can access parent's services
parentContainer.set({ id: 'SharedService', type: SharedService });
const service = childContainer.get('SharedService'); // ✅ accessible
```

### Service Reset and Cleanup

```ts
import { Container, Service } from '@rabjs/typedi';

@Service()
class CacheService {
  data = new Map();

  // Implement dispose method, will be called automatically on container cleanup
  dispose() {
    this.data.clear();
    console.log('Cache cleared');
  }
}

// Reset service values (keep registration info)
Container.reset({ strategy: 'resetValue' });

// Completely clear services (including registration info)
Container.reset({ strategy: 'resetServices' });

// Cleanup container
await Container.dispose();
```

### Manual Service Registration

```ts
import { Container, Token } from '@rabjs/typedi';

// Register a class
Container.set({ id: 'MyService', type: MyService });

// Register a value
Container.set({ id: 'API_KEY', value: 'secret-key-123' });

// Use Token
const ConfigToken = new Token<Config>('config');
Container.set({
  id: ConfigToken,
  value: { apiUrl: 'https://api.example.com' },
});

// Custom scope
Container.set({
  id: 'Logger',
  type: ConsoleLogger,
  scope: 'singleton',
});
```

## API Documentation

### Container (ContainerInstance)

- `get<T>(identifier: ServiceIdentifier<T>): T` - Get a service instance
- `getMany<T>(identifier: ServiceIdentifier<T>): T[]` - Get multiple service instances
- `set<T>(options: ServiceOptions<T>): this` - Register a service
- `has<T>(identifier: ServiceIdentifier<T>): boolean` - Check if a service exists
- `remove(identifier: ServiceIdentifier | ServiceIdentifier[]): this` - Remove service(s)
- `of(id: ContainerIdentifier, options?, parentId?): ContainerInstance` - Create or get a child container
- `reset(options?: { strategy: 'resetValue' | 'resetServices' }): this` - Reset container
- `dispose(): Promise<void>` - Cleanup container

### Decorators

- `@Service(options?: ServiceOptions)` - Mark a class as an injectable service
- `@Inject(typeOrToken?)` - Inject a dependency into a property or constructor parameter
- `@InjectMany(typeOrToken?)` - Inject multiple service instances

### Types

- `ServiceIdentifier<T>` - Service identifier (class, string, or Token)
- `ContainerScope` - Service scope: 'singleton' | 'container' | 'transient'
- `ServiceOptions<T>` - Service configuration options
- `Token<T>` - Type-safe service identifier

## Documentation

### 📖 Online Documentation

- 📘 [GitHub Pages Documentation](https://ximing.github.io/typedi/) (Recommended)
- 📂 [Local Documentation](./docs) - View the `./docs` directory

### 🛠️ Running Documentation Locally

```bash
# Install GitBook CLI
npm install -g gitbook-cli

# Install documentation plugins
npm run docs:install

# Start documentation server
npm run docs:serve

# Visit http://localhost:4000
```

### 📝 Documentation Development

See [Documentation Setup Guide](./DOCS_SETUP.md) to learn how to:

- Edit and add documentation
- Preview documentation locally
- Customize styles and plugins
- Deploy to GitHub Pages

## Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

## License

MIT
