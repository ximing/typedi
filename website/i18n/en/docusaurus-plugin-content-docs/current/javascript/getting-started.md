# Getting Started with JavaScript

TypeDI can also be used with plain JavaScript, although TypeScript provides better type safety and developer experience.

## Installation

```bash
npm install @rabjs/typedi reflect-metadata
```

## Basic Example

```javascript
require('reflect-metadata');
const { Container, Service } = require('@rabjs/typedi');

// Define a service
class UserService {
  getUsers() {
    return ['John', 'Jane'];
  }
}

// Register the service
Container.set(UserService, new UserService());

// Or use the Service decorator (requires Babel for decorators)
// @Service()
// class UserService { ... }

// Get the service
const userService = Container.get(UserService);
console.log(userService.getUsers()); // ['John', 'Jane']
```

## Limitations

When using TypeDI with JavaScript:

- Type information is not available at runtime
- You need to manually register services or use Babel for decorators
- No automatic constructor parameter injection
- Manual dependency management required

## Next Steps

For better experience, consider:

- [Basic Usage](./basic-usage) - Learn more about JavaScript usage
- [TypeScript Guide](../typescript/getting-started) - Migrate to TypeScript for better DX

[basic-usage-page]: ./basic-usage
