import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // TypeDI documentation sidebar structure based on GitBook SUMMARY.md
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'TypeScript 使用指南',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: '快速开始',
          collapsed: false,
          items: ['typescript/getting-started', 'typescript/basic-usage-guide'],
        },
        {
          type: 'category',
          label: '核心概念',
          collapsed: false,
          items: [
            'typescript/container-api',
            'typescript/service-decorator',
            'typescript/inject-decorator',
            'typescript/service-tokens',
          ],
        },
        {
          type: 'category',
          label: '高级特性',
          collapsed: false,
          items: [
            'typescript/inheritance',
            'typescript/custom-decorators',
            'typescript/using-scoped-containers',
            'typescript/using-transient-services',
          ],
        },
        {
          type: 'category',
          label: '集成',
          collapsed: false,
          items: ['typescript/usage-with-typeorm'],
        },
      ],
    },
    {
      type: 'category',
      label: 'JavaScript 使用指南',
      collapsed: false,
      items: ['javascript/getting-started', 'javascript/basic-usage'],
    },
  ],
};

export default sidebars;
