---
id: basic-usage
title: JavaScript 基本用法
sidebar_label: JavaScript 基本用法
---

# JavaScript 基本用法

> **注意：** 此页面是旧文档的直接副本。将会重新编写。

在你的类的构造函数中，你总是会收到一个容器作为最后一个参数，你可以使用它来获取其他依赖。

```javascript
class BeanFactory {
  create() {}
}

class SugarFactory {
  create() {}
}

class WaterFactory {
  create() {}
}

class CoffeeMaker {
  constructor(container) {
    this.beanFactory = container.get(BeanFactory);
    this.sugarFactory = container.get(SugarFactory);
    this.waterFactory = container.get(WaterFactory);
  }

  make() {
    this.beanFactory.create();
    this.sugarFactory.create();
    this.waterFactory.create();
  }
}

var Container = require('typedi').Container;
var coffeeMaker = Container.get(CoffeeMaker);
coffeeMaker.make();
```

使用 TypeDI 你可以使用命名服务。示例：

```javascript
var Container = require('typedi').Container;

class BeanFactory implements Factory {
  create() {}
}

class SugarFactory implements Factory {
  create() {}
}

class WaterFactory implements Factory {
  create() {}
}

class CoffeeMaker {
  beanFactory: Factory;
  sugarFactory: Factory;
  waterFactory: Factory;

  constructor(container) {
    this.beanFactory = container.get('bean.factory');
    this.sugarFactory = container.get('sugar.factory');
    this.waterFactory = container.get('water.factory');
  }

  make() {
    this.beanFactory.create();
    this.sugarFactory.create();
    this.waterFactory.create();
  }
}

Container.set('bean.factory', new BeanFactory(Container));
Container.set('sugar.factory', new SugarFactory(Container));
Container.set('water.factory', new WaterFactory(Container));
Container.set('coffee.maker', new CoffeeMaker(Container));

var coffeeMaker = Container.get('coffee.maker');
coffeeMaker.make();
```

如果你想存储（并在稍后注入）一些设置或配置选项，这个功能特别有用。
例如：

```javascript
var Container = require('typedi').Container;

// 在你的全局应用参数中的某个地方
Container.set('authorization-token', 'RVT9rVjSVN');

class UserRepository {
  constructor(container) {
    this.authorizationToken = container.get('authorization-token');
  }
}
```

当你编写测试时，你可以使用 `set` 方法轻松为正在测试的类提供自己的"假"依赖：

```javascript
Container.set(CoffeeMaker, new FakeCoffeeMaker());

// 或者对于命名服务

Container.set([
  { id: 'bean.factory', value: new FakeBeanFactory() },
  { id: 'sugar.factory', value: new FakeSugarFactory() },
  { id: 'water.factory', value: new FakeWaterFactory() },
]);
```

TypeDI 还支持函数依赖注入。它看起来是这样的：

```javascript
var Service = require('typedi').Service;
var Container = require('typedi').Container;

var PostRepository = Service(() => ({
  getName() {
    return 'hello from post repository';
  },
}));

var PostManager = Service(() => ({
  getId() {
    return 'some post id';
  },
}));

class PostQueryBuilder {
  build() {
    return 'SUPER * QUERY';
  }
}

var PostController = Service([PostManager, PostRepository, PostQueryBuilder], (manager, repository, queryBuilder) => {
  return {
    id: manager.getId(),
    name: repository.getName(),
    query: queryBuilder.build(),
  };
});

var postController = Container.get(PostController);
console.log(postController);
```
