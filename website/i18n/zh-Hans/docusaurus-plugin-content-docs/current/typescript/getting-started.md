# 快速开始

TypeDI 是一个专为 TypeScript 和 JavaScript 设计的[依赖注入](https://zh.wikipedia.org/wiki/%E4%BE%9D%E8%B5%96%E6%B3%A8%E5%85%A5)库。

## 安装

> 注意：此安装指南适用于 TypeScript 项目，如果你希望在 JavaScript 项目中使用 TypeDI，
> 请阅读 [JavaScript 快速开始指南][getting-started-js]。

通过 NPM 安装所需的包来开始使用 TypeDI：

```bash
npm install typedi reflect-metadata
```

在应用程序的**第一行**导入 `reflect-metadata` 包：

```ts
import 'reflect-metadata';

// 在导入 reflect-metadata 包之后，
// 你的其他导入和初始化代码写在这里！
```

最后一步，你需要在 TypeScript 配置中启用装饰器元数据的生成。在你的 `tsconfig.json` 文件的 `compilerOptions` 键下添加这两行：

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

现在你已经准备好在 TypeScript 中使用 TypeDI 了！

## 基本用法

最基本的用法是请求一个类定义的实例。TypeDI 会检查该类的实例是否已经创建过，
如果有则返回缓存的版本，否则会创建一个新实例，缓存并返回它。

```ts
import { Container, Service } from 'typedi';

@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

@Service()
class ExampleService {
  constructor(
    // 因为我们用 @Service() 装饰器注解了 ExampleInjectedService，
    // 当从 TypeDI 请求 ExampleService 类时，TypeDI 会自动在这里
    // 注入一个 ExampleInjectedService 的实例。
    public injectedService: ExampleInjectedService,
  ) {}
}

const serviceInstance = Container.get(ExampleService);
// 我们从 TypeDI 请求一个 ExampleService 的实例

serviceInstance.injectedService.printMessage();
// 在控制台输出 "I am alive!"
```

[getting-started-js]: ../javascript/getting-started.md
