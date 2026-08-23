

.venv\Scripts\activate.bat
. .\venv\Scripts\Activate.ps1
cd backend; . .\venv\Scripts\Activate.ps1; python run.py;
cd frontend; npm run dev;

1. （可选）顶部导航栏花里胡哨的效果，鼠标光标没悬停在导航栏上时，文字收缩，仅显示图标，悬停时，文字展开，显示文字和图标。像灵动岛一样，鼠标悬停时，导航栏向下展开一些，图标和文字同时显示。这里注意鼠标光标在边界位置的判定问题，不然鼠标悬停在边界位置时，导航栏会一直展开，或者想点击某个按钮时，导航栏会突然收起。
2. 导航栏做成跟踪导航栏（高亮效果会移动）
3. 文章部分，“系列、难度”部分，屏幕向下滑动后，在左侧“弹”一下展示出“文章标题、OI-wiki快捷链接、标签tags”。
4. 音乐播放器的音量调节器，打开一个小容器，有吊图，根据音量的高低来判断展示什么图片/gif，像拖拉机的摇杆一样按住拖动，

图片/gif预选：动力danking，维斯塔潘麦昆

1. 增加文章
2. 增加 友链 板块

通过 plan 实现

1. 增加 留言 板块

留言模块的 审核 机制，现状：发布留言直接通过了。

1. 增加备份功能——用脚本将数据库中的内容备份到本都，并且定期上传到github。
2. 目前的缺点：

- 音乐播放器切换唱片，栖息界面“碎念”部分的详情展开动画

1. 2026-08-17 风格统一性回归完成：

- 博客/项目列表年份计数改 mono kicker（0.78rem / mono / 0.05em）
- 文章详情正文 `.body` 去框平铺，阅读栏仍由 markdown-reading 提供
- 项目详情 overview/markdown/changelog 文字块平铺化（hairline 分段），gallery/demo 保留卡片
- 友链/留言表单控件去玻璃混色，focus 改 2px accent outline
- 关于页事实网格改 hairline 分格（gap:0 + 共享边框）
- DESIGN.md 增补：mono 数值、表单控件 focus、平铺约定

1. 2026-08-18 hover 语言收敛（DESIGN.md §9）：

- 导航 .link/.group-trigger hover 去染色底+弹跳，只留文字色+生长线；展开/当前页保留染色底标识
- 下拉项 hover 从 accent 22% 染色改为色阶表面 bg-elevated
- 全局 .card:hover 扫光/浮起/发光阴影删除（展示卡 hover 无变化）
- 可点击卡（timeline-card/friends-apply-entry）hover 统一为左缘 accent 竖线（inset 2px）+ translateY(-1px)
- 右侧工具按钮（音乐/主题/语言等 scale+glow）未动，如需收敛另开任务

1. 2026-08-18 全局基准字号 16px → 17px（`html font-size: 106.25%`）：

- 原因：大量元数据 0.65–0.78rem（≈10–12.5px）在 Windows 中文渲染下发虚
- 所有 rem 等比放大 6.25%；首页/博客/详情/关于/移动端截图回归通过
- 音乐播放器装饰小字（0.65–0.7rem）保持不动
- DESIGN.md §3 增补基准字号约定与元数据下限

1. 2026-08-19 方案 G 合订 + 胶片宽屏无缝循环（已完成）：

- [x] 方案 G（翻角+错位+檐角）落地：`.card-hover-g` + `CardCornerVine.vue` + 博客/项目 timeline-card + 首页 cover-story
- [x] cover-story「开始阅读」右移 gutter，避开花藤 SVG
- [x] FilmFeed 横向宽屏：按视口动态克隆组数 + `--film-repeat` 位移，修复轮播断层
- [x] DESIGN.md §9 更新可点击卡 hover 语言

1. 2026-08-19 前端收尾（纸面重构后 · 按序做，不求快）：

**P0 — 体验 / 性能（先做）**

- [x] 105-1 FilmFeed 滚轮：首页横幅 `@wheel.prevent` 劫持整页滚动 → 默认页面可滚；Shift+滚轮才调速度；悬停时光标变化 + 右上角滚轮提示（i18n）
- [x] 105-2 花藤 SVG 懒挂载：博客/项目 timeline-card 首次 hover 再插入 `CardCornerVine`，静止列表不重复 39 条 path
- [x] 105-3 FilmFeed `prefers-reduced-motion`：系统减少动态时停 infinite scroll，保留静态帧或首屏条
- [x] 105-4 中文展示衬线：补 Noto Serif SC 简体中文子集自托管（500/600），`--font-serif` 中文标题不再落 SimSun

**P1 — 设计语言收束**

- [x] 105-5 全局 `.badge` 字号：0.68rem → ≥0.76rem（DESIGN.md §3 元数据下限），三档主题抽查
- [x] 105-6 顶栏右侧工具按钮：音乐/主题/语言/photo-bg 等 hover 去 scale+glow，对齐导航「提色 + 克制」
- [x] 105-7 `SiteNavGroup` 下拉 `blur(20px)` 收到 `--glass-nav-blur`（≈10px），与纸面令牌一致

**P2 — 结构 / 维护**

- [x] 105-8 时间线样式去重：BlogView / ProjectsView 重复 scoped CSS → 抽 `page-timeline.css`；方案 G 只改一处
- [x] 105-9 首页 `.toc-row` 目录行：保持 hairline 目录 hover（不着色块、不套方案 G），与 timeline-card 边界写进 DESIGN.md 一句
- [x] 105-10 `PostCard.vue`（项目笔记列表）：对齐 timeline 目录式排版（serif 标题 + mono 日期），去掉孤立 `.card` 墙感

**P3 — 已有 backlog，单独立项（本批不做除非用户点名）**

- [x] 106-1 栖息碎念详情展开动画（见 100、`page-xiqi.css` detail enter）
- [x] 106-2 文章详情滚动侧栏（系列/难度/OI-wiki）

1. 2026-08-20 路由跳转 · 全屏遮罩（参考 jiejoe，改成纸面）

**这部分暂时搁置**

参考：`https://www.jiejoe.com/home` —— 固定全屏遮罩盖住整站（含导航），双层色块从一侧刮入，中间露出标记，再刮走揭开新页。本站不抄霓虹绿 / LOADING / 胶片 Lottie，只借**「单独一层盖住界面」**的结构。

现状：`AppShell` 只有正文 GSAP `out-in`（淡出上移），**没有**盖住导航的遮罩层。

**流程（先 HTML 预览 → 选定 → 再落地 Vue）**

- [ ] 107-1 原型：打开 `designed/page-transition/index.html`，点壳内导航，对比 A–E
- [ ] 107-2 选定后落地：遮罩挂在 `AppShell` 最外层（`position:fixed`，盖住 nav/main/footer）；内容在完全盖住时替换
- [ ] 107-3 与 `page-enter--play`：遮罩揭开后再播页内入场，或揭开当帧跳过位移
- [ ] 107-4 `prefers-reduced-motion`：无遮罩，直接切页
- [ ] 107-5 DESIGN.md §9 补遮罩契约（色块只用 ink/paper/accent，中间字用去向而非 Loading）

**方案对照**


| 代号  | 名称   | 说明                                         |
| --- | ---- | ------------------------------------------ |
| A   | 双层横刮 | 最接近 jiejoe：墨绿先刮、墨色跟上，中间衬线去向，再向左刮走          |
| B   | 整页落纸 | 暖纸从上落下，顶边 accent 发丝                        |
| C   | 对开合页 | 左右纸面向中缝合上再打开                               |
| D   | 墨色盖印 | 墨色从下铺满，再向上揭开                               |
| E   | 花藤勾帘 | 主茎勾到约 3/4，细梢扣帘边；墨帘从下盖满后整帘上收                |
| F   | 墨上生枝 | 纯 D 墨色盖满，中央再长出一枝简化花藤（贴图遮罩 + 描边生长），随后连帘带枝上收 |


1. 2026-08-23 首页减法与阅读层级

方向：在 105 纸面重构基础上做**减法**——Hero 只负责个人印象，Cover Story / Latest / Projects / About 负责内容；不堆新装饰，只调布局、字阶与栏目权重。

现状（`HomeView.vue`）：

- 刊号行 `home-mast`（VOL / NO / 小头像）+ 高幅 `home-band`（FilmFeed 背景 + `cover-kicker`「站点名 · 个人成果与笔记」+ 问候语）
- 分区标题 `toc-head`（LATEST / PROJECTS / ABOUT / REREAD）字重偏轻
- 正文/摘要字号与博客列表接近，Hero 占位高，首屏难看到目录内容

参考：栖息 · 碎念 / 推荐列表区（`FragmentsView` / `RecommendView`）——标题 + 摘录的**目录行**节奏，Hero 宜更接近这种「一行一条、尽快进入内容」的密度，而非全屏横幅。

**P0 — Hero 重组（先做）**

用户确认本次只改两条，先不动左文右图大改：

- [x] 108-1 删除 `home-band` 上的 `cover-kicker` 一行（`{{ SITE_NAME }} · {{ t('home.tagline') }}`）；保留问候语与副标题
- [x] 108-2 降低 `home-band` 高度（桌面 `clamp(13rem, 32vh, 20rem)`，移动端 `clamp(10rem, 26vh, 16rem)`）；`.home-band-film` 仍 `inset: 0` 铺满，**不要裁切**胶片上沿。FilmFeed 必须同步修副本测量，否则 Chrome/Edge 会卡死。

**⚠️ 第三方浏览器首页卡死（历史回归，改 Hero 时必查）**

- 现象：Edge / Chrome 打开首页卡死，CPU/内存/磁盘打满；内置浏览器不一定复现。
- 根因：横向格 `height:100%` + `aspect-ratio:4/5`，容器变矮 → 格变窄 → `measureLoopCopies` 改 `repeatCount` → `:key="repeatCount"` 整轨重挂载、图片反复读盘。只裁切外框会挡住胶片上半，不可用。
- 做法：容器变矮并铺满；`FilmFeed` 去掉轨道 `:key`、只观察 `.film`、布局未完成时不冲 `MAX_REPEAT`。改完后用 **Edge 或 Chrome** 打开首页停留/滚动 30 秒确认无卡死且胶片上下齿孔都可见，再勾选 [x]。

- [ ] 108-3 Hero 改为**左文右图**（暂缓，待 P0 验证稳定后再做）：左栏衬线问候 + 个人简介；右栏头像/形象图 + 向纸底的自然渐变融边
- [ ] 108-4 刊号行 `home-mast`：与新版 Hero 合并或收束（暂缓，同 108-3）

**P1 — 栏目与字阶**

- [ ] 108-5 分区标题加粗：`toc-head`（LATEST / PROJECTS / ABOUT / REREAD）及 Cover Story kicker 适度提字重，仍用 mono kicker，勿变渐变字
- [ ] 108-6 导航栏外正文放大：`.toc-summary`、项目描述、Cover Story lede 等**正文级**略增；`.toc-title` / `.cover-story-title` / Hero 问候**分别加大**；日期、标签、`.toc-meta` 保持较小（≥0.76rem 下限，DESIGN.md §3）
- [ ] 108-7 三主题 + 移动端目视；必要时同步博客/项目列表摘要字号，避免首页与列表落差过大

**涉及文件**
`frontend/src/views/HomeView.vue`、`frontend/src/styles/page-enter-home.css`、`frontend/src/i18n/locales/{zh,en}.json`；字阶若跨页则改 `main.css` / `markdown-reading.css` 时注明范围。

1. 2026-08-23 项目 / 博客详情页完善

与 108 独立：108 动首页与全局阅读字阶；109 动详情页媒体与滚动侧栏。可并行，但建议先合 108 再动侧栏触发逻辑，避免同文件 `PostDetailView` / `ProjectDetailView` 冲突。

**P0 — 图片查看**

- [ ] 109-1 项目详情内图片：悬停时在**右侧**出现预览浮层（类似详情左栏 overlay 气质，非挤占正文）；点击后全屏遮罩大图。实现方式不限（CSS / 小组件），需 `prefers-reduced-motion` 降级

**P1 — 滚动侧栏**

- [ ] 109-2 博客 / 项目详情侧栏（`useDetailScrollSidebar`）：题录滚出触发区后**稳定展示**侧栏块，避免在标题区与正文区之间滚动时出现半透明/半露出状态；进入触发区即用现有动画完整呈现，离开顶部再收拢

**涉及文件**
`frontend/src/views/ProjectDetailView.vue`、`PostDetailView.vue`、`useDetailScrollSidebar.ts`、`DetailScrollSidebar.vue`、项目块 `GalleryBlock` 等含图组件。

**每完成一项：本地目视 + 必要时 Playwright 截图；勾选 [ ] → [x]**