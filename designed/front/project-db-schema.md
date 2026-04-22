# 项目（Projects）数据库表设计

> 与 `designed/front/project-timeline-spec.md`、前端 `Project` 类型及现有 `post` 表风格对齐。  
> 本文仅描述**表结构与约定**，不含具体迁移/脚本实现。

---

## 1. 设计目标

- 一条记录对应一个「项目」，供时间线列表与详情页 API 读取。
- `layout` 与前端 `ProjectLayoutBlock[]` 同构，避免二次建模。
- `related_posts_json` 仅存**手动精选**；与 `project_note` 的**自动关联**在 API 层合并（见规格文档）。
- 与现有文章体系兼容：`post.extra.project_id` 建议继续存 **`public_id`**（字符串，如 `proj-demo-app`），与导入 Markdown 一致。

---

## 2. 主表：`wiki_project`

采用单表 + JSON 字段承载可变结构（与 `post.keywords`、`post.extra` 一致）。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `BIGINT` | PK, AUTO_INCREMENT | 内部主键，可选用于未来外键 |
| `public_id` | `VARCHAR(64)` | NOT NULL, UNIQUE | 对外稳定 ID，与 `post.extra.project_id`、旧 `projects.json` 的 `id` 对齐 |
| `slug` | `VARCHAR(255)` | NOT NULL, UNIQUE | URL 段，如 `demo-app` |
| `locale` | `VARCHAR(8)` | NOT NULL, DEFAULT `'zh'` | 语言 |
| `title` | `VARCHAR(512)` | NOT NULL | 项目标题（时间线与详情共用） |
| `summary` | `TEXT` | NULL | 摘要 |
| `tags` | `JSON` | NULL | 字符串数组，如 `["Vue","TypeScript"]` |
| `status` | `TINYINT` | NOT NULL | `0=published` `1=archived` `2=hidden`（与前端 `ProjectStatus` 枚举一致即可） |
| `featured` | `TINYINT(1)` | NOT NULL, DEFAULT 0 | 首页精选等 |
| `year` | `SMALLINT` | NULL | **可选遗留字段**；时间线排序以 `start_date` 为准 |
| `start_date` | `DATE` | NULL | 时间线主排序；导入脚本应保证已发布项目非空 |
| `end_date` | `DATE` | NULL | 结束日；空表示「进行中」 |
| `github_url` | `VARCHAR(1024)` | NULL | 仓库外链；允许 NULL 便于草稿导入 |
| `demo_url` | `VARCHAR(1024)` | NULL | Demo 托管地址，如 `/api/media/files/demos/.../index.html` |
| `layout` | `JSON` | NOT NULL | 详情块数组，与前端 `layout` 一致 |
| `related_posts_json` | `JSON` | NULL | 手动精选相关文章，见 §3 |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

### 2.1 索引建议

- `UNIQUE KEY uq_wiki_project_public_id (public_id)`
- `UNIQUE KEY uq_wiki_project_slug (slug)`
- `KEY idx_wiki_project_status (status)` — 列表过滤 `hidden`
- `KEY idx_wiki_project_start_date (start_date)` — 时间线按开始日排序
- （可选）`KEY idx_wiki_project_featured (featured, start_date)` — 首页精选

### 2.2 `status` 与列表可见性

- 列表/时间线 API：仅 `status IN (0, 1)`，且可按参数是否包含 `archived`。
- `status = 2 (hidden)`：不进入列表；直接按 `slug` 访问详情可返回 404（与现网约定一致）。

---

## 3. `related_posts_json` 结构（手动精选）

类型：**JSON 数组**。元素对象建议：

```json
[
  { "slug": "demo-app-ui-polish", "label": "UI 记录", "pinned": true },
  { "slug": "memoization-vs-tabulation" }
]
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `slug` | string | 是 | 对应 `post.slug` |
| `label` | string | 否 | 展示用短标签 |
| `pinned` | boolean | 否 | 合并排序时置顶 |

**约定**：库内只存 `slug`；标题等展示字段由 API 联表 `post` 补齐（避免改标题后数据不一致）。

---

## 4. `layout` JSON 结构

与前端 `ProjectLayoutBlock[]` 一致，例如：

```json
[
  { "type": "overview", "title": "概览", "body": "..." },
  { "type": "demo", "title": "在线演示", "demoUrl": "/api/media/files/demos/task-board/v1/index.html", "body": "..." },
  { "type": "gallery", "title": "截图", "images": ["..."] }
]
```

块级扩展字段可放在 `meta`（`Record<string, unknown>`），与现前端类型一致。

---

## 5. 与 `post` 表的关系（逻辑）

- **自动关联**：`post.type = project_note`（DB 中为对应 `type` 值）且 `post.extra->>'$.project_id' = wiki_project.public_id`。
- **不建数据库外键**：`extra` 为 JSON，MySQL 不便声明 FK；由应用层与导入脚本保证引用有效。

---

## 6. 可选扩展（非首版必须）

| 方案 | 说明 |
|------|------|
| 拆 `wiki_project_block` 表 | 块数量极大或需单块版本管理时再拆；首版 JSON 更简单 |
| `legacy_id` | 若需与旧系统第二套 ID 对齐，可增加列，与 `post.legacy_id` 命名一致 |
| 全文搜索 | 可对 `title/summary` 加 `FULLTEXT`，或继续走应用层搜索 |

---

## 7. 参考 DDL（MySQL 8+）

以下为可直接作为增量脚本草稿（表名可按团队习惯微调）：

```sql
CREATE TABLE IF NOT EXISTS `wiki_project` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(64) NOT NULL COMMENT '对外 ID，与 post.extra.project_id 对齐',
  `slug` VARCHAR(255) NOT NULL,
  `locale` VARCHAR(8) NOT NULL DEFAULT 'zh',
  `title` VARCHAR(512) NOT NULL,
  `summary` TEXT NULL,
  `tags` JSON NULL COMMENT '字符串数组',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0 published 1 archived 2 hidden',
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `year` SMALLINT NULL DEFAULT NULL COMMENT '可选，遗留/展示用',
  `start_date` DATE NULL DEFAULT NULL COMMENT '时间线主排序',
  `end_date` DATE NULL DEFAULT NULL,
  `github_url` VARCHAR(1024) NULL DEFAULT NULL,
  `demo_url` VARCHAR(1024) NULL DEFAULT NULL COMMENT '可与 layout 中 demo 块一致或冗余',
  `layout` JSON NOT NULL COMMENT 'ProjectLayoutBlock[]',
  `related_posts_json` JSON NULL COMMENT '手动精选 RelatedPostRef[]',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wiki_project_public_id` (`public_id`),
  UNIQUE KEY `uq_wiki_project_slug` (`slug`),
  KEY `idx_wiki_project_status` (`status`),
  KEY `idx_wiki_project_start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 8. 与导入脚本的关系（简述）

- 导入脚本将 YAML/JSON 源映射为上述列，写入 `wiki_project`。
- `npm run build:demos` 仍负责 Demo 静态产物；导入时只校验/写入 `demo_url` 与 `layout` 中引用是否一致。
