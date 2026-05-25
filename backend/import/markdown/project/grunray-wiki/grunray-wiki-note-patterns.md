---
title: 前端复用：数据层、缓存与 Composable
slug: grunray-wiki-note-patterns
type: project_note
tags:
  - Vue
  - 架构
  - TypeScript
summary: contentRepository、apiGet、session 缓存、composables 与 project-blocks 扩展方式汇总。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 5
published_at: '2026-05-25T10:00:00'
updated_at: '2026-05-25T18:00:00'
project_id: proj-grunray-wiki
---

## 界面布局

本篇不对应单一页面，而是说明**多页面共用的前端模式**，便于新功能接入时复用同一套约定。

核心分层：

```
Views（页面）
    ↓ 调用
contentRepository / 直接 fetch
    ↓
api/http.ts 或 fetch('/api/...')
    ↓
Vite 开发代理 → Flask /api
```

展示层复用：`components/ui/*Skeleton`、`AppSelect`、`PostCard`；项目详情复用 `project-blocks/*`。

## 数据与 API

### 内容仓库 `contentRepository.ts`

| 函数 | 作用 |
|------|------|
| `ensureProjectsLoaded(force?)` | 单例拉取 `GET /api/projects`，缓存 `projectsCache` |
| `listProjectsPublic` / `getProjectBySlug` | 读缓存，过滤 hidden/archived |
| `listPostsForBlog` | `GET /api/posts` + 前端过滤项目笔记可见性 |
| `listPostsForProjectSlug` | `type=project_note` + `project_id` |
| `getPostBySlug` | `GET /api/posts/:slug?html=1` |
| `sortPosts` | 置顶与发布时间排序 |
| `canAccessPostPublic` / `canAccessProjectPublic` | 统一可见性判断 |

### HTTP 封装 `api/http.ts`

- `apiGet<T>(path)`：拼接可选 `VITE_API_BASE_URL`，`credentials: 'same-origin'`，非 2xx 抛带 `status` 的 Error。
- 博客、项目笔记列表等**推荐**走 `apiGet`；首页 `HomeView` 仍用原生 `fetch`（历史实现，行为等价）。

### RSS 订阅

- 根路径 `GET /rss.xml`（非 `/api` 前缀），由 Flask `backend/app/rss_feed.py` 生成 RSS 2.0，条目与博客公开可见性一致。
- 开发时 Vite 将 `/rss.xml` 代理到后端（`frontend/vite.config.ts`）；生产需在反向代理层转发该路径。

### 缓存策略

| 场景 | 机制 | 键/变量 |
|------|------|---------|
| 项目列表 | 模块级变量 | `projectsCache`、`projectsLoaded` |
| 首页数据 | sessionStorage JSON | `grunray.home.*` via `sessionJsonCache.ts` |
| 博客列表 | sessionStorage | `grunray-blog-list:{category}` |
| 博文详情 | sessionStorage | `grunray-post-detail:{slug}` |

### Composable 一览

| Composable | 用途 |
|------------|------|
| `useSeoMeta` | @unhead/vue 动态 title/description/OG/JSON-LD |
| `usePageEnterAnimation` | `playPageEnter` / `restartPageEnter` |
| `useHeaderToolbarLayoutShift` | 顶栏工具 FLIP |
| `useNavScrollCompact` | 导航栏滚动紧凑 |
| `useMarkdownCodeCopy` | 博文代码块一键复制 |
| `useFooterGrunRayReveal` | 页脚滚动揭示 |
| `useCopyToClipboard` / `useExternalLinkCopy` | 复制辅助 |
| `useXiqiSplitFooter` | 栖息分栏打开时锁定页脚揭示（详见 grunray-wiki-note-xiqi） |

### 项目块扩展

在 `frontend/src/project-blocks/registry.ts` 的 `projectBlockRegistry` 增加 `type → 组件` 映射即可；`ProjectBlockRenderer` 对未知 type 回退 `FallbackBlock.vue`。新增块**无需改** `router` 或 `ProjectDetailView` 模板结构。

### 类型契约

`frontend/src/types/content.ts` 与后端 `row_to_post` / `row_to_project` 字段对齐；改 API 时先改类型与 serialize，再改 View。

### i18n

界面字符串在 `frontend/src/i18n/`；文章 `locale` 字段与界面语言独立，便于日后多语言正文。

## 关键文件

| 职责 | 路径 |
|------|------|
| 内容访问层 | `frontend/src/services/contentRepository.ts` |
| API GET | `frontend/src/api/http.ts` |
| Session 缓存 | `frontend/src/utils/sessionJsonCache.ts` |
| 内容类型 | `frontend/src/types/content.ts` |
| 块注册表 | `frontend/src/project-blocks/registry.ts` |
| SEO | `frontend/src/composables/useSeoMeta.ts` |
| 站点常量 | `frontend/src/config/site.ts` |
| Vite 代理 | `frontend/vite.config.ts` |
| Markdown 阅读样式 | `frontend/src/styles/markdown-reading.css` |
| RSS 生成 | `backend/app/rss_feed.py` |

## 实现要点

1. **先 `ensureProjectsLoaded` 再拉笔记/博客**：任何依赖项目可见性的列表都应 await 项目缓存，避免 `project_id` 过滤时项目尚未加载。
2. **错误与 404**：`getPostBySlug` 捕获 status 404 返回 `undefined`，由 View 展示 NotFound 或骨架切换。
3. **新增页面 checklist**：路由 → View → `useSeoMeta` → 按需 `contentRepository` → 可选 `page-enter-*.css` → i18n 键；若渲染 Markdown HTML，根节点加 `markdown-reading` 类（全局样式已加载）。
4. **与后端导入的关系**：正文在 `backend/content/posts/*.md`，前端只消费 API；本地开发改 import 后需跑 `import_markdown_posts.py`（见项目 Markdown 导入笔记）。
