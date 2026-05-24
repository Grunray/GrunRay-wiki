# Skill 提示词：项目导入与博客类 Markdown 导入

用于之后在 Cursor 中创建 Skill 时，作为 **instructions / 系统提示** 的主体。面向仓库 **GrunRay_wiki**。

输出语言：**简体中文**。改动范围：**仅任务相关文件**，不做无关重构。

---

## Skill 目标

按规范**新增或改写**两类内容：

1. **项目（Project）**：`backend/import/projects/`  
2. **博客类文章（Markdown）**：`backend/import/markdown/`（及用户指定的子目录，如 `project/`、`demo/`）

---

## 一、项目类（`backend/import/projects/`）

### 1.1 路径与命名

- 文件：`backend/import/projects/<slug>.md`（`slug` 建议 kebab-case，与文件名一致）。  
- **参考样板**：`backend/import/projects/crsea.md`。

### 1.2 结构（强制）

- **必须以 YAML front matter 开头**（首行 `---`，字段闭合后再 `---`）。  
- **正文不写长篇**：展示以 `layout` 为准；文末可保留与样板一致的一句说明，例如：  
  `正文区域当前版本**不会写入数据库**；项目展示内容以 \`layout\` 为准。`

### 1.3 Front matter 常用字段

按 `crsea.md` 对齐，至少包含：

| 用途 | 字段 |
|------|------|
| 标识 | `public_id`（如 `proj-xxx`）、`slug` |
| 展示 | `title`、`summary`、`tags`、`locale` |
| 状态 | `status`、`featured`、`year`、`start_date`、`end_date` |
| 外链 | `github_url`、`demo_url`（未提供时可 `''`，由用户手填） |
| 布局 | `layout`（数组：`type`、`title`、`body`；`demo` 可含 `demoUrl`） |
| 关联 | `related_posts`（`[]` 或 slug 列表） |

### 1.4 写作注意

- 概述、亮点放进 `layout[].body`，避免正文与 `layout` 重复堆叠。  
- **不编造** URL、日期、客户信息；缺失则占位或询问用户。

---

## 二、博客类 Markdown（`backend/import/markdown/`）

### 2.1 路径与命名

- 默认：`backend/import/markdown/<slug>.md`。  
- 用户指定子目录时：如 `backend/import/markdown/project/`、`demo/`。  
- 用户要求文件名前缀时（如 `string_*.md`）：**必须遵守**。

### 2.2 Front matter（与导入脚本、模板一致）

常用字段：

- `title`、`slug`（仅字母、数字、`_`、`-`，全局唯一）  
- `type`：`article` | `algorithm` | `project_note`（以 `designed/template.md` 与 `content_tools/import_markdown_posts.py` 为准）  
- `tags`、`summary`（`summary` 含 `...` 时注意 YAML 引号）  
- `locale: zh`  
- `pinned`、`pinned_order`  
- `published_at`、`updated_at`（**用户指定时必须原样使用**）  
- **算法类**：可加 `difficulty`、`oj`、`problem_id`、`series` 等  
- **工程 / Vue 随笔**（仍放在 markdown 目录）：建议 `series: 项目与工程`，与 `project_vue_*`、`project_demo_*` 等一致

### 2.3 正文结构（对齐参考文）

参考：`backend/import/markdown/string_hash_rolling_binary.md`、`project_demo_architecture_vite_flask.md`。

- Front matter 后空行，用 **`##` / `###`** 分节。  
- 代码使用 **fenced code block**（` ```cpp `、` ```js `、` ```text ` 等）。  
- **算法题解**（若用户要求「先主体、再应用」）：  
  - 第一节：**核心模板**（如前缀函数 + KMP + Z 函数）；  
  - 后续：**应用**；**每个应用/函数前**用一小段中文说明用途，再贴代码；  
  - **用户原有代码注释必须保留**，不得删除或篡改注释语义。  
- **工程 / Vue 类**：写成**通用问题与方案**，避免绑定具体业务页名、Tab 名、客户项目名（除非用户明确要求保留）。  
- **架构 / 部署**：路径写泛化形式，如 `backend/**/demos`、`/api/**/files/`，避免写死仅本机路径。  
- 语气：**避免**「你的模板」「你给出的」等第二人称套话，用中性书面语。

### 2.4 从单文件拆多篇

用户要求「**每个大结构体一篇**」时：每篇独立文件、独立 `slug`，每篇含模板 + 应用说明 + 用户给定的时间字段。

### 2.5 题解原文保护

用户声明「某句说明不得修改」时：该句**逐字保留**，仅在外围增加 Markdown 结构（标题、列表、代码块），**不改原句**。

---

## 三、横切规则（两类共用）

1. **只改任务涉及的文件**。  
2. **日期**：以用户或会话中的 `Today's date` 为准；用户明确 `published_at` / `updated_at` 时必须一致。  
3. **slug**：合法字符、唯一；与命名策略一致。  
4. **数据源**：项目以 `layout` 为准；博文以 front matter + 正文为准（与仓库模板说明一致）。  
5. 修改后对**本次编辑的文件路径**检查 lints（若 IDE 提供）。

---

## 四、Skill 触发描述（示例）

当用户要：

- 新建/改写 **`backend/import/projects`** 下的项目文件，或  
- 新建/改写 **`backend/import/markdown`** 下的博文（算法、工程笔记、架构文等），

则分别执行本提示词的 **「一、项目类」** 或 **「二、博客类 Markdown」** 流水线；若用户给出参考文件路径（如 `crsea.md`、`string_hash_rolling_binary.md`），**优先打开并对齐格式**。

---

## 五、与本仓库的对应关系（便于 Skill 内链）

| 类型 | 目录 | 参考 |
|------|------|------|
| 项目 | `backend/import/projects/` | `crsea.md` |
| 博文模板说明 | `designed/template.md` | 导入字段说明 |
| 博文示例 | `backend/import/markdown/` | `string_hash_rolling_binary.md`、`project_demo_architecture_vite_flask.md` |
