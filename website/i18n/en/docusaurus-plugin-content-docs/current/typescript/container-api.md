# Container API

The Container is the heart of TypeDI. It manages all service registrations and provides methods to retrieve instances.

## Basic Methods

### `Container.get()`

Retrieves an instance of a service by its class, token, or string identifier.

```typescript
import { Container, Service } from '@rabjs/typedi';

@Service()
class UserService {}

const userService = Container.get(UserService);
```

### `Container.set()`

Registers a value in the container.

```typescript
import { Container, Token } from '@rabjs/typedi';

const configToken = new Token('config');
Container.set(configToken, { apiUrl: 'https://api.example.com' });

// Or with string identifier
Container.set('database.url', 'mongodb://localhost:27017');
```

### `Container.remove()`

Removes a service from the container.

```typescript
Container.remove(UserService);
Container.remove('database.url');
```

### `Container.reset()`

Clears all services from the container.

```typescript
Container.reset();
```

## Container Instances

### `Container.of()`

Creates or retrieves a named container instance.

```typescript
const requestContainer = Container.of('request-123');
const userService = requestContainer.get(UserService);
```

### `Container.has()`

Checks if a service is registered in the container.

```typescript
if (Container.has(UserService)) {
  // Service is registered
}
```

## Advanced Usage

### Multiple Containers

You can use multiple container instances for different scopes:

```typescript
import { Container, Service } from '@rabjs/typedi';

@Service()
class DatabaseService {}

// Default container
const dbService1 = Container.get(DatabaseService);

// Request-specific container
const requestContainer = Container.of('request-1');
const dbService2 = requestContainer.get(DatabaseService);

// Different instances for different containers
console.log(dbService1 !== dbService2); // true
```
