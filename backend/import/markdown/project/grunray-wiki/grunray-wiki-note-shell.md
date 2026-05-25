---
title: 全局壳层：导航与页脚
slug: grunray-wiki-note-shell
type: project_note
tags:
  - Vue
  - 布局
  - 导航
summary: AppShell 顶栏工具区、SiteNav 分组导航、页脚品牌区与路由级背景联动。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 3
published_at: '2026-05-25T10:00:00'
updated_at: '2026-05-25T10:00:00'
project_id: proj-grunray-wiki
---

## 界面布局

全站壳层由 `frontend/src/components/layout/AppShell.vue` 包裹所有子路由（`router/index.ts` 中父路由 `component: AppShell`）。

```
┌──────────────────────────────────────────────┐
│ glass-nav-sticky-wrap（顶栏：导航 + 工具按钮）   │
├──────────────────────────────────────────────┤
│ main.app-main（RouterView 页面内容）           │
├──────────────────────────────────────────────┤
│ FooterGrunRayPanel（页脚品牌、外链、元信息）    │
└──────────────────────────────────────────────┘
```

**顶栏左侧**：`header-left` 内嵌 `SiteNav`（`nav.nav--shell`）。

- 直链「首页」→ `/`
- `SiteNavGroup` ×3：创作（项目、博客）、社区（留言、友链）、栖息（碎念、关于、推荐）
- 下拉菜单由 `frontend/src/components/layout/SiteNavGroup.vue` 实现，文案来自 i18n（`nav.groupCreate` 等）

**顶栏右侧**：主题切换、语言切换、照片背景开关、光标轨迹、音乐播放器入口；窄屏时部分收入「溢出」面板（`overflowOpen`），展开/收起配合 FLIP 动画。

**页脚**：`FooterGrunRayPanel.vue` 组合：

- `FooterGrunRayBrand.vue` — 品牌与标语
- `FooterExternalLinks.vue` — 外链图标条
- `FooterGrunRayMetaBar.vue` — 版权、RSS 等元信息

样式集中在 `frontend/src/styles/footer-grunray.css`；滚动揭示逻辑见 `useFooterGrunRayReveal.ts`。

## 数据与 API

壳层本身以**静态配置 + Pinia** 为主，不拉取业务列表 API。

| 能力 | 数据来源 |
|------|----------|
| 导航文案 | `frontend/src/i18n/locales/zh.json`、`en.json` |
| 主题/光标/音乐/照片背景 | `frontend/src/stores/ui.ts`，持久化 `localStorage` |
| 音乐曲目 | 子组件请求 `GET /api/music/tracks`（播放器 UI 在 AppShell 内） |
| 页脚外链 | 多为静态或 i18n；友链数据在友链页单独请求 |

**路由副作用**（`frontend/src/router/index.ts` `afterEach`）：

- `applyPagePhotoBackgroundToDocument(to)` — 按路由切换全屏背景图 CSS 变量（`frontend/src/theme/pagePhotoBackgrounds.ts`）
- `syncPageCorruptForRoute(to.name)` — 部分页面启用 corrupt 视觉（`frontend/src/theme/pageCorruptState.ts`）

## 关键文件

| 职责 | 路径 |
|------|------|
| 应用壳层 | `frontend/src/components/layout/AppShell.vue` |
| 主导航 | `frontend/src/components/layout/SiteNav.vue` |
| 导航下拉组 | `frontend/src/components/layout/SiteNavGroup.vue` |
| 日/夜/抽象主题切换 | `frontend/src/components/layout/ThemeDayNightToggle.vue` |
| 页脚容器 | `frontend/src/components/layout/FooterGrunRayPanel.vue` |
| 页脚品牌 | `frontend/src/components/layout/FooterGrunRayBrand.vue` |
| 页脚外链 | `frontend/src/components/layout/FooterExternalLinks.vue` |
| 页脚元信息 | `frontend/src/components/layout/FooterGrunRayMetaBar.vue` |
| 顶栏 FLIP | `frontend/src/composables/useHeaderToolbarLayoutShift.ts` |
| 导航滚动紧凑 | `frontend/src/composables/useNavScrollCompact.ts` |
| 页脚揭示 | `frontend/src/composables/useFooterGrunRayReveal.ts` |
| 光标轨迹 | `frontend/src/components/layout/CursorTrail.vue` |
| 路由与 afterEach | `frontend/src/router/index.ts` |
| 页脚样式 | `frontend/src/styles/footer-grunray.css` |

## 实现要点

1. **导航高亮**：`SiteNav` 的 `isActive(path)` 对非根路径使用 `startsWith`，子路由（如 `/blog/foo`）仍高亮「博客」父级需依赖分组项各自 `to` 精确匹配。
2. **工具栏 FLIP**：音乐按钮在「顶栏 / 溢出菜单」间移动时，`captureToolbarFlipSlots` 记录位置，`playToolbarFlipAfterRemove` 播放位移，减少布局跳动（与 `TODO.md` 中导航动效优化相关）。
3. **full-viewport 子页**：子路由 `meta.appMainLayout === 'full-viewport'` 时，`app-main` 应用不同 padding，首页/碎念/关于等铺满背景。
4. **与主题笔记的分工**：壳层负责切换 `data-theme`、照片背景 dataset；具体页面 scoped 样式在各 View 内维护。
