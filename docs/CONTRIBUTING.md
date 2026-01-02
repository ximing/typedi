# 文档贡献指南

感谢你对 TypeDI 文档的关注!本指南将帮助你了解如何为文档做出贡献。

## 📚 文档结构

```
docs/
├── README.md              # 文档首页(完整示例)
├── SUMMARY.md             # 文档目录结构
├── book.json              # GitBook 配置
├── styles/                # 自定义样式
│   └── website.css
├── typescript/            # TypeScript 使用指南
│   ├── 01-getting-started.md
│   ├── 02-basic-usage-guide.md
│   ├── 03-container-api.md
│   ├── 04-service-decorator.md
│   ├── 05-inject-decorator.md
│   ├── 06-service-tokens.md
│   ├── 07-inheritance.md
│   ├── 07-usage-with-typeorm.md
│   ├── 08-custom-decorators.md
│   ├── 09-using-scoped-containers.md
│   └── 10-using-transient-services.md
└── javascript/            # JavaScript 使用指南
    ├── 01-getting-started.md
    └── 02-basic-usage.md
```

## 🛠️ 本地开发

### 安装依赖

首先需要安装 GitBook CLI:

```bash
npm install -g gitbook-cli
```

然后安装 GitBook 插件:

```bash
npm run docs:install
# 或者
cd docs && gitbook install
```

### 本地预览

启动本地服务器预览文档:

```bash
npm run docs:serve
# 或者
cd docs && gitbook serve
```

访问 http://localhost:4000 查看文档。

### 构建文档

构建静态文档:

```bash
npm run docs:build
# 或者
cd docs && gitbook build
```

生成的文档位于 `docs/_book/` 目录。

### 清理构建文件

```bash
npm run docs:clean
```

## ✍️ 编写文档

### Markdown 格式

文档使用 Markdown 格式编写,支持:

- 标题 (`#`, `##`, `###` 等)
- 列表(有序和无序)
- 代码块(使用 ``` 包裹)
- 链接和图片
- 表格
- 引用块

### 代码示例

使用带语言标识的代码块:

````markdown
```typescript
import { Container, Service } from 'typedi';

@Service()
class UserService {
  getUsers() {
    return ['Alice', 'Bob'];
  }
}
```
````

支持的语言:

- `typescript` / `ts`
- `javascript` / `js`
- `json`
- `bash` / `shell`

### 内部链接

链接到其他文档页面:

```markdown
详见 [Container API](03-container-api.md)
```

### 注意事项

使用引用块强调重要信息:

```markdown
> **注意:** 确保在应用的第一行导入 `reflect-metadata`。
```

## 📝 文档规范

### 文件命名

- 使用小写字母和连字符
- 按数字前缀排序(如 `01-`, `02-`)
- 使用描述性名称(如 `container-api.md`)

### 标题层级

- 每个文档只有一个一级标题 (`#`)
- 使用合理的标题层级,不要跳级
- 标题要清晰描述内容

### 代码示例

- 提供完整可运行的示例
- 包含必要的导入语句
- 添加注释说明关键代码
- 显示预期输出(使用注释)

示例:

```typescript
import { Container, Service } from 'typedi';

@Service()
class UserService {
  getUsers() {
    return ['Alice', 'Bob'];
  }
}

const service = Container.get(UserService);
console.log(service.getUsers());
// 输出: ['Alice', 'Bob']
```

### 中英文混排

- 中英文之间不需要空格
- 英文术语首次出现时可以加粗
- 保持术语一致性

## 🔄 更新文档

### 添加新页面

1. 在相应目录创建 Markdown 文件
2. 在 `SUMMARY.md` 中添加链接
3. 遵循现有的文件命名规范

### 修改现有页面

1. 确保内容与最新代码一致
2. 更新相关示例
3. 检查内部链接是否有效

### 更新目录

编辑 `docs/SUMMARY.md`:

```markdown
### 快速开始

- [入门指南](typescript/01-getting-started.md)
- [基础用法](typescript/02-basic-usage-guide.md)

### 核心概念

- [Container API](typescript/03-container-api.md)
- [新功能](typescript/11-new-feature.md) ← 添加新链接
```

## 🚀 自动部署

文档通过 GitHub Actions 自动部署到 GitHub Pages。

### 触发条件

- 推送到 `main` 或 `develop` 分支
- 修改 `docs/` 目录下的文件
- 修改 `.gitbook.yaml` 文件

### 部署流程

1. 检出代码
2. 安装 GitBook CLI
3. 安装插件
4. 构建文档
5. 部署到 GitHub Pages

查看 `.github/workflows/deploy-docs.yml` 了解详情。

## 🧪 测试

### 检查链接

确保所有内部链接有效:

```bash
# 手动检查 SUMMARY.md 中的所有链接
grep -o '\[.*\](.*)' docs/SUMMARY.md
```

### 代码示例

确保代码示例可运行:

```bash
# 在项目根目录
npm test
```

### 格式检查

检查 Markdown 格式:

```bash
npm run prettier:check
```

修复格式问题:

```bash
npm run prettier:fix
```

## 📋 提交检查清单

提交前请确认:

- [ ] 代码示例已测试
- [ ] 所有链接有效
- [ ] 更新了 `SUMMARY.md`(如果添加新页面)
- [ ] Markdown 格式正确
- [ ] 本地预览正常
- [ ] 提交信息清晰

## 💡 最佳实践

1. **保持简洁**: 使用简短的句子和段落
2. **示例驱动**: 提供实际可运行的代码示例
3. **循序渐进**: 从简单到复杂组织内容
4. **注重实用**: 关注常见用例和最佳实践
5. **及时更新**: 代码变更时同步更新文档

## 📮 获取帮助

如有问题,欢迎:

- 提交 Issue: https://github.com/ximing/typedi/issues
- 发起讨论: https://github.com/ximing/typedi/discussions
- 提交 PR: https://github.com/ximing/typedi/pulls

感谢你的贡献! 🎉
