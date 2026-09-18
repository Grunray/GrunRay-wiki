# GrunRay wiki — DESIGN.md

> 站点设计系统。AI 编码代理做 UI 工作时读本文件，不要引入第二个视觉语言。
> **代理总入口**：仓库根 [`AGENTS.md`](../AGENTS.md)（文档地图与硬约束）；本文件只承载视觉 / 动效契约。
> **实况样例**：前端路由 `/design`（页脚胶囊「样式规范」），色板 / 字体 / 按钮 / 下拉 / 卡片 / 空态与本文契约对照。
> **无障碍**：键盘、Skip link、抽屉 / Read sheet 焦点见 [`ACCESSIBILITY.md`](./ACCESSIBILITY.md)。**版本记录**：[`CHANGELOG.md`](./CHANGELOG.md)。**排障**：[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)。
> 参考方向：WIRED（纸面阅读）、Notion（暖知识库）、Claude（编辑气质）、Runway（媒体封面）、VoltAgent（深色终端）、Linear（项目列表）。**抽原则，不抄色值与字体。**

---

## 1. Visual Theme & Atmosphere

**定位**：编辑式（英文 “Editorial”）个人 wiki —— 一本「一直在写的个人杂志」，不是 SaaS 产品页，不是开发者仪表盘。

- **气质**：纸面、编辑、安静。内容（文章、项目、胶片）是主角，界面退后。
- **密度**：中等偏松。留白是排版工具，不是浪费。
- **哲学**：表面是纸，不是玻璃；强调色是墨水，不是涂料。
- **一句话测试**：这个页面打印出来像不像一本排版认真的小册子？像，就对了。

## 2. Color Palette & Roles

三档主题（`data-theme="light|dark|abstract"`）。令牌语义键三档一致，见 `frontend/src/styles/themes/tokens.*.css`。

### 浅色 light —— 纸面


| 角色             | 值         | 用途                     |
| -------------- | --------- | ---------------------- |
| `bg-base`      | `#f4f1e8` | 页面纸底（暖纸，非纯白非灰）         |
| `bg-surface`   | `#faf8f1` | 卡片/表面：比纸底浅半度           |
| `bg-elevated`  | `#ece7d8` | 标签、代码内联底               |
| `reading-bg`   | `#f8f5ec` | 正文阅读栏                  |
| `text`         | `#2b2823` | 墨色正文（暖黑）               |
| `text-muted`   | `#6e675b` | 次要文字                   |
| `border`       | `#ddd5c2` | 纸边线（hairline）          |
| `accent`       | `#2e6b4f` | **墨绿**：链接、选中、CTA。唯一强调色 |
| `accent-muted` | `#9dbba9` | 装饰性绿色（分隔、图形）           |
| `on-accent`    | `#f4f1e8` | 墨绿底上的文字                |


### 深色 dark —— 终端


| 角色            | 值         | 用途                  |
| ------------- | --------- | ------------------- |
| `bg-base`     | `#0d1210` | 近黑底（带绿味，非纯黑）        |
| `bg-surface`  | `#141a17` | 卡片                  |
| `bg-elevated` | `#1b2320` | 抬升面                 |
| `reading-bg`  | `#151c19` | 阅读栏                 |
| `text`        | `#d8e2dc` | 正文                  |
| `text-muted`  | `#8ba095` | 次要                  |
| `border`      | `#2b3833` | 边线                  |
| `accent`      | `#abde6b` | **黄绿**（Dendro 方案 D）：暗底强调色 |
| `accent-muted` | `#5aaa64` | 装饰绿                   |
| `on-accent`   | `#0d1210` | 绿底上的文字              |
| `status-off`  | `#a99a76` | 已归档 6px 点（灰金）         |


### 抽象 abstract —— 保留现有体系

`#0a2330` 深青底 + `#ffdb00` 黄边 + 直角 + 等宽字体 + `4px 4px 0` 硬阴影。这是全站最独特的一档，**不要用任何目录品牌覆盖它**。仅允许微调，禁止重设计。

### 强调色纪律

- 全站**只有一个强调色**（`accent`）。它出现在：链接、选中态、主 CTA、focus 环。
- 表面永远是纸色/近黑色，**不是强调色**。旧版「满屏青绿」是反模式。
- `accent-muted` 只用于装饰（分隔线、图形、拖尾），不用于文字。

## 3. Typography Rules

三套字族令牌（`--font-sans / --font-serif / --font-mono`），另加首页用 `--font-script`；全部自托管或系统字（国内可访问，无 Google Fonts 外链）。

**基准字号：`html { font-size: 106.25% }`（= 17px）**。Windows 中文 ClearType 在 <13px 明显发虚，2026-08 从 16px 上调；所有 rem 随之等比放大。新增样式时不要把元数据/kicker 压到 0.76rem（≈13px）以下。


| 字族     | 栈                                                                               | 用途                               |
| ------ | ------------------------------------------------------------------------------- | -------------------------------- |
| Sans   | system-ui → PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC | 正文、UI                            |
| Serif  | Playfair Display → Noto Serif SC → Source Han Serif SC → Songti SC → SimSun     | **展示标题**：站点问候、页面大标题、文章 H1、年份数字   |
| Script | Great Vibes（自托管 woff2）→ Segoe Script → Apple Chancery                           | **仅**首页问候语里的品牌名（`--font-script`） |
| Mono   | JetBrains Mono → Cascadia Code → Consolas                                       | **kicker**（小标签/日期/编号）、代码、元数据     |


### 层级（桌面基准）


| 层级         | 字族             | 字号                   | 字重                                                                     | 说明                                                             |
| ---------- | -------------- | -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 站点问候/封面    | Serif + Script | clamp(2.55–4.125rem) | 中文 Noto Serif SC **600 normal**（自托管无 700 italic 面）；品牌名 Great Vibes 400 | 仅首页；等 Noto + Great Vibes 就绪再显；问候卡 `overflow: visible` 以免裁掉花体下伸 |
| 页面标题 H1    | Serif          | clamp(1.5–2rem)      | 600                                                                    | 文章标题、分区标题                                                      |
| 节标题 H2/H3  | Serif 或 Sans   | 1.1–1.35rem          | 600                                                                    |                                                                |
| 正文         | Sans           | 1.02–1.06rem         | 400                                                                    | 行高 1.75–1.85（中文要松）                                             |
| Kicker/元数据 | Mono           | 0.72–0.8rem          | 500，大写，+0.08em 字距                                                      | 日期、标签前缀、分类名                                                    |
| UI 辅助      | Sans           | 0.85–0.95rem         | 500                                                                    | 按钮、导航                                                          |


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

### 空态 / 错误态 `.page-status`（PageStatusBlock）

- 列表与详情加载失败、库空、筛选无匹配统一用此块；不要再写「请确认后端已启动」等运维向访客文案。
- 结构：mono kicker（Signal/Empty）+ 衬线标题 + muted 说明 + 可选 `.ed-action` 重试（衬线 + accent 下划线，勿用胶囊 `.btn-accent`）。
- loading 优先各页骨架；无骨架时可用 `kind="loading"` 轻量文字态。
- 站长 compose / 审核失败可用更具体的 API message，但仍须截断堆栈（见 `ownerFacingMessage`）。

### 按钮 `.btn-accent`

- 胶囊形、描边式（outline）：accent 边 + 透明底 + accent 文字；hover 时 16% accent 底。禁止实心大色块按钮。

### 标签 `.tag` / `.badge`

- `.tag`：elevated 底 + muted 文字，小圆角。
- `.badge`：mono 大写字距 + 描边，无底色（编辑式 kicker）。

### 导航 `.glass-nav-`*

- 保留 sticky 横条→滚动收缩成胶囊的动画契约（类名与 `data-nav-compact` 不动）。
- 材质随主题：浅色=纸面微透，深色=近黑微透。模糊量收敛，靠色而不是靠 blur 分层。
- 左右按钮组（方案 D）：不要圆角填充药丸。外层用 `--radius-sm` + 上下 hairline（`box-shadow: 0 -1px 0 / 0 1px 0 var(--color-border)`，两端随圆角走弧）。项是弱图标 + 字；分组展开符用轻 `+`。hover / 当前页 = 底部 1px accent 下划线，不要绿底药丸。
- 二级菜单：R 角纸面卡（`--radius-md` + `--color-bg-surface`）。左栏 mono kicker，衬线标题，说明用 `nav.*Desc` 原句；**不要**叶子小图标。顶底 hairline 带弧、略宽于项间；项间直 hairline。hover 同 `.toc-row`（elevated 52% 洗底 + 标题 accent）。
- 右侧工具钮：纯 icon；hover 同样下划线。溢出面板与二级菜单同为纸面卡 + hairline，不要玻璃药丸。

## 5. Layout Principles

- 内容列宽：`--content-width: 68rem`（页面）；**阅读栏 `38rem`（≈36 字/行中文最佳区间）**。
- 间距刻度：4 的倍数（0.25rem 步进），区块间 1.25–2rem。
- 首页是**封面**：通透首屏（照片背景或右侧线稿）+ 刊号/问候卡 + 纸面从下挤入；禁止三栏等宽仪表盘。**不**在首页挂 FilmFeed（组件保留，挂别的页）。
- 列表优先用「目录式」（日期 + 标题 + 摘要 + hairline 分隔）而非卡片墙。
- 文章/项目详情的**正文与文字块平铺**：不加框、不套卡，仅靠 hairline 与字号/行距分层。
- 文章/项目详情滚动侧栏（方案 D）：视口 `position:fixed` 悬浮卡，挂在 `app-page-cover` 外；题录滚出视口后再淡入。不改 `app-main` 宽度，不给正文加 `margin`。
- 关于页用方案 B 双栏履历（左粘滞身份、右经历），不用玻璃卡、不用事实网格、不用奖项药丸。
- 法律声明是阅读页：一级刊头 + 节间浅灰 hairline，不用玻璃卡、不用药丸返回。
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
- 表单控件不要用 `--glass-card-`* 令牌混色，focus 不要仅靠改 border 颜色（对比不足）。
- 不要引入 Vercel/Stripe/Cursor 式「开发者产品页」语言（巨大英文标题、渐变网格背景、实心黑 CTA）。
- 不要在令牌文件里写业务分支；主题差异只通过令牌值表达。

## 8. Responsive Behavior

- 断点：768px（平板/手机）、480px（小手机）；页面自有断点在各自样式内补。
- 移动端触控目标 ≥44px；表格/代码块横向滚动不撑破视口。
- 首页窄屏：首屏（问候）→ COVER STORY → 目录纵向堆叠；问候语允许换行。**不显示刊号与头像。**
- **手机壳层**（`html[data-mobile-shell]`，`max-width: 768px`）：顶栏只留品牌 + 主题 / 中英文 / 汉堡；汉堡打开纸面侧栏。禁用滚动胶囊。右侧工具（照片背景、拖尾、FPS、音乐展开）强制关，回桌面恢复。Footer 只留 ICP 胶囊，不要 GrunRay 扭曲字。碎念/推荐详情改为底部不透明 Read sheet，不要右栏分栏。壳层是 Motion Policy 的第四条输入（见 §9）：强制关工具**不写** localStorage，也不改 `ui.motionPreference`。
- **无障碍（壳层）**：Skip link → `#main`；汉堡抽屉与 Read sheet 焦点陷阱、Esc、关闭后归还触发器。清单见 `ACCESSIBILITY.md`，不要在本文件复制长段。

## 9. Motion

- 页面进入动画契约：`page-enter--play` 类 + `page-enter-*.css`，重构页面结构时**必须同步更新对应 CSS 的选择器**。
- 统一缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；入场 0.7–0.9s，微交互 0.2s。

### Motion Policy（批次 151）

两套三态不要混：导航里选的是**用户偏好**；组件只读**运行时档** `html[data-motion]` / `ui.motionLevel`。禁止各组件再写 `matchMedia` + `isMobile` + `fps < 40`。系统 `prefers-reduced-motion: reduce` 是无障碍底线，FULL 不能抬上去。

**用户偏好** `ui.motionPreference`（`localStorage ui.motionPreference`，默认 `auto`）：

- `auto` — 跟随系统
- `reduced` — 永久手动降级
- `full` — 尽可能完整

刊头：`MOTION · 动效`，三项 `AUTO / REDUCED / FULL`（跟随系统 / 降级 / 完整），放顶栏溢出面板，纸面 + `.ed-action`，不要药丸 Switch。

**运行时档** `ui.motionLevel`：

- `full` — 完整
- `reduced` — 砍持续消耗，留氛围
- `minimal` — 非必要动画全关（≈ 今日系统 reduce）

**解析顺序**（高 → 低）：

1. 系统 reduce → 一律 `minimal`（AUTO / REDUCED / FULL 都不能抬上去）
2. 手机壳层：持续 rAF 特效按 §8 强制关（拖尾 / FPS / 照片 / 音乐展开、Footer 仅 ICP），**不改** MOTION 存储、**不把** `data-motion` 写成 minimal（短 hover 仍可走 CSS）
3. 用户选 `reduced` → `reduced`
4. 用户同意性能建议 → 写入 `reduced`（只建议，须点同意，禁止静默改档）
5. 用户 `full` 且系统不是 reduce → `full`
6. `auto` 且系统 no-preference → `full`；低端特征 / 采样异常只提高「弹出建议」的概率

`html[data-motion="full|reduced|minimal"]`。CSS `@media (prefers-reduced-motion)` 保留作系统底线；用户 REDUCED 靠 dataset。

| 能力 | full | reduced | minimal |
| --- | --- | --- | --- |
| Footer GrunRay 扭曲 rAF | 开（桌面） | 关；滚动揭开仍走 clip，大字不常驻 | 同左；窄屏本就 meta-only |
| 月相拖尾 Canvas | 尊重拖尾开关 | 不挂载 | 不挂载 |
| 页面入场 GSAP / `page-enter--play` | 现时长 | 瞬切（仍打 play 类，内容要能看见） | 瞬切 |
| 顶栏滚动胶囊 | 开 | 保持横条 | 保持横条 |
| 顶栏 FLIP / spring pop | 开 | 关 | 关 |
| 方案 G（翻角/花藤/位移） | 开 | 只留着色 | 只留着色 |
| 普通 CSS hover / 下划线 | 开 | 开 | 开 |
| 音乐音频 | 开 | 开 | 开（不自动播） |
| 碟片持续旋转 | 开 | 关 | 关 |
| 照片 blur-up | 开 | 直接到位 | 直接到位 |
| 开屏蜗牛 | 开 | 跳过 | 跳过 |
| FPS 调试浮层 | 用户手动才挂 | 同左（不是降级手段） | 同左 |
| 滚动 smooth | 开 | 可保留 | `auto` |

REDUCED 仍要像这份纸面刊。MINIMAL 才对应系统无障碍。

**性能建议**（附件，非常驻）：首次进入且本会话未结论、页面可见，空闲约 8s 后短窗采样约 8s。异常再确认一轮。两轮仍异常且用户在前台 → 从 MOTION 旁出纸面气泡，不是中央对话框。忽略记 `ui.motionHintDismissed`。同意写入 `reduced`。禁止 FPS 低就自动关特效；禁止常驻探测 rAF。§13 浮层与这条采样分离。阈值：相对刷新率（平均 fps ＜ 约 0.65×刷新）**且** 窗内 ≥8 次帧时间 ＞ 50ms 才算一轮异常；低端特征（`hardwareConcurrency`≤4 或 `deviceMemory`≤4）可把长帧次数降到 5，仍须两轮、可见、非后台长帧。`getBattery` 可用则省电加分。LoAF 可选增强，无 API 时 rAF 短窗必须能独立走完。

### Hover 语言（2026-08 收敛）

- **导航链接/分组按钮**：hover 只提文字色 + 底部 1px accent 下划线；当前页/展开同样下划线，不要绿底药丸、不要位移弹跳、不要图标旋转。
- **下拉菜单项**：`AppSelect variant="editorial"` 菜单是纸面，不是卡片：无圆角、无阴影、无玻璃；顶一条 ink hairline。hover 同 `.toc-row`（`bg-elevated` 52% 洗底 + 标题 accent）；当前项只改字色，不要 accent 14% 整行染色。实况样例在 `/design`。默认药丸皮肤不要用在刊头与撰写页。
- **卡片无全局 hover**：纸面/终端面不浮起、不扫光、无发光阴影。
- **可点击卡**（`timeline-card--clickable`、首页 COVER STORY）：方案 G —— 轻浮 `translateY(-2px)` + 右下 24px 纸张翻角 + 标题/日期左右错位、标签提亮 + 右下花藤沿骨架生长。类名 `.card-hover-g`。`/projects` 与 `/blog` 时间线卡用同一套 G，但卡片造型是目录行密度（透明底 + 每张顶 hairline，hover **保留**顶线）。首页封面是滚动纸面上的一张 `.cover-story.card-hover-g`（kicker 与正文同卡；`SCROLL · 下读` 在纸面顶通栏 ink 下、卡外），悬停走卡上的方案 G，**不要**再拆 peek/detail 用 `:has()` 同步。`prefers-reduced-motion` 或用户 REDUCED / MINIMAL 时去掉翻角/花藤/位移，只留着色。
- **首页目录行**（`.toc-row`）：hairline 分隔 + 轻底色 hover + 标题提 accent；**不套**方案 G（无翻角/花藤/位移），与列表时间线卡边界分明。
- **列表刊头**（`/projects` `/blog` 共用 `.ed-filter`）：编辑式 kicker（FILTER · 标签），不是纸面 Filter Bar。下拉仍是 `AppSelect`（`variant="editorial"`）。博客置顶是独立 `.timeline-pin` 带，日期用 `.timeline-date--with-year` 叠年，**不**拉宽 `--timeline-date-col`，**不**另开 Timeline 排版文件。筛选写入 query：博客 `?cat=`（`all` 不写）/`?tag=`/`?q=`，项目 `?tag=`、隐藏归档时 `archived=0`；空键不出现在 URL。分类/标签 `push` 进历史，检索去抖 `replace`。
- **留言页**（`/messages` 方案 D）：一级列表刊头，H1「留言」，无返回链。Write 用 `.ed-filter` inset；Inbox 行不 inset。列表是目录行（头像 + 衬线名 + mono 元数据），hover 同首页 `.toc-row`（elevated 洗底 + 名提 accent），**不套**方案 G。楼中楼是 `replies[]`（`parent_id` 挂多行），不是单条站长 `reply`。危险色（琥珀/红）只给站长拉黑、删除与取消回复，不作页面强调色。
- **友链页**（`/friends` 方案 A）：一级列表刊头，H1「友链」，无返回链。Links · 往来进 `.ed-filter`；申请 / 审核是下划线 `.ed-action`。Directory · 名录是目录行（头像 + 衬线名 + mono 域名），透明底 + 每张顶 hairline，hover 同 `.toc-row`，**不套**方案 G。Extra · 特殊两列并排。申请 / 审核是次级页：`← 友链` + H1「申请」/「审核」。Facts / Apply / Review / Queue 的内收与字段语言见批次 125。**必须保留**站点图标预览（申请 `previewAvatar`、审核 `previewAvatarFor`、Facts 本站 logo）。验证码视觉对齐留言，仍走本页 captcha，不抽共享组件。
- **栖息碎念 / 推荐**（`/fragments` `/recommend` 方案 B）：两页独立，一级刊头，H1「碎念」/「推荐」，无返回链。说明进 `.ed-filter`；心情/分类在左，最新/最早同行最右。筛选钮滑动下划线对齐博客 Section·分类（`.ed-cats` / `.ed-cat-line`）。名录是目录行（顶 hairline），hover 同 `.toc-row`，**不套**方案 G。有封面行加高、图拉满行高；无封面不留缩略图位。心情/分类只给词上色，不要胶囊徽章、不要每行左边色条。点开仍走 `XiqiSplitLayout`（footer 锁定、滚动还原、clip 揭开），不要另写一套分栏。展开后选中行右侧 2px accent 竖线与详情折缝成对，**不要箭头**。关闭钮 `.ed-action.danger`。推荐星级前端不显示，后端字段不动。两页共用 `components/editorial`（kicker / 筛选切换 / 名录行 / 详情壳），详情 Markdown 仍挂 `.markdown-reading` 并接代码复制；友链名录与博客/项目 Timeline、详情整页 `.ed-mast` **不**并进这套。
- **碎念 / 推荐撰写**（`/fragments/compose` `/recommend/compose` 方案 A）：次级刊头，`← 碎念` / `← 推荐` + H1「撰写碎念」/「撰写推荐」。说明进 `.ed-filter`（Write · 撰写）。心情 / 分类 / 状态用 `AppSelect variant="editorial"`，菜单同刊头纸面（ink 顶线，不是药丸/卡片）；碎念时间用 `AppDateTimeField variant="editorial"`。状态含草稿 / 发布 / 隐藏。双栏纸面，右栏 Preview 左边一根竖 hairline（`--color-border`，不是 accent 脊）。上传 / 保存 / 回列表是 `.ed-action`，不要玻璃头、不要药丸、不要 `btn-accent`。两个保存：「保存至 import」只写 Markdown；「写入数据库」写完 import 后立刻入库，列表可见。推荐星级前端不显示（默认 5，后端字段不动）。非站长重定向回列表。
- **碎念 / 推荐编辑**（`/fragments/edit` `/recommend/edit`）：次级刊头，`← 碎念` / `← 推荐` + H1「编辑碎念」/「编辑推荐」。名录复用 Ledger 行（`.ed-feed` / `EdFeedRow`），含草稿 / 发布 / 隐藏，**不要**分栏、不要右侧详情。点一行进撰写页 `?id=`，把原文填进同一套表单。列表侧「撰写」「编辑」都是 `.ed-action`。
- **首页 NOW**：文案来自 `GET /api/site/now`；空字段回退 `home.nowDoing` / `home.nowReading`。站长可走次级页 `/now`（`← 首页` + H1「此刻」）改写；非站长无首页「编辑」链、无写权限。不要做成完整 CMS。
- **关于页**（`/about` 方案 B）：一级刊头，H1「关于」，无返回链、无 `XiqiPageHero`。说明与隐私句进 `.ed-filter`；邮箱点击复制，不要 `mailto:`。刊头邮箱旁斜体「点击复制邮箱」，左栏邮箱无斜体。双栏：左身份/竞赛/证书粘滞对齐首页 `.toc-side`（`align-self:start` + sticky）；右 Education / Work / Community / Projects，节间浅灰 hairline（`--color-border`），不是 ink。奖项只给词上色（铜/银/金），不要胶囊。项目「前往项目页」是 `.ed-action`。公开 API 与前端包不下发 Raw 隐私字段；占位只用「已隐藏」标签 + 空遮挡条。`AboutPrivateText` 本页停用。
- **出站确认**：外链点击时同步 `open('about:blank')` 再 `location.replace` 到 `/leave/redirect?tab=1`（与原先同一套一级刊头；Chromium 直接 `open(url,'_blank')` 常返回 null，勿据此误开第二份确认）。`tab=1` 取消为关页，失败则提示手动关闭；弹窗被拦时当前标签进 `/leave/redirect`（取消返回）。禁止 `target="_blank"` 直开目标。OAuth 仍用 `/auth/redirect`。
- **OAuth 过渡**（`/auth/redirect`）：同一套居中刊头。AUTH · 授权；提供方名（GitHub / Google）单独放大，不要写进「即将前往授权」句。取消 / 继续是下划线 `.ed-action`。
- **法律声明**（`/legal`）：一级刊头，H1「法律声明」，无玻璃卡、无药丸。LEGAL · 声明与 intro 进 `.ed-filter`；返回是下划线 `.ed-action`（`← 首页`）。各节 kicker + 正文，节间浅灰 hairline（`--color-border`），不是 ink。邮箱点击复制，不要 `mailto:`。阅读栏约 `42rem`，不要拉成 `68rem`。
- **项目笔记**（`/projects/:slug/notes`）：次级页，`← 项目名` + H1「笔记」+ NOTES · 笔记；列表仍是 `.toc-row`（`PostCard`）。
- **详情刊头**（`/blog/:slug` `/projects/:slug` 共用 `.ed-mast`）：题名上方 ink 顶线；返回链默认 accent（博客 `← 博客`，项目 `← 项目`）。返回链带回离开列表时的 query。项目题名 / 信息 / 操作不再用三张纸卡，信息与操作是刊头下半 FACTS / ACTIONS；状态用 6px 点，不用角标。题名上方**不**放 Title · 题名 / 状态行。kicker 复用 `.ed-kicker`。
- **文章 TOC / 邻篇**：正文 h2/h3 生成目录，挂方案 D 侧栏；窄屏折叠。无标题不渲染空壳。当前节 accent 高亮，条目单行省略。项目详情 TOC 在 layout 渲染后从块标题 / Markdown 标题收集，不预解析 YAML。文末较新 / 较旧顶用 ink 线；题名用 `.ed-action`（同 Actions · 按钮），不要另做一套按钮条。
- **不改 editorial**：404、首页封面（§12）。

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

- 拖尾只有月相圆点，**无连线**；idle 从末端收回；顶满时羽状微粒散开。克制、低饱和，不抢正文。同时最多约 5 颗，间距约 48px。
- 指针精灵（Columbina / Damselette）整体约 3/4 原尺寸（`spriteMaxPx` 36）。顶栏拖尾开关图标用 Welkin Moon 填色 SVG（`TrailNavIcon`，`currentColor`）。
- 悬停 **link**（`.toc-row`、文章链接）：虹月·恒月·霜月内收，虹月近读。调参：`frontend/src/cursor/moonlitCursorConfig.ts` 的 `CONSTELLATION_HOVER_TUNING.link`。
- 悬停 **project**（项目卡、`.timeline-card`）：同一三月，外张、霜月更清楚。调参：`CONSTELLATION_HOVER_TUNING.project`。
- 点击 **祈愿**：指针完全淡出 → `wish.svg` 显现 → 轨道虚线+节点圆旋转 → 多颗 `Primogem` 从圆内侧散落（青白 / 薰衣草 / 粉）。已替换旧 `water.svg` 水纹。
- 静憩：指针停驻 ≥2s **且不在可点击控件上**，Columbina / Damselette 淡出，切 `sleep.svg` 月摇篮 + `Kuuhenki.svg` 推摇；月光晕与银河落尘在世界坐标，不随月弯摇。停在按钮 / 链接 / 可点卡上保持指针精灵，不进待机。
- 浅色纸面月光偏冷灰蓝；深色/abstract 用 cyan 线稿。强调色仍只给 UI 交互点，拖尾不占用 `accent`。

### 行为契约

- 仅 `pointer: fine` 启用；触屏不挂载。
- `prefers-reduced-motion`、用户 REDUCED / MINIMAL、或顶栏关闭：不挂载 Canvas（`ui.cursorTrailActive`，见 §9 Motion Policy）。无键默认关，仅 `localStorage ui.cursorTrail=1` 才开；引擎按需动态 import，不进首屏主包。
- 手机壳层强制关拖尾 / 音乐 / 照片背景 / FPS 时**不写** localStorage，回桌面恢复偏好。
- 启用时 `html.moonlit-cursor-on * { cursor: none }`，盖掉按钮/链接的 `cursor: pointer`，避免悬停露出系统指针。输入框 / `select` / `contenteditable`：加 `moonlit-cursor-input`，恢复系统光标，不画自定义指针。
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
    .home-scroll-layer > …paper
      .cover-paper-peek           ← 通栏 2px ink + SCROLL · 下读；与卡留缝
      .cover-story.card-hover-g  ← 整张卡（kicker + 正文 + CardCornerVineLazy）
        .cover-story-peek-head   ← 卡内刊头（kicker）；peek 高度 = 纸面顶 → 此条底
      .home-sheet                ← NOW + TOC（无 FilmFeed）
```

路由 meta：`appMainLayout: 'full-viewport'`。离页时 composable 清除 `data-home-hero-page` 与相关 CSS 变量。

### 视觉 / 背景

- **通透首屏**：开照片背景时整页去掉纸面蒙层与 `html::before` 灰罩；中间留空看 `body::before` 照片。**禁止**再叠独立 `backdrop-filter` / `__veil`。
- **滚动 blur**：仅写 `--page-photo-bg-blur`，从 0 插值到用户设定值（默认 6px）；跟手、无 0.85s filter 过渡。离页恢复用户值。写入前量化到 0.5px，同值不刷变量；progress 用缓存的纸面文档偏移 + `scrollY`，不要每帧 `getBoundingClientRect`。
- **关照片背景**：底图用改线稿前的填充 WebP（`/art/polonia_sandoren.webp` | `-dark.webp` | `-abstract.webp`，Git 里那版 1536×1024）。扇形内叠当前线稿换墨 WebP（`-wedge.webp` / `-dark-wedge.webp` / `-abstract-wedge.webp`）+ 10% 扇形墨底。线稿源 `designed/home-hero-relayout/polonia_sandoren_line.svg`（`fill:none`，只改 `stroke` 再栅格）。扇形预设（`homeStageArtWedge.ts`）：顶点 `(1270.93, 0)`、夹角 `39°`、中轴 `-45°`；浅色扇形墨 `#38697a`，深色 `#abde6b`，abstract `#f4f1e8`。无虚线射线。高度：导航下缘 → COVER STORY 上缘。宽屏贴右可向左延伸；**窄屏（≤640px）** 铺满舞台 cover、锚点约 `50% 38%`（勿贴右 100%），露出角色正脸。主题 SVG 只留 `designed/`，勿当生产热路径。
- **盖住后跳过绘制**：纸面顶缘落到导航下后给 `html` 打 `data-home-stage-covered`，`.home-stage` 用 `content-visibility: hidden`（自身 height 仍撑 sticky 占位）。回顶在露出前一截就去掉该标记，避免闪空白。
- **纸面挤入**：`.home-rising` 负 margin 叠在首屏上。COVER STORY 整张卡坐在滚动纸面上（`.home-scroll-layer-paper`），不要再拆 sticky peek。纸面顶先一根通栏 2px ink（`.cover-paper-rule`，封住卡左右缺口），其下是 `SCROLL · 下读` + 极细 ∨（muted，不加粗、不用 accent），再与卡片留缝。卡顶是 kicker `COVER STORY · 封面故事` → 标题 / 摘要 / 元数据。`--cover-peek-height` / `--cover-lift` **从纸面顶量到卡内 kicker 底**（通栏线 + cue + 缝 + kicker），不要量整张卡；线稿与欢迎卡 `bottom` 跟着上移。造型是 editorial 纸面圆角矩形（`--radius-md` 四角），底色 `--cover-story-bg`（`--color-bg-base`，与滚动纸面同一色）。卡顶底 ink 2px（`--cover-ink`，对齐 `.home-toc` 顶线 / NOW 下方那根）；顶用外侧 `box-shadow` 随 R 角走弧（不要用通栏直线横切圆角），底用 `inset`（卡上 `overflow:hidden` 会裁外侧底影）。悬停时两根卡 ink 都要保留，不要被方案 G 的浮起阴影盖掉。卡下再一根同样 2px 直 ink（`.cover-story-foot-ink`）。无左侧 accent 脊、无玻璃。底部与 footer 揭示区用盖板纸色接上（`app-page-cover::after`），勿留空缝。勿做成卡片外悬浮条、大三角或圆形按钮。

### 刊号 / 问候

- `.home-stage` 顶一条 ink 线（`--color-text`），贴导航下缘。纸面顶用通栏 2px `--cover-ink` 封缝；COVER STORY 上圆角仍由卡顶弧 ink 负责，不要再用通栏直线切卡。
- 刊号与头像分卡：上方矩形 `.mast-vol.card`，下方圆形 `.home-mast-avatar.card`，中间留间距。刊号字号与头像都略大于目录 kicker。
- 问候语与介绍语分卡；问候略加宽。默认靠左下（关照片背景再向左收一截）；**开照片背景**时整组 `transform` 滑到右侧（`.home-intro-track` 容器查询），关掉滑回。位移跟 `html[data-photo-bg]`，**不要**在 `.home-layout` 上绑 `is-photo-bg` 的 Vue `:class`。
- 四张欢迎卡（刊号 / 头像 / 问候 / 介绍）始终有 `.card` 纸面。关照片（线稿）时底改为不透明 `--color-bg-surface`、关掉 `backdrop-filter`，避免线稿透字；开照片走默认玻璃卡。开照片背景时问候整组仍滑到右下；关则滑回左下。`prefers-reduced-motion` 时位移直接到位。
- 问候入场只淡入，不动 `transform`（避免冲掉左下/右下偏移）。只等 Great Vibes（短超时），**不要** `fonts.load` 不存在的 Noto 700 italic，也不要等整页 `fonts.ready`。就绪后加 `home-fonts-ready`。

### COVER STORY 悬停

与项目卡同一套方案 G，挂在这一张 `.cover-story.card-hover-g` 上（上浮、折角、花藤、标题、kicker、tag）。`transform` 只加在卡上，不要加在 `.home-rising` / `.home-stage`。不要把刊头和正文拆成两块再 `:has()` 同步。

### 导航占位

- 首页用 `--home-nav-offset` 垫 sticky `top` / 首屏高度；只设导航 `min-height`，**不**封 `height`/`max-height`（否则会量到压矮盒子，比其它页矮）。
- 占位按展开态 `.glass-nav-inner` + padding 锁一次；compact 只收视觉胶囊。快滑回顶：`overscroll-behavior-y: none` + sticky `overflow-anchor: none`。

### 路由转场 / 入场类（硬规则）

- `HomeView` 模板**必须单根**（一个元素）。根外 HTML 注释也会变成 fragment，卡死 `AppShell` 的 `Transition mode="out-in"`，表现为离开首页后主内容空白、刷新才恢复。
- `page-enter--play` / `home-fonts-ready` 由 `classList` 写入。**禁止**在同一根上再用 Vue `:class` 绑开关态（会冲掉入场类，整页 opacity:0）。照片背景开关用文档根 `data-photo-bg`。
- 重构结构时同步 `page-enter-home.css` 选择器。
- `RouterView` 的 `:key` 用 `route.path`，不要 `fullPath`：列表改 query 不应 leave/enter 闪白。
- 列表→详情→返回：按列表 `fullPath` 记 `scrollY`；不同筛选不串位。返回列表跳过时间线入场，避免还原滚动时卡片还是 opacity:0。

## 13. FPS / 1%L 监视浮层

全站调试用，挂在 `AppShell`（不是某一页）。参考 yumetsuki 的 rAF 计数，并加 1% Low。

- **瞬时 FPS**：近 1 秒 `requestAnimationFrame` 次数。
- **1%L**：近 3 秒帧时间里最慢的 1%，取其平均再换成 FPS（`1000 / avgMs`）。样本不足时显示 —。
- **显示**：一行 `FPS 144 95(1%L)`；1%L 数字按分档着色（≤20 卡 / ≤40 尚可 / 其余正常，看 FPS 与 1%L 较差值）。
- 默认关，顶栏溢出面板开关，点卡片关闭；`localStorage ui.fpsMeter`（`1` 开 / 无键或 `0` 关）。关闭必须停 rAF。
- **不是** Motion Policy 的探测器（§9）。进站短窗采样是另一条短命路径，默认不挂本浮层。
- 页面 `hidden` 或单帧 >1s（切后台）不计入 1%L。
- 右下角纸面卡，令牌用 `--glass-nav-`*；左下回到顶部不动。

## 14. 首屏资源预算（批次 150）

对照用 `npm run build` + preview，不要拿 Vite 开发包当数。数字是 **2026-09-18** 本地生产构建。

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 主包 `index-*.js` | 324.6 kB（gzip 117） | 316.8 kB（gzip 115）；Vue runtime / router 另 chunk |
| 壳层 CSS `index-*.css` | 106.1 kB（gzip 18.4） | 84.9 kB（gzip 14.9） |
| 拖尾 / 音乐 / FPS | 打进主包 | 默认不下：`CursorTrail` 44.2 kB、`FloatingMusicPlayer` 18.1 kB + CSS 19.2 kB、`FpsMeter` 2.1 kB |
| 首页 chunk `HomeView-*.js` | 15.0 kB（gzip 5.9） | 15.1 kB（gzip 5.9） |
| 舞台 WebP（当前主题底+楔） | 浅色约 140 + 234 kB，整文件 | 同左；不加 `sizes`/`srcset`，横竖屏不换源 |
| 字体 | `fonts.css` 含 Great Vibes；Noto SC 500/600 各约 1.5 MB | Great Vibes 只随首页 CSS；Noto 本批不重做子集 |

契约：

- 舞台图只挂当前主题两张 `<img src>`，装饰、`fetchpriority="low"`。不预拉其它主题。
- 音乐：顶栏展开才动态 import `FloatingMusicPlayer` 并拉曲目；本会话收起不卸载。
- 拖尾 / FPS：开启后才动态 import。GSAP 仍在壳层包（路由转场要用）。
- 功能都能手动打开，不删。

