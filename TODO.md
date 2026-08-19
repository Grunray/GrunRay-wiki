0. 
.venv\Scripts\activate.bat
. .\venv\Scripts\Activate.ps1
cd backend; . .\venv\Scripts\Activate.ps1; python run.py;
cd frontend; npm run dev;

1. （可选）顶部导航栏花里胡哨的效果，鼠标光标没悬停在导航栏上时，文字收缩，仅显示图标，悬停时，文字展开，显示文字和图标。像灵动岛一样，鼠标悬停时，导航栏向下展开一些，图标和文字同时显示。这里注意鼠标光标在边界位置的判定问题，不然鼠标悬停在边界位置时，导航栏会一直展开，或者想点击某个按钮时，导航栏会突然收起。
2. 导航栏做成跟踪导航栏（高亮效果会移动）

3. 文章部分，“系列、难度”部分，屏幕向下滑动后，在左侧“弹”一下展示出“文章标题、OI-wiki快捷链接、标签tags”。

4. 音乐播放器的音量调节器，打开一个小容器，有吊图，根据音量的高低来判断展示什么图片/gif，像拖拉机的摇杆一样按住拖动，
图片/gif预选：动力danking，维斯塔潘麦昆


5. 增加文章

6. 增加 友链 板块

通过 plan 实现

7. 增加 留言 板块

留言模块的 审核 机制，现状：发布留言直接通过了。

8. 增加备份功能——用脚本将数据库中的内容备份到本都，并且定期上传到github。


100. 目前的缺点：
- 音乐播放器切换唱片，栖息界面“碎念”部分的详情展开动画

101. 2026-08-17 风格统一性回归完成：
- 博客/项目列表年份计数改 mono kicker（0.78rem / mono / 0.05em）
- 文章详情正文 `.body` 去框平铺，阅读栏仍由 markdown-reading 提供
- 项目详情 overview/markdown/changelog 文字块平铺化（hairline 分段），gallery/demo 保留卡片
- 友链/留言表单控件去玻璃混色，focus 改 2px accent outline
- 关于页事实网格改 hairline 分格（gap:0 + 共享边框）
- DESIGN.md 增补：mono 数值、表单控件 focus、平铺约定

102. 2026-08-18 hover 语言收敛（DESIGN.md §9）：
- 导航 .link/.group-trigger hover 去染色底+弹跳，只留文字色+生长线；展开/当前页保留染色底标识
- 下拉项 hover 从 accent 22% 染色改为色阶表面 bg-elevated
- 全局 .card:hover 扫光/浮起/发光阴影删除（展示卡 hover 无变化）
- 可点击卡（timeline-card/friends-apply-entry）hover 统一为左缘 accent 竖线（inset 2px）+ translateY(-1px)
- 右侧工具按钮（音乐/主题/语言等 scale+glow）未动，如需收敛另开任务

103. 2026-08-18 全局基准字号 16px → 17px（`html font-size: 106.25%`）：
- 原因：大量元数据 0.65–0.78rem（≈10–12.5px）在 Windows 中文渲染下发虚
- 所有 rem 等比放大 6.25%；首页/博客/详情/关于/移动端截图回归通过
- 音乐播放器装饰小字（0.65–0.7rem）保持不动
- DESIGN.md §3 增补基准字号约定与元数据下限

104. 2026-08-19 方案 G 合订 + 胶片宽屏无缝循环（已完成）：
- [x] 方案 G（翻角+错位+檐角）落地：`.card-hover-g` + `CardCornerVine.vue` + 博客/项目 timeline-card + 首页 cover-story
- [x] cover-story「开始阅读」右移 gutter，避开花藤 SVG
- [x] FilmFeed 横向宽屏：按视口动态克隆组数 + `--film-repeat` 位移，修复轮播断层
- [x] DESIGN.md §9 更新可点击卡 hover 语言

105. 2026-08-19 前端收尾（纸面重构后 · 按序做，不求快）：

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

**每完成一项：本地目视 + 必要时 Playwright 截图；勾选 [ ] → [x]**
