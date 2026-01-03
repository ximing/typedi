---
id: intro
title: TypeDI Documentation
sidebar_label: Introduction
slug: /
---

# TypeDI Documentation

TypeDI is a powerful dependency injection container designed specifically for TypeScript and JavaScript applications. It provides a clean API and decorator syntax that makes managing dependencies in your application effortless.

## Features

- 🎯 **Simple to Use** - Dependency injection through decorators
- 📦 **TypeScript First** - Complete type support
- 🔄 **Multiple Injection Methods** - Constructor injection, property injection, etc.
- 🏷️ **Service Tokens** - Support for string and Symbol identifiers
- 🔧 **Flexible Configuration** - Scoped containers and transient services
- ⚡ **Lightweight** - No external dependencies, small bundle size

## Quick Start

### Installation

```bash
npm install @rabjs/typedi reflect-metadata
```

### Basic Usage

```typescript
import 'reflect-metadata';
import { Container, Service, Inject } from '@rabjs/typedi';

interface Factory {
  create(): void;
}

@Service({ id: 'bean.factory' })
class BeanFactory implements Factory {
  create() {
    console.log('Creating bean...');
  }
}

@Service({ id: 'sugar.factory' })
class SugarFactory implements Factory {
  create() {
    console.log('Creating sugar...');
  }
}

@Service({ id: 'water.factory' })
class WaterFactory implements Factory {
  create() {
    console.log('Creating water...');
  }
}

@Service({ id: 'coffee.maker' })
class CoffeeMaker {
  beanFactory: Factory;
  sugarFactory: Factory;

  @Inject('water.factory')
  waterFactory: Factory;

  constructor(@Inject('bean.factory') beanFactory: BeanFactory, @Inject('sugar.factory') sugarFactory: SugarFactory) {
    this.beanFactory = beanFactory;
    this.sugarFactory = sugarFactory;
  }

  make() {
    this.beanFactory.create();
    this.sugarFactory.create();
    this.waterFactory.create();
    console.log('Coffee is ready!');
  }
}

// Use container to get service
const coffeeMaker = Container.get<CoffeeMaker>('coffee.maker');
coffeeMaker.make();
```

## Guides

- [TypeScript Guide](./typescript/getting-started) - Learn how to use TypeDI in TypeScript projects
- [JavaScript Guide](./javascript/getting-started) - Understand usage in JavaScript projects

## Core Concepts

- **Container API** - Basic operations of the container
- **@Service Decorator** - Declare injectable services
- **@Inject Decorator** - Inject dependencies
- **Service Tokens** - Using service identifiers

## Advanced Features

- **Service Inheritance** - How to handle inheritance relationships
- **Custom Decorators** - Create your own injection decorators
- **Scoped Containers** - Manage service lifecycles
- **Transient Services** - Create new instances for each injection

## Integrations

- **TypeORM Integration** - Perfect integration with TypeORM

## Community

- [GitHub Repository](https://github.com/ximing/typedi)
- [npm Package](https://www.npmjs.com/package/@rabjs/typedi)
- [Issues & Bug Reports](https://github.com/ximing/typedi/issues)
