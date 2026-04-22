# 项目页改造小规格（前后端对齐）

## 1. 背景与目标

- 当前 `ProjectsView` 为卡片列表，数据来自前端本地 `projects.json`。
- 目标改为「垂直时间线」展示项目，按项目开始时间排序。
- 点击项目卡片默认跳转到项目配置的 GitHub 链接。
- 保留站内详情页 `ProjectDetailView`，用于沉淀项目说明。
- 采用「自动关联 + 手动精选」双轨展示相关文章。

## 2. 页面与交互范围

### 2.1 `ProjectsView`（项目总览）

- 展示形态：垂直时间线（参考用户给定样式）。
- 排序规则：按 `start_date` 倒序（最新开始的项目在上）。
- 点击行为：
  - 默认点击卡片打开 `github_url`（新窗口）。
  - 可保留一个次级入口进入站内详情（例如「查看详情」小链接/按钮）。
- 时间线节点信息建议：
  - 左侧：日期（至少 `MM-DD`，年份分组可选）。
  - 右侧：项目标题、简述、标签、状态。

### 2.2 `ProjectDetailView`（项目详情）

- 保留现有详情展示能力（summary、tags、layout）。
- 新增「相关文章」卡片区域（仅在有数据时显示）。

### 2.3 `ProjectNotesView`（项目笔记列表）

- 短期可保留，避免破坏现有路由。
- 中长期可降级为次要入口（从详情页进入），不作为主流程。

## 3. 数据模型（建议）

> 以下是目标模型，先定义契约，后续分步落地。

### 3.1 项目基础字段（新增/完善）

- `start_date: string`（必填，`YYYY-MM-DD`）
- `end_date?: string`（可选，`YYYY-MM-DD`）
- `github_url: string`（必填，项目外链）
- `title: string`（时间线与详情共用，不区分第二标题）

### 3.2 相关文章（手动精选）

- `related_posts_json?: RelatedPostRef[]`（可空）
- `RelatedPostRef` 建议字段：
  - `slug: string`（必填，站内文章唯一标识）
  - `label?: string`（可选，业务标签，如“复盘”“实现细节”）
  - `pinned?: boolean`（可选，是否在相关文章区置顶）

## 4. 相关文章双轨策略

## 4.1 自动关联

- 规则：`post.type = project_note` 且 `post.project_id = 当前项目id`。
- 用于减少手工维护成本。

## 4.2 手动精选

- 来源：项目表 `related_posts_json`。
- 作用：可挂载普通文章/算法文章，或突出重点项目笔记。

## 4.3 合并与显示

- 后端返回建议为已合并结果：`manual + auto`，按 `slug` 去重。
- 排序建议：
  1) `manual` 中 `pinned=true` 优先；
  2) 其余按 `published_at` 倒序。
- 若最终为空：前端不渲染「相关文章」卡片。

## 5. 后端接口建议（后续实现）

> 当前后端尚无 `projects` 独立接口，此节为待实现契约。

- `GET /api/projects`
  - 返回项目时间线列表（含 `start_date`、`github_url` 等）。
- `GET /api/projects/:slug`
  - 返回项目详情及 `related_posts`（可返回已合并结果）。

返回结构建议示意：

- 列表项包含：`id, slug, title, summary, tags, status, start_date, end_date, github_url`
- 详情包含：列表项字段 + `layout` + `related_posts[]`

## 6. 前端渲染规则（关键约束）

- 时间线排序严格使用 `start_date`，不再使用 `year` 作为主排序字段。
- `github_url` 缺失时，卡片不可点击，并展示禁用态（避免空跳转）。
- 日期解析失败时，降级显示原始字符串，不阻断页面。
- `related_posts` 为空时，不展示详情页相关文章卡片。

## 7. 分阶段实施建议

### Phase 1（仅前端）

- 在前端本地数据结构中补齐 `start_date`、`github_url` 等字段。
- `ProjectsView` 改为垂直时间线样式与交互。
- 保持与当前后端解耦，先完成视觉与交互验证。

### Phase 2（接后端）

- 新增项目表与 `projects` 读取 API。
- 支持 `related_posts_json` 字段读取与合并逻辑。
- 前端 `contentRepository` 切换到项目 API。

### Phase 3（收敛）

- 评估 `ProjectNotesView` 是否保留独立入口。
- 完善管理端/导入脚本，降低维护成本。

## 8. 待确认项（实现前一次性定稿）

- 时间线点击是否「整卡可点」还是「仅标题/按钮可点」。
- 外链打开方式是否固定新窗口（推荐 `target="_blank"`）。
- `related_posts_json` 是仅存 `slug` 还是同时冗余 `title`（推荐仅 `slug`）。
- 是否保留“筛选归档/标签”能力，或改为更轻量的筛选交互。
