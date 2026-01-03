---
id: getting-started
title: JavaScript 快速开始
sidebar_label: JavaScript 快速开始
---

# JavaScript 快速开始

可以在没有 TypeScript 的情况下使用 TypeDI，但是某些功能会受到限制或不可用。
这些差异在下面的[限制][limitations-sections]部分中列出。

## 安装

要在 JavaScript 中开始使用 TypeDI，请通过 NPM 安装所需的包：

```bash
npm install typedi reflect-metadata
```

## 基本用法

最基本的用法是请求一个类定义的实例。TypeDI 会检查该类的实例是否已经创建过，
如果有则返回缓存的版本，否则会创建一个新实例，缓存并返回它。

```js
import 'reflect-metadata';
import { Container } from 'typedi';

class ExampleClass {
  print() {
    console.log('I am alive!');
  }
}

/** 将此类注册到 TypeDI 容器 */
Container.set({ id: ExampleClass, type: ExampleClass });

/** 从 TypeDI 请求 ExampleClass 的实例。 */
const classInstance = Container.get(ExampleClass);

/** 我们收到了 ExampleClass 的实例，可以开始使用它。 */
classInstance.print();
```

有关更高级的用法示例和模式，请阅读[下一页][basic-usage-page]。

## 限制

当使用 `Container.set()` 方法注册依赖时，有三个可用选项必须设置。只允许使用以下选项中的一个：`type`、`factory` 或 `value`，不能同时使用多个。

- `Container.set({ id: ExampleClass, type: ExampleClass});`
- `Container.set({ id: ExampleClass, value: new ExampleClass});`
- `Container.set({ id: ExampleClass, factory: ExampleClass});`

为了快速开始，建议使用 `type`，因为使用 `value` 会在类注册到 TypeDI 容器之前就实例化该类。使用 `type` 还能确保 TypeDI 容器被注入到构造函数中。

[limitations-sections]: #限制
[basic-usage-page]: ./basic-usage.md
