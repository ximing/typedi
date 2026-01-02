import 'reflect-metadata';
import { Container } from '../src/index';
import { Service } from '../src/decorators/service.decorator';
import { ContainerInstance } from '../src/container-instance.class';

describe('Container Inheritance', () => {
  beforeEach(() => Container.reset({ strategy: 'resetValue' }));
  afterEach(async () => {
    // 清理所有容器,防止 ID 冲突
    await Container.reset({ strategy: 'resetValue' });
  });

  describe('5.1 继承模式测试', () => {
    it('应该支持 inherit: false 隔离模式', () => {
      @Service()
      class GlobalService {
        value = 'global';
      }

      // 全局容器注册服务
      const globalService = Container.get(GlobalService);
      expect(globalService.value).toBe('global');

      // 创建隔离容器
      const isolated = new ContainerInstance('isolated', { inherit: false });

      // 隔离容器无法访问全局服务
      expect(() => isolated.get(GlobalService)).toThrow();
    });

    it('应该支持 inherit: true 继承模式(默认)', () => {
      @Service()
      class GlobalService {
        value = 'global';
      }

      Container.get(GlobalService);

      // 创建继承容器(默认 inherit: true)
      const child = Container.of('child');

      // 可以访问全局服务
      const service = child.get(GlobalService);
      expect(service.value).toBe('global');
    });

    it('应该支持服务覆盖', () => {
      @Service()
      class BaseService {
        getValue() {
          return 'base';
        }
      }

      class OverrideService extends BaseService {
        getValue() {
          return 'override';
        }
      }

      // 全局容器注册基础服务
      Container.get(BaseService);

      // 子容器覆盖服务
      const child = Container.of('child');
      child.set({ id: BaseService, type: OverrideService });

      const service = child.get(BaseService);
      expect(service.getValue()).toBe('override');

      // 全局容器不受影响
      const globalService = Container.get(BaseService);
      expect(globalService.getValue()).toBe('base');
    });
  });

  describe('5.2 查询流程测试', () => {
    it('应该优先查询本容器', () => {
      @Service()
      class TestService {
        value: string;
        constructor() {
          this.value = 'default';
        }
      }

      // 全局容器
      const global = Container.get(TestService);
      global.value = 'global';

      // 子容器覆盖
      const child = Container.of('child');
      child.set({ id: TestService, type: TestService });
      const childService = child.get(TestService);
      childService.value = 'child';

      // 验证各自独立
      expect(Container.get(TestService).value).toBe('global');
      expect(child.get(TestService).value).toBe('child');
    });

    it('应该支持 parent 查询', () => {
      @Service()
      class ServiceA {
        name = 'A';
      }

      @Service()
      class ServiceB {
        name = 'B';
      }

      // 全局容器注册
      Container.get(ServiceA);
      Container.get(ServiceB);

      // 子容器应该能访问
      const child = Container.of('child');
      expect(child.get(ServiceA).name).toBe('A');
      expect(child.get(ServiceB).name).toBe('B');
    });

    it('应该支持 singleton 优先查询', () => {
      class SingletonService {
        id = Math.random();
      }

      // 在全局容器注册 singleton
      Container.set({ id: 'singleton', type: SingletonService, scope: 'singleton' });

      const global = Container.get<SingletonService>('singleton');

      // 子容器获取同一实例
      const child = Container.of('child');
      const childInstance = child.get<SingletonService>('singleton');

      expect(childInstance.id).toBe(global.id);
      expect(childInstance).toBe(global);
    });

    it('inherit: false 应该禁用 parent 查询', () => {
      @Service()
      class ParentService {}

      Container.get(ParentService);

      // 创建隔离子容器
      const isolated = new ContainerInstance('isolated-parent', { inherit: false }, Container);

      // 无法访问父容器服务
      expect(() => isolated.get(ParentService)).toThrow();
    });
  });

  describe('5.3 Resolution Scope 测试', () => {
    it('singleton 应该在 root 容器创建', () => {
      class MySingleton {
        id = Math.random();
      }

      const child = Container.of('child');
      child.set({ id: 'test', type: MySingleton, scope: 'singleton' });

      const instance = child.get<MySingleton>('test');

      // 从全局容器也能获取同一实例
      const globalInstance = Container.get<MySingleton>('test');
      expect(globalInstance).toBe(instance);
    });

    it('singleton 应该跨容器共享', () => {
      class SharedService {
        counter = 0;
      }

      Container.set({ id: 'shared', type: SharedService, scope: 'singleton' });

      const child1 = Container.of('child1');
      const child2 = Container.of('child2');

      const instance1 = child1.get<SharedService>('shared');
      const instance2 = child2.get<SharedService>('shared');
      const globalInstance = Container.get<SharedService>('shared');

      instance1.counter++;
      expect(instance2.counter).toBe(1);
      expect(globalInstance.counter).toBe(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(globalInstance);
    });

    it('container scope 应该在各容器独立缓存', () => {
      class ContainerScopedService {
        id = Math.random();
      }

      Container.set({ id: 'scoped', type: ContainerScopedService, scope: 'container' });

      const child1 = Container.of('child1');
      const child2 = Container.of('child2');

      const instance1 = child1.get<ContainerScopedService>('scoped');
      const instance2 = child2.get<ContainerScopedService>('scoped');
      const globalInstance = Container.get<ContainerScopedService>('scoped');

      // 各容器实例不同
      expect(instance1).not.toBe(instance2);
      expect(instance1).not.toBe(globalInstance);
      expect(instance2).not.toBe(globalInstance);

      // 但同一容器内复用
      expect(child1.get<ContainerScopedService>('scoped')).toBe(instance1);
      expect(child2.get<ContainerScopedService>('scoped')).toBe(instance2);
    });

    it('transient scope 应该每次创建新实例', () => {
      class TransientService {
        id = Math.random();
      }

      Container.set({ id: 'transient', type: TransientService, scope: 'transient' });

      const instance1 = Container.get<TransientService>('transient');
      const instance2 = Container.get<TransientService>('transient');

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });
  });

  describe('5.5 多层继承测试', () => {
    it('应该支持 3 层及以上继承', () => {
      @Service()
      class RootService {
        level = 'root';
      }

      Container.get(RootService);

      // 创建多层继承 - 使用唯一ID
      const child = Container.of('multi-level-child');
      const grandchild = new ContainerInstance('multi-level-grandchild', { inherit: true }, child);
      const greatGrandchild = new ContainerInstance('multi-level-great-grandchild', { inherit: true }, grandchild);

      // 最深层应该能访问根服务
      const service = greatGrandchild.get(RootService);
      expect(service.level).toBe('root');
    });

    it('应该支持递归查询', () => {
      @Service()
      class Level0 {
        value = 0;
      }

      class Level1 {
        value = 1;
      }

      class Level2 {
        value = 2;
      }

      // 根容器
      Container.get(Level0);

      // 第一层 - 使用唯一ID
      const child = Container.of('recursive-child');
      child.set({ id: 'level1', type: Level1 });

      // 第二层 - 使用唯一ID
      const grandchild = new ContainerInstance('recursive-grandchild', { inherit: true }, child);
      grandchild.set({ id: 'level2', type: Level2 });

      // 从最深层查询
      expect(grandchild.get(Level0).value).toBe(0);
      expect(grandchild.get<Level1>('level1').value).toBe(1);
      expect(grandchild.get<Level2>('level2').value).toBe(2);

      // 中间层无法访问孙子层的服务
      expect(() => child.get<Level2>('level2')).toThrow();
    });
  });

  describe('5.7 边界情况测试', () => {
    it('应该正确处理服务不存在的情况', () => {
      const child = Container.of('child');

      class NonExistentService {}

      expect(() => child.get(NonExistentService)).toThrow(
        'Service with "MaybeConstructable<NonExistentService>" identifier was not found',
      );
    });

    it('应该防止对已清理容器的操作', async () => {
      const child = Container.of('disposable');

      @Service()
      class TestService {}

      child.set({ id: TestService, type: TestService });
      child.get(TestService);

      await child.dispose();

      // 清理后无法操作
      expect(() => child.get(TestService)).toThrow('Cannot use container after it has been disposed');
      expect(() => child.set({ id: 'test', type: TestService })).toThrow(
        'Cannot use container after it has been disposed',
      );
    });
  });
});
