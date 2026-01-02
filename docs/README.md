# Documentation

## Typescript Usage

With TypeDI you can use a named services. Example:

```typescript
import { Container, Service, Inject } from 'typedi';

interface Factory {
  create(): void;
}

@Service({ id: 'bean.factory' })
class BeanFactory implements Factory {
  create() {}
}

@Service({ id: 'sugar.factory' })
class SugarFactory implements Factory {
  create() {}
}

@Service({ id: 'water.factory' })
class WaterFactory implements Factory {
  create() {}
}

@Service({ id: 'coffee.maker' })
class CoffeeMaker {
  beanFactory: Factory;
  sugarFactory: Factory;

  @Inject('water.factory')
  waterFactory: Factory;

  constructor(@Inject('bean.factory') beanFactory: BeanFactory, @Inject('sugar.factory') sugarFactory: SugarFactory) {
    this.beanFactory = beanFactory;
    this.sugarFactory = sugarFactory;
  }

  make() {
    this.beanFactory.create();
    this.sugarFactory.create();
    this.waterFactory.create();
  }
}

let coffeeMaker = Container.get<CoffeeMaker>('coffee.maker');
coffeeMaker.make();
```

This feature especially useful if you want to store (and inject later on) some settings or configuration options.
For example:

```typescript
import { Container, Service, Inject } from 'typedi';

// somewhere in your global app parameters
Container.set('authorization-token', 'RVT9rVjSVN');

@Service()
class UserRepository {
  @Inject('authorization-token')
  authorizationToken: string;
}
```

When you write tests you can easily provide your own "fake" dependencies to classes you are testing using `set` method:

```typescript
// 替换类实现
Container.set({ id: CoffeeMaker, value: new FakeCoffeeMaker() });

// 或者批量替换命名服务
Container.set({ id: 'bean.factory', value: new FakeBeanFactory() });
Container.set({ id: 'sugar.factory', value: new FakeSugarFactory() });
Container.set({ id: 'water.factory', value: new FakeWaterFactory() });
```

## TypeScript Advanced Usage Examples

- [Using factory function to create service](#using-factory-function-to-create-service)
- [Using factory class to create service](#using-factory-class-to-create-service)
- [Problem with circular references](#problem-with-circular-references)
- [Custom decorators](#custom-decorators)
- [Using service groups](#using-service-groups)
- [Using multiple containers and scoped containers](#using-multiple-containers-and-scoped-containers)
- [Remove registered services or reset container state](#remove-registered-services-or-reset-container-state)

### Using factory function to create service

You can create your services with the container using factory functions.

This way, service instance will be created by calling your factory function instead of
instantiating a class directly.

```typescript
import { Container, Service } from 'typedi';

function createCar() {
  return new Car('V8');
}

@Service({ factory: createCar })
class Car {
  constructor(public engineType: string) {}
}

// Getting service from the container.
// Service will be created by calling the specified factory function.
const car = Container.get(Car);

console.log(car.engineType); // > "V8"
```

### Using factory class to create service

You can also create your services using factory classes.

This way, service instance will be created by calling given factory service's method factory instead of
instantiating a class directly.

```typescript
import { Container, Service } from 'typedi';

@Service()
class CarFactory {
  constructor(public logger: LoggerService) {}

  create() {
    return new Car('BMW', this.logger);
  }
}

@Service({ factory: [CarFactory, 'create'] })
class Car {
  constructor(
    public model: string,
    public logger: LoggerInterface,
  ) {}
}
```

### Problem with circular references

There is a known issue in language that it can't handle circular references. For example:

```typescript
// Car.ts
@Service()
export class Car {
  @Inject()
  engine: Engine;
}

// Engine.ts
@Service()
export class Engine {
  @Inject()
  car: Car;
}
```

This code will not work, because Engine has a reference to Car, and Car has a reference to Engine.
One of them will be undefined and it cause errors. To fix them you need to specify a type in a function this way:

```typescript
// Car.ts
@Service()
export class Car {
  @Inject((type) => Engine)
  engine: Engine;
}

// Engine.ts
@Service()
export class Engine {
  @Inject((type) => Car)
  car: Car;
}
```

And that's all. This does **NOT** work for constructor injections.

### Custom decorators

You can create your own decorators which will inject your given values for your service dependencies.
For example:

```typescript
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
    this.logger.log(`user ${user.firstName} ${user.secondName} has been saved.`);
  }
}
```

### Using service groups

You can group multiple services into single group tagged with service id or token.
For example:

```typescript
// Factory.ts
export interface Factory {
  create(): any;
}

// FactoryToken.ts
export const FactoryToken = new Token<Factory>('factories');

// BeanFactory.ts
@Service({ id: FactoryToken, multiple: true })
export class BeanFactory implements Factory {
  create() {
    console.log('bean created');
  }
}

// SugarFactory.ts
@Service({ id: FactoryToken, multiple: true })
export class SugarFactory implements Factory {
  create() {
    console.log('sugar created');
  }
}

// WaterFactory.ts
@Service({ id: FactoryToken, multiple: true })
export class WaterFactory implements Factory {
  create() {
    console.log('water created');
  }
}

// app.ts
// now you can get all factories in a single array
Container.import([BeanFactory, SugarFactory, WaterFactory]);
const factories = Container.getMany(FactoryToken); // factories is Factory[]
factories.forEach((factory) => factory.create());
```

### 使用多容器和作用域容器

默认情况下,所有服务都存储在全局默认容器中。如果你希望服务根据不同的上下文(如 HTTP 请求)具有不同的行为和数据,可以为不同的上下文使用不同的容器。

```typescript
// QuestionController.ts
@Service()
export class QuestionController {
  constructor(protected questionRepository: QuestionRepository) {}

  save() {
    this.questionRepository.save();
  }
}

// QuestionRepository.ts
@Service()
export class QuestionRepository {
  save() {}
}

// app.ts
// 为每个请求创建独立容器
const request1Container = Container.of('request-1');
const controller1 = request1Container.get(QuestionController);
controller1.save();

// 请求完成后清理容器
await request1Container.dispose();

const request2Container = Container.of('request-2');
const controller2 = request2Container.get(QuestionController);
controller2.save();

await request2Container.dispose();
```

在这个例子中,`controller1` 和 `controller2` 是完全不同的实例,它们使用的 `QuestionRepository` 也是不同的实例。

#### 服务作用域

TypeDI 支持三种服务作用域:

**Singleton**: 全局单例,所有容器共享同一实例

```typescript
@Service({ scope: 'singleton' })
export class ConfigService {
  // 所有容器都会获得同一个实例
}
```

**Container**: 容器作用域(默认),每个容器维护独立实例

```typescript
@Service({ scope: 'container' }) // 或 @Service()
export class RequestContext {
  // 每个容器有独立的实例
}
```

**Transient**: 临时作用域,每次获取都创建新实例

```typescript
@Service({ scope: 'transient' })
export class CommandHandler {
  // 每次 Container.get() 都创建新实例
}
```

#### 容器继承

子容器可以继承父容器的服务:

```typescript
// 创建父容器并注册服务
const parentContainer = Container.of('parent');
parentContainer.set({ id: 'shared-config', value: { debug: true } });

// 创建继承父容器的子容器
const childContainer = parentContainer.of('child');

// 子容器可以访问父容器的服务
const config = childContainer.get('shared-config'); // ✓ 可以访问

// 禁用继承
const isolatedContainer = Container.of('isolated', { inherit: false });
// isolatedContainer.get('shared-config'); // ✗ 抛出错误
```

TypeDI also supports a function dependency injection. Here is how it looks like:

```javascript
export const PostRepository = Service(() => ({
  getName() {
    return 'hello from post repository';
  },
}));

export const PostManager = Service(() => ({
  getId() {
    return 'some post id';
  },
}));

export class PostQueryBuilder {
  build() {
    return 'SUPER * QUERY';
  }
}

export const PostController = Service(
  [PostManager, PostRepository, PostQueryBuilder],
  (manager, repository, queryBuilder) => {
    return {
      id: manager.getId(),
      name: repository.getName(),
      query: queryBuilder.build(),
    };
  },
);

const postController = Container.get(PostController);
console.log(postController);
```

### 移除注册的服务或重置容器状态

如果需要从容器中移除已注册的服务,使用 `Container.remove()` 方法:

```typescript
import { Container, Service } from 'typedi';

@Service()
class TempService {
  dispose() {
    console.log('Cleaning up...');
  }
}

Container.get(TempService);
Container.remove(TempService); // 输出: Cleaning up...

// 批量移除
Container.remove([ServiceA, ServiceB, ServiceC]);
```

重置容器有两种策略:

```typescript
// 仅重置服务值,保留注册信息
Container.reset({ strategy: 'resetValue' });

// 完全清除所有服务注册
Container.reset({ strategy: 'resetServices' });
```

销毁容器及其所有服务:

```typescript
const scopedContainer = Container.of('request-123');
// 使用容器...

// 完全销毁容器
await scopedContainer.dispose();
// 容器销毁后无法再使用
```
