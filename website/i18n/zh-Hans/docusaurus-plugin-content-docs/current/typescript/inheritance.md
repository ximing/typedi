---
id: inheritance
title: 继承
sidebar_label: 继承
---

# 继承

当基类和扩展类都使用 `@Service()` 装饰器标记时，**属性的**继承是受支持的。
扩展具有装饰属性的类的类，在创建时会在这些属性上接收初始化的类实例。

```ts
import 'reflect-metadata';
import { Container, Token, Inject, Service } from 'typedi';

@Service()
class InjectedClass {
  name: string = 'InjectedClass';
}

@Service()
class BaseClass {
  name: string = 'BaseClass';

  @Inject()
  injectedClass: InjectedClass;
}

@Service()
class ExtendedClass extends BaseClass {
  name: string = 'ExtendedClass';
}

const instance = Container.get(ExtendedClass);
// instance 具有值为 "ExtendedClass" 的 `name` 属性（覆盖了基类）
// 和具有 `InjectedClass` 类实例的 `injectedClass` 属性

console.log(instance.injectedClass.name);
// 输出 "InjectedClass"
console.log(instance.name);
// 输出 "ExtendedClass"
```
