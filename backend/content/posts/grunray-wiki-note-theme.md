## 界面布局

全站视觉建立在 **CSS 变量（design tokens）** 上，而非各页面硬编码颜色。页面级布局仍由各 View 的 scoped CSS 完成；主题层只提供「颜色、圆角、阴影、玻璃、字体」等语义变量。

典型表面元素：

- **`.card`**：在 `frontend/src/styles/main.css` 定义，使用 `--glass-card-bg`、`--glass-card-border`、`backdrop-filter`，形成统一玻璃卡片。
- **阅读区**：凡渲染 Markdown HTML 的容器统一加全局类 `.markdown-reading`（博文 `.body`、项目块 `.project-md`、碎念/推荐详情等）；排版与代码高亮集中在 `frontend/src/styles/markdown-reading.css`（含 Pygments `.codehilite`），在 `frontend/src/main.ts` 与 `main.css` 同级全局引入。块外壳仍用 `--color-reading-bg`（见 `MarkdownBlock.vue` 的 `.block-markdown-reading`）。

部分路由有**独立样式文件**（在对应 View 中 `import '@/styles/...'`），仅负责入场动画或页面特有布局，不重复定义 token。

## 数据与 API

主题系统**不请求后端**；状态来自 Pinia + `document.documentElement`：

| 状态 | 存储 | DOM 标记 |
|------|------|----------|
| `theme` light/dark/abstract | `localStorage` `ui.theme` | `html[data-theme]` |
| abstract 彩蛋解锁 | `ui.themeAbstractUnlocked` | 允许切换到 abstract |
| 照片背景开关 | `ui.photoBackground` | `html[data-photo-bg]` |
| 减少动效 | `prefersReducedMotion` / 用户设置 | 影响 GSAP、FLIP、入场动画 |
| 页面背景图 | 路由 meta + `pagePhotoBackgrounds.ts` | `--page-photo-bg-image` 内联变量 |

`html` 默认背景图指向 `/api/media/files/film/main/background/bg_homeview.png`（见 `main.css`），切换路由后由 `applyPagePhotoBackgroundToDocument` 覆盖。

## 关键文件

| 职责 | 路径 |
|------|------|
| 全局样式入口 | `frontend/src/styles/main.css` |
| Markdown 阅读排版（全局） | `frontend/src/styles/markdown-reading.css` |
| 应用入口（样式加载顺序） | `frontend/src/main.ts` |
| 浅色 token | `frontend/src/styles/themes/tokens.light.css` |
| 深色 token | `frontend/src/styles/themes/tokens.dark.css` |
| 抽象/彩蛋 token | `frontend/src/styles/themes/tokens.abstract.css` |
| corrupt 页面特效 | `frontend/src/styles/themes/page-corrupt.css` |
| 首页入场 | `frontend/src/styles/page-enter-home.css` |
| 时间轴页入场 | `frontend/src/styles/page-enter-timeline.css` |
| 文章/项目详情入场 | `frontend/src/styles/page-enter-post.css` |
| 留言/友链/栖息等 | `page-enter-message.css`、`page-friends.css`、`page-xiqi.css` 等 |
| 光标轨迹 | `frontend/src/styles/cursor-trail.css` |
| UI 状态 store | `frontend/src/stores/ui.ts` |
| 路由背景切换 | `frontend/src/theme/pagePhotoBackgrounds.ts` |
| corrupt 路由同步 | `frontend/src/theme/pageCorruptState.ts` |
| 主题切换按钮 | `frontend/src/components/layout/ThemeDayNightToggle.vue` |

## 实现要点

1. **Token 分层**：`tokens.abstract.css` 提供与浅色/深色正交的变量集；`data-theme="abstract"` 时启用，需先解锁彩蛋（`ThemeDayNightToggle` 内逻辑）。
2. **主题切换动画**：切换时可在 `body` 上挂载扩散层（Teleport，`z-index` 与 `#app` 叠层顺序在 `main.css` 注释中说明），避免闪屏。
3. **页面样式导入约定**：需要入场动画的 View 显式 `import '@/styles/page-enter-*.css'`，未导入的页面仅继承全局 `.card` 与 token。
4. **与壳层笔记的边界**：`AppShell` / `ThemeDayNightToggle` 写 `dataset`；`main.css` 与 token 文件定义变量取值；业务 View 只消费 `var(--*)`。
5. **Markdown 阅读样式**：`MarkdownBlock.vue` 仅保留块级边框/背景；标题、列表、表格、`pre`/`code` 均由 `.markdown-reading` 统一定义，避免在多个 View 重复维护。
6. **暗色代码块**：`markdown-reading.css` 内 `[data-theme='dark']` 对 `pre` / `.codehilite` 有单独背景混合。