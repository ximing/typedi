# 使用 Transient 服务

Transient 作用域是 TypeDI 提供的三种服务作用域之一。与 Singleton 和 Container 作用域不同,Transient 服务每次请求时都会创建一个全新的实例,不进行任何缓存。

## 什么是 Transient 服务

Transient(临时)服务的特点:

- **不缓存**: 每次调用 `Container.get()` 都创建新实例
- **完全隔离**: 每个实例的状态完全独立
- **性能开销**: 由于频繁创建实例,性能略低于其他作用域
- **适合无状态或需要隔离的场景**

## 定义 Transient 服务

使用 `@Service` 装饰器的 `scope` 选项设置为 `'transient'`:

```ts
import { Service } from 'typedi';

@Service({ scope: 'transient' })
class TransientService {
  private id = Math.random();

  getId() {
    return this.id;
  }
}
```

## 基础示例

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class UniqueIdGenerator {
  public id: string;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 9);
    console.log(`UniqueIdGenerator created with ID: ${this.id}`);
  }

  generateId() {
    return `${this.id}-${Date.now()}`;
  }
}

const gen1 = Container.get(UniqueIdGenerator);
// 输出: UniqueIdGenerator created with ID: abc1234

const gen2 = Container.get(UniqueIdGenerator);
// 输出: UniqueIdGenerator created with ID: def5678

console.log(gen1 === gen2); // false
console.log(gen1.id !== gen2.id); // true
console.log(gen1.generateId()); // abc1234-1234567890
console.log(gen2.generateId()); // def5678-1234567891
```

## Transient 与其他作用域的对比

### 与 Singleton 对比

```ts
import { Container, Service } from 'typedi';

// Singleton: 全局唯一实例
@Service({ scope: 'singleton' })
class SingletonCounter {
  private count = 0;

  increment() {
    return ++this.count;
  }
}

// Transient: 每次都是新实例
@Service({ scope: 'transient' })
class TransientCounter {
  private count = 0;

  increment() {
    return ++this.count;
  }
}

// Singleton 行为
const singleton1 = Container.get(SingletonCounter);
const singleton2 = Container.get(SingletonCounter);

console.log(singleton1.increment()); // 1
console.log(singleton2.increment()); // 2 (共享状态)
console.log(singleton1 === singleton2); // true

// Transient 行为
const transient1 = Container.get(TransientCounter);
const transient2 = Container.get(TransientCounter);

console.log(transient1.increment()); // 1
console.log(transient2.increment()); // 1 (独立状态)
console.log(transient1 === transient2); // false
```

### 与 Container 作用域对比

```ts
import { Container, Service } from 'typedi';

// Container 作用域: 每个容器一个实例
@Service({ scope: 'container' })
class ContainerScoped {
  private id = Math.random();
  getId() {
    return this.id;
  }
}

// Transient: 每次都是新实例
@Service({ scope: 'transient' })
class TransientScoped {
  private id = Math.random();
  getId() {
    return this.id;
  }
}

const container1 = Container.of('container-1');
const container2 = Container.of('container-2');

// Container 作用域: 同一容器内共享
const containerA1 = container1.get(ContainerScoped);
const containerA2 = container1.get(ContainerScoped);
console.log(containerA1 === containerA2); // true (同一容器)

// Container 作用域: 不同容器独立
const containerB1 = container2.get(ContainerScoped);
console.log(containerA1 === containerB1); // false (不同容器)

// Transient: 总是创建新实例
const transient1 = container1.get(TransientScoped);
const transient2 = container1.get(TransientScoped);
const transient3 = container2.get(TransientScoped);
console.log(transient1 === transient2); // false (即使在同一容器)
console.log(transient2 === transient3); // false
```

## 使用场景

### 1. 命令对象模式

每个命令都应该是独立的实例:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class SendEmailCommand {
  constructor(
    private to: string = '',
    private subject: string = '',
    private body: string = '',
  ) {}

  setRecipient(to: string) {
    this.to = to;
    return this;
  }

  setSubject(subject: string) {
    this.subject = subject;
    return this;
  }

  setBody(body: string) {
    this.body = body;
    return this;
  }

  execute() {
    console.log(`Sending email to ${this.to}`);
    console.log(`Subject: ${this.subject}`);
    console.log(`Body: ${this.body}`);
    // 实际发送逻辑...
  }
}

// 每个命令都是独立的
const cmd1 = Container.get(SendEmailCommand);
cmd1.setRecipient('user1@example.com').setSubject('Welcome').setBody('Welcome to our service!').execute();

const cmd2 = Container.get(SendEmailCommand);
cmd2.setRecipient('user2@example.com').setSubject('Notification').setBody('You have a new message').execute();
```

### 2. 工厂模式

创建不同配置的实例:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class HttpClient {
  private baseUrl: string = '';
  private timeout: number = 5000;
  private headers: Record<string, string> = {};

  setBaseUrl(url: string) {
    this.baseUrl = url;
    return this;
  }

  setTimeout(ms: number) {
    this.timeout = ms;
    return this;
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
    return this;
  }

  async get(path: string) {
    console.log(`GET ${this.baseUrl}${path}`);
    console.log(`Timeout: ${this.timeout}ms`);
    console.log(`Headers:`, this.headers);
    // 实际请求逻辑...
  }
}

@Service()
class HttpClientFactory {
  createJsonClient() {
    return Container.get(HttpClient)
      .setBaseUrl('https://api.example.com')
      .setHeaders({ 'Content-Type': 'application/json' });
  }

  createXmlClient() {
    return Container.get(HttpClient)
      .setBaseUrl('https://api.example.com')
      .setHeaders({ 'Content-Type': 'application/xml' });
  }
}

const factory = Container.get(HttpClientFactory);
const jsonClient = factory.createJsonClient();
const xmlClient = factory.createXmlClient();

await jsonClient.get('/users');
await xmlClient.get('/data');
```

### 3. 原型模式

克隆对象的模板:

```ts
import { Container, Service } from 'typedi';

interface Cloneable<T> {
  clone(): T;
}

@Service({ scope: 'transient' })
class Document implements Cloneable<Document> {
  private title: string = 'Untitled';
  private content: string = '';
  private metadata: Record<string, any> = {};

  setTitle(title: string) {
    this.title = title;
    return this;
  }

  setContent(content: string) {
    this.content = content;
    return this;
  }

  setMetadata(key: string, value: any) {
    this.metadata[key] = value;
    return this;
  }

  clone(): Document {
    const cloned = Container.get(Document);
    cloned.title = this.title;
    cloned.content = this.content;
    cloned.metadata = { ...this.metadata };
    return cloned;
  }

  print() {
    console.log('Title:', this.title);
    console.log('Content:', this.content);
    console.log('Metadata:', this.metadata);
  }
}

const template = Container.get(Document);
template.setTitle('Template Document').setContent('This is a template').setMetadata('author', 'Admin');

const doc1 = template.clone();
doc1.setTitle('Document 1').print();

const doc2 = template.clone();
doc2.setTitle('Document 2').print();
```

### 4. 状态隔离

需要完全隔离状态的场景:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class TaskProcessor {
  private status: 'idle' | 'processing' | 'completed' | 'failed' = 'idle';
  private result: any = null;
  private error: Error | null = null;

  async process(task: any) {
    this.status = 'processing';
    console.log('Processing task:', task);

    try {
      // 模拟处理
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.result = { processed: true, data: task };
      this.status = 'completed';
      console.log('Task completed');
    } catch (err) {
      this.error = err as Error;
      this.status = 'failed';
      console.error('Task failed:', err);
    }

    return this;
  }

  getStatus() {
    return {
      status: this.status,
      result: this.result,
      error: this.error,
    };
  }
}

// 并行处理多个任务,每个都有独立状态
async function processTasks(tasks: any[]) {
  const processors = tasks.map(() => Container.get(TaskProcessor));

  const results = await Promise.all(tasks.map((task, index) => processors[index].process(task)));

  return results.map((p) => p.getStatus());
}

const tasks = [
  { id: 1, data: 'Task 1' },
  { id: 2, data: 'Task 2' },
  { id: 3, data: 'Task 3' },
];

processTasks(tasks).then((results) => {
  console.log('All tasks processed:', results);
});
```

## Transient 服务的依赖注入

Transient 服务可以注入其他作用域的服务:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'singleton' })
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

@Service({ scope: 'singleton' })
class ConfigService {
  getConfig() {
    return { apiUrl: 'https://api.example.com' };
  }
}

@Service({ scope: 'transient' })
class ApiRequest {
  constructor(
    private logger: Logger,
    private config: ConfigService,
  ) {}

  async execute(endpoint: string) {
    const { apiUrl } = this.config.getConfig();
    this.logger.log(`Requesting: ${apiUrl}${endpoint}`);
    // 实际请求逻辑...
  }
}

// 每次都创建新的 ApiRequest,但注入的 Logger 和 ConfigService 是单例
const request1 = Container.get(ApiRequest);
const request2 = Container.get(ApiRequest);

console.log(request1 === request2); // false (transient)
// 但 request1 和 request2 注入的 logger 和 config 是同一个实例
```

## 性能考虑

由于 Transient 服务不缓存,频繁创建可能影响性能:

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class ExpensiveService {
  constructor() {
    // 假设这里有昂贵的初始化操作
    console.log('Expensive initialization...');
  }
}

// ❌ 不好的做法: 在循环中频繁创建
for (let i = 0; i < 1000; i++) {
  const service = Container.get(ExpensiveService); // 创建1000次!
  // 使用 service...
}

// ✅ 更好的做法: 考虑使用对象池或其他作用域
@Service({ scope: 'container' })
class OptimizedService {
  constructor() {
    console.log('Optimized initialization...');
  }

  reset() {
    // 重置状态而不是创建新实例
  }
}

const service = Container.get(OptimizedService);
for (let i = 0; i < 1000; i++) {
  service.reset();
  // 使用 service...
}
```

## 与 Container.set() 结合

可以手动注册 Transient 服务:

```ts
import { Container } from 'typedi';

class CustomService {
  private id = Math.random();
  getId() {
    return this.id;
  }
}

Container.set({
  id: CustomService,
  type: CustomService,
  scope: 'transient',
});

const instance1 = Container.get(CustomService);
const instance2 = Container.get(CustomService);

console.log(instance1 === instance2); // false
console.log(instance1.getId() !== instance2.getId()); // true
```

## 最佳实践

1. **明确需求**: 只在真正需要每次创建新实例时使用 Transient
2. **注意性能**: 避免在高频场景中使用重量级的 Transient 服务
3. **状态管理**: Transient 服务适合封装临时状态
4. **组合使用**: 可以让 Transient 服务依赖 Singleton 或 Container 作用域的服务
5. **避免缓存引用**: 不要在其他服务中缓存 Transient 服务的引用

## 常见错误

### 错误1: 缓存 Transient 实例

```ts
import { Container, Service } from 'typedi';

@Service({ scope: 'transient' })
class TransientService {
  private id = Math.random();
  getId() {
    return this.id;
  }
}

// ❌ 错误: 在 Singleton 中缓存 Transient 实例
@Service({ scope: 'singleton' })
class CachingService {
  // 这会导致 transientService 实际上变成单例
  private transientService = Container.get(TransientService);

  useTransient() {
    return this.transientService.getId(); // 总是返回相同的 ID
  }
}

// ✅ 正确: 每次使用时都获取新实例
@Service({ scope: 'singleton' })
class CorrectService {
  useTransient() {
    const transientService = Container.get(TransientService);
    return transientService.getId(); // 每次都是新的 ID
  }
}
```

### 错误2: 混淆 Transient 和 Container 作用域

```ts
import { Container, Service } from 'typedi';

// ❌ 误解: 认为 Container 作用域每次都创建新实例
@Service({ scope: 'container' }) // 这不是 transient!
class RequestHandler {
  private counter = 0;

  handle() {
    return ++this.counter;
  }
}

const container = Container.of('test');
const handler1 = container.get(RequestHandler);
const handler2 = container.get(RequestHandler);

console.log(handler1 === handler2); // true (container 作用域在同一容器内共享)
console.log(handler1.handle()); // 1
console.log(handler2.handle()); // 2 (共享状态!)

// ✅ 如果需要完全隔离,使用 transient
@Service({ scope: 'transient' })
class IsolatedHandler {
  private counter = 0;

  handle() {
    return ++this.counter;
  }
}

const isolated1 = container.get(IsolatedHandler);
const isolated2 = container.get(IsolatedHandler);

console.log(isolated1 === isolated2); // false
console.log(isolated1.handle()); // 1
console.log(isolated2.handle()); // 1 (独立状态)
```

## 总结

Transient 作用域适合以下场景:

- ✅ 命令对象模式
- ✅ 需要完全隔离状态的服务
- ✅ 原型模式
- ✅ 临时数据处理
- ✅ 工厂创建的对象

不适合的场景:

- ❌ 重量级初始化的服务
- ❌ 高频调用的服务
- ❌ 需要共享状态的服务
- ❌ 数据库连接等资源

合理使用 Transient 作用域可以确保服务之间的隔离性,但也要注意性能开销。
