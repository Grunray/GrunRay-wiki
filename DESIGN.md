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

三套字族令牌（`--font-sans / --font-serif / --font-mono`），全部自托管或系统字（国内可访问，无 Google Fonts 外链）。

**基准字号：`html { font-size: 106.25% }`（= 17px）**。Windows 中文 ClearType 在 <13px 明显发虚，2026-08 从 16px 上调；所有 rem 随之等比放大。新增样式时不要把元数据/kicker 压到 0.76rem（≈13px）以下。

| 字族 | 栈 | 用途 |
|---|---|---|
| Sans | system-ui → PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC | 正文、UI |
| Serif | Playfair Display → Noto Serif SC → Source Han Serif SC → Songti SC → SimSun | **展示标题**：站点问候、页面大标题、文章 H1、年份数字 |
| Mono | JetBrains Mono → Cascadia Code → Consolas | **kicker**（小标签/日期/编号）、代码、元数据 |

### 层级（桌面基准）

| 层级 | 字族 | 字号 | 字重 | 说明 |
|---|---|---|---|---|
| 站点问候/封面 | Serif | clamp(1.8–3rem) | 600 italic 可选 | 仅首页与 hero |
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
- 首页是**封面**：媒体带 + 一句定位 + 文章目录，禁止三栏等宽仪表盘。
- 列表优先用「目录式」（日期 + 标题 + 摘要 + hairline 分隔）而非卡片墙。
- 文章/项目详情的**正文与文字块平铺**：不加框、不套卡，仅靠 hairline 与字号/行距分层。
- 文章/项目详情滚动侧栏（方案 D）：视口 `position:fixed` 悬浮卡，挂在 `app-page-cover` 外；题录滚出视口后再淡入。不改 `app-main` 宽度，不给正文加 `margin`。
- 关于页/事实网格用「hairline 分格」（grid 边框共享，gap:0），不用独立卡片。

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
- 首页窄屏：封面 → 目录 → 胶片带 纵向堆叠。

## 9. Motion

- 页面进入动画契约：`page-enter--play` 类 + `page-enter-*.css`，重构页面结构时**必须同步更新对应 CSS 的选择器**。
- 统一缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；入场 0.7–0.9s，微交互 0.2s。
- 全部动效遵守 `prefers-reduced-motion`（已有全局兜底，新增动画必须加）。

### Hover 语言（2026-08 收敛）

- **导航链接/分组按钮**：hover 只提文字色 + 底部生长线（accent 渐变线是唯一着色）；展开/当前页态才给轻染色底。不做位移弹跳、不做图标旋转。
- **下拉菜单项**：hover 用色阶表面（`bg-elevated`），当前页项才用 accent 14% 染色。
- **卡片无全局 hover**：纸面/终端面不浮起、不扫光、无发光阴影。
- **可点击卡**（`timeline-card--clickable`、`.cover-story`）：方案 G —— 轻浮 `translateY(-2px)` + 右下 24px 纸张翻角 + 标题/日期左右错位、标签提亮 + 右下花藤沿骨架生长。类名 `.card-hover-g`。`prefers-reduced-motion` 时去掉翻角/花藤/位移，只留着色。
- **首页目录行**（`.toc-row`）：hairline 分隔 + 轻底色 hover + 标题提 accent；**不套**方案 G（无翻角/花藤/位移），与 timeline-card 边界分明。
- **友链申请入口**（`friends-apply-entry`）：hover = 左边条加深 + `translateY(-1px)`（不套方案 G）。

## 10. Agent Prompt Guide

改 UI 时默念：
1. 表面是纸（浅）或终端（深），不是玻璃。
2. 强调色只有墨绿/翠绿，且只给交互点。
3. 标题 serif、正文 sans、元数据 mono。
4. 列表像目录，不像仪表盘。
5. 抽象档不动。
