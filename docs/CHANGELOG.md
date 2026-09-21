# Changelog

按时间倒序。编码代理入口见 [AGENTS.md](../AGENTS.md)。视觉契约见 [DESIGN.md](./DESIGN.md)，键盘与读屏见 [ACCESSIBILITY.md](./ACCESSIBILITY.md)，排障见 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。

任务勾选与验收见 [TODO.md](../TODO.md)。本文件只记「已经发生了什么」：一两句效果 + 可选批次号；合入用已合并 PR（或上了 `main` 的关键 commit）挂在对应日期，不把 TODO 的 `- [x]` / P0 / 涉及文件整段贴过来。

纸面重构批次（TODO 105）之前的条目，据 GitHub 提交与 PR #2–#4 整理，仓库 TODO 无对应勾选。

## 2026-09-21

### 内容

- 新增项目 `proj-openclaw`（OpenClaw 技能与本地桥接）；CAD / 文件 RAG / ASR / Excel 排产四篇改为其 `project_note`（`/projects/openclaw/notes`）。
- icpcCode 仍为普通博文；DeepSeek+Dify 糖尿病助手改为独立项目卡片。正文避开甲方公司名。

## 2026-09-19

### 站长通知

- 访客留言、非站长回复、友链申请写入成功后，经 SMTP 给站长发一封邮件。未配齐或发送失败不影响提交；站长自己的留言和回复不发。配置只放 `backend/.env`。

### Docs

- 新增 `docs/TROUBLESHOOTING.md`：现象 / 根因 / 解法模板；与 TODO、CHANGELOG 分工。先收录 REDUCED 可见性、页脚 clip、详情焦点、`parentNode` 转场、venv/pytest 等条目。
- 新增根目录 `AGENTS.md`（代理文档地图 / 硬约束 / 开干·收工）与 `.cursor/rules/grunray-agents.mdc`（alwaysApply 指向入口）。

### CI · 批次 153

- GitHub Actions：`push` / PR 跑前端 `vue-tsc` + `vite build`、后端 pytest（校验 / 序列化 / 友链·留言，不连 MySQL）。失败标红。本地命令写在 `TODO.md` 开发命令区与 `backend/README.md`。
- Playwright 冒烟本批不做。

## 2026-09-18

### Docs

- 设计契约迁到 `docs/DESIGN.md`；新增本 CHANGELOG 与 `ACCESSIBILITY.md`。仓库根 `DESIGN.md` 改为指针，旧链接仍可用。

### Motion · 批次 151

- 统一 Motion Policy：导航溢出面板 `MOTION · 动效` 三态 AUTO / REDUCED / FULL；运行时档写 `html[data-motion]`。系统 `prefers-reduced-motion: reduce` 永远 MINIMAL，FULL 不能抬过。
- 短窗性能采样只建议、须点同意才写入 REDUCED；FPS 浮层仍是手动调试，禁止常驻探测 rAF、禁止静默关特效。
- REDUCED 跟进：页脚大字仍按滚动 clip 揭开；入场仍打 `page-enter--play`；顶栏不收成胶囊；路由 / 分栏 JS 转场跳过 GSAP 时不在同步钩子里拆节点；碎念·推荐关详情先归还名录焦点再 `aria-hidden`。

### Performance · 批次 150

- 拖尾无键默认关、开启后才加载引擎；音乐点开展开才挂播放器；FPS 同样按需。壳层 CSS 约 106 kB → 85 kB。舞台图不加 `sizes`，横竖屏不换源。Great Vibes 只跟首页。数字见 `DESIGN.md` §14。

### Accessibility · 批次 149

- 页顶 Skip link → `#main`；汉堡抽屉与碎念 / 推荐 Read sheet：焦点陷阱、`Esc`、关闭后焦点归还；出站确认可纯键盘，关页失败 `aria-live`；顶栏溢出菜单键盘可达并保留可见焦点环。清单见 `ACCESSIBILITY.md`。

### Habitat / compose · 批次 148

- 首页「此刻」可站长编辑（公开只读 + 受保护写）；碎念 / 推荐撰写合入 editorial；站长编辑名录 `/fragments/edit`、`/recommend/edit`（Ledger 行，点开 compose `?id=`）。
- `AppSelect variant="editorial"` 对齐刊头纸面，`/design` 有实况样例。站长权限判断已恢复；COVER STORY 窄屏钉 overlay（148-7）不做。

### Reading · 批次 147

- 博客 / 项目列表筛选与 URL 双向同步；列表→详情→返回尽量恢复滚动。
- 文章详情侧栏 TOC（h2/h3）；无标题不渲染；邻接上一篇 / 下一篇轻量入口。

## 2026-09-16

### Uploaded

合入（UTC 当晚，东八区记本日）：

- [PR #45](https://github.com/Grunray/GrunRay-wiki/pull/45) — 手机壳层：汉堡抽屉、碎念 / 推荐 Read sheet、Footer 仅 ICP
- [PR #46](https://github.com/Grunray/GrunRay-wiki/pull/46) — 首页通透楔形线稿 + COVER STORY 纸面卡
- [PR #47](https://github.com/Grunray/GrunRay-wiki/pull/47) — 出站确认：新标签可关页
- [PR #48](https://github.com/Grunray/GrunRay-wiki/pull/48) — 月相拖尾：Welkin Moon 图标、可点不待机、藏系统指针
- [PR #49](https://github.com/Grunray/GrunRay-wiki/pull/49) — 导航 / 拖尾相关原型与 DESIGN·TODO 记录

对应本地批次（实现日可能早于合入日）：手机壳层 141、出站确认 143、首页纸面 144、月相拖尾 145。勾选见 [TODO.md](../TODO.md)。

### Empty / error · 批次 146

- 列表 / 详情 / 栖息统一 `PageStatusBlock`：加载失败可重试；库空与筛选无匹配分文案；公网页不再露出「请启动后端」类开发者口吻。

## 2026-09-15

### Home · 批次 144

- COVER STORY 合成为滚动纸面上的一张卡；`SCROLL · 下读` 走 editorial；纸面顶通栏 2px ink，封住卡顶弧线左右缺口。

### Leave · 批次 143

- 外链新标签打开出站确认，与原先 `/leave/redirect` 一级刊头同皮；`tab=1` 关页失败有文案。Footer 与其它外链同一路径。

## 2026-09-14

### Home stage · 批次 142

- 关照片背景时右侧舞台：扇形外填充 + 扇形内线稿换墨 + 10% 扇形底；几何写死 composable。修掉 `ThemeDayNightToggle` fragment 根无法继承 `class` 的 Vue 警告。

## 2026-09-11

### Mobile shell · 批次 141

- `max-width: 768px` 统一手机壳层：汉堡抽屉、碎念 / 推荐底部 Read sheet、Footer 仅 ICP、强制关照片 / 拖尾 / FPS（不写 localStorage）。短页也能露出 ICP。合入见 [2026-09-16](#2026-09-16) PR #45。

## 2026-09-08

### Home · 批次 133–140

- **133**：顶栏导航按钮改 editorial 目录项（方案 D）；收缩胶囊契约不动。
- **134–135**：欢迎层 ink / 左移 / 刊号放大；欢迎卡随 `data-photo-bg` 透明或先铺再滑。
- **136–138**：COVER STORY editorial 刊头皮；R 角 + 走弧 ink；卡面与纸面同色、顶底 2px ink。
- **139**：NOW「在写 / 在读」只改 i18n（当时未接接口；后由 148 接站长读写）。
- **140**：窄屏线稿锚点不贴右；关照片背景时欢迎卡恢复纸面，避免线稿压字。

## 2026-09-07

### Uploaded

- [PR #34](https://github.com/Grunray/GrunRay-wiki/pull/34)–[#44](https://github.com/Grunray/GrunRay-wiki/pull/44) — 深色 Dendro accent、共用 editorial 组件与 i18n、关于简历、出站 / OAuth 刊头、友链 / 留言 / 栖息 editorial、法律页与项目笔记刊头、音乐默认收起等。

### Editorial sweep · 批次 127–132

- **127**：碎念 / 推荐双栏各自滚动，阅读态加宽留白；不锁 `html overflow`。
- **128**：碎念 / 推荐共用 editorial 组件与日期；详情 Markdown 接博客同款代码复制。
- **129**：关于页改双栏履历（方案 B）。
- **130–131**：出站确认、OAuth 过渡去掉卡片 / 药丸，改一级刊头。
- **132**：剩余公开路由收进同一套刊头语言（404、撰写药丸、首页 §12 除外）。

## 2026-09-06

### Community / habitat · 批次 123–126

- **123**：留言页方案 D 刊头 + 楼中楼 `replies[]`。
- **124**：蜗牛开屏只本机首次播；跨标签 / OAuth 回跳不重播；顶栏 🐌 仍可手动重播。
- **125**：友链目录 / 申请 / 审核合入 editorial 方案 A。
- **126**：碎念 / 推荐合入 habitat editorial 方案 B（分栏仍走 `XiqiSplitLayout`）。

## 2026-09-05

### Uploaded

- [PR #29](https://github.com/Grunray/GrunRay-wiki/pull/29)–[#33](https://github.com/Grunray/GrunRay-wiki/pull/33) — 列表 / 详情 editorial 刊头、原型与文档、Polonia 主题线稿资源。

### Lists / detail · 批次 121–122

- **121**：项目 / 博客列表方案 D editorial 刊头；继续共用时间线。
- **122**：博客 / 项目详情顶栏方案 A editorial 刊头；正文与滚动侧栏不重排。

## 2026-08-28

### Uploaded

- [PR #22](https://github.com/Grunray/GrunRay-wiki/pull/22)–[#28](https://github.com/Grunray/GrunRay-wiki/pull/28) — 通透 Hero 与滚动性能、出站 / OAuth / 法律与友链审核、film 同步删除、FPS 浮层、首页 / 页脚原型、TODO 记录、问候字体与月相微调。

### Home / tools · 批次 117–120

- **117**：通透首屏 + 纸面从下挤入；FilmFeed 不进首页；介绍语随照片背景左右滑。
- **118**：减首页 GPU / 首屏等待；模糊仍只走 `--page-photo-bg-blur`。
- **119**：全站可开关的 FPS / 1%L 纸面浮层（调试用，关则停 rAF）。
- **120**：问候语中文 / 花体裁切修复；月相拖尾尺寸与透明度微调。

（批次 **114–116** 本地完成后亦随本组合入：出站确认与页脚短页、友链申请与站长审核、照片背景默认模糊与目录字重。）

## 2026-08-25

### Uploaded

分批合入（109–113），见 TODO 归档表：

- [PR #15](https://github.com/Grunray/GrunRay-wiki/pull/15) 顶栏胶囊 · 111
- [PR #21](https://github.com/Grunray/GrunRay-wiki/pull/21) 照片背景模糊调节 · 112
- [PR #17](https://github.com/Grunray/GrunRay-wiki/pull/17) 月相拖尾 · 113
- [PR #18](https://github.com/Grunray/GrunRay-wiki/pull/18) 笔记 toc-row · 110
- [PR #19](https://github.com/Grunray/GrunRay-wiki/pull/19) 画廊预览 + 详情侧栏 · 109
- [PR #20](https://github.com/Grunray/GrunRay-wiki/pull/20) TODO 同步

### Cursor · 批次 113

- Canvas「星座月相」指针替换字母拖尾：Columbina / Damselette / 月相拖尾 / 静憩 / 祈愿；editorial 克制，无霓虹粒子。

## 2026-08-23

### Shell / detail · 批次 108–112

- **108**：首页 Hero 减法；Cover Story / Latest / Projects / About 承担内容。
- **109**：详情画廊预览与滚动侧栏。
- **110**：项目笔记列表对齐首页 toc-row（整行可点、hairline）。
- **111**：顶栏工具与主导航统一（分段胶囊 + 密度收紧）。
- **112**：照片背景钮右键模糊滑杆（0–48px），即时预览并持久化。

## 2026-08-19

### Uploaded

纸面重构分批合入：

- [PR #5](https://github.com/Grunray/GrunRay-wiki/pull/5)–[#14](https://github.com/Grunray/GrunRay-wiki/pull/14) — GSAP、纸面令牌与字体、首页重排、方案 G 时间线卡、导航与胶片、碎念分栏滚动、滚动侧栏原型、杂项抛光与设计原型。

### Paper redesign · 批次 105 与归档

- **105**：纸面重构后体验 / 性能收尾；时间线样式抽离；栖息详情展开与详情滚动侧栏立项落地。
- **方案 G 与胶片**：可点击卡翻角 + 花藤；FilmFeed 宽屏无缝循环。
- （同日前后）全局导航 hover 收敛、基准字号 16→17px — 见下节。

## 2026-08-17

### Style（含 08-18）

- 列表年份 mono kicker；详情去框 / hairline；友链与留言表单去玻璃混色；关于页事实网格；DESIGN 增补 mono / 表单 / 平铺约定。
- 导航与卡片 hover 去掉染色底与扫光浮起；可点击卡统一左缘 accent 竖线 + 轻位移。
- 全局基准字号调至约 17px（`html` 106.25%）。

---

以下日期 **早于纸面重构批次（TODO 105 起）**，仓库根 `TODO.md` 无对应批次；摘要据 [GitHub 提交](https://github.com/Grunray/GrunRay-wiki/commits/main) 与早期 PR 整理，按日归并，略去琐碎文案 / 内容微调。

## 2026-06-09

### Content

- 碎念 import 文案更新；新增 4 条优化主题碎念（吐槽 / 随笔 / 瞬间 / 日常）。

## 2026-06-08

### Uploaded

- [PR #4](https://github.com/Grunray/GrunRay-wiki/pull/4) — GSAP 路由跳转转场、滚动进度与回到顶部。

### Perf / media / motion

- 路由懒加载 + 字体自托管；媒体图 WebP 内容协商（按需转码 + 磁盘缓存）。
- sitemap / robots + `index.html` 静态兜底 meta。
- 全屏背景 Blur-up / 光晕呼吸；`AppImage` 蜗牛爬行加载；蜗牛 loader 覆盖 FilmFeed、画廊、栖息封面与关于头像。
- Hero 图走 API 优先 + 本地兜底；修 preview 下 hero 404。
- 修路由转场前容器宽度突变；修顶部滚动进度条（footer 预留 + 异步内容）。
- 移除误提交的大体积 zip / demos `node_modules`；补充 gunicorn 等优化档案笔记。

## 2026-06-07

### Uploaded

- [PR #3](https://github.com/Grunray/GrunRay-wiki/pull/3) — 全面适配手机端布局（早期窄屏适配；后由 141 手机壳层再统一）。

## 2026-06-03

### Uploaded

- [PR #2](https://github.com/Grunray/GrunRay-wiki/pull/2) — 修复生产构建后液态玻璃失效，以及照片背景随页面高度错误缩放。

### Docs

- 补充需求宣讲用 deck / 讲稿类设计材料。

## 2026-05-31

### Community / footer

- 留言：站长删除与作者拉黑。
- 友链：名录替换为 Apos Blog 友链条目。
- 页脚：恢复 meta 栏 RSS 与双 ICP 布局；修 `vue-tsc`（VinylDeck / XiqiSplitLayout）。

## 2026-05-29

### Footer

- 页脚揭示推迟到路由布局稳定后再算，减少切页误揭。

## 2026-05-28

### Music

- 黑胶 VinylDeck 传输控件与滑入动画；补充音乐播放器原型与实验资源。

## 2026-05-25

### Habitat / feeds / reading

- RSS 2.0：`/rss.xml`。
- Markdown 阅读样式收口到共用 CSS；栖息分栏与页脚整合。
- 栖息详情进出动画、列表筛选 FLIP、关闭归位平滑；进入动画对齐首页 / 留言 cascade。
- 工程笔记与项目卡内容扩展；前后端审计清单；清理 TODO 已完成项。

## 2026-05-24

### Habitat · 首次落地

- 「栖息」模块：关于 / 碎念 / 推荐页 + 后端 Markdown 导入；404 与 corrupt 主题。
- 导航栏与页脚 GrunRay 品牌区重构；后端脚本按内容 / 友链 / 访客拆目录。

## 2026-05-21

### Community · 首次落地

- 友链与留言板全栈：审核 / 限流 / 验证码与 OAuth 配置；前端友链 / 申请 / 留言页与导航接入。

## 2026-05-13

### Repo

- 增加 MIT License。

## 2026-05-04

### Content / SEO

- 接入 `@unhead/vue` 与 `useSeoMeta`，主要页面动态 SEO；骨架屏与站点配置。
- 项目详情 Markdown 模块更新；补充文章与新项目内容。

## 2026-05-03

### Shell / reading

- 博客与项目页大幅改版；独立算法路由并入阅读流。
- 蜗牛开屏、导航图标、favicon；胶片资源整理。
- AppShell 顶栏与主题切换改版；工具栏布局位移与页面入场；补充 SEO 待办与 `seo-head-vue` 技能文档。

## 2026-04-22

### Projects · 首次落地

- 项目内容链路：后端模型 / 接口 / 导入；前端列表与详情；多语言与演示资源。

## 2026-04-18

### Music / home

- 音乐曲目 API 与悬浮播放器；导航壳与播放器联动。
- 主页与文章详情改版；胶片墙媒体接口与首页动效资源。

## 2026-04-11

### Bootstrap

- 补充后端，并增加 / 修改前端界面（站点从雏形走向可浏览）。

## 2026-03-30

### Initial

- Initial commit：GrunRay wiki（frontend、backend、design assets）。
