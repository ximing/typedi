---
id: intro
title: TypeDI 文档
sidebar_label: 介绍
slug: /
---

# TypeDI 文档

TypeDI 是一个强大的依赖注入容器，专为 TypeScript 和 JavaScript 应用程序设计。它提供了简洁的 API 和装饰器语法，让你能够轻松管理应用程序中的依赖关系。

## 特性

- 🎯 **简单易用** - 通过装饰器实现依赖注入
- 📦 **TypeScript 优先** - 完整的类型支持
- 🔄 **多种注入方式** - 支持构造函数注入、属性注入等
- 🏷️ **Service Token** - 支持字符串和 Symbol 标识符
- 🔧 **灵活配置** - 支持作用域容器和瞬时服务
- ⚡ **轻量级** - 无外部依赖，体积小

## 快速开始

### 安装

```bash
npm install @rabjs/typedi reflect-metadata
```

### 基本用法

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

// 使用容器获取服务
const coffeeMaker = Container.get<CoffeeMaker>('coffee.maker');
coffeeMaker.make();
```

## 指南

- [TypeScript 使用指南](./typescript/getting-started) - 学习如何在 TypeScript 项目中使用 TypeDI
- [JavaScript 使用指南](./javascript/getting-started) - 了解 JavaScript 项目中的用法

## 核心概念

- **Container API** - 容器的基本操作方法
- **@Service 装饰器** - 声明可注入的服务
- **@Inject 装饰器** - 注入依赖项
- **Service Tokens** - 服务标识符的使用

## 高级特性

- **服务继承** - 如何处理继承关系
- **自定义装饰器** - 创建自己的注入装饰器
- **作用域容器** - 管理服务的生命周期
- **Transient 服务** - 每次注入都创建新实例

## 集成

- **TypeORM 集成** - 与 TypeORM 的完美结合

## 社区

- [GitHub Repository](https://github.com/ximing/typedi)
- [npm Package](https://www.npmjs.com/package/@rabjs/typedi)
- [Issues & Bug Reports](https://github.com/ximing/typedi/issues)
