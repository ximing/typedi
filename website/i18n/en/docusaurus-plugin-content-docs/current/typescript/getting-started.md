# Getting Started

TypeDI is a dependency injection library that allows you to build well-structured applications using TypeScript and JavaScript. This page will guide you through the basics of using TypeDI.

## Installation

To get started with TypeDI, you need to install the package and reflect-metadata:

```bash
npm install @rabjs/typedi reflect-metadata
```

## Basic Example

Here's a simple example showing how to use TypeDI:

```typescript
import 'reflect-metadata';
import { Container, Service } from '@rabjs/typedi';

@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

@Service()
class ExampleService {
  constructor(public injectedService: ExampleInjectedService) {}
}

const serviceInstance = Container.get(ExampleService);
// we request an instance of ExampleService from TypeDI

serviceInstance.injectedService.printMessage();
// logs "I am alive!" to the console
```

## Key Concepts

- **@Service()**: Marks a class as a service that can be injected
- **Container**: The main container that manages all services
- **Dependency Injection**: Automatic injection of dependencies into constructors

## Next Steps

Continue reading to learn more about:

- [Basic Usage Guide](./basic-usage-guide)
- [Container API](./container-api)
- [Service Decorator](./service-decorator)

[getting-started-js]: ../javascript/getting-started
