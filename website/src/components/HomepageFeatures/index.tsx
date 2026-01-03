import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

type FeatureItem = {
  title: ReactNode;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: (
      <Translate
        id="homepage.features.easy-to-use.title"
        description="Title of feature on homepage">
        简单易用
      </Translate>
    ),
    icon: '🎯',
    description: (
      <Translate
        id="homepage.features.easy-to-use.description"
        description="Description of easy to use feature">
        通过简洁的装饰器语法实现依赖注入，让你的代码更加清晰和可维护。
        只需要几行代码就能开始使用 TypeDI。
      </Translate>
    ),
  },
  {
    title: (
      <Translate
        id="homepage.features.typescript-first.title"
        description="Title of TypeScript feature on homepage">
        TypeScript 优先
      </Translate>
    ),
    icon: '📦',
    description: (
      <Translate
        id="homepage.features.typescript-first.description"
        description="Description of TypeScript feature">
        为 TypeScript 设计，提供完整的类型支持和智能提示。
        同时也完美支持 JavaScript 项目。
      </Translate>
    ),
  },
  {
    title: (
      <Translate
        id="homepage.features.lightweight.title"
        description="Title of lightweight feature on homepage">
        轻量级
      </Translate>
    ),
    icon: '⚡',
    description: (
      <Translate
        id="homepage.features.lightweight.description"
        description="Description of lightweight feature">
        零外部依赖，体积小巧。支持多种注入方式：
        构造函数注入、属性注入和服务定位器模式。
      </Translate>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}