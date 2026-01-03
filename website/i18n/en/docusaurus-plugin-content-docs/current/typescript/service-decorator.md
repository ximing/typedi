# @Service Decorator

The `@Service` decorator is used to mark a class as a service that can be injected by TypeDI.

## Basic Usage

```typescript
import { Service, Container } from '@rabjs/typedi';

@Service()
class UserService {
  getUsers() {
    return ['John', 'Jane'];
  }
}

const userService = Container.get(UserService);
console.log(userService.getUsers()); // ['John', 'Jane']
```

## Service Options

### Service ID

You can specify a custom ID for your service:

```typescript
@Service({ id: 'user.service' })
class UserService {}

const userService = Container.get('user.service');
```

### Service Scope

Control the lifecycle of your service instances:

```typescript
// Singleton - one instance for the entire application
@Service({ scope: 'singleton' })
class ConfigService {}

// Container - one instance per container (default)
@Service({ scope: 'container' })
class UserService {}

// Transient - new instance every time
@Service({ scope: 'transient' })
class RequestHandler {}
```

### Factory Function

Use a factory function to create complex service instances:

```typescript
@Service({
  factory: () => {
    return new DatabaseConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
    });
  },
})
class DatabaseConnection {}
```

## Multiple Services

You can register multiple implementations for the same interface:

```typescript
interface Logger {
  log(message: string): void;
}

@Service({ id: 'console.logger' })
class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(message);
  }
}

@Service({ id: 'file.logger' })
class FileLogger implements Logger {
  log(message: string) {
    // Write to file
  }
}

// Use specific implementation
const consoleLogger = Container.get<Logger>('console.logger');
const fileLogger = Container.get<Logger>('file.logger');
```
