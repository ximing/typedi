---
id: usage-with-typeorm
title: 与 TypeORM 和 routing-controllers 一起使用
sidebar_label: 与 TypeORM 和 routing-controllers 一起使用
---

# 与 TypeORM 和 routing-controllers 一起使用

要将 TypeDI 与 routing-controllers 和/或 TypeORM 一起使用，需要配置它们使用应用程序使用的顶级 TypeDI 容器。

```ts
import { useContainer as rcUseContainer } from 'routing-controllers';
import { useContainer as typeOrmUseContainer } from 'typeorm';
import { Container } from 'typedi';

rcUseContainer(Container);
typeOrmUseContainer(Container);
```
