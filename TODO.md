## 开发命令

```bat
.venv\Scripts\activate.bat
. .\venv\Scripts\Activate.ps1
cd backend; . .\venv\Scripts\Activate.ps1; python run.py;
cd frontend; npm run dev;
```

测试 / 类型检查（153；CI 同命令）。后端先 Activate 再 `pip` / `pytest`（目录若是 `.venv` 则改 `. .\.venv\Scripts\Activate.ps1`）：

```bat
cd frontend
npm ci
npx vue-tsc -b
npx vite build

cd backend
. .\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
pytest
```

排障 / 已知坑见 [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)。

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

- **我已指明风格或参考**（含截图、链接、DESIGN.md 条款）→ 直接在 `frontend/` 落地，对齐纸面令牌与 `docs/DESIGN.md`，不必先做 HTML 原型。
- **未指明、需你自由发挥或有多解**，或我提到 **「让我预览」「先预览」「出方案对比」** 等 → **先不要改 Vue 生产代码**；在 `designed/` 下新建主题文件夹（如 `designed/nav-tools-options/`），用静态 HTML 出 **≥2 套可切换方案**，把 `index.html` 路径告诉我后等我选定，再合入 `frontend/`。

原型约定（沿用 `home-options`、`hover-options`、`page-transition`、`music_player`、`scroll-sidebar` 经验）：

- 入口：`index.html`（必要时加 `shared.css` / `shared.js`，大改动可拆 `scheme-a.html` 等）
- 顶部 **方案切换条**（按钮或 Tab），默认展示方案 A；每套附 **一两句说明**（适合场景、改动量、与现有组件关系）
- 视觉：优先用站点纸面色（纸底 `#f4f1e8`、墨 `#2b2823`、accent `#2e6b4f`），与 `docs/DESIGN.md` / `tokens.*.css` 一致；抽象档黄边等特殊主题仅在方案需要时单独标出
- 范围：原型只演示目标区域 UI，不嵌整站路由；可 mock 文案与占位图
- 交付：告诉我文件夹路径与方案代号（A/B/C…）；需要对比时可加 `shoot.py`（Playwright 截图到同目录）
- **选定前**：`designed/` 内容可提交；**未选定方案不要写进** `frontend/src`

小改（单色、间距、单一 hover）且意图明确时，可跳过原型直接改代码。

---

## 工作提示词 · 随手备注

> 给 AI / 自己的短提示、验收口径、链接、复制粘贴的 prompt。上半 **当前提示词** 给当次任务；下半 **灵感** 攒未排期想法。确定要做再整理进「进行中」开批次。

### 当前提示词（复制给 AI）

（无）

### 灵感（未排期）

1. 首页 刊号、问候语等 卡片背景有些突兀


2. 
博客/项目 详情页：
（1）左侧侧栏的Contents·目录改为右侧，原本的图片预览改到左侧侧栏项目信息部分的下方
（2）左侧侧栏项目信息部分、左侧图片预览部分、右侧Contents·目录部分，都添加一个功能，可以临时关闭

2. 此项搁置
碎念/推荐 改为 绝区零绳网展示方式
- 通用：
（1）顶部为标题，标题下方为图片（如果有），再下方为详情，点击卡片的整个区域都可以跳转；
（2）每个卡片的高度可以不一致，高度根据标题字数、图片高度、详情字数等内容判断；
（3）可以在居中位置放上最新的文章/项目的卡片，这个卡片的宽度可以大一些；
- 如果是项目界面： 
（1）顶部展示项目图片，默认选取第一张，但会有一个问题，在碎念/推荐界面也是有默认选取第一张的逻辑的，这个是写在前端的还是写在后端，需要改为后端判断
（2）还要考虑如果内容过少，显示效果会不会不如原本的时间线；
- 如果是博客界面：
（1）有没有技术能够把代码给做成预览，就像是项目界面的图片一样，这样比较高级；

3. 内容备份：脚本将数据库导出到本地，并定期推送到 GitHub。

---

## TODO 书写模板（复制开新批次）

> 用法：从下方「批次骨架」复制一整段，粘贴到 **「进行中」** 区（灵感 / 搁置 / 已完成 之间）。旧批次只改状态、不删记录；整批完成后整块下移到对应分区；确定不做则下移到文末 **废案**。

### 本文件结构（自上而下）

1. 开发命令（固定，少改）
2. **快捷提示词**（复制用，序号与正文分行）
3. **工作提示词 · 随手备注**（当前提示词 + 灵感，同一区上下分块）
4. **本模板**（固定）
5. 进行中
6. 搁置
7. 已完成 / 归档
8. **废案**（确定不做；整块移到文件末尾，不删编号）

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

**状态**：进行中 | 搁置 | 已完成 | 废案
<!-- 完成后示例：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18) -->

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
- **状态**：只改 `[ ]` / `[x]`；搁置整批写 **状态：搁置**（可回炉）；完成整批写 **状态：已完成（日期）**，并在状态行旁加 CHANGELOG 日链（见上节边界）；确定不做写 **状态：废案**（附 **废案原因**），整块移到文末「废案」区。
- **验收**：每批至少本地目视；动首页 Hero / FilmFeed 须 Edge 或 Chrome 停留 30 秒无卡死。
- **CHANGELOG**：关单 / 合入当天追加一两句；GitHub 上传用已合并 PR 链接，不必抄完整 `git log`。

### 与 DESIGN.md / CHANGELOG 的边界

- **编码代理入口**（文档地图 + 硬约束）→ [`AGENTS.md`](AGENTS.md)；Cursor 规则 `.cursor/rules/grunray-agents.mdc` 指向它
- 令牌、hover 语言、阅读宽等**契约** → `docs/DESIGN.md`
- 键盘 / Skip / 焦点陷阱等**无障碍契约** → `docs/ACCESSIBILITY.md`
- **已经发生了什么**（对外摘要、按日倒序）→ `docs/CHANGELOG.md`
- **踩过坑的解法**（现象 / 根因 / 解法）→ `docs/TROUBLESHOOTING.md`；未修完的活仍写本文件，不要把勾选清单贴进排障文
- `TODO.md` 只跟踪**怎么做、优先级、勾选、验收、涉及文件**（可写「见 DESIGN.md §n」或「见 TROUBLESHOOTING · 某条」）
- **不要**把本文件的 `- [x]` / P0 / 涉及文件整段粘进 CHANGELOG；关单或合入当天在 CHANGELOG 追加一两句效果 + 可选批次号；合入用已合并 PR（或上了 `main` 的关键 commit）挂对应日期节
- 已完成批次状态行旁加：`摘要见 [CHANGELOG · YYYY-MM-DD](docs/CHANGELOG.md#yyyy-mm-dd)`（与 `## YYYY-MM-DD` 锚点对齐）

---

## 进行中

> 对外变更摘要见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。

## 154 · 2026-09-19 Lighthouse 首页跟进

**状态**：进行中

**方向**：对照 2026-09-19 Chrome Lighthouse 13.4.1 对 `https://www.grunray.tech/` 的审计（JSON：本机 Downloads `www.grunray.tech-20260919T032853.json`）。只改**站内能负责**、且能改善 LCP / 缓存 / 无障碍名称的项。不重做视觉语言，不追插件噪声，不做整站 SSR。

**背景 / 现状**：四类分数 **性能 94 / 无障碍 100 / 最佳做法 100 / SEO 100**；新类 **Agentic browsing 67**。Core Web Vitals：FCP 0.8s、LCP **1.4s（0.84）**、TBT 20ms、CLS 0.001、Speed Index 1.4s。模拟视口约 412×823。报告里大量「未使用 JS 2.3 MiB / 未压缩 JS」来自 `chrome-extension://`（uBlock 等），**忽略**。`bf-cache` 失败原因是「内部出错了」，当噪声。三主题 CSS 未用规则（约 15 KiB）是纸面令牌设计，不拆主题。Noto SC 子集（各约 1.5 MB）批次 150 已明确本批不做。

**依赖 / 冲突**：LCP 图是关照片背景时的舞台底图 `img.home-stage-art-base`（`/art/polonia_sandoren.webp`）。`docs/DESIGN.md` §14 写过舞台图 `fetchpriority="low"`、不加 `sizes`/`srcset`、不预拉其它主题 —— 本批只抬**当前主题底图**优先级，楔图与其它主题仍低；不要推翻 150 的横竖屏不换源。nginx 缓存草稿见 `designed/optimization/04-nginx-rss-cache-gzip.md`（已有 `/assets/` `/fonts/`，缺 `/art/` `/footer/`）。

**P0 — 真瓶颈（先做）**

- [ ] 154-1 nginx 打开 HTTP/2（报告 36 个资源全是 `http/1.1`，insight 估 660 ms）：生产 `listen 443 ssl http2`（或 HTTP/3 另议）；本仓库没有 conf 正文，改服务器 `/etc/nginx/conf.d/grunray_wiki.conf`，`nginx -t` 后 reload；用 `curl -sI --http2` 确认。不改 Vue。
- [ ] 154-2 静态长缓存：`/art/*.webp`、`/footer/*.svg` 现 `Cache-Control` 寿命为 0（估 411 KiB）。给不可变静态加 `public, max-age=…`（可参考 04 文档的 fonts 一年；文件名无 hash 则用较短 max-age + 发版改名或 query）。`index.html` 继续禁缓存。`/api/media/` 头像已有 1 天，可并列看要不要缩图而不是再加长缓存。
- [ ] 154-3 首页 LCP：关照片背景时 LCP 是舞台底图，且「初始 HTML 发现不了 / 未 `fetchpriority=high`」。只对**当前主题底图**（浅色默认 `/art/polonia_sandoren.webp`）`fetchpriority="high"`，或在 `index.html` `rel=preload` 默认浅色底图一张；楔图与其它主题仍 `low`、不预拉。禁止 `sizes`/`srcset`。开照片背景时不要误预载舞台图。
- [ ] 154-4 语言钮无障碍名称：可见字是 `EN` / `中`，`aria-label` 却是 `t('ui.locale')`（「语言」），Lighthouse `label-content-name-mismatch`。把可访问名改成包含可见字（或拿掉 `aria-hidden` 让可见字成为名称）。`AppShell.vue` 语言钮；不要改成药丸皮肤。

**P1 — 体积与字体**

- [ ] 154-5 刊号头像：`touxiang.jpg` 约 80 KB，显示约 58×58，insight 估浪费 78 KB。做一版小图（如 ≤128 px WebP/JPEG）给首页 mast 用，或媒体管线缩略；不要把原图当 58px 图标。宽高属性已有则保留防 CLS。
- [ ] 154-6 Great Vibes：`page-home-hero.css` 里 `font-display: block`，insight 估 140 ms。改为 `swap` 或 `optional` 后目视问候花体，闪一下系统草书可以、布局跳一下不行；若 `swap` 明显撑高卡片则维持 `block` 并在 DESIGN §14 写明例外。
- [ ] 154-7 （可选）`llms.txt`：Agentic 67，现文件缺 H1、无链接（生产有文件、仓库无）。加一份带 `# 标题` 与站点主要路径链接的 `llms.txt`（前端 public 或后端与 `robots.txt` 同发），不写长文案堆砌。

**P2 — 明确不做 / 以后再说**

- ~~154-8 按 Lighthouse 砍「未使用 JS 2.3 MiB」~~ **不做**：几乎全是浏览器扩展。
- ~~154-9 为三主题未用 CSS 拆包~~ **不做**：令牌三档同页切换。
- ~~154-10 本批重做 Noto SC 子集~~ **不做**：见 150；体积仍大，需要时另开批次。
- ~~154-11 为 bf-cache / 强制重排 insight 改架构~~ **不做**：bf-cache 是工具内部错误；reflow 0.4 ms。

**⚠️ 回归 / 风险**

- 抬 LCP 优先级后，弱网下舞台图可能抢问候字体；验收时看浅色首页问候是否仍先于楔图可读。
- HTTP/2 只动 nginx，reload 失败要能回滚（沿用 04 文档流程）。
- 验收：Chrome 再跑一次首页 Lighthouse（**无痕、关扩展**），对照 LCP、HTTP 协议、缓存寿命、语言钮；窄屏壳层头像不显示则 154-5 只验桌面刊号。

**涉及文件**

`frontend/src/views/HomeView.vue`、`frontend/index.html`、`frontend/src/styles/page-home-hero.css`、`frontend/src/components/layout/AppShell.vue`、`docs/DESIGN.md` §14、服务器 nginx conf、`designed/optimization/04-nginx-rss-cache-gzip.md`、可选 `frontend/public/llms.txt`

**验收**

- [ ] 无痕 Lighthouse 首页：LCP 仍 ≤2.5s 且发现项不再报缺 `fetchpriority` / 不可发现（或已说明 SPA 预载方案）
- [ ] `curl -sI` 舞台 webp / footer svg 带缓存头；HTML 仍 no-cache
- [ ] 语言钮：可见 EN/中 与可访问名一致；读屏不报名称不含可见字
- [ ] 三主题 + 关/开照片背景：舞台图不错位、不预拉其它主题
- [ ] DESIGN.md §14 补 LCP / 缓存 / font-display 例外（若有改契约）

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

> 对外摘要见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。已完成批次尽量在状态行挂对应日链（含 08-17 起回填）。

## 153 · 2026-09-16 自动化测试 + CI（收尾）

**状态**：已完成（2026-09-19） · 摘要见 [CHANGELOG · 2026-09-19](docs/CHANGELOG.md#2026-09-19)

**方向**：**排在 146–151 之后做**（152 已废案，不挡本批）；一次覆盖前面改动。最小：前端 `vue-tsc` + `vite build`、后端关键 API / 校验单测、GitHub Actions 在 PR 上跑。

**背景 / 现状**：几乎无 `*.test` / `*.spec`；无 `.github/workflows`；合入靠人工目视。

**做完有什么用**：PR 自动挡编译挂与明显回归；146–151 合完后有一张「全绿」网，后面加功能不怕 silently 炸。

**依赖 / 冲突**：建议等 146–151 合入 `main` 再开本批实现；可提前草拟 workflow 文件但不以本批阻塞前序。

**P0 — 本地与流水线**

- [x] 153-1 前端 CI job：`npm ci` + `vue-tsc -b` + `vite build`（`frontend/`）
- [x] 153-2 后端 CI job：pytest（或等价）跑校验 / 序列化 / 友链·留言关键用例；无 DB 则用 fixture 或 sqlite 测试配置
- [x] 153-3 `.github/workflows/ci.yml`：push / PR 触发；失败阻断合并（或至少标红）

**P1 — 冒烟**

- [ ] ~~153-4 可选：Playwright 烟测首页 + 博客列表空/错态选择器（依赖 146 稳定文案）~~ — **本批不做**（可选；弱机个人站优先轻量 CI）
- [x] 153-5 README 或 TODO 开发命令区补「如何跑测试」

**涉及文件**

`.github/workflows/ci.yml`、`frontend/package.json`、`backend/tests/`、`backend/requirements-dev.txt`、`backend/pytest.ini`、`TODO.md` 开发命令、`backend/README.md`、`frontend/README.md`

**验收**

- [x] 本地 pytest 绿；前端 `vue-tsc -b` + `vite build` 可独立跑（与 CI 同命令）
- [x] `main` 上 CI 绿（合入后看 Actions：#52 / #53 merge 与对应 PR 跑均绿）

---

## 151 · 2026-09-16 动效降级策略（文档 + 挂钩）

**状态**：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18)  
**规格修订**：2026-09-18（统一 Motion Policy；FPS 只建议不偷关；短时采样；后续 agent 按本文实现，勿另起炉灶）

**方向**：把分散的 `prefers-reduced-motion` / 手机壳层 / 拖尾开关 / FPS 浮层收成一套可复用的**动效运行时契约**。系统减动效是底线，导航手动三态是主入口，短时性能采样只建议、不自动改档。不另开视觉皮、不做 APM / 常驻性能监视器。

**做完有什么用**：低端机更稳；系统无障碍不被 FULL 绕过；后人加特效只问「挂哪一档」，不必每个组件再写一套 `if`。

---

### 给后续 agent 的硬约束（先读完再改代码）

1. **不要**「FPS 低 → 直接关特效」。FPS / 长帧只用来发现异常；改档必须用户点同意（或用户自己选 REDUCED）。
2. **不要**为探测再挂一条常驻 `requestAnimationFrame`。现有 Footer / 拖尾已经各有 rAF；监视浮层（批次 119）默认关，关则必须停循环。探测只能短窗采样，结束即拆。
3. **不要**让 FULL 覆盖系统 `prefers-reduced-motion: reduce`。那是无障碍底线，不是可选皮肤。
4. **不要**把 119 的 `FpsMeter` 升级成常开 Performance Monitor。浮层仍是调试 overlay；进站采样是另一条短命路径。
5. **不要**第一版就做 `allows("cursor-tail")` 细权限表，也不要把 Long Animation Frames（LoAF）当主路径。
6. **不要** `if (deviceMemory <= 4) disableAnimations()`。硬件 API 只作软提示。
7. 组件禁止继续各自 `matchMedia` + `isMobile` + `fps < 40` 分叉。只读 **最终档位**（见下）。CSS 纯动画用 `html[data-motion]`（或等价 dataset）+ 现有 `@media (prefers-reduced-motion)`。
8. 手机壳层契约不变（`useMobileShell` / DESIGN §8）：窄屏强制关照片 / 拖尾 / FPS / 音乐展开，**不写** localStorage。壳层是第四条输入，不是 MOTION 三态的替代。
9. 风格走 editorial：MOTION 是刊头控制，不是 CMS Switch；建议气泡从导航 MOTION 附近冒出，不要屏幕中央对话框。
10. 先写 `docs/DESIGN.md` 契约（扩 §9，交叉 §8 壳层 / §11 拖尾 / §13 FPS），再改 `ui` store 与消费方。未写清映射不要先堆 UI。

---

### 背景 / 现状（实现时对照，避免重复造轮）

判断入口已经散落，151 的核心是**收口**，不是再加一层平行 `if`：

| 现状 | 位置 |
| --- | --- |
| 系统 reduced-motion 写入 store | `AppShell.vue` `matchMedia` → `ui.setReducedMotion`；`ui.prefersReducedMotion` |
| 拖尾是否挂载 | `ui.cursorTrailActive` = `cursorTrailEnabled && !prefersReducedMotion`（`stores/ui.ts`）；`CursorTrail.vue` 另要求 `pointer: fine` |
| 手机壳层强制关工具 | `useMobileShell.ts` `lockTools`：关照片 / 拖尾 / FPS、音乐收起；`runWithoutToolPersist` |
| Footer 扭曲字 | `FooterGrunRayPanel.vue` 窄屏 `footer-grunray-root--meta-only` 不渲染品牌字；`footer-grunray.css` 亦有 reduced-motion |
| 入场 GSAP / CSS | `usePageEnterAnimation.ts` 的 `prefersReducedMotionMedia()`；多份 `page-enter-*.css` 的 `@media (prefers-reduced-motion)` |
| 组件私自 matchMedia | `VinylDeck.vue`、`GalleryImagePreview.vue`、`FilmFeed.vue`、`SplashWoniuOverlay.vue`、`useDetailScrollSidebar.ts`、`pagePhotoBackgrounds.ts` 等 |
| CSS 媒体查询 | `AppShell.vue`、`page-home-hero.css`、`page-ed-ledger.css`、`page-xiqi.css`、`page-messages.css`… 多处 |
| FPS 调试浮层 | `useFpsMeter.ts` + `FpsMeter.vue`；仅 `ui.fpsMeterEnabled` 为真时挂载；注释已写「卸载即停循环」 |
| 顶栏工具 | 溢出面板：拖尾 / FPS / 照片背景。尚无 MOTION 三态 |

`DESIGN.md` §9 目前只写「全部动效遵守 prefers-reduced-motion」，没有档位表、没有用户手动策略、没有「性能只建议」。§13 明确 FPS 浮层是调试用、关闭必须停 rAF。

---

### 两套「三态」不要混用

**用户控制**（导航可见、持久化）≠ **运行时档位**（组件真正遵守）。DESIGN 必须写死映射。

#### A. 用户偏好 `userPreference`（localStorage，建议键 `ui.motionPreference`）

```text
AUTO      跟随系统（默认）
REDUCED   永久手动降级
FULL      尽可能完整（仍不能压过系统 reduce）
```

刊头文案建议（editorial，不要 ON/OFF Switch）：

```text
MOTION · 动效
AUTO        跟随系统
REDUCED     降级
FULL        完整
```

系统当前为 reduce 时，面板里给一句提示：「检测到系统减少动态效果」。FULL 选项可显示，但**生效结果仍是 MINIMAL**（见解析）。

#### B. 运行时档位 `effectiveLevel`

```text
FULL      Level 0 · 完整
REDUCED   Level 1 · 砍持续消耗，留氛围
MINIMAL   Level 2 · 非必要动画全关（≈ 今日 prefers-reduced-motion）
```

#### C. 解析顺序（优先级从高到低，必须写进 DESIGN）

```text
1. 系统 prefers-reduced-motion: reduce
      → 一律 MINIMAL
      （AUTO / REDUCED / FULL 都不能抬上去）

2. 手机壳层 isMobileShell
      → 持续特效按现有壳层：拖尾 / FPS / 照片 / 音乐展开强制关；
        Footer 只留 ICP。这是壳层契约，不改 MOTION 存储。
      → 运行时对「持续 rAF 特效」视同 MINIMAL；短 hover 仍可走 CSS。

3. userPreference === REDUCED
      → REDUCED（即使用户机器 144fps）

4. 用户刚同意「性能建议降级」
      → 写入 REDUCED（或单独记一条已接受建议；不要静默改）

5. userPreference === FULL 且系统不是 reduce
      → FULL

6. AUTO 且系统 no-preference
      → FULL
      低端特征 / 采样异常 只提高「弹出建议」的概率，不在这一步改档
```

图示：

```text
system reduce ──→ MINIMAL          （底线，FULL 也进这里）
      │
user REDUCED ──→ REDUCED
      │
performance 同意 ──→ REDUCED       （只建议，须点同意）
      │
AUTO / FULL ──→ FULL
```

**禁止**：检测到卡顿后偷偷关掉 Footer 扭曲或拖尾。用户可能正在看扭曲字，突然消失会像 bug。

---

### 特效挂档（新动效只问「属于哪一档」）

实现时以 `effectiveLevel` 一处判断；下面是 2026-09-18 应对齐的清单。未列到的新特效先归类再写代码。

| 能力 | FULL | REDUCED | MINIMAL |
| --- | --- | --- | --- |
| Footer GrunRay 扭曲字 | 开（桌面） | **关**（仍可静态字/ICP，不要持续扭曲 rAF） | 关；窄屏本就 meta-only |
| 月相拖尾 Canvas / rAF | 尊重 `cursorTrailEnabled` | **不挂载** | 不挂载 |
| 页面入场 GSAP / `page-enter--play` | 现时长 | 很短或瞬切 | 瞬切 / 不播放 |
| 顶栏 FLIP / spring pop | 开 | 缩短或关 | 关 |
| 方案 G 卡 hover（翻角/花藤/位移） | 开 | 可留着色，去掉翻角花藤位移 | 只留着色 |
| 普通 CSS hover / 下划线 | 开 | 开 | 开（非位移类） |
| 音乐：音频播放 | 开 | 开 | 开（不自动播，见既有契约） |
| 音乐：碟片/可视化持续动效 | 开 | 减或关 | 关 |
| 照片背景 blur-up / 呼吸 | 开 | 可减 | 关（直接到位） |
| 开屏蜗牛 / 头像交接 | 开 | 缩短 | 跳过 |
| FPS 调试浮层 | 用户手动开才挂 | 同左（仍是调试工具，不是降级手段） | 同左 |
| 滚动 smooth | 开 | 可保留 | `auto` |

REDUCED 的意图：**去掉持续占主线程的东西，网站还要像这份纸面刊**，不是把站变成无动画静态页。MINIMAL 才对应系统无障碍。

建议同时写 `html[data-motion="full|reduced|minimal"]`，让 CSS 在用户选 REDUCED、系统并非 reduce 时也能砍方案 G / 入场，而不是只认 `@media (prefers-reduced-motion)`。

消费方统一问：

```ts
// 伪代码，名字可不同，但只能有这一处
motionPolicy.effectiveLevel  // 'full' | 'reduced' | 'minimal'
// 或
html.dataset.motion
```

禁止再写：

```ts
if (prefersReducedMotion) ...
if (isMobile) ...
if (fps < 40) ...
if (deviceMemory < 4) ...
```

壳层窄屏逻辑继续留在 `useMobileShell`（关工具、不写 storage），不要复制进每个动效组件。

---

### 性能检测（附件，不是主功能）

#### 原则

- **常态不测。**
- 只在：首次进入（或本会话尚未得出结论）+ 页面已稳定 + `document.visibilityState === 'visible'` 时，做一次短窗采样。
- 异常 → 再确认一轮（仍要页面可见、用户确实在用，不要后台算长帧）。
- 两轮仍异常 → **气泡建议**，不是改档。
- 用户点「忽略」后本机记住（localStorage），不要每次进站都问。
- 页面 hidden 时暂停/丢掉采样（浏览器会节流后台 rAF；切回的超长帧本来就不该进 119 的 1%L）。

建议时序：

```text
首次进入
  → 等空闲约 5–10s（首屏入场结束、不在 hidden）
  → 采样约 8–10s
  → 正常：本会话不再测
  → 异常：若用户不在前台 / 刚切回 → 暂缓
        若在用 → 第二轮采样
          → 仍异常 → 气泡
```

#### 判据（不要单看 1%L）

60Hz 与 144Hz 上「45 FPS」含义不同；平均 FPS 好看仍可能「顿」。卡顿更接近**个别帧太长**。

短窗记录至少：

```ts
{
  fps,              // 平均 / 近窗
  lowFps,           // 1%L 可作辅证，不是唯一开关
  longFrameCount,   // 例如帧时间 > 50ms 的次数
  frameTimeP95,     // 有则更好
  sampleDuration
}
```

「建议降级」需要 **持续** 长帧 + 低帧，且 **两轮** 都异常。一次掉到 40 FPS 不够。

阈值写进 DESIGN 时用「相对刷新 / 长帧次数」表述，不要写死「低于 40 就弹」。具体数字实现时定，但必须：两轮、可见、非后台长帧。

#### LoAF

`PerformanceObserver` + `long-animation-frame` 可作为 **P2 可选增强**（精确长帧、以后排查 Footer / GSAP / 拖尾）。MDN 标实验 / 覆盖有限。

```text
优先：LoAF（若存在）
否则：短窗 rAF 帧时间（可复用 useFpsMeter 的采样思路，但必须独立短命、默认不挂浮层）
```

**禁止**把 151 建在 LoAF 上；无 API 时 fallback 必须能独立完成建议流程。

#### 低端特征（软提示）

可用则作为「提高建议概率」的加分，**不单独改档**：

- `navigator.hardwareConcurrency`（支持较广）
- `navigator.deviceMemory`（粗粒度、支持有限）
- `navigator.getBattery()`（支持很有限；省电模式可加分）

组合直觉：低端特征 + 系统已 reduce → 已经是 MINIMAL，无需再弹。低端 + AUTO + 采样异常 → 比高端更容易弹出建议。

---

### UI 规格

#### 导航 MOTION（P1，151 的用户主入口）

- 放顶栏溢出面板（工具槽已挤：拖尾 / FPS / 照片）。不要再做独立「动画 ON/OFF」。
- 点击展开小面板：AUTO / REDUCED / FULL，纸面、ink 顶线、`.ed-action` / editorial 选项，不要药丸 Switch。
- 状态持久化；壳层强制关工具时**不要**把 MOTION 偏好写成关（MOTION 不是那四个工具快照里的项；窄屏可持续特效仍被壳层关掉）。
- 拖尾开关可保留：FULL 时仍尊重「用户关拖尾」；REDUCED / MINIMAL 时拖尾根本不该挂上（即使 storage 里是开）。

#### 性能建议气泡（P2）

不要：

```text
屏幕中央大对话框「检测到页面动画可能导致卡顿」
```

要：从 MOTION 钮附近冒出的轻量纸面气泡（刊头控制，不是后台管理）：

```text
PERFORMANCE
检测到页面存在持续卡顿。
是否降低动效？
[降低动效]  [忽略]
```

「降低动效」→ `userPreference = REDUCED`（或等价）。「忽略」→ 记住，本机不再为这次结论打扰。

---

### 建议代码收敛（目标结构，文件名可微调）

```text
AppShell
  └── ui.motionPolicy（或拆 composable，但对外只暴露最终档）
         ├── systemPreference     matchMedia
         ├── userPreference       localStorage AUTO|REDUCED|FULL
         ├── mobileShell          已有 useMobileShell
         ├── performanceHint      none | dismissed | accepted
         └── effectiveLevel       FULL|REDUCED|MINIMAL
                │
                ├── html[data-motion]
                ├── CursorTrail / moonlitCursorEngine
                ├── Footer GrunRay distortion
                ├── usePageEnterAnimation / page-enter-*.css
                ├── VinylDeck 等可视化
                └── 其余动效只读 dataset / store
```

`cursorTrailActive` 应改为同时尊重 `effectiveLevel`（REDUCED/MINIMAL 不挂），而不是只 `!prefersReducedMotion`。

把 `VinylDeck` / `FilmFeed` / `GalleryImagePreview` / `SplashWoniuOverlay` / `pagePhotoBackgrounds` / `useDetailScrollSidebar` 的私自 `matchMedia` 迁到同一源。CSS `@media (prefers-reduced-motion)` 可保留作系统底线；用户 REDUCED 靠 `[data-motion="reduced"]` / `minimal`。

---

### 批次拆分（按此顺序做，不要一次做完所有「可以做」）

**P0 — Motion Contract（先文档再收口）**

- [x] 151-1 `docs/DESIGN.md`：扩 §9（可加「Motion Policy」小节），写清两套三态、解析顺序、特效挂档表、壳层关系、FPS 浮层≠探测。交叉引用 §8 / §11 / §13，不要三处各写一套互相矛盾的句子。
- [x] 151-2 `ui` store（或小 composable）产出 `userPreference` + `effectiveLevel`，同步 `html[data-motion]`；`AppShell` 继续听系统 matchMedia。列出所有私自 `matchMedia('(prefers-reduced-motion')` 的 TS/Vue 并迁到最终档；CSS 补 `[data-motion]`。此步**还不要**做采样弹窗。

**P1 — 用户控制**

- [x] 151-3 溢出面板 MOTION：AUTO / REDUCED / FULL；i18n zh/en；持久化；系统 reduce 时提示句；FULL 不能抬过系统底线。拖尾在 REDUCED/MINIMAL 不挂载。

**P1 — 降级落地（读档位，不读 FPS）**

- [x] 151-4 REDUCED/MINIMAL：关 Footer 扭曲 rAF、拖尾不启动、入场瞬切或极短；音乐可视化减/关、音频仍可播。对照上表逐项打勾。窄屏继续走壳层，不要双重实现。

**P2 — 短时采样建议（可后做；P0/P1 可独立验收）**

- [x] 151-5 短命 Performance 采样：LoAF 优先、rAF 帧时间 fallback；不常驻；两轮异常才从 MOTION 旁出气泡；忽略持久化。禁止常开 rAF，禁止一次掉帧就问。
- [x] 151-6 可选：`hardwareConcurrency` / `deviceMemory` / `getBattery` 只加建议权重。无 API 则跳过。

**明确不做（本批）**

- 常驻性能监视器、把 1%L 当自动开关、细粒度 `allows("…")` 特效权限框架、用 LoAF attribution 做可视化调试台、新视觉皮肤、改 152/153。

---

### 依赖 / 冲突

- 119 FPS 浮层：保留调试用途；与 151 采样路径分离；两者都开时不要跑两条无限 rAF（采样应短、浮层仅用户打开时存在）。
- 113 拖尾 / 118 首页 blur / 150 首屏预算：降级是卸载或缩短，不是再打进主包。拖尾仍默认关、动态 import。
- `docs/ACCESSIBILITY.md`：系统 reduce 的键盘/焦点契约不动；本批只补运动档位，不改 Skip / 焦点陷阱。
- 原型：规格已定，**不要**再出 `designed/` 多方案。直接 `frontend/` + DESIGN。

---

### 涉及文件（预期会动；按需增减）

`docs/DESIGN.md`  
`frontend/src/stores/ui.ts`  
`frontend/src/components/layout/AppShell.vue`  
`frontend/src/composables/useMobileShell.ts`（只对齐，勿破坏工具快照）  
`frontend/src/composables/usePageEnterAnimation.ts`  
`frontend/src/composables/useFpsMeter.ts`（采样若复用思路，勿让浮层常开）  
`frontend/src/components/layout/FpsMeter.vue`  
`frontend/src/components/layout/FooterGrunRayPanel.vue` 及 `footer-grunray.css` / reveal composable  
`frontend/src/components/layout/CursorTrail.vue`、`cursor/moonlitCursorEngine.ts`  
`frontend/src/components/music/VinylDeck.vue`、音乐挂载  
`frontend/src/theme/pagePhotoBackgrounds.ts`  
`frontend/src/styles/page-enter-*.css`、`page-home-hero.css` 等 reduced-motion 媒体查询  
上表「私自 matchMedia」各组件  
`frontend/src/i18n/locales/zh.json` `en.json`  
`TODO.md`（勾选）

---

### 验收

- [x] 系统「减少动态效果」开：无论 AUTO/REDUCED/FULL，有效档 MINIMAL；无拖尾、无 Footer 扭曲 rAF、入场可接受、方案 G 无位移花藤
- [x] 系统关 reduce，用户选 REDUCED：扭曲/拖尾/长入场关掉；刷新保持；普通下划线 hover 仍在
- [x] 系统关 reduce，用户选 FULL：桌面完整特效（拖尾仍看自己的开关）
- [x] 系统开 reduce + 用户选 FULL：仍 MINIMAL（回归：不得绕过无障碍）
- [x] 窄屏壳层：工具强制关且不写掉桌面 MOTION/拖尾 storage；回桌面恢复
- [x] 用户未开 FPS 浮层时，无常驻探测 rAF（Performance 面板不应多一条无限循环）
- [x] 若已做 151-5：两轮可见异常才出气泡；忽略后刷新不再弹；同意后变 REDUCED 且不再偷偷改回来
- [x] DESIGN §9 与代码一致；新特效能按挂档表归类
- [x] `npx vue-tsc -b`；桌面 + 窄屏各走一遍首页 / 博客 / Footer

**⚠️ 回归 / 风险**

- 现象：关 FPS 浮层后仍掉帧 → 根因：探测 rAF 没拆；对照 119
- 现象：用户开系统减动效仍见拖尾 → `cursorTrailActive` 没吃到 effectiveLevel
- 现象：选 REDUCED 但方案 G 花藤还在 → CSS 只认 media query，没认 `data-motion`
- 现象：手机打开一次，桌面拖尾/MOTION 丢了 → 壳层写入了 storage；必须 `runWithoutToolPersist`
- 现象：Footer 扭曲突然消失无人点过 → 采样走了自动改档；禁止


---

## 150 · 2026-09-16 首屏与资源预算

**状态**：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18)

**方向**：量一轮生产构建基线；收紧首屏 JS / 图 / 字体；拖尾与音乐默认更晚挂载。不删功能。

**P0 — 度量与收紧**

- [x] 150-1 记录基线：生产构建主包 / 舞台 WebP / 字体体积，写入 `docs/DESIGN.md` §14
- [x] 150-2 舞台图：当前主题底+楔整文件加载；**不加** `sizes`/`srcset`（横竖屏不换源）；不预拉其它主题
- [x] 150-3 拖尾无键默认关、开启后动态 import；音乐点开展开才挂；壳层强制关不写 localStorage

**P1 — 字体与 chunk**

- [x] 150-4 Great Vibes 只随首页 CSS；Noto SC 子集本批不重做（各约 1.5 MB，有 `display:swap`）
- [x] 150-5 拖尾 / 音乐 / FPS 拆出独立 chunk，默认不进首屏主包

**涉及文件**

`HomeView.vue`、`App.vue`、`AppShell.vue`、`ui` store、`useMobileShell.ts`、`fonts.css`、`page-home-hero.css`、`docs/DESIGN.md` §14

**验收**

- [x] 主包 / 壳层 CSS 下降；拖尾、音乐可手动打开

---

## 149 · 2026-09-16 无障碍扫一遍（壳层后）

**状态**：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18)

**方向**：键盘与读屏能走完主导航、汉堡抽屉、Read sheet、出站确认；补「跳到主内容」与焦点陷阱。不重做视觉。

**背景 / 现状**：已有部分 `aria-*` / `focus-visible`；手机壳层与 sheet 刚合入，最容易漏焦点归还。

**做完有什么用**：键盘用户与读屏可用；合规与口碑；顺带抓到「点不开 / 焦点丢了」类回归。

**P0 — 焦点与跳转**

- [x] 149-1 页顶 Skip link：Tab 可见，跳到 `#main`
- [x] 149-2 汉堡抽屉 / Read sheet：打开时焦点陷阱；关闭后焦点回到触发按钮；`Esc` 关闭
- [x] 149-3 出站确认页：主要操作可纯键盘完成；关页失败 `aria-live="assertive"`

**P1 — 扫尾**

- [x] 149-4 顶栏工具 / 溢出菜单：键盘可达与可见焦点环
- [x] 149-5 验收清单写进 `docs/ACCESSIBILITY.md`（`docs/DESIGN.md` §8 指针）

**涉及文件**

`AppShell.vue`、`XiqiSplitLayout.vue`、`SiteLeaveRedirectView.vue`、`useFocusTrap.ts`、`nav-toolbar.css`、`docs/ACCESSIBILITY.md`、`docs/DESIGN.md`

**验收**

- [x] 不碰鼠标：打开抽屉 → 选页 → 关抽屉；碎念打开 sheet → Esc 关闭
- [x] Skip link 跳过后焦点在主内容

---

## 148 · 2026-09-16 内容运营面板（轻量）

**状态**：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18)

**方向**：站长登录后完善碎念 / 推荐运营入口；新增「今日状态」（首页 NOW）可编辑，避免改前端 i18n 才能换文案。不做完整 CMS。

**背景 / 现状**：`xiqi_admin_api` + `FragmentComposeView` 已有 import 写入能力；推荐运营 UI 偏弱；首页 `home.nowDoing` / `home.nowReading` 写死在 locale。

**做完有什么用**：站长改 NOW / 发碎念 / 管推荐不用改代码发版；首页「此刻」真正跟着生活走；运营与访客皮分离，少误伤公网。

**P0 — 今日状态（NOW）**

- [x] 148-1 后端：站长可读写「今日状态」（在写 / 在读等字段）；公开只读 API 供首页
- [x] 148-2 前端：受保护编辑入口（可挂关于旁、或独立短页 / 浮层）；保存后首页即时或下次进入可见
- [x] 148-3 无配置时回退现有 i18n 默认文案；非站长不可见编辑入口

**P1 — 碎念 / 推荐运营**

- [x] 148-4 碎念：compose / 列表侧补齐草稿·隐藏·发布与媒体上传的站长路径（对齐已有 API，缺 UI 补 UI）
- [x] 148-5 推荐：同等轻量运营面板（新建 / 改状态 / 分类）；复用 editorial 表单语言，不新开一套皮肤
- [x] 148-6 权限：一律 `is_site_owner`；未登录跳留言 OAuth 或既有登录流
- [x] 148-8 站长编辑名录：`/fragments/edit` `/recommend/edit` 用 Ledger 行（无分栏），点开 compose `?id=` 填原文；撰写下拉菜单走 AppSelect editorial 纸面，`/design` 有实况样例

**P2 — 可选**

- [x] ~~148-7 COVER STORY 可选「置顶覆盖 latest-updated」~~ — **不做**（本批明确跳过；需要时另开任务）

**涉及文件**

`xiqi_admin_api.py`、`xiqi_import_apply.py`、`fragment_repo.py`、`recommend_repo.py`、`site_now_repo.py`、`sql/site_now.sql`、`HomeView.vue`、`SiteNowEditView.vue`、`siteNowApi.ts`、`FragmentComposeView.vue`、`RecommendComposeView.vue`、`XiqiOwnerEditView.vue`、`DesignSystemView.vue`、`AppSelect.vue`、`fragmentsAdminApi.ts`、router、i18n、`DESIGN.md`

**验收**

- [x] 非站长看不到运营入口；站长改 NOW 后首页文案更新
- [x] 碎念 / 推荐站长路径可完成「写一条 → 列表可见 / 可隐藏」
- [x] 站长可从编辑名录点开已有条目，compose 填入原文；撰写下拉菜单是纸面不是卡片
- [x] 本地测试用的站长 bypass 已恢复；未登录写接口 401

---

## 147 · 2026-09-16 阅读与列表交互细节

**状态**：已完成（2026-09-18） · 摘要见 [CHANGELOG · 2026-09-18](docs/CHANGELOG.md#2026-09-18)

**方向**：博客 / 项目列表筛选写入 URL；从列表进详情再返回尽量恢复滚动；长文阅读侧栏旁补 TOC / 上下篇（轻量，不重做详情皮）。

**背景 / 现状**：`tagFilter` / `keyword` 多在组件本地状态；刷新或分享链接会丢筛选；详情已有侧栏进度与代码复制。

**做完有什么用**：筛选结果可分享、可刷新不丢；返回列表不「跳回顶」；长文跳章节更快，SEO / 站内停留更自然。

**P0 — 列表 URL**

- [x] 147-1 博客：`?tag=` / `?q=`（或现有命名）与筛选双向同步；前进后退跟着历史走
- [x] 147-2 项目列表同理（标签等）；空参不污染 URL

**P1 — 滚动与阅读**

- [x] 147-3 列表→详情→返回：恢复列表滚动位置（`sessionStorage` 或 router state；注意 slug 切换勿串位）
- [x] 147-4 文章详情：文内 TOC（从 h2/h3 生成）挂侧栏或折叠；无标题则不渲染
- [x] 147-5 上一篇 / 下一篇或「相关」轻量入口（同标签或按时间邻接即可）

**⚠️ 回归 / 风险**

- URL 同步勿与手机壳层 / editorial filter 动画抢焦点；改 query 不应整页闪白

**涉及文件**

`BlogView.vue`、`ProjectsView.vue`、`useListQuerySync.ts`、`useListScrollRestore.ts`、`AppShell.vue`、`PostDetailView.vue`、`PostTocNav.vue`、`useDetailScrollSidebar.ts`、router、i18n

**验收**

- [x] 复制带筛选项的 `/blog?...` 在新标签打开结果一致
- [x] 返回列表滚动大致回到离开位置
- [x] 长文 TOC 可点跳；无 h2 时不露空壳

---

## 146 · 2026-09-16 错误态与空态统一

**状态**：已完成（2026-09-16） · 摘要见 [CHANGELOG · 2026-09-16](docs/CHANGELOG.md#2026-09-16)

**方向**：列表 / 详情 / 栖息等页的加载失败与空结果，统一成 editorial 空态组件 + 可重试；去掉面向开发者的「请确认后端已启动」类文案对访客露出。

**做完有什么用**：访客遇断网 / 空库时仍读得懂、能重试；站长自测与截图口径一致；后续 CI / E2E 有稳定选择器可挂。

**P0 — 组件与文案**

- [x] 146-1 `PageStatusBlock` + `page-status.css` + `common.status.*` i18n（中英）
- [x] 146-2 博客 / 项目 / 碎念 / 推荐 / 友链 / 留言：error 可重试；loading 用骨架或 `kind=loading`
- [x] 146-3 文章 / 项目详情 / 笔记：`loadError` 与 notFound 走同一组件

**P1 — 边界**

- [x] 146-4 博客 / 项目 / 碎念 / 推荐：库空 vs 筛选无匹配分文案
- [x] 146-5 compose / 友链审核：`ownerFacingMessage` 截断堆栈；公网页不抛 raw Error

**涉及文件**

`PageStatusBlock.vue`、`page-status.css`、`publicErrorMessage.ts`、各列表/详情 View、`i18n`、`DESIGN.md` §4

**验收**

- [x] 断后端文案无「请启动后端」；错误态可点重试
- [x] 空列表 / 筛选无结果文案分开

---

## 145 · 2026-09-16 月相拖尾 · Welkin Moon 图标 / 可点不待机 / 藏系统指针

**状态**：已完成（2026-09-16；本地目视：顶栏 / 溢出菜单图标、可点悬停不切摇篮、启用后按钮上 `cursor: none`） · 摘要见 [CHANGELOG · 2026-09-16](docs/CHANGELOG.md#2026-09-16)

**方向**：顶栏拖尾开关换成 Welkin Moon；导航小尺寸加粗原造型描边；停在可点击控件上不进静憩（月灵推摇篮）；启用后盖掉各处 `cursor: pointer`，避免悬停露出系统箭头。不改造型为几何圈、不改祈愿 / 拖尾月相语义。

**背景 / 现状**：源 SVG `E:/Project/sandoren/Welkin Moon.svg`；原 `html.moonlit-cursor-on { cursor: none }` 被子节点 `cursor: pointer` 盖掉；`isPointerResting` 只看停驻 ≥2s，可点区也会进待机。

**P0 — 顶栏图标**

- [x] 145-1 `TrailNavIcon` 同步 Welkin Moon 三层路径（`right` / `left` / `center`）；`currentColor`；去掉源文件组透明度
- [x] 145-2 导航小尺寸：保留原路径，视口描边加粗 + 收紧 `viewBox`；勿改成 24 视口几何同心圆

**P0 — 可点区不进待机**

- [x] 145-3 `isPointerResting`：可点击命中（按钮 / 链接 / role / `.card-hover-g` / 项目卡等）或输入区时不进静憩；停在可点上保持哥伦比娅指针 + 悬停月相
- [x] 145-4 静止时仍周期性 `detectHover`，避免停在按钮上 hover 态掉光后误进待机

**P0 — 藏系统指针**

- [x] 145-5 `cursor-trail.css`：`html.moonlit-cursor-on, html.moonlit-cursor-on * { cursor: none !important }`；输入态仍恢复 `auto` / `text`
- [x] 145-6 `isInputTarget` 只认 `input` / `textarea` / `select` / `contenteditable`（启用后不能再靠 computed `cursor` 判断）

**P1 — 契约**

- [x] 145-7 `DESIGN.md` §11：可点不静憩、启用时全节点藏系统指针

**⚠️ 回归 / 风险**

- 可点选择器过宽会让正文几乎永不待机；过窄则按钮仍会进摇篮 —— 以 `CLICKABLE_SELECTOR` + 项目卡为准
- `cursor: none !important` 只挂在 `moonlit-cursor-on`；关闭拖尾后按钮指针应恢复
- 输入框 / 可编辑区须仍能见系统 I 形 / 箭头

**涉及文件**

`TrailNavIcon.vue`、`moonlitCursorEngine.ts`、`cursor-trail.css`、`DESIGN.md` §11

**验收**

- [x] 顶栏 / 溢出菜单月相图标可辨，线重接近其它工具图标
- [x] 悬停按钮 / 链接 ≥2s：不切 sleep + Kuuhenki；离开可点区再停 ≥2s 仍进静憩
- [x] 启用拖尾后悬停按钮：computed `cursor` 为 `none`，系统箭头不露；输入框仍恢复系统光标
- [x] `DESIGN.md` §11 已同步

---

## 144 · 2026-09-15 首页 COVER STORY · 整卡合入纸面 + 通栏顶 ink

**状态**：已完成（2026-09-15；本地目视：首屏 peek、滚动展开、方案 G 悬停、离页回首页单根正常） · 摘要见 [CHANGELOG · 2026-09-15](docs/CHANGELOG.md#2026-09-15) · 合入 [2026-09-16](docs/CHANGELOG.md#2026-09-16)（PR #46）

**方向**：把拆开的 peek + detail 合成滚动纸面上的一张 COVER STORY 卡；下读提示走 editorial 方案 A。再按方案 1 在纸面顶加通栏 2px ink，把 `SCROLL · 下读` 挪到线下方、卡外，与卡留缝，封住卡顶弧 ink 左右缺口。不改 sticky 首屏 / 方案 G / 单根 `HomeView`。

**背景 / 现状**：原先 `.home-peek-wrap` sticky 刊头与 `.cover-story-detail` 两块，悬停靠 `:has()` 同步；卡顶弧 ink 只跟卡宽，纸面顶左右无墨线。原型：`designed/home-cover-scroll-cue/`（A/B/C，选定 A）。

**P0 — 整卡合入**

- [x] 144-1 去掉 `.home-peek-wrap` / `.cover-story-detail`；一张 `.cover-story.card-hover-g` 坐在 `.home-scroll-layer-paper`
- [x] 144-2 删 `:has()` peek/detail 同步与 mouseenter 转发；方案 G 挂在整张卡上；悬停保留顶/底 2px ink
- [x] 144-3 `page-enter-home.css` 入场目标改为 `.cover-story`；`HomeView` 仍单根

**P0 — 下读提示（方案 A）**

- [x] 144-4 合入 `SCROLL · 下读` + 极细 ∨（muted、不加粗、不用 accent）；i18n `home.scrollCueEn` / `scrollCueZh`

**P0 — 纸面顶通栏 ink（方案 1）**

- [x] 144-5 `.cover-paper-rule`：纸面顶铺满 2px `--cover-ink`；`.cover-paper-peek` = 通栏线 + cue；与卡留 `0.7rem` 缝
- [x] 144-6 cue 出卡；卡内只留 kicker + 正文；去掉卡内 hairline
- [x] 144-7 `--cover-peek-height` / `--cover-lift`：从纸面顶量到卡内 kicker 底（`peekRef` + `peekHeadRef`）；不量整张卡

**P1 — 契约**

- [x] 144-8 `DESIGN.md` §12 / §9 hover：结构、通栏顶缝、peek 测量、勿用通栏线横切卡上圆角

**⚠️ 回归 / 风险**

- peek 高度勿量整张卡，否则线稿 / 欢迎卡 `bottom` 被整卡顶死
- 通栏顶 ink 与卡顶弧 ink 分工：前者封纸面缝，后者随 R 角；悬停只抬卡，通栏线不动
- 勿再拆 peek/detail 或恢复 sticky 刊头

**涉及文件**

`HomeView.vue`、`page-home-hero.css`、`page-enter-home.css`、`useHomeHeroRelayout.ts`、`zh.json` / `en.json`、`DESIGN.md` §12、`designed/home-cover-scroll-cue/`

**验收**

- [x] 首屏底：通栏 ink + `SCROLL · 下读` + 缝 + 卡顶 kicker；左右无纸面缺口
- [x] 下滚展开标题 / 摘要 / 元数据；卡顶弧 ink、卡底 inset ink、`.cover-story-foot-ink` 仍在
- [x] 悬停方案 G（上浮 / 折角 / 花藤 / 标题 / kicker）；sticky 首屏与单根离页回首页正常
- [x] `DESIGN.md` §12 已同步

---

## 143 · 2026-09-15 外链新标签确认 · footer 统一路径

**状态**：已完成（2026-09-15；跟进：弃用手写注入页，改开同一套 `/leave/redirect?tab=1` 刊头） · 摘要见 [CHANGELOG · 2026-09-15](docs/CHANGELOG.md#2026-09-15) · 合入 [2026-09-16](docs/CHANGELOG.md#2026-09-16)（PR #47）

**方向**：外链改为新标签打开出站确认，**布局与原先 `/leave/redirect` 一级刊头一致**；footer 与其它外链同一路径。弹窗被拦回退当前标签过渡页。不改站内路由语义、不加埋点。

**背景 / 现状**：曾用 `document.write` 另造简易确认 HTML，与站内 `.ed-filter` / `EdKicker` / 字体 / 壳层不一致；且 Chromium 对 `open(url,'_blank')` 常返回 `null`，会误开第二份确认。

**P0 — 打开与确认页**

- [x] 143-1 `isExternalHttpUrl`：非本站 http(s) 判定
- [x] 143-2 `openExternalLeaveConfirm`：同步 `about:blank` → `location.replace` 到 `/leave/redirect?tab=1`（同一套 `SiteLeaveRedirectView`）；删除手写 `buildExternalLeaveConfirmHtml`
- [x] 143-3 `tab=1`：取消「取消并关闭」；`close` 失败展示 `leave.tabCloseFailed`，隐藏操作、不跳转
- [x] 143-3b 修复 Chromium `open(url,'_blank')` 返回 null 误判 → 当前页再 `router.push` 叠双确认

**P0 — 挂点**

- [x] 143-4 `installExternalLeaveClickGuard` 捕获阶段拦截；模块自挂 + HMR 可重装；`main.ts` 亦装
- [x] 143-5 `startExternalLeave` 优先新标签，失败再当前页 `router.push`（无 `tab`）
- [x] 143-6 Footer 外链 / ICP 去掉 `target="_blank"`；友链 / 推荐 / 项目 GitHub / Demo / 留言头像链同路径

**P1 — 文案与契约**

- [x] 143-7 i18n `leave.tabHint` / `tabCancel` / `tabCloseFailed`
- [x] 143-8 `DESIGN.md` §9 出站确认契约更新（同页布局 + `tab=1` 关页）

**涉及文件**

`leave/openExternalLeaveConfirm.ts`、`leave/installExternalLeaveClickGuard.ts`、`SiteLeaveRedirectView.vue`、`page-leave-redirect.css`、`siteLeaveRedirect.ts`、`useSiteLeaveRedirect.ts`、`main.ts`、`FooterExternalLinks.vue`、`FooterGrunRayMetaBar.vue`、`FriendsView.vue`、`RecommendView.vue`、`ProjectDetailView.vue`、`DemoBlock.vue`、`MessagesView.vue`、`zh.json` / `en.json`、`DESIGN.md`

**验收**

- [x] 新标签 `/leave/redirect?tab=1` 刊头与旧出站页一致（H1、LEAVE · 出站、ink 顶线、域名放大、下划线操作）
- [x] `tab=1` 取消文案为「取消并关闭」；非 tab 仍「取消，返回」
- [x] Footer / ICP 无 `target="_blank"`；友链点击不直开目标
- [x] 站内 `/legal`、申请友链等相对链不误拦
- [ ] 真机 Chrome/Edge：新标签确认 → 继续打开目标；取消关页；close 失败见提示；不出现双确认页
- [x] `DESIGN.md` §9 / i18n 已同步

---

## 142 · 2026-09-14 首页线稿扇形叠层 · ThemeDayNightToggle 警告

**状态**：已完成（2026-09-14；关照片背景三主题目视：扇形外填充 / 扇形内线稿换墨 / 10% 扇形底；控制台无 Extraneous class 警告） · 摘要见 [CHANGELOG · 2026-09-14](docs/CHANGELOG.md#2026-09-14)

**方向**：关照片背景时右侧舞台用**两套同构图图**叠层——扇形外旧填充、扇形内当前线稿换墨 + 10% 扇形底；几何写死在 composable。顺手修掉 `ThemeDayNightToggle` 因 fragment 根无法继承 `class` 的 Vue 警告。项目笔记入库说明。大 SVG 不进生产热路径。

**背景 / 现状**：原先单张线稿 WebP；扇形内外要不同画法必须叠两层。原型 `designed/home-hero-wedge/`（evenodd 挖洞 + CSS `--wedge` 改 stroke）；生产等价为底图不裁 + 顶图 `clip-path`。契约见 `DESIGN.md` §12。

**P0 — 扇形叠层合入**

- [x] 142-1 底图恢复改线稿前填充 WebP（`polonia_sandoren.webp` / `-dark` / `-abstract`）；扇形内烤线稿换墨 WebP（`-wedge.webp` 等三主题）
- [x] 142-2 `homeStageArtWedge.ts`：顶点 `(1270.93, 0)`、夹角 `39°`、中轴 `-45°`；墨色 light `#38697a` / dark `#abde6b` / abstract `#f4f1e8`；`homeStageArtWedgeClipPath()` 输出百分比 polygon
- [x] 142-3 `HomeView`：`.home-stage-art-stack` = base img + tint img（同 clip）+ wash div（同 clip、`opacity: 0.1`）；无虚线射线
- [x] 142-4 宽屏贴右 / 窄屏 cover 锚点契约不动；`DESIGN.md` §12 同步扇形内外与 WebP 热路径

**P0 — Vue 警告**

- [x] 142-5 `ThemeDayNightToggle`：`inheritAttrs: false` + 按钮 `v-bind="$attrs"`，消除 fragment/Teleport 根导致的 Extraneous `class` 警告；紧凑导航 `.header-theme-toggle` 仍生效

**P1 — 文档**

- [x] 142-6 项目笔记 `backend/import/markdown/project/grunray-wiki/grunray-wiki-note-home-stage-art-wedge.md`（两套图、clip 几何、原型 vs 生产）

**⚠️ 回归 / 风险**

- 扇形内描边勿烤成纸面墨 `--ink`，否则与填充外沿撞色，扇形边界「消失」
- 勿把 `designed/` 大 SVG 拷回 `frontend/public/art/`；热路径只 WebP
- 改夹角/顶点先在原型调，再抄进 `HOME_STAGE_ART_WEDGE`

**涉及文件**

`HomeView.vue`、`homeStageArtWedge.ts`、`page-home-hero.css`、`ThemeDayNightToggle.vue`、`frontend/public/art/polonia_sandoren*.webp`、`designed/home-hero-wedge/`、`designed/home-hero-relayout/polonia_sandoren_line.svg`、`DESIGN.md` §12、`grunray-wiki-note-home-stage-art-wedge.md`

**验收**

- [x] 关照片背景：浅/深/abstract 扇形外填充、扇形内线稿墨色、10% 扇形底可见；开照片背景舞台艺术不挂载
- [x] 宽屏贴右、≤640px 正脸锚点
- [x] 控制台无 `ThemeDayNightToggle` Extraneous class 警告；主题切换与紧凑态 padding 正常

---

## 141 · 2026-09-11 手机壳层 · 顶栏汉堡 / Read sheet / ICP-only footer

**状态**：已完成（2026-09-11；390 窄屏目视：首页 / 博客 / 项目 / 碎念 sheet / 推荐 / 关于 / 留言 / 友链 / 详情 / 404） · 摘要见 [CHANGELOG · 2026-09-11](docs/CHANGELOG.md#2026-09-11) · 合入 [2026-09-16](docs/CHANGELOG.md#2026-09-16)（PR #45）

**方向**：`max-width: 768px` 统一手机壳层：顶栏只留品牌 + 主题 / 语言 / 汉堡；禁滚动胶囊；强制关右侧工具；Footer 仅 ICP 胶囊；碎念/推荐详情改底部不透明 Read sheet；首页藏刊号与头像。跟进一轮短页 ICP、关闭提示文案与触控热区。

**背景 / 现状**：桌面顶栏横排目录 + 工具胶囊在窄屏挤占；碎念/推荐桌面右栏分栏在手机不可用；GrunRay 扭曲字占位过高。契约见 `DESIGN.md` §8。

**P0 — 壳层入口与顶栏**

- [x] 141-1 `useMobileShell`：`MOBILE_SHELL_MQ = (max-width: 768px)`、`html[data-mobile-shell]`、provide/inject、抽屉与 sheet 共用滚动锁
- [x] 141-2 手机强制关照片背景 / 拖尾 / FPS、音乐最小化；回桌面恢复快照
- [x] 141-3 顶栏：品牌左，右胶囊 = 主题 | 语言 | 汉堡（≥44px）；禁 `navCompact` / 胶囊 `::before` inset
- [x] 141-4 汉堡抽屉 Teleport 到 body，纸面侧栏；`SiteNav variant="drawer"` 纵向目录

**P0 — 碎念 / 推荐 / 首页 / Footer**

- [x] 141-5 `XiqiSplitLayout`：手机 editorial 时底部不透明 Read sheet（`Teleport` body，约 `min(75dvh, 100dvh - 4.5rem)`）；开合动画；`data-xiqi-sheet` 藏回顶
- [x] 141-6 首页：`v-if` + CSS 兜底藏 `.home-mast`；Splash 跳过头像飞入
- [x] 141-7 Footer：手机不渲染 GrunRay 扭曲字；`META_ONLY` 垫高 110px；短页也露出 ICP 胶囊

**P1 — 跟进打磨（同批收口）**

- [x] 141-8 碎念/推荐打开详情：手机文案改为「点空白处关闭」（桌面仍 Esc / 右上角）
- [x] 141-9 短页 ICP：`hasRevealRoom` 改为相对垫高本身判断，避免 110px padding 误判「还能滚」；404 等短页首屏即显胶囊
- [x] 141-10 回顶钮：手机 `z-index` 高于 ICP 胶囊，避免被盖住点不到
- [x] 141-11 博客/项目 `.ed-filter` 换行断点 640 → 768，与壳层对齐
- [x] 141-12 名录 `.ed-cat`：透明 `::before` 扩大点按热区，不撑高筛选行

**⚠️ 回归 / 风险**

- IDE 内嵌浏览器截图常只画左列，fixed 层可能偏右；真机 / 实际 768 视口为准
- 抽屉故意留左侧缝（`100vw - 2.25rem`），非 bug
- 留言登录链、目录「全部 →」仍是刊头文字链，未改成大按钮（保纸面语言）

**涉及文件**

`useMobileShell.ts`、`AppShell.vue`、`SiteNav.vue`、`SiteNavGroup.vue`、`XiqiSplitLayout.vue`、`HomeView.vue`、`FragmentsView.vue`、`RecommendView.vue`、`FooterGrunRayPanel.vue`、`useFooterGrunRayReveal.ts`、`BackToTop.vue`、`SplashWoniuOverlay.vue`、`main.css`、`page-ed-ledger.css`、`footer-grunray.css`、`page-list-masthead.css`、`zh.json` / `en.json`、`DESIGN.md` §8

**验收**

- [x] 390×844：顶栏汉堡布局；音乐壳隐藏；碎念点开 sheet 不透明上滑；关闭后 DOM 卸掉
- [x] 短页（404）首屏可见 ICP 胶囊；滚到底回顶可点
- [x] `DESIGN.md` §8 已记手机壳层契约

---

## 140 · 2026-09-08 首页窄屏线稿锚点 · 欢迎卡恢复纸面

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：窄屏线稿不贴右；欢迎卡关照片背景时恢复 `.card` 纸面，避免线稿压字。宽屏贴右契约不动。

**P0**

- [x] 140-1 ≤640px：`.home-stage-art` 铺满、`cover`、`object-position: 72% 38%`
- [x] 140-2 去掉关背景卡面全透明；线稿态欢迎卡用不透明 `--color-bg-surface`（关 blur），开照片仍默认玻璃
- [x] 140-3 `DESIGN.md` §12 同步

**涉及文件**

`page-home-hero.css`、`DESIGN.md` §12

---

## 139 · 2026-09-08 首页 NOW · 在写 / 在读文案

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：只改 i18n。NOW 右侧两句仍走 `t('home.nowDoing')` / `t('home.nowReading')`，不接接口。

**P0**

- [x] 139-1 中文改为「在调整站点界面布局」「已退坑空月之歌」
- [x] 139-2 英文改为 `Adjusting the site layout` / `Dropped Song of the Welkin Moon`

**涉及文件**

`zh.json`、`en.json`

---

## 138 · 2026-09-08 首页 COVER STORY · 纸色 / 2px ink

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：卡面与滚动纸面同色。顶底走弧 ink 加粗到目录顶线（NOW 下方那根 2px）；卡下再加一根同样粗的直 ink。方案 G 悬停不动。

**背景 / 现状**：NOW 自身 `border-bottom` 是 1px `--color-border`；视觉上更粗的 ink 是 `.home-toc` 顶线 `2px` + `--color-text` 82%。

**P0**

- [x] 138-1 `--cover-story-bg` 改回 `--color-bg-base`（`#F4F1E8`）
- [x] 138-2 peek 顶 / detail 底 ink 改为 2px（`--cover-ink`），悬停保留
- [x] 138-3 卡下加 `.cover-story-foot-ink`，与 `.home-toc` 顶线同粗同色
- [x] 138-4 `DESIGN.md` §12 同步

**涉及文件**

`page-home-hero.css`、`HomeView.vue`、`DESIGN.md` §12

---

## 137 · 2026-09-08 首页 COVER STORY · R 角 + 走弧 ink

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：整卡改成 `--radius-md` 圆角矩形（peek 上圆 / detail 下圆）。顶底 ink 随圆角走弧。欢迎层通栏底 ink 拿掉，避免横切上圆角。

**P0**

- [x] 137-1 peek `border-radius` 上两角 + 外侧 `box-shadow` 顶 ink
- [x] 137-2 detail 下两角 + `inset` 底 ink（`overflow: hidden` 会裁外侧影）
- [x] 137-3 `.home-stage::after` 通栏底线停用
- [x] 137-4 悬停 elevation 不冲掉顶底 ink；`DESIGN.md` §12 同步

**涉及文件**

`page-home-hero.css`、`DESIGN.md` §12

---

## 136 · 2026-09-08 首页 COVER STORY · Editorial 刊头皮

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：只改 peek + detail 卡面。标题 / 摘要 / 标签 / 阅读链排布不动；方案 G 悬停不动。

**P0**

- [x] 136-1 去掉玻璃 `.card`、左侧 accent 脊、圆角、上浮阴影
- [x] 136-2 peek 顶 ink + detail 底 hairline；纸底 `--color-bg-base`；kicker 改 editorial 字色
- [x] 136-3 浏览器验收：静止刊头皮 + 悬停翻角/花藤/错位仍在

**涉及文件**

`page-home-hero.css`、`HomeView.vue`、`DESIGN.md` §12

---

## 135 · 2026-09-08 首页欢迎卡 · 关背景透明 / 开背景先铺再滑

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：四张欢迎卡跟 `html[data-photo-bg]`。纯 CSS 两段 delay，不在 `.home-layout` 绑 Vue class。

**P0**

- [x] 135-1 关照片背景：刊号 / 头像 / 问候 / 介绍卡面全透明（含关掉 `backdrop-filter`）
- [x] 135-2 开：先铺卡面再滑到右下；关：先滑回再褪透明
- [x] 135-3 `prefers-reduced-motion` 直接到位；`DESIGN.md` §12 补契约

**涉及文件**

`page-home-hero.css`、`DESIGN.md` §12

---

## 134 · 2026-09-08 首页欢迎层 · ink 线 / 左移 / 刊号放大

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：只动 `.home-stage` 欢迎层。通透背景、单根 Transition、`data-photo-bg` 位移契约不动。卡片透明再位移的想法只讨论、不落地。

**P0**

- [x] 134-1 `.home-stage` 顶底 ink 线（`--color-text`）；底线贴 peek 上缘
- [x] 134-2 关照片背景时问候/介绍再向左收；开背景仍走现有右下位移
- [x] 134-3 刊号字号与头像略放大
- [x] 134-4 浏览器验收：浅色下关/开照片背景；问候左移与右滑均到位

**涉及文件**

`page-home-hero.css`、`HomeView.vue`、`DESIGN.md` §12

---

## 133 · 2026-09-08 导航按钮 · Editorial 方案 D

**状态**：已完成（2026-09-08） · 摘要见 [CHANGELOG · 2026-09-08](docs/CHANGELOG.md#2026-09-08)

**方向**：顶部导航按钮改成 editorial 目录项（方案 D）。不推倒收缩式导航；`data-nav-compact` 契约不动。二级菜单说明用现有 `nav.*Desc` 原句，不沿用叶子小图标。

**背景 / 现状**：生产仍是绿填充药丸 + 圆形开关键。原型 `designed/nav-editorial-options/`，选定 **D 上下发丝**。

**依赖 / 冲突**：不要改 404、首页封面（§12）、碎念撰写页药丸 `AppSelect`。不要给 editorial 列表加 `xiqi-page--split`。

**P0 — 合入 Vue（先做）**

- [x] 133-1 左侧按钮组：去掉药丸填充；弱图标 + 轻 `+`；hover/active 细绿下划线；胶囊上下发丝（`--color-border`，两端带弧）
- [x] 133-2 二级菜单：R 角纸面卡；左栏 kicker、衬线标题、**原 i18n 说明**；无叶子图标；顶底发丝略宽于项间直 hairline；hover 对齐笔记 `.toc-row`
- [x] 133-3 右侧工具组：同样发丝胶囊；悬停下划线（不再铺底）；溢出面板纸面卡 + hairline
- [x] 133-4 浏览器验收：浅/深/抽象、展开横条/收缩胶囊、三组下拉、工具开/关、窄屏

**P1 — 契约**

- [x] 133-5 `DESIGN.md` §4 / §9 导航 hover 语言改成下划线 + 发丝，不再写生长线药丸
- [x] 133-6 二级菜单 kicker 进 i18n（INDEX / NOTES / INBOX 等），说明句不改

**方案对照**

| 代号 | 名称 | 说明 |
| --- | --- | --- |
| 现状 | 药丸 | 对照用，不合入 |
| A | 目录项 | 去按钮感 + 下划线 |
| B | 斜杠分节 | 项间 `/` |
| C | 顶部目录 | 拆掉左右内胶囊 |
| **D** | **上下发丝** | **选定。A + 发丝包线 + 纸面下拉** |

**涉及文件**

`SiteNav.vue`、`SiteNavGroup.vue`、`nav-toolbar.css`、`AppShell.vue`（溢出面板皮）、`DESIGN.md`、`zh.json` / `en.json`、`designed/nav-editorial-options/`

**验收**

- [x] 本地目视（三主题 + 移动端）
- [x] 二级菜单说明与改前 `nav.projectsDesc` 等一致
- [x] DESIGN.md / i18n 已同步

---

## 132 · 2026-09-07 剩余页 · Editorial 刊头

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：扫公开路由，把还没 editorial 的页收进同一批。404 不动。撰写页药丸按 DESIGN 保留。首页封面（§12）不改成列表刊头。

**背景 / 盘点**

已 editorial、本批不回滚：关于、出站、OAuth、友链/申请/审核、留言、碎念/推荐、博客/项目 Timeline、详情 `.ed-mast`。

| 页面 | 盘点 | 本批 |
| --- | --- | --- |
| `/legal` `LegalView.vue` | 玻璃卡 + 药丸「返回首页」+ `mailto:` | 做 |
| `/projects/:slug/notes` `ProjectNotesView.vue` | 薄页：返回 + H1 + `PostCard` | 轻改刊头 |
| `/fragments/compose` | 玻璃头 + 药丸 `AppSelect` | **不改**（撰写页保持药丸） |
| 404 `NotFoundView.vue` | — | **不改** |
| 首页 `HomeView.vue` | 封面契约 §12 | **不改** |
| `NavPlaceholderView.vue` | 路由未挂 | 不用 |

**定稿**

- **法律声明**：一级刊头，H1「法律声明」，无玻璃卡、无药丸。`.ed-filter`：`LEGAL · 声明` + intro；返回下划线 `.ed-action`（`← 首页`）。四节 kicker（Notice · 免责 / Rights · 版权 / Privacy · 隐私 / Credits · 致谢）+ 正文；节间浅灰 hairline（`--color-border`），不是 ink。邮箱点击复制，不要 `mailto:`；刊头版权节旁斜体「点击复制邮箱」。阅读栏约 `42rem`，不要拉成 `68rem`。入场仍走 `page-enter-legal.css`（H1 + filter + 四节）。
- **项目笔记**：次级页，`← 项目名` + H1「笔记」+ `NOTES · 笔记`。列表仍是 `.toc-row`（`PostCard`），不改数据层。

**P0**

- [x] 132-1 `/legal`：H1 + LEGAL · 声明 + 节间浅灰 hairline + `.ed-action`；邮箱点击复制，不要 `mailto:`
- [x] 132-2 `/projects/:slug/notes`：次级页刊头 NOTES · 笔记；列表仍走 `PostCard`
- [x] 132-3 `DESIGN.md` §5 / §9 补法律声明、项目笔记与「不改 editorial」口径

**涉及文件**

`LegalView.vue`、`page-legal.css`、`ProjectNotesView.vue`、`zh.json` / `en.json`（`legal.kicker*`、`projects.kickerNotes*`）、`DESIGN.md`

---

## 131 · 2026-09-07 OAuth 过渡 · Editorial 刊头

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：`/auth/redirect` 对齐出站确认：居中刊头、无卡片 / 药丸。不改授权跳转逻辑。

**P0**

- [x] 131-1 H1 + AUTH · 授权；GitHub / Google 单独放大；下划线 `.ed-action`；列宽与竖直居中同 `/leave/redirect`

---

## 130 · 2026-09-07 出站确认 · Editorial 刊头

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：`/leave/redirect` 去掉卡片 / 药丸，改成一级刊头。不改 OAuth `/auth/redirect`。

**P0**

- [x] 130-1 H1 + `.ed-filter`（LEAVE · 出站）+ 下划线 `.ed-action`；列宽同项目/博客；OAuth 过渡卡不动

---

## 129 · 2026-09-07 关于页 · Editorial 简历排版

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：把 `/about` 从 Hero + 玻璃卡改成 editorial 简历。**选定 B · 双栏履历**。不改撰写页药丸、碎念/推荐、友链名录、博客/项目 Timeline、详情 `.ed-mast`。

**背景 / 现状**

- 生产：`XiqiPageHero` + 玻璃简介卡 + 药丸奖项 + 事实网格 + 项目药丸按钮。隐私字段走 `AboutPrivateText` 把 Raw 模糊进 DOM。
- 原型：`designed/about-resume-options/`（http://127.0.0.1:8771/）。灵感：工作提示词「关于做成简历」。
- CSS blur 挡不住查看源代码。公开 API / 前端包 **不要**下发 Raw。

**选定 B 定稿**

- **刊头**：H1「关于」，无返回链、无 `XiqiPageHero`。`.ed-filter`：`PROFILE · 履历` + intro +「部分信息已做隐私处理。完整简历请来信：」+ 邮箱。邮箱**点击复制**，不要 `mailto:`。刊头邮箱旁斜体「点击复制邮箱」，成功短暂「已复制」。
- **左栏**：头像、`GrunRay`、性别年龄、邮箱（同样复制，**不要**斜体说明）。Awards 只给**词**上色，不要胶囊（铜 `award-line--bronze` / 银 `--silver` / 金档已备）。Papers 证书列表。不要左栏隐私句。粘滞对齐首页 `.toc-side`：`align-self: start; position: sticky; top: 5.5rem; overflow-anchor: none;`。grid 父级不要把 aside 拉满高。
- **右栏**：Education / Work / Community / Projects。左日期 mono、右职务衬线。节间浅灰 hairline（`--color-border`），不是 ink。项目 `.ed-action`「前往项目页」→ `/projects`，不要药丸按钮。
- **隐私**：公开 `GET /api/xiqi/about` 与前端 DOM / fallback **不要**写 `schoolRaw` / `rankRaw` / `companyRaw` / `summaryRaw` / `nameRaw`。只渲染公开文案 +「已隐藏」标签 + 空遮挡条。`AboutPrivateText` 本页停用，组件可留。`api_to_profile`（站长 import）仍可保留 Raw。

**P0 — 原型**

- [x] 129-1 `designed/about-resume-options/`：现状 / A 单栏 / B 双栏 / C 名录；浅/深；真实履历 mock

**P1 — 合入**

- [x] 129-2 合入 `AboutView` 方案 B（刊头复制邮箱、左栏无斜体、sticky 同 toc-side、右栏浅灰 hairline）
- [x] 129-3 公开 API / `aboutResume.ts` 不下发 Raw；去掉 Hero / 玻璃卡 / 奖项药丸 / `mailto:`
- [x] 129-4 DESIGN.md §5 / §9 改为方案 B；`XiqiPageHero` 可留着别删

**方案对照**

| 代号 | 名称 | 说明 |
| --- | --- | --- |
| 现状 | Hero + 玻璃卡 | 对照，不合入 |
| A | 单栏履历 | 刊头 + 时间一列 |
| **B** | **双栏履历** | **选定。左身份/竞赛/证书，右经历** |
| C | 名录履历 | 经历做成目录行 |

**涉及文件**

`designed/about-resume-options/`、`AboutView.vue`、`page-about-resume.css`、`aboutResume.ts`、`about_serialize.py`、`fragments_api.py`、`DESIGN.md`、i18n

**⚠️ 回归 / 风险**

- 现象：sticky 失效、奖项又做成胶囊、节间 ink 线、源码/Network 泄漏学校或公司全称、撰写下拉被改
- 验收：`/about` 无 Hero/玻璃/药丸；刊头复制有斜体、左栏邮箱无斜体；滚右栏左栏钉住；铜/银色词；节间浅灰线；项目下划线进 `/projects`；页面源码与 `/api/xiqi/about` 无学校全称、排名、公司全称、实习/社团细节；浅/深；窄屏叠回；`/fragments` `/friends` 撰写下拉未改

---

## 128 · 2026-09-07 栖息 · 碎念 / 推荐共用 editorial 排版

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：把碎念 / 推荐接到同一套 editorial 语言上。抽共用 Vue 组件与日期格式，详情 Markdown 接博客同款代码复制。不为抽公共改撰写页药丸、关于 Hero、友链名录行、博客/项目 Timeline 卡、详情整页 `.ed-mast`、验证码。

**背景 / 现状**

- CSS 与分栏壳已在 126 / 127（`.ed-ledger-head` / `.ed-feed-row` / `.ed-cats` / `XiqiSplitLayout` editorial）。两页模板几乎复制，推荐加载误用 `fragments.loading`，详情未接 `useMarkdownCodeCopy`。

**P0**

- [x] 128-1 Ledger·名录：`EdLedgerHead` + `EdFeedRow`（有封面加高 / 无封面不留位）
- [x] 128-2 Read·详情壳：`EdReadArticle`（tone + 时间 + Markdown 槽）；栏头仍 `EdKicker` READ·详情
- [x] 128-3 详情 Markdown 接 `useMarkdownCodeCopy`；复制钮样式收到 `markdown-reading.css`；窄栏图/引用/代码间距
- [x] 128-4 筛选行：`EdSwitchFilter` + `EdCatGroup`（左分类/心情、右最新/最早）
- [x] 128-5 `.ed-tone` 小组件；hint / 计数 / 加载收到 `xiqi.*`
- [x] 128-6 推荐「访问链接」仍走 `startExternalLeave`，不要 `target=_blank`

**⚠️ 回归 / 风险**

- 现象：抽组件后筛选下划线不跟、有封面行塌掉、推荐出站变成新标签、撰写/About/友链/Timeline 被误改
- 验收：`/fragments` `/recommend` 筛选、有图/无图、无箭头、推荐无星、访问链接出站确认、详情代码块可复制；浅/深；`/about` Hero 与撰写页药丸未改

**涉及文件**

`frontend/src/components/editorial/*`、`FragmentsView.vue`、`RecommendView.vue`、`XiqiSplitLayout.vue`、`page-ed-ledger.css`、`markdown-reading.css`、`PostDetailView.vue`、`editorialDate.ts`、`zh.json` / `en.json`、`TODO.md`、`DESIGN.md`

---

## 127 · 2026-09-07 栖息分栏 · 双栏独立滚动与阅读态留白

**状态**：已完成（2026-09-07） · 摘要见 [CHANGELOG · 2026-09-07](docs/CHANGELOG.md#2026-09-07)

**方向**：碎念 / 推荐展开详情后，名录与详情各自滚动，刊头保持滚走后的位置；阅读态加宽并留出上下空隙。不锁 `html overflow`（会把 `scrollY` 钳成 0，H1/筛选钉回顶部）。不改撰写页、关于页、后端。

**背景 / 现状**

- 126 合入后详情跟文档一起滚，滚到文章末尾右侧详情会消失。
- 曾用 `xiqi-page--split` 锁视口：刊头不在左栏里，展开后 H1/筛选跳回顶，关掉闪一下。
- 纯 sticky（首页 ABOUT）不够：详情比视口高时不能自己滚，名录也会跟整页走。

**选定**

- 展开：`.habitat-split-docked` 贴在导航下，左 `.xiqi-split-main` / 右 `.xiqi-detail-body` 各自 `overflow-y: auto`。外层 `min-height` 撑住原文档高度。
- 刊头仍通栏在 masthead 槽；已滚走的部分用 `--habitat-mast-clip` 裁掉，左栏 `scrollTop` 只补「已被导航盖住」的那截。
- 导航下留约 20px，避免 `glass-nav-inner` 盖住 LEDGER；关掉时先还原 `scrollY` 再卸 dock，避免名录闪回顶。
- 展开时 `setXiqiSplitFooterLock(true, { keepRevealSpace: true })`：收页脚揭示、去掉 `data-footer-over-cover`，**不**清 `--footer-reveal-space`（否则短页 `scrollY` 被钳回 0）。`html[data-xiqi-split-open]:has(.xiqi-page--split)` 才把 cover `padding-bottom` 置 0。
- **阅读态 1+2**（2026-09-07）：关着仍 960px；展开 `max-width: min(72rem, 100%)`。底边 `--habitat-dock-bottom-gap: 1.25rem`，导航下空隙 20px。`--habitat-read` 仍 25rem，先不动。

**P0**

- [x] 127-1 editorial 展开改为 dock + 双栏独立滚动，不设 `xiqi-page--split`
- [x] 127-2 导航空隙 + 关闭滚动还原，避免刊头/名录被玻璃条盖住或闪现
- [x] 127-3 展开压页脚、保留揭示垫高
- [x] 127-4 阅读态加宽 72rem + 上下留白

**⚠️ 回归 / 风险**

- 现象：展开后整页一起滚 / 刊头钉回顶 / 页脚压在两栏上 / 导航盖住 LEDGER
- 验收：`/fragments` `/recommend` 浅色/深色；顶栏未滚、滚过刊头、滚到页脚后再展开；Esc/关闭后滚动位置稳定；`/about` Hero 与撰写页药丸下拉未改

**涉及文件**

`XiqiSplitLayout.vue`、`page-ed-ledger.css`、`page-xiqi.css`、`useXiqiSplitFooter.ts`、`useFooterGrunRayReveal.ts`

---

## 126 · 2026-09-06 栖息 · 碎念 / 推荐 Editorial 方案 B 合入

**状态**：已完成（2026-09-06） · 摘要见 [CHANGELOG · 2026-09-06](docs/CHANGELOG.md#2026-09-06)

**方向**：把 `designed/habitat-editorial/` **方案 B** 合入 `/fragments` 与 `/recommend`。刊头语言对齐 121 列表、123 留言、125 友链。现状 / A 不合入。分栏逻辑仍走现有 `XiqiSplitLayout`（footer 锁定、滚动还原、clip 揭开），不要在 `page-xiqi.css` 另写一套分栏。

**背景 / 现状**

- 合入前生产是 `XiqiPageHero` + 玻璃 intro + chip + `XiqiCard` 左色条。Hero 渐变标题不合 DESIGN §3。
- 推荐星级**只藏前端**（列表 / 筛选 / 详情不显示），后端与 API 字段不动。

**方案对照**


| 代号  | 名称      | 说明                  |
| --- | ------- | ------------------- |
| 现状  | 对照      | 大图 Hero + 玻璃卡，不合入   |
| A   | 已废弃     | 列表-only / 另开详情页，不采用 |
| B   | 刊头 + 分栏 | **已合入**             |


**选定视觉（方案 B）**

- 两页独立：碎念 H1「碎念」，推荐 H1「推荐」，无返回链。说明进 `.ed-filter`；心情/分类在左，最新/最早同行最右。
- 筛选钮滑动下划线对齐博客 Section·分类（`.ed-cats` / `.ed-cat-line`）。筛选行上方 ink 线**位置不变**，样式改为偏灰通栏（不做内收）；刊头顶黑 ink、底灰线保留。
- 名录是目录行，hover 同 `.toc-row`，**不套**方案 G。有封面行加高（图拉满行高），无封面收掉左侧占位。
- 心情/分类只给**词**上色（吐槽陶土、随笔苔绿、瞬间灰蓝、日常赭石；软件/开源/番剧同理）。不要胶囊徽章、不要每行左边色条。筛选与选中仍走 accent。
- 展开：列表与详情之间留缝；选中行右侧 2px 绿线，与详情折缝成对。**不要箭头**。关闭钮 `.ed-action.danger`（serif，危险色下划线）。名录 hint：关着「点一行看详情」，开着「Esc 或右上角关闭」。
- 合入样式：`page-ed-ledger.css` + 扩 `page-list-masthead.css` 的 `.ed-switch`。留言 Inbox 右侧工具接同一套滑动下划线可另开，不挡本批。

**P0**

- [x] 126-1 `designed/habitat-editorial/`：现状 / B，浅/深，访客/站长；碎念 / 推荐分页
- [x] 126-2 碎念与推荐各自独立界面：H1 + 刊头 + 分栏
- [x] 126-2b 筛选钮滑动下划线；刊头 ink 线偏灰通栏、位置在筛选行上方
- [x] 126-2c 名录 + 有/无封面；选中绿线成对、无箭头；关闭 `.ed-action.danger`；前端不显示推荐星星
- [x] 126-3 合入 `FragmentsView` / `RecommendView` / `page-ed-ledger.css` / `XiqiSplitLayout` editorial 态
- [x] 126-4 i18n + `DESIGN.md` + 入场动效 + 浏览器验收

**涉及文件**

`designed/habitat-editorial/`、`FragmentsView.vue`、`RecommendView.vue`、`XiqiSplitLayout.vue`、`page-ed-ledger.css`、`page-list-masthead.css`、`page-enter-xiqi.css`、`zh.json` / `en.json`、`DESIGN.md`

---

## 125 · 2026-09-06 友链页 · Editorial 方案 A 合入

**状态**：已完成（2026-09-06） · 摘要见 [CHANGELOG · 2026-09-06](docs/CHANGELOG.md#2026-09-06)

**方向**：把 `designed/friends-editorial/` **方案 A** 合入 `/friends`、`/friends/apply`、`/friends/admin`。刊头语言对齐 121 项目列表与 123 留言。B / C 已废弃，不合入。

**选定（2026-09-06）**：方案 A · 列表刊头。原型：`designed/friends-editorial/index.html`（现状对照 | A；列表 / 申请 / 审核；访客 / 站长）。

**背景 / 现状**

- 生产：居中渐变标题（`background-clip`，DESIGN §3 已禁）、欢迎纸卡、申请/审核入口卡、友链封面模糊网格；审核页同样渐变刊头 + 药丸 Tab + 玻璃卡。
- 原型 A 已迭代：名录行内收 + 每张顶 hairline（同 `/projects` Timeline）；Extra 两列；申请字段中文统一；简介走留言框；验证码走留言样式；填写区内收与 Facts 对齐；审核 Queue 内收与 Facts 对齐。

**依赖 / 冲突**

- 一级列表：H1「友链」，无返回链。申请 / 审核：`← 友链` + H1「申请」/「审核」。
- 往来说明进 `.ed-filter`（padding `0.72rem 1.5rem 0.82rem`）；申请 / 审核是下划线 `.ed-action`。
- 名录是目录行（头像 + 衬线名 + mono 域名），hover 同首页 `.toc-row`，**不套**方案 G；顶 hairline hover 保留。
- Extra · 特殊固定两列并排（窄屏叠回）。
- 验证码布局对齐留言（`.message-captcha-*` 视觉），仍走本页 `fetchFriendCaptcha`，**不抽**共享组件。
- **必须保留**站点图标预览：申请 `previewAvatar`、审核 `previewAvatarFor`、Facts 本站 logo 预览。
- 外链仍走 `startExternalLeave`；站内申请 / 审核入口不走过渡页。
- 入场仍走 `page-enter-friends.css`；改直接子节点时同步选择器。

**P0 — 列表** `/friends`

- [x] 125-1 去掉渐变标题 / 玻璃欢迎卡 / 申请入口卡 / 封面模糊网格；H1 对齐 `.h`
- [x] 125-2 Links · 往来：`.ed-filter` + 欢迎句 +「申请互换」；站长另加「审核申请」
- [x] 125-3 Directory · 名录：计数；每条透明底 + 顶 hairline + 左右内收；点击仍出站确认
- [x] 125-4 Extra · 特殊：两列；保留 `SpecialLinkAvatar`（开往 / 异次元图标）

**P0 — 申请** `/friends/apply`

- [x] 125-5 ← 友链 + H1「申请」；Facts · 本站进 `.ed-filter`；字段统一「站点名称 / 地址 / 图标 / 简介」；**保留 logo 预览 + 复制**
- [x] 125-6 Apply · 填写：内收与 Facts 同为 `1.5rem`（窄屏 `0.85rem`）；检索下划线输入；简介用留言框；验证码用留言样式并下移；提交旁提示斜体变浅；**保留 previewAvatar**

**P0 — 审核** `/friends/admin`

- [x] 125-7 ← 友链 + H1「审核」；访客门槛；站长 Review · 审核（文字 Tab）+ Queue · 队列（内收同 Facts）
- [x] 125-8 队列卡片：状态色、可编辑字段、简介框、**previewAvatarFor**、保存 / 通过 / 拒绝 / 隐藏 / 恢复；分组分隔保留

**P1 — 契约**

- [x] 125-9 i18n：kicker、统一字段名、申请/审核短标题
- [x] 125-10 DESIGN.md：友链一级刊头、名录行、申请/审核刊头、图标预览不得删

**⚠️ 回归 / 风险**

- 现象：合入时漏掉 `previewAvatar` / `previewAvatarFor` / Facts logo 预览
- 现象：友链点击改成 `target=_blank` 直开，绕过离开确认
- 验收：访客浅/深 `/friends` `/friends/apply`；未登录 `/friends/admin` 门槛；站长审核队列与图标预览；验证码可刷新

**涉及文件**

`designed/friends-editorial/`（对照）、`FriendsView.vue`、`FriendsApplyView.vue`、`FriendsAdminView.vue`、`page-friends.css`、`page-enter-friends.css`、`zh.json` / `en.json`、`DESIGN.md`

---

## 124 · 2026-09-06 开屏 · 跨标签 / OAuth 回跳不再重播

**状态**：已完成（2026-09-06） · 摘要见 [CHANGELOG · 2026-09-06](docs/CHANGELOG.md#2026-09-06)

**方向**：蜗牛开屏只在本机第一次访问播；新标签、留言登录整页回到 `/messages` 不再重播。顶栏 🐌 手动重播不动。

**背景 / 现状**

- `SplashWoniuOverlay` 用 `sessionStorage` 记「已看过」，每个标签一份；OAuth 离开 GitHub/Google 再整页回来时，若中途没 `dismiss`，也会再播。
- 开屏结束头像飞向首页 `[data-splash-avatar-target]`，落在 `/messages` 上本来就不对。

**P0**

- [x] 124-1 「已看过」改 `localStorage`（`grunray_splash_woniu_v1`）；旧 `sessionStorage` 有值则迁过去
- [x] 124-2 开始播就写入，不必等播完 / 跳过
- [x] 124-3 `?auth=success` / `auth_error` 回跳直接跳过并记已看过
- [x] 124-4 `designed/redesign-check` 截图脚本同步写 localStorage

**涉及文件**

`SplashWoniuOverlay.vue`、`designed/redesign-check/shoot.py`、`designed/redesign-check/check.py`

**验收**

- [x] 新标签打开站点不再自动开屏（本机已看过之后）
- [x] 留言 OAuth 回到 `/messages` 不播开屏
- [ ] 顶栏 🐌 仍能手动重播（需点一次确认）

---

## 123 · 2026-09-06 留言页 · 方案 D 刊头 + 楼中楼

**状态**：已完成（2026-09-06；访客浅/深/abstract 目视；友链申请验证码未改） · 摘要见 [CHANGELOG · 2026-09-06](docs/CHANGELOG.md#2026-09-06)

**方向**：把 `designed/messages-editorial/` 已选定的方案 D 合入 `/messages`。视觉跟 121 列表刊头同一套 kicker；回复从「每条只一条站长回复」改为楼中楼（`replies[]`）。验证码布局本批不动。

**背景 / 现状**

- 原型：`designed/messages-editorial/index.html`（现状 | A | B | C | D；访客 / 已登录 / 站长；浅/深）。**合入目标 = D**。
- 生产：居中渐变大标题（`background-clip`，DESIGN §3 已禁）、欢迎语玻璃卡、登录/撰写居中纸卡、留言左绿条卡片；回复入口 `v-if="isSiteOwner && !msg.reply"`，接口一次只挂一条 `is_owner=1` 回复，409「该留言已有站长回复」。
- `guest_message.parent_id` 已够用，**不必加列**。不要加 `UNIQUE(parent_id, guest_user_id)`（「每人每条一条」未要求）。

**依赖 / 冲突**

- Write 带复用 `.ed-filter` 的 inset（`0.72rem 1.5rem 0.82rem`），Inbox 行**不** inset。
- 一级页：H1「留言」，无返回链，无 `Messages·留言` kicker。
- 验证码仍走现有 `message_captcha` + `.message-captcha-*`；与友链申请共用布局另开批次，本批不抽。
- 入场仍走 `page-enter-message.css`；改直接子节点时同步选择器。

**P0 — 视觉（方案 D）**

- [x] 123-1 去掉渐变标题 / 玻璃欢迎卡 / 居中撰写纸卡；H1 对齐 `/blog` `/projects` 的 `.h`
- [x] 123-2 Write：`.ed-filter` + `Write · 写下`；访客欢迎句在带内；已登录头像+名字，**退出登录靠该行最右**
- [x] 123-3 Inbox：kicker + 计数/最新最早/公开·待审；列表去卡，头像+衬线名+ mono 元数据（`河灯 · GitHub · 09-05`）
- [x] 123-4 列表 hover 用目录行语言（elevated 52% 洗 + 名提 accent）；悬停楼中楼**不**给楼主行上色
- [x] 123-5 「回复」钉在该条右上角；楼中楼区右端内收，使楼主/楼中楼按钮错位；取消回复红色；站长「拉黑作者」琥珀黄、「删除」红

**P0 — 楼中楼（注释契约）**

- [x] 123-6 `list_published`：`parent_id IN (…)` 去掉 `AND is_owner=1`，按 `created_at` 取多行
- [x] 123-7 `POST /api/messages/<id>/reply`：已登录即可（非仅站长）；作者取当前用户；`is_owner` 按是否站长写，勿写死 `1`
- [x] 123-8 序列化 `reply` → `replies[]`；去掉 409
- [x] 123-9 前端：已登录可回；回楼主输入框空着；回楼中楼预填 `回复 {名字} · {身份}：`；超过 2 条默认折叠（展开其余回复 / 收起其余回复）

**P1 — 契约**

- [x] 123-10 i18n：Write / Inbox kicker、回复/折叠、拉黑作者
- [x] 123-11 DESIGN.md：留言一级刊头、楼中楼、危险色仅用于站长删除/取消

**⚠️ 回归 / 风险**

- 现象：沿用 `msg.reply` 单对象 → 楼中楼只显示第一条
- 现象：回复仍 `_require_site_owner` → 普通登录用户看不到入口
- 验收：访客只见登录；已登录可回楼主与楼中楼；站长见拉黑/删除配色；待审列表仍仅站长；验证码只在新留言

**方案对照**


| 代号  | 名称         | 结果                   |
| --- | ---------- | -------------------- |
| 现状  | 渐变标题 + 玻璃卡 | 对照，不合入               |
| A   | 刊头账本       | 有返回链 / Ledger 侧栏，不采用 |
| B   | 两栏信笺       | 改栅格过多                |
| C   | 登记簿        | 编号行，不采用              |
| D   | 列表刊头       | **合入目标**             |


**涉及文件**

`MessagesView.vue`、`page-messages.css`、`messageApi.ts`、`mockMessages.ts`、`MessageAvatarWithProvider.vue`、`page-enter-message.css`、`messages_api.py`、`guest_message_repo.py`、`message_serialize.py`、`i18n/locales/{zh,en}.json`、`DESIGN.md`、`designed/messages-editorial/`

**验收**

- [x] `/messages` 浅/深/abstract：无渐变标题、无玻璃卡
- [x] 访客目视（登录钮、无回复入口）；已登录 / 站长需本地登录确认回复钮、预填、拉黑/删除配色
- [x] 列表已按 `replies[]` 渲染既有楼中楼；折叠/预填/发送逻辑已合入
- [x] 验证码仍只出现在新留言；友链申请页未改

---

## 122 · 2026-09-05 详情顶栏 · Editorial 刊头

**状态**：已完成（2026-09-05；浅/深目视收口） · 摘要见 [CHANGELOG · 2026-09-05](docs/CHANGELOG.md#2026-09-05)

**方向**：把 `designed/detail-header-editorial/` 已选定的方案 A 合入博客 / 项目详情题录区。只改顶栏，不重排正文与滚动侧栏。

**背景 / 现状**

- 原型：`designed/detail-header-editorial/index.html`（现状 | 方案 A；博客 / 项目两页；浅/深）。
- 博客详情：`PostDetailView` 题录已是 hairline 编辑头，但返回链默认灰色、标题旁仍有「置顶」Badge，题名上方没有项目刊头那条 ink 顶线。
- 项目详情：`ProjectDetailView` 题名 / 项目信息 / 操作是三张 `.card` 纸卡；返回文案是 `common.back`「返回」。

**依赖 / 冲突**

- 刊头语言跟 121 列表 `.ed-filter` 同一套 kicker（`.ed-kicker` / `.ed-en`），不要另起一套 SaaS 纸卡。
- 入场仍走 `page-enter-post.css`（`article > *`）；题录继续包在 `.post-fold` / `.project-fold` 里，不要拆成更多直接子节点冲延迟。
- 滚动侧栏、算法 spec、项目笔记链、正文阅读栏不动。

**P0 — 博客详情**

- [x] 122-1 去掉标题旁「置顶」Badge
- [x] 122-2 返回链 `← 博客` 默认 accent 绿（不再灰字 hover 才变绿）
- [x] 122-3 题名上方加与项目相同的 ink 顶线（`.ed-mast`）

**P0 — 项目详情**

- [x] 122-4 返回文案由「返回」改为「项目」（`projects.title`），颜色同博客 accent
- [x] 122-5 三张纸卡收成一条 Editorial 刊头：题名区无 Title · 题名 / 状态行；FACTS · 项目信息 + ACTIONS · 操作；状态改 6px 点；操作是下划线字不是药丸；操作两钮在列内竖直居中

**P1 — 契约 / 骨架**

- [x] 122-6 i18n：刊头 Facts / Actions 中英 kicker
- [x] 122-7 DESIGN.md：详情刊头与列表 `.ed-filter` 的边界
- [x] 122-8 详情骨架题录对齐刊头（去纸卡）

**⚠️ 回归 / 风险**

- 现象：拆 `article` 直接子节点 → 入场阶梯乱
- 现象：项目操作钮 `position:absolute` 在窄屏叠到 kicker 上 → 720px 须回到文档流
- 验收：`/blog/:slug` 无 Badge、返回绿、题名顶线；`/projects/grunray-wiki` 刊头 + `← 项目`；碎念撰写下拉仍是药丸

**方案对照**


| 代号  | 名称                | 结果       |
| --- | ----------------- | -------- |
| 现状  | 灰返回 / Badge / 三纸卡 | 对照，不合入   |
| A   | Editorial 刊头      | **合入目标** |


**涉及文件**

`page-detail-masthead.css`、`main.ts`、`PostDetailView.vue`、`ProjectDetailView.vue`、`PostDetailPageSkeleton.vue`、`ProjectDetailPageSkeleton.vue`、`i18n/locales/{zh,en}.json`、`DESIGN.md`、`designed/detail-header-editorial/`

**验收**

- [x] `/blog/:slug`：无置顶 Badge；`← 博客` 默认绿；题名上方 ink 顶线
- [x] `/projects/:slug`：`← 项目`；刊头非纸卡；Facts / Actions；状态点；操作钮列内居中
- [x] 窄屏操作列不叠字；入场无「先全显再播」
- [x] 浅/深/abstract 可读

---

## 121 · 2026-09-05 项目 / 博客列表 · 方案 D Editorial 刊头

**状态**：已完成（2026-09-05；浅/深/abstract + 390 窄屏目视收口） · 摘要见 [CHANGELOG · 2026-09-05](docs/CHANGELOG.md#2026-09-05)

**方向**：把 `designed/project-list-notes-options/` 已选定的方案 D 合入 `/projects` 与 `/blog`。两页继续共用时间线与下拉，不新开一份 Timeline 排版文件。

**背景 / 现状**

- 原型：`designed/project-list-notes-options/index.html`（顶栏 现状 | A | D；D 下分项目 / 博客两整页）。
- 生产：`BlogView` / `ProjectsView` 共用 `page-timeline.css`（`main.ts` 全局引入），DOM 类名相同；日期列 `--timeline-date-col: 5.2rem` + `formatMonthDay()` 的 MM-DD；年份只在 `.timeline-year` 组头。下拉共用 `AppSelect.vue`（碎片撰写页也用）。
- 博客置顶在生产是坏的：`sortPosts()` 已按 pinned → `pinned_order` → 日期排，但 `BlogView.timelineItems` 又按日期重排，角标有、条目不在顶上。

**依赖 / 冲突**

- **Timeline**：只在原 `page-timeline.css` 补 modifier / 卡片造型，禁止 `page-timeline-pinned.css` 之类第二套三列 grid。
- **下拉**：合入必须仍是 `AppSelect.vue`；刊头皮肤用 `variant="editorial"`，默认皮肤留给 `FragmentComposeView`。
- 首页 `.toc-row` 仍不套方案 G；列表时间线卡是「目录行密度 + 方案 G」，边界写进 DESIGN.md §9。
- 改列表结构时同步 `page-enter-timeline.css` 选择器（DESIGN.md §9 入场契约）。

**P0 — 共用排版（先做）**

- [x] 121-1 `page-timeline.css`：卡片改为笔记目录行密度（透明底、每张顶 hairline，含组内第一张；hover 须保留顶线）；不拉宽 `--timeline-date-col`
- [x] 121-2 置顶日期 modifier `.timeline-date--with-year`：年份叠在 MM-DD 上，列宽仍 5.2rem；年份组继续单行 MM-DD
- [x] 121-3 刊头筛选抽共用 `page-list-masthead.css`（两页同一套 `.ed-filter` / kicker / 开关），不是 SaaS Filter Bar 纸卡
- [x] 121-4 `AppSelect` 增加 `editorial` 变体（衬线触发条、不透明菜单、选项 hover 右移）；碎片页保持默认药丸下拉

**P0 — 两页合入**

- [x] 121-5 `ProjectsView`：FILTER · 标签 + ARCHIVE · 已归档（显示/隐藏）；状态改首页同款 6px 点（进行中 / 已归档），去掉「已归档」角标
- [x] 121-6 `BlogView`：FILTER · 标签 | SECTION · 分类（滑动下划线）| SEARCH · 检索；置顶独立刊头带，卡片上去掉「置顶」角标；置顶条目不再混进年份组
- [x] 121-7 骨架 `TimelinePageSkeleton` `variant="notes"` 两页都用；入场动画覆盖刊头与置顶带

**P1 — 文案 / 契约**

- [x] 121-8 i18n zh/en（刊头中英 kicker、置顶计数、归档显示/隐藏）
- [x] 121-9 DESIGN.md：列表刊头、置顶带、日期 modifier、timeline-card 与首页 toc-row 的 G 边界

**⚠️ 回归 / 风险**

- 现象：拉宽日期列或另写 Timeline 文件 → 项目页与年份组左列一起歪
- 现象：改 AppSelect 默认皮肤 → 碎念撰写页下拉变形
- 现象：置顶仍按日期插进 2026 组 → 未从 `timelineItems` 拆出 pinned
- 现象：页面 scoped `@media` 再写三列 grid 会盖掉共用 480px 单列；圆点 `display:none` 后卡片掉进点列变成竖条
- 验收：`/projects` 与 `/blog` 轴线对齐；浅/深/abstract；窄屏；碎片撰写下拉仍是药丸；首页目录行仍无翻角花藤

**方案对照**


| 代号  | 名称               | 结果                   |
| --- | ---------------- | -------------------- |
| 现状  | 纸卡时间线            | 对照，不合入               |
| A   | 轴 + 目录行 + 纸面工具条  | 列表基线，筛选仍是 Filter Bar |
| D   | A + Editorial 刊头 | **合入目标**             |


**涉及文件**

`page-timeline.css`、`page-list-masthead.css`、`page-enter-timeline.css`、`AppSelect.vue`、`BlogView.vue`、`ProjectsView.vue`、`TimelinePageSkeleton.vue`、`page-toc-row.css`（状态点）、`i18n/locales/{zh,en}.json`、`DESIGN.md`、`designed/project-list-notes-options/`

**验收**

- [x] `/projects`：刊头 + 目录行时间线 + 状态点；归档开关有效
- [x] `/blog`：刊头 + 置顶带（年份叠日期）+ 年份组 MM-DD；分类下划线滑动；搜索高亮仍在
- [x] 两页共用 Timeline 格子与 AppSelect；碎念撰写页下拉未改
- [x] 三主题 + 窄屏目视；入场动画无「先全显再播」（390 下轴线隐藏、日期改行、刊头换行；scoped 三列覆盖已去掉）

---

## 120 · 2026-08-28 首页问候字体 · 月相拖尾微调

**状态**：已完成（2026-08-28；本地目视） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)

**方向**：修复部署后首页问候语中文掉系统宋体、品牌名花体下伸被裁；月相拖尾月亮缩小、Columbina 相对 Damselette 拉开、拖尾月亮不透明度 40%。

**背景 / 现状**

- 问候语曾用 `font-weight:700` + `font-style:italic`，自托管 Noto Serif SC 只有 500/600 **normal**，部署后匹配失败落到 Songti/SimSun；`.card { overflow:hidden }` 裁掉 Great Vibes 的 `y` 下伸。
- 月相拖尾月亮偏大、Columbina 贴 Damselette 过近；拖尾月亮虽有 alpha 但偏实。

**P0 — 问候字体**

- [x] 120-1 `.home-intro-greeting`：中文改为 Noto Serif SC **600 normal**；问候卡 `overflow: visible` + 略增 padding，避免裁花体下伸
- [x] 120-2 `fonts.css`：Noto Serif SC 700 请求复用 600 面；入场等字体同时 load Noto + Great Vibes
- [x] 120-3 DESIGN.md §3 问候层级说明与自托管字重对齐

**P0 — 月相拖尾**

- [x] 120-4 拖尾月亮 `moonRadiusBase` 减 1/5（`4 → 3.2`）
- [x] 120-5 Columbina 相对 Damselette 偏移 `8,7 → 14,12`
- [x] 120-6 拖尾月亮（含头月）基准不透明度 `trailMoonOpacity: 0.4`；原型 `designed/moonlit-cursor-options` 同步

**⚠️ 回归 / 风险**

- 现象：问候中文仍像宋体 → 查 `/fonts/noto-serif-sc-*-600-normal.woff2` 是否 404
- 现象：品牌名仍缺下伸 → 确认未再给问候卡加 `overflow:hidden`
- 验收：浅/深主题问候可读；开拖尾月亮更透、更小；线稿不压尖端

**涉及文件**

`page-home-hero.css`、`HomeView.vue`、`fonts.css`、`DESIGN.md`、`moonlitCursorEngine.ts`、`designed/moonlit-cursor-options/shared.js`、`TODO.md`

**验收**

- [x] 问候「你好，我是」为 Noto 衬线；「GrunRay」花体完整（含 y）
- [x] 拖尾月亮约 40% 不透明、尺寸缩小；Columbina 更靠右下

---

## 119 · 2026-08-28 全站 FPS / 1%L 监视浮层

**状态**：已完成（2026-08-28；首页+博客目视，开关可用） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)

**方向**：全站右下角纸面卡片显示瞬时 FPS 与 1% Low（1%L），方便目视流畅度。可开关、持久化；**不是**首页专属。不另加 backdrop-filter 假毛玻璃层（用现有 `--glass-nav-`*）。

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

**状态**：已完成（2026-08-28；本地目视 + 30s 停留） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)

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

**状态**：已完成（2026-08-28；117-10 三主题+移动端+30s 目视收口） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)

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
- **勿在** `homeRoot` **上用 Vue** `:class` **绑动态态**：会冲掉 `classList` 写入的 `page-enter--play` / `home-fonts-ready`（见 117-18）；开/关照片背景左右位移走 `html[data-photo-bg]`。

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

**状态**：已完成（本地；未推送） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)（随 PR #22 组合入）

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

**状态**：已完成（本地；未推送） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)（随 PR #23 组合入）

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

**状态**：已完成（本地；未推送） · 摘要见 [CHANGELOG · 2026-08-28](docs/CHANGELOG.md#2026-08-28)（随 PR #23 组合入）

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-25](docs/CHANGELOG.md#2026-08-25)

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


**P0 — 原型性能优化（**`designed/moonlit-cursor-options/shared.js`**）**

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-23](docs/CHANGELOG.md#2026-08-23)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-23](docs/CHANGELOG.md#2026-08-23)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-23](docs/CHANGELOG.md#2026-08-23)

**GitHub**：`feat/page-toc-row` → PR [#18](https://github.com/Grunray/GrunRay-wiki/pull/18) 合入 `main`（2026-08-25）；远程分支已删

**方向**：项目笔记列表与首页「LATEST · 最新文章」目录行对齐——整行可点、hairline 分隔、轻底色 hover，不套方案 G。

- [x] 110-1 笔记列表交互：`PostCard` 改为 `RouterLink.toc-row` 包裹整行；`page-toc-row.css` 与 `HomeView` 共用样式

**涉及文件**

`PostCard.vue`、`ProjectNotesView.vue`、`page-toc-row.css`、`HomeView.vue`、`i18n/locales/{zh,en}.json`

---

## 109 · 2026-08-23 项目 / 博客详情页完善

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-23](docs/CHANGELOG.md#2026-08-23)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-25](docs/CHANGELOG.md#2026-08-25)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-23](docs/CHANGELOG.md#2026-08-23)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-19](docs/CHANGELOG.md#2026-08-19)

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

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-19](docs/CHANGELOG.md#2026-08-19)

- [x] 方案 G（翻角+错位+檐角）：`.card-hover-g` + `CardCornerVine.vue` + timeline-card + cover-story
- [x] cover-story「开始阅读」右移 gutter，避开花藤 SVG
- [x] FilmFeed 宽屏无缝循环：`--film-repeat` + 动态克隆组数
- [x] DESIGN.md §9 更新可点击卡 hover 语言

---

## 归档 · 2026-08-17 ~ 08-18 风格与字号

**状态**：已完成 · 摘要见 [CHANGELOG · 2026-08-17](docs/CHANGELOG.md#2026-08-17)

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

---

## 废案

> 确定不做。保留编号与原文，避免以后重复立项；与「搁置」（可能回炉）不同。新废案整块追加到本区末尾。

## 152 · 2026-09-16 监控：前端错误与 API 日志

**状态**：废案

**废案原因**：弱机个人站 + 已有 153 CI；错误上报 / API 结构化日志不是刚需，时间优先给自动化测试与流水线。不做完整 APM，也不再排期轻量 endpoint。

**方向**：前端全局错误轻量上报（或至少 `console` + 可选 endpoint）；后端 API 对 4xx/5xx 打结构化简单日志。不做完整 APM。

**背景 / 现状**：出问题多靠用户口述；Flask 默认日志未必带 path / status 汇总。

**做完有什么用**：上线后能发现白屏 / 接口炸；修回归有线索；为 153 CI 之外的「生产可观测」补一层。

**P0 — 前端**

- [ ] 152-1 `window.onerror` / `unhandledrejection`（及 Vue `app.config.errorHandler`）汇总；开发环境只打日志
- [ ] 152-2 生产：可选 POST 到自有轻量 endpoint（无第三方也行）；注意脱敏（勿带 token / 正文）

**P1 — 后端**

- [ ] 152-3 after_request 或 errorhandler：记录 method、path、status、耗时；5xx 带 request id
- [ ] 152-4 4xx 高频路径（友链 / 留言）可采样，避免刷屏

**涉及文件**

`frontend/src/main.ts`、新建小模块、`backend/app/__init__.py`、config

**验收**

- [ ] 故意抛错：前端能看到汇总日志或收到上报
- [ ] 打一个 500：后端日志含 path 与 status

