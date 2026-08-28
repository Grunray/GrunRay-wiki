## 开发命令

```bat
.venv\Scripts\activate.bat
. .\venv\Scripts\Activate.ps1
cd backend; . .\venv\Scripts\Activate.ps1; python run.py;
cd frontend; npm run dev;
```

---

## 快捷提示词（复制用）

> 序号单独一行，正文从下一行开始，方便快捷键复制时不带上序号。

**1. 上传到GitHub的提示词**

将当前改动上传到 GitHub。提交信息使用 Conventional Commits（`feat` / `fix` / `chore` / `docs` 等）。改动较多时按功能拆成多批，每批独立分支 + commit + push（必要时开 PR），不要一次 `git add .` 糊在一起。

执行前先看 `git status` / `git diff`，列出分批计划（每批：分支名、涉及文件、commit 标题、是否依赖其他批）。经我确认后再动 git。

分批经验（2026-08 纸面重构曾拆 9 批）：

- 按**依赖顺序**排：基础设施（如 GSAP）→ 设计令牌 → 页面功能 → 修复项 → 原型/文档
- 分支名：`feat/简短描述`、`fix/简短描述`、`chore/简短描述`
- commit 示例：`feat(frontend): add GSAP and register ScrollTrigger globally`、`fix(xiqi): restore split scroll on detail close`
- 从完整工作区按文件切片：每批 `git checkout -B 分支 origin/main`，再 `git checkout <备份提交或stash> -- 路径…`，只 `git add` 本批文件
- PowerShell 下 commit 用 `git commit -m "标题"`（不要用 bash heredoc）
- PR 描述写 Summary + Test plan；多 PR 时注明 **Merge order**
- 合并后：`git pull` 同步 `main`，删除已合并的 feature 分支
- 可选：说「用 split-to-prs」时按模块拆 PR，且不经同意不整仓提交

不要提交：`.env`、密钥、`debug.log`、`hs_err_*.log`、本地 `.cursor/settings.json`（除非我明确要求）。

**2. 新需求的提示词**

你先去读我在「工作提示词 · 随手备注」里写的内容（含 **当前提示词** 与 **灵感**）。请先不要写代码：把需求整理进下方「进行中」区，按 TODO 模板开批次（编号从当前最大 +1，如 `112`），拆成 P0/P1 可勾选子项。整理完成后告诉我，我会指定先做哪几条。

**3. 前端风格修改的提示词**

涉及前端样式 / 布局 / 动效时：

- **我已指明风格或参考**（含截图、链接、DESIGN.md 条款）→ 直接在 `frontend/` 落地，对齐纸面令牌与 `DESIGN.md`，不必先做 HTML 原型。
- **未指明、需你自由发挥或有多解**，或我提到 **「让我预览」「先预览」「出方案对比」** 等 → **先不要改 Vue 生产代码**；在 `designed/` 下新建主题文件夹（如 `designed/nav-tools-options/`），用静态 HTML 出 **≥2 套可切换方案**，把 `index.html` 路径告诉我后等我选定，再合入 `frontend/`。

原型约定（沿用 `home-options`、`hover-options`、`page-transition`、`music_player`、`scroll-sidebar` 经验）：

- 入口：`index.html`（必要时加 `shared.css` / `shared.js`，大改动可拆 `scheme-a.html` 等）
- 顶部 **方案切换条**（按钮或 Tab），默认展示方案 A；每套附 **一两句说明**（适合场景、改动量、与现有组件关系）
- 视觉：优先用站点纸面色（纸底 `#f4f1e8`、墨 `#2b2823`、accent `#2e6b4f`），与 `DESIGN.md` / `tokens.*.css` 一致；抽象档黄边等特殊主题仅在方案需要时单独标出
- 范围：原型只演示目标区域 UI，不嵌整站路由；可 mock 文案与占位图
- 交付：告诉我文件夹路径与方案代号（A/B/C…）；需要对比时可加 `shoot.py`（Playwright 截图到同目录）
- **选定前**：`designed/` 内容可提交；**未选定方案不要写进** `frontend/src`

小改（单色、间距、单一 hover）且意图明确时，可跳过原型直接改代码。

---

## 工作提示词 · 随手备注

> 给 AI / 自己的短提示、验收口径、链接、复制粘贴的 prompt。上半 **当前提示词** 给当次任务；下半 **灵感** 攒未排期想法。确定要做再整理进「进行中」开批次。

### 当前提示词（复制给 AI）

现在需要对首页界面布局再做一次大修改： 
（1）Hero部分（FilmFeed）直接移到首页最下方； 
（2）原本在Hero部分的介绍文字“你好，我是GrunRay”和“找不到实习捏——代码不跑我跑！”这两句话移到左下方（这里的左下方所指的方位你可以查看我给你的图片）； 
（3）中间空着的部分就用于展示背景，初始状态是通透的没有模糊层的，但是向上滑动时会有一层模糊层随着界面移动，就像是下方的内容向上挤压（像是“从下一页伸进来的内容”），这里你可以看第一张图和第二张图的区别，是覆盖上去的而不是都随着界面滚动； 
（4）底部留着“COVER STORY · 封面故事”这部分；

### 灵感（未排期）

1. 博客/项目 界面，时间线展示方式 改为 绝区零绳网展示方式

- 通用：
（1）顶部为标题，标题下方为图片（如果有），再下方为详情，点击卡片的整个区域都可以跳转；
（2）每个卡片的高度可以不一致，高度根据标题字数、图片高度、详情字数等内容判断；
（3）可以在居中位置放上最新的文章/项目的卡片，这个卡片的宽度可以大一些；
- 如果是项目界面： 
（1）顶部展示项目图片，默认选取第一张，但会有一个问题，在碎念/推荐界面也是有默认选取第一张的逻辑的，这个是写在前端的还是写在后端，需要改为后端判断
（2）还要考虑如果内容过少，显示效果会不会不如原本的时间线；
- 如果是博客界面：
（1）有没有技术能够把代码给做成预览，就像是项目界面的图片一样，这样比较高级；

1. 内容备份：脚本将数据库导出到本地，并定期推送到 GitHub。

2. 记录一下之后添加到 推荐 部分，图片转换为SVG线条的方法：  
- 先去https://colorart.ai/image-to-line-art?utm_source=chatgpt.com网页将彩色图转换为黑白线稿
- 然后去https://pic2vector.com/app/将线稿转换为SVG矢量图

---

## TODO 书写模板（复制开新批次）

> 用法：从下方「批次骨架」复制一整段，粘贴到 **「进行中」** 区（灵感 / 搁置 / 已完成 之间）。旧批次只改状态、不删记录；整批完成后整块下移到对应分区。

### 本文件结构（自上而下）

1. 开发命令（固定，少改）
2. **快捷提示词**（复制用，序号与正文分行）
3. **工作提示词 · 随手备注**（当前提示词 + 灵感，同一区上下分块）
4. **本模板**（固定）
5. 进行中
6. 搁置
7. 已完成 / 归档

### 工作提示词区模板（书写格式）

```markdown
## 工作提示词 · 随手备注

> 说明：当前提示词 = 当次复制给 AI；灵感 = 未排期 backlog，每条单独编号。

### 当前提示词（复制给 AI）

（本次要让 AI 执行的提示……）

### 灵感（未排期）

1. 
2. 
```

### 灵感 backlog（已并入工作提示词区，此处仅作格式备忘）

灵感统一写在 **工作提示词 · 随手备注** 下方 `### 灵感（未排期）`，不要另开「灵感 · 未排期」章节；确定做再开批次（如 `112`）。

### 批次骨架（复制用）

```markdown
## {编号} · {YYYY-MM-DD} {主题短标题}

**状态**：进行中 | 搁置 | 已完成

**方向**：（1–2 句：要解决什么、不做什么）

**背景 / 现状**：（可选）相关页面、当前问题、参考链接

**依赖 / 冲突**：（可选）须先合哪条 PR / 避免改哪些文件

**P0 — {子主题}（先做）**

- [ ] {编号}-1 {可验收的一句话}
- [ ] {编号}-2 …

**P1 — {子主题}**

- [ ] {编号}-3 …

**P2 — 结构 / 维护**（可选）

- [ ] …

**⚠️ 回归 / 风险**（有则写，无则删本节）

- 现象：…
- 根因：…
- 验收：…（浏览器、停留时长、必查页面）

**方案对照**（多方案选型时保留；单方案可删）

| 代号 | 名称 | 说明 |
| --- | --- | --- |
| A | … | … |

**涉及文件**

`path/to/file`、…

**验收**

- [ ] 本地目视（三主题 + 移动端）
- [ ] 必要时 Playwright 截图
- [ ] DESIGN.md / i18n 已同步（若动设计语言或文案）

**废弃项**（可选）

- ~~{编号}-x~~ **已废弃**：原因…
```

### 单条任务写法

```markdown
- [ ] {批次}-{序号} {动词开头}：{做什么}；{边界/不做什么}；{降级或例外}
- [x] {批次}-{序号} …（已完成）
```

**规则**

- **编号**：批次号 + 连字符 + 序号（如 `111-1`），全文件唯一。
- **优先级**：P0 体验/阻塞 > P1 设计语言 > P2 结构维护 > P3 单独立项 backlog。
- **状态**：只改 `[ ]` / `[x]`；搁置整批写 **状态：搁置**；完成整批写 **状态：已完成**。
- **验收**：每批至少本地目视；动首页 Hero / FilmFeed 须 Edge 或 Chrome 停留 30 秒无卡死。

### 与 DESIGN.md 的边界

- 令牌、hover 语言、阅读宽等**契约** → `DESIGN.md`
- `TODO.md` 只跟踪**任务、优先级、验收**（可写「见 DESIGN.md §n」）

---

## 进行中

（暂无）

---

## 搁置

## 107 · 2026-08-20 路由跳转 · 全屏遮罩

**状态**：搁置

**搁置原因**：先 HTML 原型选型，暂未选定方案合入 Vue。

**方向**：参考 [jiejoe 首页](https://www.jiejoe.com/home) 的「单独一层盖住界面」结构；改成纸面色块，不抄霓虹绿 / LOADING / 胶片 Lottie。

**背景 / 现状**：`AppShell` 仅有正文 GSAP `out-in`（淡出上移），无盖住导航的全屏遮罩。

**流程**：先 `designed/page-transition/index.html` 预览 → 选定 → 再落地 Vue。

**P0 — 原型与落地**

- [ ] 107-1 原型：打开 `designed/page-transition/index.html`，点壳内导航，对比 A–F
- [ ] 107-2 选定后落地：遮罩挂在 `AppShell` 最外层（`position:fixed`，盖住 nav/main/footer）；内容在完全盖住时替换
- [ ] 107-3 与 `page-enter--play`：遮罩揭开后再播页内入场，或揭开当帧跳过位移
- [ ] 107-4 `prefers-reduced-motion`：无遮罩，直接切页
- [ ] 107-5 DESIGN.md §9 补遮罩契约（色块只用 ink/paper/accent，中间字用去向而非 Loading）

**方案对照**


| 代号  | 名称   | 说明                          |
| --- | ---- | --------------------------- |
| A   | 双层横刮 | 墨绿先刮、墨色跟上，中间衬线去向，再向左刮走      |
| B   | 整页落纸 | 暖纸从上落下，顶边 accent 发丝         |
| C   | 对开合页 | 左右纸面向中缝合上再打开                |
| D   | 墨色盖印 | 墨色从下铺满，再向上揭开                |
| E   | 花藤勾帘 | 主茎勾到约 3/4，细梢扣帘边；墨帘从下盖满后整帘上收 |
| F   | 墨上生枝 | 纯 D 墨色盖满，中央再长简化花藤，随后连帘带枝上收  |


**涉及文件**

`AppShell`、路由切换逻辑、`designed/page-transition/`、`DESIGN.md`

---

## 已完成

## 119 · 2026-08-28 全站 FPS / 1%L 监视浮层

**状态**：已完成（2026-08-28；首页+博客目视，开关可用）

**方向**：全站右下角纸面卡片显示瞬时 FPS 与 1% Low（1%L），方便目视流畅度。可开关、持久化；**不是**首页专属。不另加 backdrop-filter 假毛玻璃层（用现有 `--glass-nav-*`）。

**背景 / 现状**

- 参考 [yumetsuki.moe](https://yumetsuki.moe/)：`#fps` + `requestAnimationFrame` 每秒写一次；控制台勾选 `localStorage.fpson`。
- 本站右下已有可拖动音乐播放器，左下有回到顶部；浮层需让开播放器。

**依赖 / 冲突**

- 挂在 `AppShell`（与 `CursorTrail` / `BackToTop` 同级），勿写进 `HomeView`。
- 关闭时必须停 rAF，避免与月相光标抢主线程。
- 顶栏 FLIP 工具槽已经很挤：开关放溢出面板，不进胶囊主槽。

**P0 — 测量与浮层**

- [x] 119-1 `requestAnimationFrame` 计瞬时 FPS（近 1s 帧数）；滚动窗口算 1%L（最慢 1% 帧时间的倒数）；后台页暂停
- [x] 119-2 `AppShell` 右下角卡片：FPS + 1%L + 分档文案；纸面令牌；点击卡片关闭
- [x] 119-3 `ui.fpsMeterEnabled` 持久化（默认关）；溢出面板按钮开关；关则卸载循环

**P1 — 文案 / 契约**

- [x] 119-4 i18n zh/en；DESIGN.md 补监视浮层（分档、1%L 定义、勿常驻 rAF）

**⚠️ 回归 / 风险**

- 现象：关监视后仍掉帧 → 根因：rAF 未 cancel；卸载组件
- 现象：切后台回来 1%L 变成个位数 → 根因：把休眠长帧算进去；隐藏或 dt>1s 丢弃
- 验收：全站路由可见；开/关即时；三主题可读；不挡回到顶部

**涉及文件**

`AppShell.vue`、`stores/ui.ts`、`composables/useFpsMeter.ts`、`components/layout/FpsMeter.vue`、`i18n`、`DESIGN.md`、`TODO.md`

**验收**

- [x] 首页 / 博客 / 项目都能看到卡片
- [x] 显示 FPS 与 1%L；卡顿时 1%L 明显低于 FPS
- [x] 溢出面板可开关；刷新保持；关闭后无 rAF
- [x] 三主题走令牌；窄屏卡片仍在右下、不挡左下回到顶部

---

## 118 · 2026-08-28 首页 Hero 滚动 / 首屏性能

**状态**：已完成（2026-08-28；本地目视 + 30s 停留）

**方向**：在不改 §12 视觉契约的前提下减首页 GPU 重绘与首屏等待。Blur 仍只写 `--page-photo-bg-blur`，**不**另加 `backdrop-filter` / 双层照片 opacity。FilmFeed 不进首页。

**背景 / 现状**

- 117-10 已测：30s 滚动 `longTasks≥50ms = 0`，主线程不卡死；开照片背景下滑时每帧改全屏 `filter: blur()` 仍是 GPU 热点。
- 关背景时右侧线稿是 ~40 万字符描摹 SVG，按视口高栅格化。
- 问候入场 `fonts.load('700 italic … Noto Serif SC')`，但 `fonts.css` 只有 500/600 normal，再等 `fonts.ready`，最坏拖 2.5s。

**依赖 / 冲突**

- 守 DESIGN.md §12：单根 HomeView、勿在 `homeRoot` 上 Vue `:class`、滚动 blur 跟手无 0.85s 过渡。
- 勿把 `designed/` 线稿 SVG 当生产热路径；位图进 `frontend/public/art/`。

**P0 — 滚动 blur（先做）**

- [x] 118-1 量化 `--page-photo-bg-blur`（0.5px）且同值不 `setProperty`；区间外仍用廉价 `scrollY` 判断，避免每帧 `getBoundingClientRect`
- [x] 118-2 用缓存的文档偏移算 progress（resize / peek 变化时重测）；`prefers-reduced-motion` 与关背景路径不变

**P1 — 首屏等待 / 合成层**

- [x] 118-3 问候字体只等 Great Vibes（短超时）；去掉不存在的 Noto 700 italic 与整页 `fonts.ready`
- [x] 118-4 `.home-intro-stack` 去掉常驻 `will-change: transform`（开/关背景 0.72s 位移仍用 transition）

**P2 — 线稿栅格 / 被盖住的 sticky**

- [x] 118-5 生产线稿改 WebP（三主题），SVG 留 `designed/`；`<img>` 指位图，关背景观感对齐
- [x] 118-6 纸面完全盖住首屏后 `content-visibility: hidden` 藏 `.home-stage` 子树（占位高度不变）；回顶提前恢复，快滑回顶无空白闪一下

**P2 — 文档**

- [x] 118-7 DESIGN.md §12 补滚动 blur 量化、线稿位图、stage 盖住后跳过绘制

**⚠️ 回归 / 风险**

- 现象：blur 阶跃可见 → 根因：量化过粗；保持 0.5px、用户设定值仍到得了
- 现象：回顶问候/线稿晚一帧才出现 → 根因：stage `content-visibility` 恢复太晚；用滞回提前恢复
- 现象：问候 FOUC / 入场不播 → 根因：过早 `home-fonts-ready`；Great Vibes `font-display: block` + 短超时
- 验收：开/关照片背景跟手模糊；三主题线稿；问候入场；首页停留 30s 无卡死；快滑回顶无弹、无空白

**涉及文件**

- `frontend/src/composables/useHomeHeroRelayout.ts`
- `frontend/src/views/HomeView.vue`
- `frontend/src/styles/page-home-hero.css`
- `frontend/public/art/polonia_sandoren.webp` / `-dark.webp` / `-abstract.webp`
- `DESIGN.md` §12
- `TODO.md`

**验收**

- [x] 开照片背景：下滑 blur 跟手、同值不刷 CSS 变量；关背景不走 blur 插值
- [x] 问候语首屏出现不再卡满 2.5s（Great Vibes 就绪或短超时）
- [x] 关背景三主题线稿清晰、无错主题
- [x] 滚过首屏后再滚 TOC 不卡；快滑回顶无弹、stage 内容还在
- [x] Edge/Chrome 首页停留约 30s 无卡死（滚动+切主题+开关背景；切主题会有短 longtask，页仍可交互）
- [x] DESIGN.md §12 已同步

---

## 117 · 2026-08-28 首页 Hero 重排（hslzz 式首屏）

**状态**：已完成（2026-08-28；117-10 三主题+移动端+30s 目视收口）

**方向**：首页改成「通透首屏 + 纸面从下挤入」；FilmFeed **不进首页**（组件保留）；介绍语沉左下（开照片背景时滑到右侧）；COVER STORY 只露 kicker，随滚动与全宽纸面一起上移。**不**另做 backdrop-filter 假毛玻璃层，模糊只走导航栏照片背景那套 `--page-photo-bg-blur`。

**背景 / 现状**

- 需求见上方「当前提示词」；参考 hslzz 式「下一页挤入」，背景 fixed、内容覆盖上去。
- 原型：`designed/home-hero-relayout/index.html`（单方案，已合 `HomeView.vue`）。
- 站点首页已是 `appMainLayout: 'full-viewport'`；照片背景 = `body::before` + `PhotoBgBlurAdjuster`。
- 关照片背景时右侧用线稿 SVG 填留白；开背景则隐藏。浅/深/abstract 三份 SVG。

**依赖 / 冲突**

- 合入时复用 `data-photo-bg` / `applyPhotoBackgroundBlur`，不要新建全局 blur 层。
- 勿把 `designed/` 线稿生成脚本（`_make_line_svg.py` 等）当生产管线；生产只收主题 SVG。
- **HomeView 模板必须单根**：`AppShell` 路由 `Transition mode="out-in"` 遇 fragment 会卡死成空白页（见 117-19）。
- **勿在 `homeRoot` 上用 Vue `:class` 绑动态态**：会冲掉 `classList` 写入的 `page-enter--play` / `home-fonts-ready`（见 117-18）；开/关照片背景左右位移走 `html[data-photo-bg]`。

**P0 — HTML 原型（已完成）**

- [x] 117-1 FilmFeed 已从首页移除（组件保留，改放到其他界面）；原「移到页底」作废
- [x] 117-2 介绍语「你好，我是 GrunRay」+ 副文案沉首屏左下；问候语加大加粗，GrunRay 用 Great Vibes；等字体就绪再显示，避免强制刷新 FOUC
- [x] 117-3 首屏中间留空展示照片背景；初始 blur=0；向下滑时用站点同款 `filter: blur(--page-photo-bg-blur)` 从 0 滚到用户设定值（默认 6px）；**禁止**再叠 `__veil` / `backdrop-filter`
- [x] 117-4 COVER STORY：首屏只露 kicker；peek 层级高于全宽纸面；卡片上下同色 `--cover-story-bg`；去掉 kicker/正文接缝细线与全宽 `border-top`
- [x] 117-5 原型全宽铺满（对齐 `full-viewport`）；peek 顶栏保留左右边距，不顶满屏
- [x] 117-6 关照片背景：右侧 `polonia_sandoren.svg`（高度：导航下 → COVER STORY 上，贴右并向左延伸）；开背景则隐藏。浅色/深色两份：`polonia_sandoren.svg` / `polonia_sandoren-dark.svg`（由 `polonia_sandoren_new.svg` 只改 fill/stroke，path 数不变）；鼻子嘴巴的 `stroke:#000` 须随主题换成墨色

**P1 — 合入 Vue（已完成）**

- [x] 117-7 `HomeView.vue` 按原型结构落地：sticky 首屏 + rising peek + 全宽纸面（胶片不进首页）
- [x] 117-8 首页滚动临时覆盖 `--page-photo-bg-blur`（0 → 用户值）；离开首页恢复；关 `photoBackgroundEnabled` 时显示线稿、开则隐藏
- [x] 117-9 线稿 SVG 进 `frontend/public/art/`，主题切换换 light/dark/abstract 三文件；深色勿对含纸面填充的 SVG 做 `invert`
- [x] 117-10 三主题 + 移动端目视；Hero Edge/Chrome 停留 30 秒无卡死（胶片已不在首页）。验收：light/dark/abstract 线稿与令牌正确；开照片背景问候语右滑且内容不丢；窄屏问候换行；30s 滚动+切主题+开关背景无 longtask≥50ms、页仍可交互

**P1.5 — 合入后细化与回归（2026-08-28）**

- [x] 117-13 COVER STORY 悬停对齐项目卡方案 G：peek + detail 同步上浮 / 折角 / 花藤 / 标题右移 / kicker 字距 / tag；正文悬停也要触发（勿只绑 peek）
- [x] 117-14 abstract 线稿墨色统一 `#FFDB00`（纸面 `#0A2330`）；`_gen_theme_svgs.py` + `public/art/polonia_sandoren-abstract.svg`
- [x] 117-15 滚动纸面底与 footer 揭示区间隙：首页通透盖板补纸色（`app-page-cover::after` + 底部渐变）；`.home-layout` 底边不吃负 margin；滚动层铺 `--color-bg-base`
- [x] 117-16 刊号 / 头像 / 问候 / 介绍拆卡：刊号矩形卡；头像独立圆形卡并分隔；问候与介绍各一卡（问候略加宽）；开照片背景时问候+介绍 `transform` 滑到右侧，关则滑回左侧（`home-intro-track` + `100cqw`）
- [x] 117-17 首页导航高度与其它页对齐：只 `min-height: var(--home-nav-offset)`，不封 `height`/`max-height`；占位按展开态 `.glass-nav-inner`+padding 测量，避免量到被压矮的盒子
- [x] 117-18 开/关照片背景内容消失：去掉 `homeRoot` 上 `:class is-photo-bg`；位移改跟 `html[data-photo-bg]`，保住 `page-enter--play`
- [x] 117-19 首页跳其它页整站空白：去掉模板根外 HTML 注释（曾造成双根 fragment，卡死 `out-in` Transition）；模板保持单根 `<section.home-layout>`
- [x] 117-20 快滑回顶小幅下弹：锁导航占位 + `overscroll-behavior-y: none`；sticky 首屏 `overflow-anchor: none`

**P2 — 结构 / 维护**

- [x] 117-11 DESIGN.md §12 补首页首屏契约（通透背景、纸面挤入、关背景右侧线稿、开背景问候语右滑、单根 Transition、导航占位、方案 G peek+detail）
- [x] 117-12 清理 `designed/home-hero-relayout/`：删除 `_*.py` 生成脚本、`_line_preview.png`、`.trace-venv`；保留原型 `index.html`/`shared.*`、三主题 SVG、源文件 `polonia_sandoren_new.svg` 与 png/webp 参考图

**⚠️ 回归 / 风险**

- 现象：误加独立毛玻璃层会盖住 COVER STORY / 与导航栏 blur 滑条脱节 → 根因：`backdrop-filter` veil ≠ `body::before` 的 `--page-photo-bg-blur`
- 现象：开/关照片背景后刊号·问候·LATEST 全隐，只剩 COVER STORY 下半 → 根因：Vue `:class` 冲掉 `page-enter--play`（117-18）
- 现象：离开首页后任意路由主内容空白，刷新才好 → 根因：HomeView 双根 fragment 破坏 `Transition out-in`（117-19）
- 现象：首页导航比其它页矮 → 根因：把展开高度锁进已压矮的 `height`（117-17）
- 验收：开/关照片背景（内容不丢、问候语左右滑动）、浅/深/abstract、首屏只露 kicker、下滑纸面贴 footer 无空缝、首页→博客/项目有正文、快滑回顶无弹跳

**涉及文件**

原型：`designed/home-hero-relayout/`（`index.html`、`shared.*`、三主题 SVG、`polonia_sandoren_new.svg` 源文件；生成脚本已清理）

生产：

- `frontend/src/views/HomeView.vue`
- `frontend/src/composables/useHomeHeroRelayout.ts`
- `frontend/src/styles/page-home-hero.css`
- `frontend/src/styles/page-enter-home.css`
- `frontend/src/styles/card-hover-g.css`（方案 G，勿拆）
- `frontend/src/styles/themes/tokens.{light,dark,abstract}.css`（`--font-script`）
- `frontend/public/art/polonia_sandoren.svg` / `-dark.svg` / `-abstract.svg`
- `frontend/public/fonts/great-vibes-latin-400.woff2`、`fonts.css`
- `frontend/src/i18n/locales/{zh,en}.json`（`home.greeting` / `greetingBrand`）

**验收**

- [x] 原型：`designed/home-hero-relayout/index.html` 可预览（顶栏「背景开/关」「浅色/深色」）
- [x] Vue：开/关照片背景不丢内容；问候语左右滑动；首页→项目/博客有正文
- [x] DESIGN.md §12 已同步（117-11）；原型目录临时脚本已清理（117-12）
- [x] 三主题 + 移动端目视收口（117-10）；30s 停留无卡死
- [ ] 必要时 Playwright 截图（可选，未做）

---

## 116 · 2026-08-27 照片背景默认模糊 · 首页栏目标题字重

**状态**：已完成（本地；未推送）

**方向**：顶栏照片背景钮调节器默认模糊强度减轻；首页目录区 LATEST / PROJECTS / ABOUT / REREAD 栏目标题略加重字重。

**P0 — 照片背景模糊默认值**

- [x] 116-1 `PHOTO_BG_BLUR_DEFAULT`：`18` → `6`（`theme/photoBackgroundBlur.ts`）
- [x] 116-2 `main.css` CSS 回退同步：`--page-photo-bg-blur: 6px`；加载态 `21px`；scale `1.02`
- [x] 116-3 `PhotoBgBlurAdjuster` 点「重置」同样回到 6px

**P0 — 首页栏目标题**

- [x] 116-4 `HomeView.vue` `.toc-head` 字重 `700` → `800`（LATEST / PROJECTS / ABOUT / REREAD）；右侧「全部 →」仍为 `500`

**⚠️ 回归 / 风险**

- 已写入 `localStorage` 的 `ui.photoBackgroundBlurPx` 不会自动变 6，须调节器重置或清本地存储

**涉及文件**

`theme/photoBackgroundBlur.ts`、`styles/main.css`、`views/HomeView.vue`

**验收**

- [x] 新访客 / 清存储后照片背景默认模糊明显弱于旧 18px
- [x] 首页四栏英文 kicker 目视略粗于改前

---

## 115 · 2026-08-27 友链申请优化 · 站长审核后台

**状态**：已完成（本地；未推送）

**方向**：完善友链申请页交互；站长在 `/friends/admin` 审核/编辑友链；前后端双重校验站长身份；审核列表按状态分色与分组分隔；恢复临时 DEV bypass 并验收权限。

**背景 / 现状**

- 申请页原先缺少提交反馈与 loading 态。
- 友链数据已有 `friend_link` 表与待审核状态，但无站长审核界面。
- 本地开发曾临时注释 `_require_site_owner` 与前端 `isSiteOwner` 判断以便预览 UI，上线前须恢复。

**P0 — 申请页**

- [x] 115-1 `FriendsApplyView`：表单说明、`submitToast` 成功/失败/校验提示；提交中 loading
- [x] 115-2 头像预览：填写 URL 或留空自动 favicon（与审核页一致）

**P0 — 站长审核（前端）**

- [x] 115-3 路由 `/friends/admin`：`FriendsAdminView.vue`；Tab 全部/待审核/已发布/已隐藏/已拒绝
- [x] 115-4 `FriendsView`：仅 `authUser.isSiteOwner` 时显示「友链审核」入口 + 待审核角标
- [x] 115-5 非站长访问 `/friends/admin` 显示登录门槛（「前往留言板登录」），不加载审核列表
- [x] 115-6 审核卡片：字段编辑 + 保存；通过/拒绝/隐藏/恢复
- [x] 115-7 状态徽章分色：待审核黄 / 已发布绿 / 已隐藏灰 / 已拒绝红
- [x] 115-8 「全部」Tab：相邻不同状态组之间插入首页风格 hairline（`1px solid var(--color-border)`）；同组卡片间距不变
- [x] 115-9 头像地址字段右侧实时预览（`resolveFriendAvatar`，与申请页逻辑一致）

**P0 — 站长审核（后端）**

- [x] 115-10 `friend_link_repo.list_admin(status=None)`、`update_friend_fields()`
- [x] 115-11 `friend_validate.validate_admin_update()`；`friends_api`：`GET /admin?status=`、`PATCH /admin/<id>`（字段更新 + action）
- [x] 115-12 `_require_site_owner()`：未登录 401、非站长 403（已恢复 DEV bypass）

**P1 — 服务层与 i18n**

- [x] 115-13 `friendsApi.ts`：`fetchAdminFriends`、`patchAdminFriend`；路由 `friends/admin`；`i18n` zh/en 审核文案

**⚠️ 回归 / 风险**

- 现象：DEV bypass 期间非站长也能看到审核入口并调 admin API
- 修复：恢复 `friends_api._require_site_owner`、`FriendsView` / `FriendsAdminView` 的 `isSiteOwner` 判断
- 验收（未登录）：`/friends` 无「友链审核」按钮；`/friends/admin` 仅显示登录门槛；`GET /api/friends/admin` → **401**

**涉及文件**

`FriendsApplyView.vue`、`FriendsView.vue`、`FriendsAdminView.vue`、`page-friends.css`、`friendsApi.ts`、`router/index.ts`、`i18n/locales/{zh,en}.json`、`backend/app/friend_link_repo.py`、`friend_validate.py`、`friend_serialize.py`、`routes/friends_api.py`

**验收**

- [x] 未登录：`/friends` 仅「友链申请」，无审核入口
- [x] 未登录：`/friends/admin` 显示站长登录提示
- [x] 未登录：`curl /api/friends/admin` 返回 401
- [x] `npm run build` 通过（早前批次）
- [ ] 站长 OAuth 登录后审核全流程（待站长账号本地实测）

---

## 114 · 2026-08-27 出站确认 · OAuth 过渡 · 页脚短页修复

**状态**：已完成（本地；未推送）

**方向**：社交登录与友链外链离开本站前，经独立过渡页用户确认；留言登录点击有即时反馈；修复短内容页误揭页脚 GRUNRAY / ICP 胶囊且切页残留；页脚法律声明页；film import 同步删除脚本与 xiaoye.gif 清理。

**背景 / 现状**

- 留言 OAuth 原先 `window.location.href` 直跳后端，仅浏览器标签转圈，无页面内提示。
- 友链卡片 / 特别友链为 `target="_blank` 直开外链，无「离开本站」确认。
- 页脚揭示用 `remaining = scrollHeight - innerHeight - scrollY`；短页在 `border-box` 下 `--footer-reveal-space` 被 `min-height: 100%` 吃进视口 → `remaining≈0` 误判已到底，触发后难收回，切路由残留。

**P0 — OAuth 过渡（留言社交登录）**

- [x] 114-1 独立路由 `/auth/redirect`：`OAuthRedirectView.vue` + `config/oauthRedirect.ts` + `composables/useOAuthRedirect.ts`；`return_to` 白名单与后端 `auth_api._safe_return_to` 对齐
- [x] 114-2 `MessagesView`：点击 GitHub/Google → `startOAuth()` 进过渡页；按钮 loading + i18n `socialRedirecting`*
- [x] 114-3 过渡页 **先确认再跳转**：说明将离开本站；取消（左 1/3 红）/ 继续前往 {provider}（右 2/3）；确认后 spinner → 跳 `/api/auth/{provider}`
- [x] 114-4 i18n `oauth.`*（中/英）；`messageAuth.startMessageOAuth` 改为共用 `buildOAuthApiStartUrl`

**P0 — 外链过渡（友链出站）**

- [x] 114-5 独立路由 `/leave/redirect`：`SiteLeaveRedirectView.vue` + `config/siteLeaveRedirect.ts` + `composables/useSiteLeaveRedirect.ts`；仅允许 `http(s)` URL
- [x] 114-6 `FriendsView`：已发布友链与特别友链点击 → `startExternalLeave(url, returnTo)`；站内「申请友链」入口不走此页
- [x] 114-7 与 OAuth 过渡共用 `page-oauth-redirect.css` 布局（取消左 / 确认右、纸面卡片）

**P1 — 友链申请文案**

- [x] 114-8 申请须知「网站描述」改 i18n `friends.applyNoticeBio`（「找不到实习捏——代码不跑我跑！」）；`FriendsApplyView` 描述区固定读 i18n，不再被 API 覆盖
- [x] 114-9 后端默认 `FRIENDS_SITE_DESCRIPTION` / `.env.example` 同步

**P0 — 页脚短页误揭（回归修复）**

- [x] 114-10 `main.css`：`.app-page-cover` 改为 `min-height: calc(100dvh + var(--footer-reveal-space))`；`:root` 默认 `--footer-reveal-space: 404px`，保证短页也有可滚揭示区
- [x] 114-11 `useFooterGrunRayReveal.ts`：引入 `hasRevealRoom`（`maxScroll >= threshold`）；不足阈值时不揭页脚、不显示 meta 胶囊；路由切换后正确收回

**P1 — 法律声明页**

- [x] 114-12 路由 `/legal`：`LegalView.vue` + `page-legal.css` / `page-enter-legal.css`；免责声明 · 版权素材 · 隐私 · 开源致谢（i18n `legal.`*）
- [x] 114-13 页脚 ICP 胶囊：`FooterGrunRayMetaBar` 增「法律声明」链至 `/legal`；RSS 改 i18n `footer.`*；样式类 `footer-grunray-meta-link`
- [x] 114-14 版权与素材补充：站内配图可能来源于网络或由 AI 生成（`sectionCopyrightBody5`）

**P1 — film 媒体 import 同步删除**

- [x] 114-15 危险脚本 `scripts/media_tools/sync_film_media_from_import.py`：import/film 已删文件 → 同步删 `content/media/film` 副本 + `media` 表；须 `--dry-run` 预览、`--confirm` 执行；空 import 默认拒绝（`--allow-empty-source`）；顶部与函数注释标明仅用户明确要求时使用
- [x] 114-16 移除 `homeView/right_panel/xiaoye.gif`：`media` 表 id=4 已删；FilmFeed 不再列出（磁盘副本可另跑 sync 或手删）

**⚠️ 回归 / 风险**

- 现象：短页底部露出 GRUNRAY / ICP 胶囊；向下滑触发后上滑收不全；切页底部残留，再滚一次才消失
- 根因：揭示垫高未计入文档可滚高度 + `remaining≈0` 当「已到底」
- 验收：登录过渡页、友链页等短内容页 — 顶部无页脚/胶囊；滚到底完整揭开；滚回顶部 `progress=0`；切首页/留言无残留；栖息分栏 `xiqi-page--split` 仍 `min-height:0` 不受影响

**涉及文件**

`router/index.ts`、`OAuthRedirectView.vue`、`SiteLeaveRedirectView.vue`、`LegalView.vue`、`page-legal.css`、`page-enter-legal.css`、`page-oauth-redirect.css`、`config/oauthRedirect.ts`、`config/siteLeaveRedirect.ts`、`composables/useOAuthRedirect.ts`、`composables/useSiteLeaveRedirect.ts`、`MessagesView.vue`、`FriendsView.vue`、`FriendsApplyView.vue`、`FooterGrunRayMetaBar.vue`、`footer-grunray.css`、`messageAuth.ts`、`useFooterGrunRayReveal.ts`、`main.css`、`pagePhotoBackgrounds.ts`、`i18n/locales/{zh,en}.json`、`backend/app/config.py`、`backend/.env.example`、`backend/scripts/media_tools/sync_film_media_from_import.py`、`backend/scripts/run.md`

**验收**

- [x] `/auth/redirect` 确认/取消与留言登录全流程
- [x] `/leave/redirect` 与友链外链点击
- [x] 短页页脚揭收与跨路由无残留（`localhost:5173`）
- [x] `/legal` 与页脚胶囊「法律声明」入口
- [x] `sync_film_media_from_import.py --dry-run` 预览；xiaoye.gif 已从 `media` 表移除

**后续（未做）**

- 友链申请页若加社交登录：直接 `useOAuthRedirect().startOAuth(provider, '/friends/apply')`，共用 `/auth/redirect`

---

## 113 · 2026-08-25 鼠标光标拖尾 · 星座月相（Moonlit Cursor）

**状态**：已完成

**GitHub**：`feat/moonlit-cursor` → PR [#17](https://github.com/Grunray/GrunRay-wiki/pull/17) 合入 `main`（2026-08-25）；叠分支变基后合并；远程分支已删

**方向**：用 Canvas 引擎替换「字母跟随」拖尾（`CursorTrail.vue`），实现 **星座月相** 指针：Columbina 线稿 + Damselette 热点 + 月相拖尾 + 悬停三月 + 静憩 sleep/Kuuhenki + 点击祈愿（wish + Primogem）。保持 Editorial 克制，不做霓虹粒子爆炸。

**背景 / 现状**

- **生产**：`CursorTrail.vue` + `useMoonlitCursor` 为星座月相 Canvas；顶栏可开关（`ui.cursorTrailActive`）。旧 GSAP 字母拖尾已替换。
- **原型**：`designed/moonlit-cursor-options/`（`index.html` + `shared.js` + `shared.css`）；方案 A/B/C 已删，仅保留 **星座月相** 单方案。
- **设计文档**：`DESIGN.md` §11；`designed/moonlit-cursor-options/DESIGN-BRIEF.md`（已选方案 D）。
- **素材**：`frontend/src/assets/cursor/`（Columbina / Damselette / sleep / Kuuhenki / wish / Primogem；旧 `water` 已停用）。

**原型已实现（验收于静态页）**


| 模块  | 说明                                                                                             |
| --- | ---------------------------------------------------------------------------------------------- |
| 拖尾  | 仅月相圆点，无连线；按距离落点；idle 从末端月亮 Z 向指针收回；满员顶掉时羽状微粒散开                                                 |
| 月相  | 御月鸽座相位序列；按满度差异化月光；各月亮自转；新生月亮约 520ms 淡入（`moonSpawnMs`）                                          |
| 指针  | Damselette 尖端 = `mx/my`；Columbina 线稿偏移不重叠；悬停/点击时线稿渐淡（`getConstellationPointerFade`）            |
| 悬停  | 链接/芯片分叉入口；虹月·恒月·霜月三轨同转（3:2:1）；轨道 conic 渐变旋转                                                    |
| 点击  | **祈愿**：指针淡出至透明 → `wish.svg` 显现 → 轨道虚线+节点圆 → 多颗 `Primogem` 从圆内侧散落（青白/薰衣草/粉）；已替换旧 `water.svg` 水纹 |
| 静憩  | 停驻 ≥2s：Columbina/Damselette 淡出，切 `sleep.svg` 月摇篮 + `Kuuhenki.svg` 推摇；月光晕 + 银河落尘（世界坐标，不随月弯摇）    |
| 淡化  | `applySpriteFadeAlpha(base, fade, { minAlpha })` 统一入口；点击 `minAlpha: 0` 可完全透明                   |
| 稳定性 | 指针取消 `moveAngle` 旋转 + 平滑坐标，减轻移动抽搐                                                              |


**P0 — 原型性能优化（`designed/moonlit-cursor-options/shared.js`）**

- [x] 113-p1 **空闲休眠 rAF**：无移动/收回/悬停动画/点击衰减时 `cancelAnimationFrame`，`pointermove` 唤醒
- [x] 113-p2 **轨道渐变预烘焙**：三月轨道 conic 渐变烘成离屏 Canvas，`drawImage` + 旋转，去掉每帧 `createConicGradient` / `shadowBlur`
- [x] 113-p3 **月亮精灵缓存**：拖尾月相 + 悬停满月预烘焙，绘制时缩放 `drawImage` 代替每帧径向渐变
- [x] 113-p4 **指针层去 shadowBlur**；悬停检测节流（~60ms）
- [x] 113-p5 `**prefers-reduced-motion`**：减光晕、轨道不旋转、仍保留指针与拖尾主体
- [x] 113-p6 **启动预烘精灵**：`prewarmConstellationAssets()` 在 `start()` 与预览主题切换时烘焙拖尾月相 + 三月轨道/满月，避免首帧/切主题卡顿
- [x] 113-p7 **静憩氛围预烘焙**：月光柱/光晕/星云带烘成离屏 Canvas；银河落尘用拖尾/圆点/星芒精灵 `drawImage`，去掉每帧 `createRadialGradient` / `createLinearGradient`
- [x] 113-p8 **祈愿预烘焙**：轨道虚线+节点圆+光晕一张图旋转绘制；Primogem 光晕打进精灵，点击帧无额外 gradient
- [x] 113-p9 **静憩-only ~30fps**：仅呼吸/落尘在动时 `setTimeout(33)` 续帧；拖尾/悬停/点击仍 60fps；`restBlend` 按 dt 步进
- [x] 113-p10 **原石数组就地压缩**：`updateClickPrimogems` 不每帧 `.filter()` 分配

**P0 — 合入生产**

- [x] 113-1 将 `shared.js` 引擎迁为 **composable + Canvas 组件**：`useMoonlitCursor` + `CursorTrail.vue`（单全屏 Canvas / 单 rAF）；指针坐标不进 Vue 响应式；保留 `ui.cursorTrailActive` 与 `AppShell` 挂载
- [x] 113-2 SVG 迁入 `frontend/src/assets/cursor/`，栅格化 light/dark 线稿绑定 **站点 theme**（`cursorThemeFromSite`，abstract → dark）
- [x] 113-3 `pointer: fine` + 触屏隐藏；`prefers-reduced-motion` 对齐 Vue：`cursorTrailActive` 为 false 时不挂载
- [x] 113-4 输入框 / `contenteditable` / 文本光标区例外；hover 对接 `.toc-row`、`[data-cursor-hover="project"]`、`.timeline-card`、`a`/`button`
- [x] 113-10 合入 **静憩态**（sleep + Kuuhenki + 氛围预烘焙 + 停驻 2s + 静憩-only 30fps）
- [x] 113-11 合入 **祈愿点击**（替换 water：指针完全淡出 → wish → Primogem 散落 + 轨道预烘焙）；更新 `DESIGN.md` §11

**P1 — 体验与契约**

- [x] 113-5 悬停 link / project 调参入口：`CONSTELLATION_HOVER_TUNING`
- [x] 113-6 清理旧字母拖尾 CSS 令牌；i18n 工具提示改为「月相拖尾」
- [x] 113-7 `DESIGN.md` §11 指针/拖尾契约；`DESIGN-BRIEF.md` 注明已选方案 D

**P2 — 清理**

- [x] 113-8 `shared.js` 移除方案 A–C 死代码；保留方案 D 的 `moonFeathers` 等
- [x] 113-9 首页 + 详情页 30s 无泄漏；拖尾开关多次切换无残留监听；阅读静止时 rAF 休眠
  - 验收（`localhost:5173`）：空白停住拖尾 **0 fps**；2s 后静憩 **~29 fps**；30s 堆无单调涨；开关 6 次监听 0↔1 不累加
  - 修复：空闲时在 `update()` 衰减 `hoverPhase`，避免 rAF 一直 60fps

**验收**

- [x] 静态原型与合入后 Vue 行为一致（拖尾、悬停三月、静憩、祈愿、idle 收回）
- [x] 三主题 + 移动端（触屏无自定义指针）
- [x] 顶栏关闭后零 Canvas 开销

**涉及文件**

`designed/moonlit-cursor-options/`、`CursorTrail.vue`、`useMoonlitCursor.ts`、`moonlitCursorEngine.ts`、`moonlitCursorFx.ts`、`moonlitCursorConfig.ts`、`AppShell.vue`、`stores/ui.ts`、`cursor-trail.css`、`DESIGN.md`

---

## 112 · 2026-08-23 图片背景模糊调节器

**状态**：已完成

**GitHub**：`feat/photo-bg-blur` → PR [#21](https://github.com/Grunray/GrunRay-wiki/pull/21) 合入 `main`（2026-08-25；原 #16 因 base 分支删除而关闭，重建后合并）；远程分支已删

**方向**：顶栏照片背景钮右键打开模糊滑杆（0–48px），即时预览并持久化；修复面板不可见与进出场动效。

**背景 / 现状**：全屏图片背景默认模糊偏轻；需在不改左键开关逻辑的前提下，让用户可调常态模糊强度。

**P0 — 调节器与持久化**

- [x] 112-1 默认模糊：`main.css` `--page-photo-bg-blur` 18px、加载态 38px；`photoBackgroundBlur.ts` + `ui.photoBackgroundBlurPx`（`localStorage`）
- [x] 112-2 顶栏 / 溢出面板照片钮 `@contextmenu` 打开 `PhotoBgBlurAdjuster`；tooltip 补充「右键调节模糊」（i18n）
- [x] 112-3 面板锚定照片钮 `getBoundingClientRect()`，固定于按钮正下方（`bottom + 8px`，右缘对齐）；点外关闭仅响应左键，避免同次右键闪退

**P1 — 可见性与动效**

- [x] 112-4 **回归修复**：`.card { position: relative }` 覆盖 `position: fixed`，面板落到页底视口外；改为 `.photo-bg-blur-popover.card { position: fixed }` 提高特异性
- [x] 112-5 开/关动画：自右上落入 + 轻微 overshoot；关闭向上收起淡出；内部标题/滑杆/提示错开淡入；`prefers-reduced-motion` 仅淡入淡出

**⚠️ 回归 / 风险**

- 现象：右键后调节器「不出现」
- 根因：`.card` 抢写 `position`，Teleport 到 `body` 的面板仍按文档流排在页末
- 验收：顶栏与溢出面板内照片钮右键，面板出现在按钮下方；拖动滑杆背景模糊即时变化；Esc / 点外左键关闭

**涉及文件**

`PhotoBgBlurAdjuster.vue`、`AppShell.vue`、`stores/ui.ts`、`theme/photoBackgroundBlur.ts`、`nav-toolbar.css`、`main.css`、`i18n/locales/{zh,en}.json`

---

## 111 · 2026-08-23 顶栏导航与工具区（方案 G + A）

**状态**：已完成

**GitHub**：`feat/nav-toolbar` → PR [#15](https://github.com/Grunray/GrunRay-wiki/pull/15) 合入 `main`（2026-08-25）；远程分支已删

**方向**：顶栏工具区与主导航视觉统一——方案 G 分段胶囊 + 药丸 link；工具全展开时按密度原型方案 A 收紧尺寸；修复选中态溢出与溢出面板遮挡悬浮提示。

**方案对照**（`designed/nav-tools-options/` → G；`designed/nav-bar-density-options/` → A）


| 代号    | 名称          | 结果          |
| ----- | ----------- | ----------- |
| D     | 圆钮 + 胶囊     | 曾合入，后由 G 替代 |
| G     | 分段胶囊 + 左侧药丸 | **已合入生产**   |
| A（密度） | 缩小药丸与胶囊     | **已合入生产**   |


- [x] 111-1 工具钮方案预览 HTML：`designed/nav-tools-options/`（A–D 工具区；E/F/G 整栏统一对比）
- [x] 111-2 方案 G 合入：`SiteNav` 分段胶囊（首页 | 创作·社区·栖息）；`nav-toolbar.css` 药丸工具钮 + 与 `.link.active` 同色开启态
- [x] 111-3 密度预览 HTML：`designed/nav-bar-density-options/`；选定方案 A 后收紧药丸 padding / 字号 / 图标与顶栏间距
- [x] 111-4 胶囊内边距略增 + 选中呼吸 `scale` 收敛，避免绿底药丸超出 hairline 外框
- [x] 111-5 溢出「更多工具」面板：`card-overflow-visible` + `[data-nav-tip]:hover` 提升至 `z-index: 80`，修复提示被面板挡住

**涉及文件**

`AppShell.vue`、`SiteNav.vue`、`SiteNavGroup.vue`、`ThemeDayNightToggle.vue`、`nav-toolbar.css`、`main.css`、`designed/nav-tools-options/`、`designed/nav-bar-density-options/`

---

## 110 · 2026-08-23 笔记界面优化

**状态**：已完成

**GitHub**：`feat/page-toc-row` → PR [#18](https://github.com/Grunray/GrunRay-wiki/pull/18) 合入 `main`（2026-08-25）；远程分支已删

**方向**：项目笔记列表与首页「LATEST · 最新文章」目录行对齐——整行可点、hairline 分隔、轻底色 hover，不套方案 G。

- [x] 110-1 笔记列表交互：`PostCard` 改为 `RouterLink.toc-row` 包裹整行；`page-toc-row.css` 与 `HomeView` 共用样式

**涉及文件**

`PostCard.vue`、`ProjectNotesView.vue`、`page-toc-row.css`、`HomeView.vue`、`i18n/locales/{zh,en}.json`

---

## 109 · 2026-08-23 项目 / 博客详情页完善

**状态**：已完成

**GitHub**：`feat/gallery-detail` → PR [#19](https://github.com/Grunray/GrunRay-wiki/pull/19) 合入 `main`（2026-08-25）；远程分支已删

**方向**：详情页画廊查看与滚动侧栏；与 108 独立，避免同文件大规模冲突。

**依赖 / 冲突**：建议先合 108 再动 `PostDetailView` / `ProjectDetailView` 侧栏逻辑（已按此顺序完成）。

**P0 — 图片查看**

- [x] 109-1 项目详情画廊：宽屏悬停右侧玻璃卡片局部放大；点击全屏遮罩；滚轮缩放 + 左键拖拽平移；提示/关闭按钮样式（绿提示、红关闭）；`sanitizeMediaUrl` 修复反斜杠路径 404；导入时 `project_md.py` 规范化 gallery URL

**P1 — 滚动侧栏**

- [x] 109-2 题录滚出后侧栏稳定展示：去掉 scroll scrub，改为 enter/leave 动画；全屏查看器图片区域铺满视口

**涉及文件**

`GalleryImagePreview.vue`、`GalleryBlock.vue`、`mediaUrl.ts`、`project_md.py`、`useDetailScrollSidebar.ts`、`DetailScrollSidebar.vue`、`PostDetailView.vue`、`ProjectDetailView.vue`、`i18n/locales/{zh,en}.json`

---

## 归档 · 2026-08-25 GitHub 分批合入（109–113）

**状态**：已完成

六批独立分支 + PR，按依赖顺序合入 `main`（merge commit）。叠分支在 #15 合并后变基到 `main` 再续合并。


| 顺序  | 批次   | 分支                    | PR                                                     | 说明          |
| --- | ---- | --------------------- | ------------------------------------------------------ | ----------- |
| 1   | 111  | `feat/nav-toolbar`    | [#15](https://github.com/Grunray/GrunRay-wiki/pull/15) | 顶栏胶囊 + 密度   |
| 2   | 112  | `feat/photo-bg-blur`  | [#21](https://github.com/Grunray/GrunRay-wiki/pull/21) | 原 #16 关闭后重建 |
| 3   | 113  | `feat/moonlit-cursor` | [#17](https://github.com/Grunray/GrunRay-wiki/pull/17) | 月相拖尾        |
| 4   | 110  | `feat/page-toc-row`   | [#18](https://github.com/Grunray/GrunRay-wiki/pull/18) | 笔记 toc-row  |
| 5   | 109  | `feat/gallery-detail` | [#19](https://github.com/Grunray/GrunRay-wiki/pull/19) | 画廊预览 + 侧栏   |
| 6   | docs | `docs/todo-113`       | [#20](https://github.com/Grunray/GrunRay-wiki/pull/20) | TODO 同步     |


- 本地备份：`wip/upload-backup`（未推送，完整 WIP 快照）
- 未提交：`.cursor/settings.json`、`debug.log`、`hs_err_*.log`

---

## 108 · 2026-08-23 首页减法与阅读层级

**状态**：已完成

**方向**：Hero 减法，Cover Story / Latest / Projects / About 承担内容；只调布局与字阶，不堆新装饰。

**P0 — Hero 重组**

- [x] 108-1 删除 `home-band` 上 `cover-kicker`；保留问候语与副标题
- [x] 108-2 降低 `home-band` 高度；`.home-band-film` 仍 `inset: 0` 铺满胶片，不裁切上沿；同步修 FilmFeed 副本测量

**⚠️ 回归 / 风险（改 Hero 必查）**

- 现象：Edge / Chrome 首页卡死，CPU/内存/磁盘打满
- 根因：容器变矮 → 格变窄 → `repeatCount` 变化 → 轨道 `:key` 重挂载 → 反复读盘
- 验收：容器变矮且铺满；`FilmFeed` 去轨道 `:key`、rAF 合并测量；**Edge/Chrome 停留 30 秒**无卡死且齿孔完整可见

- [x] 108-4 `home-hero-stack` 合并刊号行与胶片横幅为单层抬头

**P1 — 栏目与字阶**

- [x] 108-5 分区 `toc-head` 与 Cover Story kicker 适度加粗
- [x] 108-6 正文级摘要略增；标题与 Hero 问候分别加大；元数据保持 ≥0.76rem
- [x] 108-7 三主题 + 移动端目视；列表 `.timeline-summary` 与首页对齐

**废弃项**

- ~~108-3~~ **已废弃**：不做左文右图 Hero 大改

**涉及文件**

`HomeView.vue`、`page-enter-home.css`、`FilmFeed.vue`、`i18n/locales/{zh,en}.json`、`main.css` / `markdown-reading.css`（字阶跨页时）

---

## 105 · 2026-08-19 前端收尾（纸面重构后）

**状态**：已完成

**方向**：体验/性能优先，再收束设计语言与结构去重。

**P0 — 体验 / 性能**

- [x] 105-1 FilmFeed 滚轮：默认页面可滚；Shift+滚轮调速度；悬停光标 + 滚轮提示（i18n）
- [x] 105-2 花藤 SVG 懒挂载：timeline-card 首次 hover 再插入 `CardCornerVine`
- [x] 105-3 FilmFeed `prefers-reduced-motion` 降级
- [x] 105-4 中文衬线 Noto Serif SC 自托管（500/600）

**P1 — 设计语言收束**

- [x] 105-5 全局 `.badge` 字号 ≥0.76rem
- [x] 105-6 顶栏工具按钮 hover 去 scale+glow
- [x] 105-7 `SiteNavGroup` 下拉 blur 收到 `--glass-nav-blur`

**P2 — 结构 / 维护**

- [x] 105-8 时间线样式抽 `page-timeline.css`
- [x] 105-9 首页 `.toc-row` 与 timeline-card 边界写入 DESIGN.md
- [x] 105-10 `PostCard` 目录式排版（后续 110-1 升级为整行 `toc-row`）

**P3 — 单独立项**

- [x] 106-1 栖息碎念详情展开动画（`page-xiqi.css`）
- [x] 106-2 文章/项目详情滚动侧栏（`DetailScrollSidebar` + 方案 D）

---

## 归档 · 2026-08-19 方案 G 与胶片

**状态**：已完成

- [x] 方案 G（翻角+错位+檐角）：`.card-hover-g` + `CardCornerVine.vue` + timeline-card + cover-story
- [x] cover-story「开始阅读」右移 gutter，避开花藤 SVG
- [x] FilmFeed 宽屏无缝循环：`--film-repeat` + 动态克隆组数
- [x] DESIGN.md §9 更新可点击卡 hover 语言

---

## 归档 · 2026-08-17 ~ 08-18 风格与字号

**状态**：已完成

**2026-08-17 风格统一性回归**

- 博客/项目列表年份 mono kicker（0.78rem）
- 文章详情 `.body` 去框平铺；项目详情文字块 hairline 分段
- 友链/留言表单去玻璃混色；focus 2px accent outline
- 关于页事实网格 hairline 分格；DESIGN.md 增补 mono / 表单 / 平铺约定

**2026-08-18 hover 语言收敛（DESIGN.md §9）**

- 导航 link hover 去染色底+弹跳；下拉项 hover 改 `bg-elevated`
- 全局 `.card:hover` 扫光/浮起删除；可点击卡统一左缘 accent 竖线 + `translateY(-1px)`

**2026-08-18 全局基准字号 16px → 17px**

- `html font-size: 106.25%`；元数据发虚问题缓解；DESIGN.md §3 增补下限

