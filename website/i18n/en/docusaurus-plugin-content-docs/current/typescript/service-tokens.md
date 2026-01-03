# Service Tokens

Service tokens provide a way to register and inject non-class values like configuration objects, primitive values, or factory functions.

## Creating Tokens

```typescript
import { Token, Container } from '@rabjs/typedi';

const CONFIG_TOKEN = new Token<{ apiUrl: string; timeout: number }>('app.config');
const API_URL_TOKEN = new Token<string>('api.url');
```

## Registering Values

```typescript
// Register configuration object
Container.set(CONFIG_TOKEN, {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
});

// Register primitive value
Container.set(API_URL_TOKEN, 'https://api.example.com');
```

## Injecting Tokens

```typescript
import { Service, Inject } from '@rabjs/typedi';

@Service()
class ApiService {
  constructor(
    @Inject(CONFIG_TOKEN) private config: { apiUrl: string; timeout: number },
    @Inject(API_URL_TOKEN) private apiUrl: string,
  ) {}

  makeRequest() {
    // Use this.config and this.apiUrl
  }
}
```

## String Identifiers

You can also use simple strings as identifiers:

```typescript
Container.set('database.host', 'localhost');
Container.set('database.port', 5432);

@Service()
class DatabaseService {
  @Inject('database.host')
  private host: string;

  @Inject('database.port')
  private port: number;
}
```
