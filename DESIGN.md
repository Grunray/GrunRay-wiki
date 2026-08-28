# GrunRay wiki — DESIGN.md

> 站点设计系统。AI 编码代理做 UI 工作时读本文件，不要引入第二个视觉语言。
> 参考方向：WIRED（纸面阅读）、Notion（暖知识库）、Claude（编辑气质）、Runway（媒体封面）、VoltAgent（深色终端）、Linear（项目列表）。**抽原则，不抄色值与字体。**

---

## 1. Visual Theme & Atmosphere

**定位**：编辑式个人 wiki —— 一本「一直在写的个人杂志」，不是 SaaS 产品页，不是开发者仪表盘。

- **气质**：纸面、编辑、安静。内容（文章、项目、胶片）是主角，界面退后。
- **密度**：中等偏松。留白是排版工具，不是浪费。
- **哲学**：表面是纸，不是玻璃；强调色是墨水，不是涂料。
- **一句话测试**：这个页面打印出来像不像一本排版认真的小册子？像，就对了。

## 2. Color Palette & Roles

三档主题（`data-theme="light|dark|abstract"`）。令牌语义键三档一致，见 `frontend/src/styles/themes/tokens.*.css`。

### 浅色 light —— 纸面

| 角色 | 值 | 用途 |
|---|---|---|
| `bg-base` | `#f4f1e8` | 页面纸底（暖纸，非纯白非灰） |
| `bg-surface` | `#faf8f1` | 卡片/表面：比纸底浅半度 |
| `bg-elevated` | `#ece7d8` | 标签、代码内联底 |
| `reading-bg` | `#f8f5ec` | 正文阅读栏 |
| `text` | `#2b2823` | 墨色正文（暖黑） |
| `text-muted` | `#6e675b` | 次要文字 |
| `border` | `#ddd5c2` | 纸边线（hairline） |
| `accent` | `#2e6b4f` | **墨绿**：链接、选中、CTA。唯一强调色 |
| `accent-muted` | `#9dbba9` | 装饰性绿色（分隔、图形） |
| `on-accent` | `#f4f1e8` | 墨绿底上的文字 |

### 深色 dark —— 终端

| 角色 | 值 | 用途 |
|---|---|---|
| `bg-base` | `#0d1210` | 近黑底（带绿味，非纯黑） |
| `bg-surface` | `#141a17` | 卡片 |
| `bg-elevated` | `#1b2320` | 抬升面 |
| `reading-bg` | `#151c19` | 阅读栏 |
| `text` | `#d8e2dc` | 正文 |
| `text-muted` | `#8ba095` | 次要 |
| `border` | `#2b3833` | 边线 |
| `accent` | `#8fd6ae` | **翠绿**：比浅色档亮，保证暗底对比 |
| `on-accent` | `#0d1210` | 绿底上的文字 |

### 抽象 abstract —— 保留现有体系

`#0a2330` 深青底 + `#ffdb00` 黄边 + 直角 + 等宽字体 + `4px 4px 0` 硬阴影。这是全站最独特的一档，**不要用任何目录品牌覆盖它**。仅允许微调，禁止重设计。

### 强调色纪律

- 全站**只有一个强调色**（`accent`）。它出现在：链接、选中态、主 CTA、focus 环。
- 表面永远是纸色/近黑色，**不是强调色**。旧版「满屏青绿」是反模式。
- `accent-muted` 只用于装饰（分隔线、图形、拖尾），不用于文字。

## 3. Typography Rules

三套字族令牌（`--font-sans / --font-serif / --font-mono`），另加首页用 `--font-script`；全部自托管或系统字（国内可访问，无 Google Fonts 外链）。

**基准字号：`html { font-size: 106.25% }`（= 17px）**。Windows 中文 ClearType 在 <13px 明显发虚，2026-08 从 16px 上调；所有 rem 随之等比放大。新增样式时不要把元数据/kicker 压到 0.76rem（≈13px）以下。

| 字族 | 栈 | 用途 |
|---|---|---|
| Sans | system-ui → PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC | 正文、UI |
| Serif | Playfair Display → Noto Serif SC → Source Han Serif SC → Songti SC → SimSun | **展示标题**：站点问候、页面大标题、文章 H1、年份数字 |
| Script | Great Vibes（自托管 woff2）→ Segoe Script → Apple Chancery | **仅**首页问候语里的品牌名（`--font-script`） |
| Mono | JetBrains Mono → Cascadia Code → Consolas | **kicker**（小标签/日期/编号）、代码、元数据 |

### 层级（桌面基准）

| 层级 | 字族 | 字号 | 字重 | 说明 |
|---|---|---|---|---|
| 站点问候/封面 | Serif + Script | clamp(2.55–4.125rem) | 中文 Noto Serif SC **600 normal**（自托管无 700 italic 面）；品牌名 Great Vibes 400 | 仅首页；等 Noto + Great Vibes 就绪再显；问候卡 `overflow: visible` 以免裁掉花体下伸 |
| 页面标题 H1 | Serif | clamp(1.5–2rem) | 600 | 文章标题、分区标题 |
| 节标题 H2/H3 | Serif 或 Sans | 1.1–1.35rem | 600 | |
| 正文 | Sans | 1.02–1.06rem | 400 | 行高 1.75–1.85（中文要松） |
| Kicker/元数据 | Mono | 0.72–0.8rem | 500，大写，+0.08em 字距 | 日期、标签前缀、分类名 |
| UI 辅助 | Sans | 0.85–0.95rem | 500 | 按钮、导航 |

规则：
- 英文展示标题用 Playfair（已自托管）；中文自动落宋体系。**不要给中文强行指定英文字体。**
- 抽象档整档用 Mono（现有行为，保留）。
- 禁用 Inter/Roboto/Arial 当展示字体；禁用 `background-clip: text` 渐变字（本站 photo-bg 叠层下会不可读，已有教训）。

## 4. Component Stylings

### 卡片 `.card`
- 浅色/深色档：**近不透明的纸面/暗面 + 1px hairline 边 + 浅阴影**，不再依赖大面积 `backdrop-filter` 模糊（`--glass-blur` 收敛到 10px 以下）。
- hover：上浮 ≤3px + 边线向 accent 靠 + 阴影加深。可点击卡（`.card-hover-g`）另见 §9：翻角、排版错位、檐角花藤。展示卡仍无全局 hover。
- 圆角：sm 6 / md 10 / lg 14；抽象档直角 + 硬阴影（保留）。
- 交互卡片（可点）必须有 `:hover` 与 `:focus-visible` 两种反馈。

### 按钮 `.btn-accent`
- 胶囊形、描边式（outline）：accent 边 + 透明底 + accent 文字；hover 时 16% accent 底。禁止实心大色块按钮。

### 标签 `.tag` / `.badge`
- `.tag`：elevated 底 + muted 文字，小圆角。
- `.badge`：mono 大写字距 + 描边，无底色（编辑式 kicker）。

### 导航 `.glass-nav-*`
- 保留 sticky 横条→滚动收缩成胶囊的动画契约（类名与 `data-nav-compact` 不动）。
- 材质随主题：浅色=纸面微透，深色=近黑微透。模糊量收敛，靠色而不是靠 blur 分层。

## 5. Layout Principles

- 内容列宽：`--content-width: 68rem`（页面）；**阅读栏 `38rem`（≈36 字/行中文最佳区间）**。
- 间距刻度：4 的倍数（0.25rem 步进），区块间 1.25–2rem。
- 首页是**封面**：通透首屏（照片背景或右侧线稿）+ 刊号/问候卡 + 纸面从下挤入；禁止三栏等宽仪表盘。**不**在首页挂 FilmFeed（组件保留，挂别的页）。
- 列表优先用「目录式」（日期 + 标题 + 摘要 + hairline 分隔）而非卡片墙。
- 文章/项目详情的**正文与文字块平铺**：不加框、不套卡，仅靠 hairline 与字号/行距分层。
- 文章/项目详情滚动侧栏（方案 D）：视口 `position:fixed` 悬浮卡，挂在 `app-page-cover` 外；题录滚出视口后再淡入。不改 `app-main` 宽度，不给正文加 `margin`。
- 关于页/事实网格用「hairline 分格」（grid 边框共享，gap:0），不用独立卡片。
- 首页首屏契约详见 **§12**。

## 6. Depth & Elevation

- 浅色：阴影极浅（`0 1px 2px rgb(43 40 35 / 5%)`），层级靠**色阶**（base < surface < elevated）不靠阴影。
- 深色：`0 1px 2px rgb(0 0 0 / 35%)`；抽象档保留硬阴影 `4px 4px 0 #ffdb00`。
- 媒体（胶片框、hero 图）允许 6px 圆角 + 中阴影，是页面里唯一可以有「厚度」的元素。

## 7. Do's and Don'ts

**Do**
- 新页面先复用 `.card` / `.btn-accent` / `.tag` / `markdown-reading`，再考虑新组件。
- 日期、编号、分类名一律 mono kicker（`--font-mono` 0.76rem / letter-spacing 0.05em）。
- 标题一律 serif；正文一律 sans。
- 表单控件：边框 `var(--color-border)`、表面 `var(--color-bg-surface)`；focus = `outline: 2px solid var(--color-accent); outline-offset: -1px`。
- 三个主题的新键必须三档都补（或注明「仅 abstract」）。

**Don't**
- 不要把表面染成强调色（满屏绿 = 旧版反模式）。
- 不要紫渐变、不要彩虹多强调色、不要玻璃模糊当主要分层手段。
- 表单控件不要用 `--glass-card-*` 令牌混色，focus 不要仅靠改 border 颜色（对比不足）。
- 不要引入 Vercel/Stripe/Cursor 式「开发者产品页」语言（巨大英文标题、渐变网格背景、实心黑 CTA）。
- 不要在令牌文件里写业务分支；主题差异只通过令牌值表达。

## 8. Responsive Behavior

- 断点：768px（平板/手机）、480px（小手机）；页面自有断点在各自样式内补。
- 移动端触控目标 ≥44px；表格/代码块横向滚动不撑破视口。
- 首页窄屏：首屏（刊号/问候）→ COVER STORY → 目录纵向堆叠；问候语允许换行。

## 9. Motion

- 页面进入动画契约：`page-enter--play` 类 + `page-enter-*.css`，重构页面结构时**必须同步更新对应 CSS 的选择器**。
- 统一缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；入场 0.7–0.9s，微交互 0.2s。
- 全部动效遵守 `prefers-reduced-motion`（已有全局兜底，新增动画必须加）。

### Hover 语言（2026-08 收敛）

- **导航链接/分组按钮**：hover 只提文字色 + 底部生长线（accent 渐变线是唯一着色）；展开/当前页态才给轻染色底。不做位移弹跳、不做图标旋转。
- **下拉菜单项**：hover 用色阶表面（`bg-elevated`），当前页项才用 accent 14% 染色。
- **卡片无全局 hover**：纸面/终端面不浮起、不扫光、无发光阴影。
- **可点击卡**（`timeline-card--clickable`、首页 COVER STORY）：方案 G —— 轻浮 `translateY(-2px)` + 右下 24px 纸张翻角 + 标题/日期左右错位、标签提亮 + 右下花藤沿骨架生长。类名 `.card-hover-g`。首页封面拆成 peek + detail 后，悬停任一块须 `:has()` 同步整套动效（见 §12）。`prefers-reduced-motion` 时去掉翻角/花藤/位移，只留着色。
- **首页目录行**（`.toc-row`）：hairline 分隔 + 轻底色 hover + 标题提 accent；**不套**方案 G（无翻角/花藤/位移），与 timeline-card 边界分明。
- **友链申请入口**（`friends-apply-entry`）：hover = 左边条加深 + `translateY(-1px)`（不套方案 G）。

## 10. Agent Prompt Guide

改 UI 时默念：
1. 表面是纸（浅）或终端（深），不是玻璃。
2. 强调色只有墨绿/翠绿，且只给交互点。
3. 标题 serif、正文 sans、元数据 mono。
4. 列表像目录，不像仪表盘。
5. 抽象档不动。
6. 动首页首屏先读 §12（通透背景、单根 Transition、勿 `:class` 冲入场类）。

## 11. Pointer & Cursor Trail（星座月相）

已选定并合入生产：**方案 D · 星座月相**（Columbina 线稿 + Damselette 热点 + 月相点拖尾）。原型在 `designed/moonlit-cursor-options/`；运行时是单全屏 Canvas + 单 rAF（`useMoonlitCursor` + `CursorTrail.vue`）。

### 视觉契约

- 拖尾只有月相圆点，**无连线**；idle 从末端收回；顶满时羽状微粒散开。克制、低饱和，不抢正文。
- 悬停 **link**（`.toc-row`、文章链接）：虹月·恒月·霜月内收，虹月近读。调参：`frontend/src/cursor/moonlitCursorConfig.ts` 的 `CONSTELLATION_HOVER_TUNING.link`。
- 悬停 **project**（项目卡、`.timeline-card`）：同一三月，外张、霜月更清楚。调参：`CONSTELLATION_HOVER_TUNING.project`。
- 点击 **祈愿**：指针完全淡出 → `wish.svg` 显现 → 轨道虚线+节点圆旋转 → 多颗 `Primogem` 从圆内侧散落（青白 / 薰衣草 / 粉）。已替换旧 `water.svg` 水纹。
- 静憩：指针停驻 ≥2s，Columbina / Damselette 淡出，切 `sleep.svg` 月摇篮 + `Kuuhenki.svg` 推摇；月光晕与银河落尘在世界坐标，不随月弯摇。
- 浅色纸面月光偏冷灰蓝；深色/abstract 用 cyan 线稿。强调色仍只给 UI 交互点，拖尾不占用 `accent`。

### 行为契约

- 仅 `pointer: fine` 启用；触屏不挂载。
- `prefers-reduced-motion` 或顶栏关闭：不挂载 Canvas（`ui.cursorTrailActive`）。
- 输入框 / `contenteditable` / `cursor: text`：恢复系统光标，不画自定义指针。
- Canvas `pointer-events: none`，不挡 hit-test；坐标不进 Vue 响应式。
- 静止无动画时 rAF 休眠，`pointermove` 唤醒。

## 12. Home Hero（通透首屏 · 纸面挤入）

已选定并合入生产（批次 117）。原型：`designed/home-hero-relayout/`；运行时：`HomeView.vue` + `useHomeHeroRelayout.ts` + `page-home-hero.css`。

### 结构契约

```
.home-layout                    ← 单根（禁止 fragment；见下方「路由转场」）
  .home-stage                   ← sticky 首屏；高度 = 100dvh − --home-nav-offset
    .home-stage-art             ← 仅关照片背景时挂载；右侧线稿
    .home-mast                  ← 刊号矩形卡 + 独立圆形头像卡
    .home-stage-dock
      .home-intro-track / .home-intro-stack
        .home-intro-greeting.card / .home-intro-note.card
  .home-rising
    .home-peek-wrap > .cover-story-peek     ← sticky kicker；层级高于纸面
    .home-scroll-layer > …paper
      .cover-story-detail.card.card-hover-g  ← 正文 + CardCornerVineLazy
      .home-sheet                           ← NOW + TOC（无 FilmFeed）
```

路由 meta：`appMainLayout: 'full-viewport'`。离页时 composable 清除 `data-home-hero-page` 与相关 CSS 变量。

### 视觉 / 背景

- **通透首屏**：开照片背景时整页去掉纸面蒙层与 `html::before` 灰罩；中间留空看 `body::before` 照片。**禁止**再叠独立 `backdrop-filter` / `__veil`。
- **滚动 blur**：仅写 `--page-photo-bg-blur`，从 0 插值到用户设定值（默认 6px）；跟手、无 0.85s filter 过渡。离页恢复用户值。写入前量化到 0.5px，同值不刷变量；progress 用缓存的纸面文档偏移 + `scrollY`，不要每帧 `getBoundingClientRect`。
- **关照片背景**：生产用 WebP 线稿（`/art/polonia_sandoren.webp` | `-dark.webp` | `-abstract.webp`）。高度：导航下缘 → COVER STORY 上缘，贴右可向左延伸。abstract 墨色 `#FFDB00`、纸面 `#0A2330`。矢量源与主题 SVG 留在 `designed/home-hero-relayout/`（只改 fill/stroke，勿当生产热路径）。
- **盖住后跳过绘制**：纸面顶缘落到导航下后给 `html` 打 `data-home-stage-covered`，`.home-stage` 用 `content-visibility: hidden`（自身 height 仍撑 sticky 占位）。回顶在露出前一截就去掉该标记，避免闪空白。
- **纸面挤入**：`.home-rising` 负 margin 叠在首屏上；peek 只露 kicker；卡片上下同色 `--cover-story-bg`，无接缝细线。底部与 footer 揭示区用盖板纸色接上（`app-page-cover::after`），勿留空缝。

### 刊号 / 问候

- 刊号与头像分卡：上方矩形 `.mast-vol.card`，下方圆形 `.home-mast-avatar.card`，中间留间距。
- 问候语与介绍语分卡；问候略加宽。默认靠左下；**开照片背景**时整组 `transform` 滑到右侧（`.home-intro-track` 容器查询），关掉滑回。位移跟 `html[data-photo-bg]`，**不要**在 `.home-layout` 上绑 `is-photo-bg` 的 Vue `:class`。
- 问候入场只淡入，不动 `transform`（避免冲掉左下/右下偏移）。只等 Great Vibes（短超时），**不要** `fonts.load` 不存在的 Noto 700 italic，也不要等整页 `fonts.ready`。就绪后加 `home-fonts-ready`。

### COVER STORY 悬停

与项目卡同一套方案 G；peek 与 detail 拆开后，`.home-rising:has(.peek:hover, .detail:hover)` 同步上浮、折角、花藤、标题、kicker、tag。勿把 `transform` 加在含 sticky peek 的父级上。

### 导航占位

- 首页用 `--home-nav-offset` 垫 sticky `top` / 首屏高度；只设导航 `min-height`，**不**封 `height`/`max-height`（否则会量到压矮盒子，比其它页矮）。
- 占位按展开态 `.glass-nav-inner` + padding 锁一次；compact 只收视觉胶囊。快滑回顶：`overscroll-behavior-y: none` + sticky `overflow-anchor: none`。

### 路由转场 / 入场类（硬规则）

- `HomeView` 模板**必须单根**（一个元素）。根外 HTML 注释也会变成 fragment，卡死 `AppShell` 的 `Transition mode="out-in"`，表现为离开首页后主内容空白、刷新才恢复。
- `page-enter--play` / `home-fonts-ready` 由 `classList` 写入。**禁止**在同一根上再用 Vue `:class` 绑开关态（会冲掉入场类，整页 opacity:0）。照片背景开关用文档根 `data-photo-bg`。
- 重构结构时同步 `page-enter-home.css` 选择器。

## 13. FPS / 1%L 监视浮层

全站调试用，挂在 `AppShell`（不是某一页）。参考 yumetsuki 的 rAF 计数，并加 1% Low。

- **瞬时 FPS**：近 1 秒 `requestAnimationFrame` 次数。
- **1%L**：近 3 秒帧时间里最慢的 1%，取其平均再换成 FPS（`1000 / avgMs`）。样本不足时显示 —。
- **显示**：一行 `FPS 144 95(1%L)`；1%L 数字按分档着色（≤20 卡 / ≤40 尚可 / 其余正常，看 FPS 与 1%L 较差值）。
- 默认关，顶栏溢出面板开关，点卡片关闭；`localStorage ui.fpsMeter`（`1` 开 / 无键或 `0` 关）。关闭必须停 rAF。
- 页面 `hidden` 或单帧 >1s（切后台）不计入 1%L。
- 右下角纸面卡，令牌用 `--glass-nav-*`；左下回到顶部不动。
