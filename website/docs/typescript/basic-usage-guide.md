---
id: basic-usage-guide
title: Basic Usage
sidebar_label: Basic Usage
---

# Basic Usage

> **IMPORTANT NOTE:**
> Don't forget to **annotate your classes with the `@Service` decorator**! Both the classes being injected and those which request the dependencies should be annotated.

## Registering dependencies

There are three ways to register your dependencies:

- annotating a class with the `@Service()` decorator ([documentation](./service-decorator))
- registering a value with a `Token`
- registering a value with a string identifier

The `Token` and string identifier can be used to register other values than classes. Both tokens and string identifiers can be used to register primitive values, configuration objects, or anything else you might need.

```ts
import 'reflect-metadata';
import { Container, Service, Token } from '@rabjs/typedi';

// register a class
@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

// register a Token
const myToken = new Token('SECRET_VALUE_KEY');
Container.set(myToken, 'my-secret-value');

// register a string identifier
Container.set('my-config-key', 'my-config-value');
Container.set('default-pagination', { page: 1, perPage: 10 });

// get the registered values
const tokenValue = Container.get(myToken);
const configValue = Container.get('my-config-key');
const defaultPagination = Container.get('default-pagination');
```

_For detailed documentation about `@Service` decorator please read the [@Service decorator](./service-decorator) page._

## Injecting dependencies

There are three ways to inject your dependencies:

- automatic class constructor parameter injection
- annotating class properties with the `@Inject()` decorator
- directly using `Container.get()` to request an instance of a class, `Token` or string identifier

### Constructor argument injection

Any class which has been marked with the `@Service()` decorator will have its constructor properties automatically injected with the correct dependency.

**TypeDI inserts the container instance** which was used to resolve the dependencies **as the last parameter in the constructor**.

```ts
import 'reflect-metadata';
import { Container, Inject, Service } from '@rabjs/typedi';

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

Properties can be marked for injection using the `@Inject()` decorator.

```ts
import 'reflect-metadata';
import { Container, Inject, Service } from '@rabjs/typedi';

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

_For detailed documentation about `@Inject` decorator please read the [@Inject decorator](./inject-decorator) page._

### Using `Container.get()`

The `Container.get()` function can be used directly to request an instance of the target type. TypeDI will resolve and initialize all dependencies on the target class. `Container.get()` can be used to request:

- a constructable value (class definition) which will return the class instance
- a `Token` which will return the value registered for that `Token`
- a string which will return the value registered with that name

```ts
import 'reflect-metadata';
import { Container, Inject, Service, Token } from '@rabjs/typedi';

const myToken = new Token('SECRET_VALUE_KEY');

@Service()
class InjectedClass {}

@Service()
class ExampleClass {
  @Inject()
  injectedClass: InjectedClass;
}

/** Tokens must be explicitly set in the Container with the desired value. */
Container.set(myToken, 'my-secret-value');
/** String identifier must be explicitly set in the Container with the desired value. */
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

_For detailed documentation about `Token` class please read the [Service Tokens](./service-tokens) page._

## Service Scopes: Singleton, Container and Transient

TypeDI supports three service scopes to control service instance lifecycle and caching behavior:

### Container Scope (Default)

By default, every service is container-scoped. This means each container maintains independent service instances:

```ts
import 'reflect-metadata';
import { Container, Service } from '@rabjs/typedi';

@Service() // equivalent to @Service({ scope: 'container' })
class UserService {
  constructor() {
    console.log('UserService created');
  }
}

// Get from default container
const service1 = Container.get(UserService); // Output: UserService created
const service2 = Container.get(UserService); // No output (uses cached instance)
console.log(service1 === service2); // true (shared within same container)

// Get from different containers
const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const service3 = container1.get(UserService); // Output: UserService created
const service4 = container2.get(UserService); // Output: UserService created
console.log(service3 === service4); // false (independent instances in different containers)
```

**Use Cases:**

- HTTP request context
- User session management
- Transaction processing
- Stateful services that need container-level isolation

### Singleton Scope

Singleton services have only one instance throughout the entire application, stored in the root container and shared by all containers:

```ts
import 'reflect-metadata';
import { Container, Service } from '@rabjs/typedi';

@Service({ scope: 'singleton' })
class ConfigService {
  constructor() {
    console.log('ConfigService created');
  }
}

// Get from default container
const config1 = Container.get(ConfigService); // Output: ConfigService created
const config2 = Container.get(ConfigService); // No output (uses cached instance)

// Get from different containers
const container1 = Container.of('request-1');
const container2 = Container.of('request-2');

const config3 = container1.get(ConfigService); // No output (uses cached instance)
const config4 = container2.get(ConfigService); // No output (uses cached instance)

console.log(config1 === config2); // true
console.log(config1 === config3); // true
console.log(config1 === config4); // true
// All instances are the same singleton
```

**Use Cases:**

- Application configuration
- Database connections
- Logging services
- Caching services
- Stateless utility services

### Transient Scope

Transient services create a new instance every time they are requested, with no caching:

```ts
import 'reflect-metadata';
import { Container, Service } from '@rabjs/typedi';

@Service({ scope: 'transient' })
class RequestService {
  private id = Math.random();

  constructor() {
    console.log(`RequestService created with id: ${this.id}`);
  }

  getId() {
    return this.id;
  }
}

const service1 = Container.get(RequestService); // Output: RequestService created with id: 0.123...
const service2 = Container.get(RequestService); // Output: RequestService created with id: 0.456...

console.log(service1 === service2); // false
console.log(service1.getId() !== service2.getId()); // true
```

**Use Cases:**

- Event handlers
- Request processors
- Temporary objects
- Services that maintain request-specific state
- Factory patterns

## Summary

Choose the appropriate scope based on your needs:

- **Container** (default): For request-scoped services that need isolation between containers
- **Singleton**: For application-wide shared services
- **Transient**: For services that should be recreated every time they're needed
