import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'TypeDI Documentation',
  tagline: 'Dependency injection for TypeScript and JavaScript',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://ximing.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/typedi/',

  // GitHub pages deployment config.
  organizationName: 'ximing', // GitHub org/user name.
  projectName: 'typedi', // Repo name.

  onBrokenLinks: 'warn',

  // Internationalization configuration
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en',
      },
      'zh-Hans': {
        label: '中文',
        direction: 'ltr',
        htmlLang: 'zh-Hans',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          // Edit links point to GitHub
          editUrl: 'https://github.com/ximing/typedi/edit/develop/website/',
          editLocalizedFiles: true,
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false, // Disable blog for documentation site
        pages: false, // Disable pages plugin to avoid conflicts with docs routeBasePath
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // TypeDI social media card
    image: 'img/typedi-social-card.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'TypeDI',
      logo: {
        alt: 'TypeDI Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/ximing/typedi',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/@rabjs/typedi',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: 'TypeScript 指南',
              to: '/typescript/getting-started',
            },
            {
              label: 'JavaScript 指南',
              to: '/javascript/getting-started',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/ximing/typedi/issues',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/ximing/typedi/discussions',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/@rabjs/typedi',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/ximing/typedi',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TypeStack contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark, // Use VS Dark theme similar to GitBook's Tomorrow theme
      additionalLanguages: ['bash', 'json', 'typescript', 'javascript'],
    },
    algolia: {
      // Search configuration - can be configured later with Algolia DocSearch
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'typedi',
      contextualSearch: true,
      searchParameters: {},
      searchPagePath: 'search',
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
