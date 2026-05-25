## 界面布局

主导航「创作」下拉含「项目」「博客」，对应两条阅读流。

### 项目线

**列表 `/projects`** — `frontend/src/views/ProjectsView.vue`

- 顶栏：标题、是否包含归档（`AppSelect`）、按标签筛选。
- 主体：按年份分组的时间轴（`TimelineYearGroup`），每项为项目卡片，点击进入详情。
- 加载态：`TimelinePageSkeleton`；入场 `playPageEnter` + `page-enter-timeline.css`。

**详情 `/projects/:slug`** — `frontend/src/views/ProjectDetailView.vue`

- `article.project-detail` + `div.detail-grid`。
- 顶栏 `top-panel`：`actions-card` 内链接 GitHub、Demo、**笔记**（`RouterLink` 到 `/projects/:slug/notes`，即 DOM 中的 `action-btn`「笔记」）。
- 下方按 `project.layout` 顺序渲染 `ProjectBlockRenderer`（overview / markdown / demo / gallery 等）。

**项目笔记 `/projects/:slug/notes`** — `frontend/src/views/ProjectNotesView.vue`

- 标题区 + `PostCard` 列表，展示绑定该 `project_id` 的 `project_note` 文章。

### 博客线

**列表 `/blog`** — `frontend/src/views/BlogView.vue`

- 分类按钮组（全部 / 杂项 / 项目 / 算法），带滑动 pill 指示器。
- 标签下拉、关键词输入；时间轴展示文章卡片（与项目列表共用时间轴视觉模式）。
- 原独立 `/algorithms` 路由已移除，算法文并入本页筛选。

**详情 `/blog/:slug`** — `frontend/src/views/PostDetailView.vue`

- 标题、元信息、正文区（Markdown HTML 或服务端 `body_html`）。
- 代码块复制：`useMarkdownCodeCopy`；相关文章侧栏调用 related API。

## 数据与 API

统一入口为 `frontend/src/services/contentRepository.ts`。

| 页面 | 调用 | API |
|------|------|-----|
| 项目列表 | `ensureProjectsLoaded()` | `GET /api/projects?include_archived=true` |
| 项目详情 | `getProjectBySlug(slug)` | 内存缓存，来自上表 |
| 项目笔记列表 | `listPostsForProjectSlug(slug)` | `GET /api/posts?type=project_note&project_id=<public_id>` |
| 博客列表 | `listPostsForBlog({ category, tag, keyword })` | `GET /api/posts` 或带 `category_id` 查询 |
| 博文详情 | `getPostBySlug(slug)` | `GET /api/posts/:slug?html=1` |
| 相关推荐 | PostDetailView 内 fetch | `GET /api/posts/:slug/related?limit=5` |

**排序**：`sortPosts` — 置顶优先 → `pinned_order` 升序 → `published_at` 降序（与 `designed/site-design-spec.md` 一致）。

**可见性**：

- `listProjectsPublic` 过滤 `hidden`；可选过滤 `archived`。
- `canAccessProjectPublic` / `canAccessPostPublic`：项目笔记随项目状态，算法/杂项文章独立规则。

**项目 layout**：详情块数据来自 `wiki_project.layout` JSON，前端 `ProjectLayoutBlock` 类型见 `frontend/src/types/content.ts`；组件映射在 `frontend/src/project-blocks/registry.ts`。

## 关键文件

| 职责 | 路径 |
|------|------|
| 项目列表 | `frontend/src/views/ProjectsView.vue` |
| 项目详情 | `frontend/src/views/ProjectDetailView.vue` |
| 项目笔记列表 | `frontend/src/views/ProjectNotesView.vue` |
| 博客列表 | `frontend/src/views/BlogView.vue` |
| 博文详情 | `frontend/src/views/PostDetailView.vue` |
| 内容仓库 | `frontend/src/services/contentRepository.ts` |
| HTTP 封装 | `frontend/src/api/http.ts` |
| 布局块渲染 | `frontend/src/project-blocks/ProjectBlockRenderer.vue` |
| 块注册表 | `frontend/src/project-blocks/registry.ts` |
| 博文卡片 | `frontend/src/components/blog/PostCard.vue` |
| 时间轴入场样式 | `frontend/src/styles/page-enter-timeline.css` |
| 详情入场样式 | `frontend/src/styles/page-enter-post.css` |
| 项目 API 序列化 | `backend/app/project_serialize.py` |
| 文章 API | `backend/app/routes/read_api.py` |

## 实现要点

1. **项目 ID**：API 与笔记 `project_id` 使用 `public_id`（如 `proj-grunray-wiki`），`row_to_project` 将其映射为前端 `Project.id`。
2. **笔记按钮**：`ProjectDetailView` 中 `RouterLink` 的 `to` 为 `` `/projects/${slug}/notes` ``，与导入的 `type: project_note` + `project_id` 配对后，笔记页才有数据。
3. **博客分类**：`BlogCategoryFilter` 映射 `category_id` 1/2/3（杂项/项目/算法），见 `BLOG_CATEGORY_TO_ID`。
4. **缓存**：博客列表按分类写 `sessionStorage`（`grunray-blog-list:*`）；博文详情 `grunray-post-detail:*`；项目列表依赖内存 `projectsCache`，路由切换不重复请求除非 `force`。
5. **SEO**：各 View 均调用 `useSeoMeta`，项目/文章标题动态拼接 `SITE_NAME`（`frontend/src/config/site.ts`）。