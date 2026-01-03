---
id: custom-decorators
title: 创建自定义装饰器
sidebar_label: 创建自定义装饰器
---

# 创建自定义装饰器

> **注意：** 此页面是旧文档的直接副本。将会重新编写。

你可以创建自己的装饰器，为你的服务依赖注入给定的值。例如：

```ts
// Logger.ts
export function Logger() {
  return function (object: Object, propertyName: string, index?: number) {
    const logger = new ConsoleLogger();
    Container.registerHandler({ object, propertyName, index, value: (containerInstance) => logger });
  };
}

// LoggerInterface.ts
export interface LoggerInterface {
  log(message: string): void;
}

// ConsoleLogger.ts
import { LoggerInterface } from './LoggerInterface';

export class ConsoleLogger implements LoggerInterface {
  log(message: string) {
    console.log(message);
  }
}

// UserRepository.ts
@Service()
export class UserRepository {
  constructor(@Logger() private logger: LoggerInterface) {}

  save(user: User) {
    this.logger.log(`用户 ${user.firstName} ${user.secondName} 已被保存。`);
  }
}
```
