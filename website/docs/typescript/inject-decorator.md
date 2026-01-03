---
id: inject-decorator
title: @Inject Decorator
sidebar_label: @Inject Decorator
---

# @Inject Decorator

The `@Inject` decorator is used to inject dependencies into class properties or constructor parameters.

## Property Injection

```typescript
import { Service, Inject, Container } from '@rabjs/typedi';

@Service()
class DatabaseService {}

@Service()
class UserService {
  @Inject()
  private database: DatabaseService;

  getUsers() {
    // Use this.database
  }
}
```

## Constructor Injection

```typescript
@Service()
class UserService {
  constructor(
    @Inject() private database: DatabaseService,
    @Inject('config.apiUrl') private apiUrl: string,
  ) {}
}
```

## Injecting by Token or String

```typescript
import { Token } from '@rabjs/typedi';

const CONFIG_TOKEN = new Token('app.config');

@Service()
class UserService {
  @Inject(CONFIG_TOKEN)
  private config: any;

  @Inject('database.url')
  private dbUrl: string;
}
```
