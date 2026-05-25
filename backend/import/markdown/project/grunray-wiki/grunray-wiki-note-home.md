---
title: 首页：三栏布局与文章预览
slug: grunray-wiki-note-home
type: project_note
tags:
  - Vue
  - 首页
  - API
summary: HomeView 三栏栅格、最新文章与随机推荐接口、胶片墙与 session 缓存说明。
locale: zh
series: 项目与工程
pinned: true
pinned_order: 1
published_at: '2026-05-25T10:00:00'
updated_at: '2026-05-25T10:00:00'
project_id: proj-grunray-wiki
---

## 界面布局

首页路由为 `/`，视图组件为 `frontend/src/views/HomeView.vue`。根节点为 `section.home-layout`，使用 CSS Grid 三列等分：

```
┌─────────────┬─────────────────┬─────────────┐
│ left-ellipse│     center      │ right-panel │
│ 文章预览区   │ 头像 + 文案卡片  │  FilmFeed   │
└─────────────┴─────────────────┴─────────────┘
```

**左栏 `aside.left-ellipse`**：玻璃拟态竖条容器，内含两块面板。

- `left-latest-panel`：标题「最新三篇文章」，下方 `v-for` 渲染最多 3 张 `RouterLink` 卡片（`latest-post-card`），链到 `/blog/:slug`。
- `left-random-panel`：标题「随机推荐」，单张推荐卡或空状态占位。

**中栏 `div.center`**：

- `div.avatar`：头像图或 `AvatarCircleSkeleton` 占位；支持开屏动画交接类名 `home-avatar--splash-fly`（与 `stores/ui.ts` 的 `splashAvatarHandoff` 联动）。
- `greeting-art`、`internship-note`、`self-intro-box`：文案来自 vue-i18n（`home.greeting` 等）与固定中文自我介绍块。

**右栏 `aside.right-panel`**：挂载 `frontend/src/components/media/FilmFeed.vue`，垂直滚动胶片墙。

路由在 `frontend/src/router/index.ts` 为首页设置 `meta.appMainLayout: 'full-viewport'`，由 `AppShell` 去掉默认主区内边距，使三栏贴近视口高度（`min-height: calc(100vh - 2rem)`）。

## 数据与 API

`onMounted` 中并行调用三个加载函数，并执行 `playPageEnter(homeRoot)`。

| 功能 | HTTP | 前端函数 | 响应字段 |
|------|------|----------|----------|
| 最新三篇 | `GET /api/posts/latest-updated` | `loadLatestUpdatedPost` | `{ posts: Post[] }`，后端按 `updated_at` 降序 LIMIT 3 |
| 随机推荐 | `GET /api/posts/random-recommend` | `loadRandomRecommendedPost` | `{ post: Post }`，`ORDER BY RAND() LIMIT 1` |
| 头像 | `GET /api/media/list?page=1&size=1&folder=film/homeView/center/avatar` | `loadAvatar` | `data[0].url` |
| 胶片墙 | `GET /api/media/list/filmfeed?page=1&size=50` | `FilmFeed.loadMedia` | `data: MediaItem[]` |

后端实现见 `backend/app/routes/read_api.py` 中 `latest_updated_post`、`random_recommend_post`；媒体列表在同文件或 media 相关路由。

**Session 缓存**：`frontend/src/utils/sessionJsonCache.ts` 的 `readSessionJson` / `writeSessionJson`，键名：

- `grunray.home.avatarUrl.v1`
- `grunray.home.latestPosts.v1`
- `grunray.home.randomPost.v1`

命中缓存则跳过网络请求，刷新标签页后同会话仍显示旧数据，直至关闭标签页。

**SEO**：`useSeoMeta`（`frontend/src/composables/useSeoMeta.ts`）设置标题为「首页 | 站点名」、description 为 `home.tagline`。

## 关键文件

| 职责 | 路径 |
|------|------|
| 首页视图与布局样式 | `frontend/src/views/HomeView.vue` |
| 胶片墙组件 | `frontend/src/components/media/FilmFeed.vue` |
| 圆形头像骨架 | `frontend/src/components/ui/AvatarCircleSkeleton.vue` |
| 首页入场动画样式 | `frontend/src/styles/page-enter-home.css` |
| 入场动画 composable | `frontend/src/composables/usePageEnterAnimation.ts` |
| Session 缓存工具 | `frontend/src/utils/sessionJsonCache.ts` |
| 路由与 full-viewport meta | `frontend/src/router/index.ts` |
| 最新/随机 API | `backend/app/routes/read_api.py` |
| 全局 UI（开屏头像） | `frontend/src/stores/ui.ts` |

## 实现要点

1. **类型**：列表项使用 `frontend/src/types/content.ts` 的 `Post`；卡片展示 `title`、`tags`、`summary`、`updated_at`（经 `formatDateYmd` 格式化为 `YYYY/MM/DD`）。
2. **错误处理**：`fetch` 失败时保留空列表或占位文案「暂无可展示文章」，不阻断整页。
3. **与壳层关系**：首页不经过 `contentRepository`，直接使用 `fetch`（与博客/项目列表的 `apiGet` 封装并存，见「前端复用」笔记）。
4. **动画**：`homeRoot` ref 传给 `playPageEnter`；样式类与 `page-enter-home.css` 中 keyframes 配合，受 `ui.prefersReducedMotion` 影响时由 composable 内部降级。
