# TypeDI 文档系统设置指南

本文档介绍 TypeDI 项目的文档系统配置,包括 GitBook 集成和 GitHub Actions 自动部署。

## 📖 系统概览

- **文档工具**: GitBook
- **部署平台**: GitHub Pages
- **自动化**: GitHub Actions
- **文档位置**: `/docs` 目录

## 🏗️ 文件结构

```
typedi/
├── .gitbook.yaml                          # GitBook 配置文件
├── .github/
│   └── workflows/
│       └── deploy-docs.yml                # 文档部署工作流
├── docs/
│   ├── README.md                          # 文档首页
│   ├── SUMMARY.md                         # 目录结构
│   ├── CONTRIBUTING.md                    # 文档贡献指南
│   ├── book.json                          # GitBook 配置
│   ├── styles/
│   │   └── website.css                    # 自定义样式
│   ├── typescript/                        # TypeScript 文档
│   │   ├── 01-getting-started.md
│   │   ├── 02-basic-usage-guide.md
│   │   ├── 03-container-api.md
│   │   ├── 04-service-decorator.md
│   │   ├── 05-inject-decorator.md
│   │   ├── 06-service-tokens.md
│   │   ├── 07-inheritance.md
│   │   ├── 07-usage-with-typeorm.md
│   │   ├── 08-custom-decorators.md
│   │   ├── 09-using-scoped-containers.md
│   │   └── 10-using-transient-services.md
│   └── javascript/                        # JavaScript 文档
│       ├── 01-getting-started.md
│       └── 02-basic-usage.md
└── package.json                           # 包含文档相关脚本
```

## ⚙️ 配置文件说明

### 1. `.gitbook.yaml`

GitBook 项目配置文件:

```yaml
root: ./docs

structure:
  readme: README.md
  summary: SUMMARY.md

redirects:
  previous/page: new-folder/page.md
```

- `root`: 指定文档根目录
- `structure`: 定义主要文件位置
- `redirects`: 配置页面重定向(可选)

### 2. `docs/book.json`

GitBook 详细配置:

```json
{
  "title": "TypeDI Documentation",
  "description": "Dependency injection for TypeScript and JavaScript",
  "language": "zh-hans",
  "plugins": [
    "github",
    "editlink",
    "prism",
    "search-plus",
    "back-to-top-button",
    "copy-code-button",
    "expandable-chapters"
  ],
  "pluginsConfig": {
    "github": {
      "url": "https://github.com/ximing/typedi"
    },
    "editlink": {
      "base": "https://github.com/ximing/typedi/edit/develop/docs",
      "label": "编辑本页"
    }
  }
}
```

**核心配置项**:

- `title`: 文档标题
- `language`: 文档语言(zh-hans 表示简体中文)
- `plugins`: GitBook 插件列表
- `pluginsConfig`: 插件配置

**推荐插件**:

| 插件                  | 功能                         |
| --------------------- | ---------------------------- |
| `github`              | 添加 GitHub 仓库链接         |
| `editlink`            | 添加"编辑本页"链接           |
| `prism`               | 代码高亮(替代默认 highlight) |
| `search-plus`         | 增强搜索功能                 |
| `back-to-top-button`  | 返回顶部按钮                 |
| `copy-code-button`    | 代码复制按钮                 |
| `expandable-chapters` | 可折叠章节                   |
| `splitter`            | 侧边栏宽度调节               |

### 3. `docs/SUMMARY.md`

文档目录结构:

```markdown
# Table of contents

## TypeScript 使用指南

### 快速开始

- [入门指南](typescript/01-getting-started.md)

### 核心概念

- [Container API](typescript/03-container-api.md)

### 高级特性

- [作用域容器](typescript/09-using-scoped-containers.md)
```

### 4. `.github/workflows/deploy-docs.yml`

GitHub Actions 工作流配置:

```yaml
name: Deploy Documentation

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'docs/**'
      - '.gitbook.yaml'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install GitBook CLI
        run: |
          npm install -g gitbook-cli
          gitbook fetch latest

      - name: Build GitBook
        run: |
          cd docs
          gitbook install
          gitbook build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './docs/_book'

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

**触发条件**:

- 推送到 `main` 或 `develop` 分支
- 修改 `docs/` 目录文件
- 手动触发 (`workflow_dispatch`)

## 🚀 快速开始

### 1. 安装 GitBook CLI

全局安装:

```bash
npm install -g gitbook-cli
```

或者使用项目脚本:

```bash
npm run docs:install
```

### 2. 本地预览

启动开发服务器:

```bash
npm run docs:serve
```

访问 http://localhost:4000 查看文档。

### 3. 构建文档

生成静态文档:

```bash
npm run docs:build
```

构建输出在 `docs/_book/` 目录。

### 4. 清理构建文件

```bash
npm run docs:clean
```

## 📝 编辑文档

### 添加新页面

1. 在 `docs/typescript/` 或 `docs/javascript/` 创建 `.md` 文件
2. 在 `docs/SUMMARY.md` 添加链接:

```markdown
### 新章节

- [新功能](typescript/11-new-feature.md)
```

3. 编写内容(使用 Markdown)
4. 本地预览确认

### 修改现有页面

1. 编辑对应的 `.md` 文件
2. 保存并刷新浏览器查看效果
3. 提交更改

### 更新样式

编辑 `docs/styles/website.css` 自定义样式。

## 🔧 高级配置

### 添加 GitBook 插件

1. 编辑 `docs/book.json`:

```json
{
  "plugins": ["existing-plugin", "new-plugin"],
  "pluginsConfig": {
    "new-plugin": {
      "option": "value"
    }
  }
}
```

2. 重新安装插件:

```bash
cd docs
gitbook install
```

### 配置多语言

在 `book.json` 中配置:

```json
{
  "language": "zh-hans",
  "languages": {
    "en": {
      "title": "TypeDI Documentation"
    },
    "zh-hans": {
      "title": "TypeDI 文档"
    }
  }
}
```

### 自定义域名

在 `docs/_book/` 目录添加 `CNAME` 文件:

```
docs.yourdomain.com
```

## 🌐 部署到 GitHub Pages

### 首次设置

1. **启用 GitHub Pages**:
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

2. **配置权限**:
   - Settings → Actions → General
   - Workflow permissions 选择 "Read and write permissions"

3. **推送代码**:

```bash
git add .
git commit -m "Setup GitBook documentation"
git push origin develop
```

4. **查看部署**:
   - 访问 Actions 标签查看工作流状态
   - 部署成功后访问 `https://ximing.github.io/typedi/`

### 自动部署流程

```
代码推送 → GitHub Actions 触发
    ↓
安装 GitBook CLI
    ↓
安装 GitBook 插件
    ↓
构建文档 (gitbook build)
    ↓
上传构建产物
    ↓
部署到 GitHub Pages
    ↓
✅ 文档上线
```

### 手动触发部署

在 GitHub Actions 页面:

1. 选择 "Deploy Documentation" 工作流
2. 点击 "Run workflow"
3. 选择分支并运行

## 📦 npm 脚本

添加到 `package.json`:

```json
{
  "scripts": {
    "docs:install": "cd docs && gitbook install",
    "docs:serve": "cd docs && gitbook serve",
    "docs:build": "cd docs && gitbook build",
    "docs:clean": "rimraf docs/_book"
  }
}
```

**使用方法**:

```bash
# 安装 GitBook 插件
npm run docs:install

# 本地预览
npm run docs:serve

# 构建文档
npm run docs:build

# 清理构建文件
npm run docs:clean
```

## 🐛 常见问题

### 1. GitBook CLI 安装失败

**问题**: `npm install -g gitbook-cli` 报错

**解决**:

```bash
# 使用 npx
npx gitbook-cli install

# 或指定 Node.js 版本
nvm use 14
npm install -g gitbook-cli
```

### 2. 插件安装失败

**问题**: `gitbook install` 报错

**解决**:

```bash
# 清理缓存
rm -rf ~/.gitbook
gitbook install
```

### 3. 本地预览端口占用

**问题**: 4000 端口被占用

**解决**:

```bash
# 指定其他端口
gitbook serve --port 4001
```

### 4. GitHub Pages 404

**问题**: 部署后访问 404

**解决**:

- 检查 Settings → Pages 是否启用
- 确认 Actions 工作流执行成功
- 等待 1-2 分钟让 GitHub Pages 生效

### 5. 样式不生效

**问题**: 自定义样式未应用

**解决**:

```bash
# 清理并重新构建
npm run docs:clean
npm run docs:build
```

## 🎨 自定义样式

编辑 `docs/styles/website.css`:

```css
/* 自定义代码块样式 */
.book .book-body .page-wrapper .page-inner section.normal pre {
  background-color: #1e1e1e;
  border-radius: 5px;
  padding: 16px;
}

/* 自定义标题样式 */
.book .book-body .page-wrapper .page-inner section.normal h1 {
  color: #0366d6;
  border-bottom: 2px solid #0366d6;
}
```

## 📊 监控部署

查看部署状态:

```bash
# 查看最近的工作流运行
gh run list --workflow="Deploy Documentation"

# 查看具体运行日志
gh run view <run-id> --log
```

## 🔐 安全性

### 保护敏感信息

不要在文档中包含:

- API 密钥
- 密码
- 内部 URL
- 敏感配置

### 审查外部链接

定期检查文档中的外部链接是否安全。

## 📈 性能优化

### 1. 图片优化

- 使用压缩的图片
- 优先使用 WebP 格式
- 添加 `loading="lazy"` 属性

### 2. 减少插件

只使用必要的 GitBook 插件,移除不需要的插件以加快构建速度。

### 3. 缓存依赖

GitHub Actions 已配置缓存:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

## 🎯 下一步

- [ ] 添加更多文档内容
- [ ] 集成文档搜索
- [ ] 添加文档版本管理
- [ ] 设置自定义域名
- [ ] 添加文档分析(如 Google Analytics)

## 📚 参考资源

- [GitBook 官方文档](https://docs.gitbook.com/)
- [GitBook CLI GitHub](https://github.com/GitbookIO/gitbook-cli)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 💬 支持

遇到问题?

- 📖 查看 [文档贡献指南](docs/CONTRIBUTING.md)
- 🐛 提交 [Issue](https://github.com/ximing/typedi/issues)
- 💡 发起 [讨论](https://github.com/ximing/typedi/discussions)

---

Happy documenting! 📝✨
