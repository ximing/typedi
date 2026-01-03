---
id: service-tokens
title: 服务令牌
sidebar_label: 服务令牌
---

# 服务令牌

服务令牌是唯一标识符，提供对存储在 `Container` 中的值的类型安全访问。

```ts
import 'reflect-metadata';
import { Container, Token } from 'typedi';

export const JWT_SECRET_TOKEN = new Token<string>('MY_SECRET');

Container.set(JWT_SECRET_TOKEN, 'wow-such-secure-much-encryption');

/**
 * 在应用程序的其他地方，导入 JWT_SECRET_TOKEN 后，
 * 可以用来从容器请求密钥。
 *
 * 这个值也是类型安全的，因为 Token 是有类型的。
 */
const JWT_SECRET = Container.get(JWT_SECRET_TOKEN);
```

## 注入服务令牌

它们可以与 `@Inject()` 装饰器一起使用，以覆盖属性或参数的推断类型。

```ts
import 'reflect-metadata';
import { Container, Token, Inject, Service } from 'typedi';

export const JWT_SECRET_TOKEN = new Token<string>('MY_SECRET');

Container.set(JWT_SECRET_TOKEN, 'wow-such-secure-much-encryption');

@Service()
class Example {
  @Inject(JWT_SECRET_TOKEN)
  myProp: string;
}

const instance = Container.get(Example);
// instance.myProp 属性具有为 Token 分配的值
```

## 同名令牌

**同名的两个令牌是不同的令牌**。名称仅用于帮助开发者在调试和开发过程中识别令牌。（它包含在错误消息中。）

```ts
import 'reflect-metadata';
import { Container, Token } from 'typedi';

const tokenA = new Token('TOKEN');
const tokenB = new Token('TOKEN');

Container.set(tokenA, 'value-A');
Container.set(tokenB, 'value-B');

const tokenValueA = Container.get(tokenA);
// tokenValueA 是 "value-A"
const tokenValueB = Container.get(tokenB);
// tokenValueB 是 "value-B"

console.log(tokenValueA === tokenValueB);
// 返回 false，因为 Token 总是唯一的
```

## Token 和字符串标识符的区别

它们都能达到相同的目标，但是建议使用 `Token`，因为它们是类型安全的且不会被误拼写，
而误拼写的字符串标识符默认会静默返回 `undefined` 值。
