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



### 灵感（未排期）

8. 内容备份：脚本将数据库导出到本地，并定期推送到 GitHub。

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

## 113 · 2026-08-25 鼠标光标拖尾 · 星座月相（Moonlit Cursor）

**状态**：进行中（P0/P1 已合入 `frontend/`；静憩态 + 祈愿点击已合入生产；113-9 泄漏/rAF 休眠已在 5173 验收）

**方向**：用 Canvas 引擎替换「字母跟随」拖尾（`CursorTrail.vue`），实现 **星座月相** 指针：Columbina 线稿 + Damselette 热点 + 月相拖尾 + 悬停三月 + 静憩 sleep/Kuuhenki + 点击祈愿（wish + Primogem）。保持 Editorial 克制，不做霓虹粒子爆炸。

**背景 / 现状**

- **生产**：`CursorTrail.vue` + `useMoonlitCursor` 为星座月相 Canvas；顶栏可开关（`ui.cursorTrailActive`）。旧 GSAP 字母拖尾已替换。
- **原型**：`designed/moonlit-cursor-options/`（`index.html` + `shared.js` + `shared.css`）；方案 A/B/C 已删，仅保留 **星座月相** 单方案。
- **设计文档**：`DESIGN.md` §11；`designed/moonlit-cursor-options/DESIGN-BRIEF.md`（已选方案 D）。
- **素材**：`frontend/src/assets/cursor/`（Columbina / Damselette / sleep / Kuuhenki / wish / Primogem；旧 `water` 已停用）。

**原型已实现（验收于静态页）**

| 模块 | 说明 |
| --- | --- |
| 拖尾 | 仅月相圆点，无连线；按距离落点；idle 从末端月亮 Z 向指针收回；满员顶掉时羽状微粒散开 |
| 月相 | 御月鸽座相位序列；按满度差异化月光；各月亮自转；新生月亮约 520ms 淡入（`moonSpawnMs`） |
| 指针 | Damselette 尖端 = `mx/my`；Columbina 线稿偏移不重叠；悬停/点击时线稿渐淡（`getConstellationPointerFade`） |
| 悬停 | 链接/芯片分叉入口；虹月·恒月·霜月三轨同转（3:2:1）；轨道 conic 渐变旋转 |
| 点击 | **祈愿**：指针淡出至透明 → `wish.svg` 显现 → 轨道虚线+节点圆 → 多颗 `Primogem` 从圆内侧散落（青白/薰衣草/粉）；已替换旧 `water.svg` 水纹 |
| 静憩 | 停驻 ≥2s：Columbina/Damselette 淡出，切 `sleep.svg` 月摇篮 + `Kuuhenki.svg` 推摇；月光晕 + 银河落尘（世界坐标，不随月弯摇） |
| 淡化 | `applySpriteFadeAlpha(base, fade, { minAlpha })` 统一入口；点击 `minAlpha: 0` 可完全透明 |
| 稳定性 | 指针取消 `moveAngle` 旋转 + 平滑坐标，减轻移动抽搐 |

**P0 — 原型性能优化（`designed/moonlit-cursor-options/shared.js`）**

- [x] 113-p1 **空闲休眠 rAF**：无移动/收回/悬停动画/点击衰减时 `cancelAnimationFrame`，`pointermove` 唤醒
- [x] 113-p2 **轨道渐变预烘焙**：三月轨道 conic 渐变烘成离屏 Canvas，`drawImage` + 旋转，去掉每帧 `createConicGradient` / `shadowBlur`
- [x] 113-p3 **月亮精灵缓存**：拖尾月相 + 悬停满月预烘焙，绘制时缩放 `drawImage` 代替每帧径向渐变
- [x] 113-p4 **指针层去 shadowBlur**；悬停检测节流（~60ms）
- [x] 113-p5 **`prefers-reduced-motion`**：减光晕、轨道不旋转、仍保留指针与拖尾主体
- [x] 113-p6 **启动预烘精灵**：`prewarmConstellationAssets()` 在 `start()` 与预览主题切换时烘焙拖尾月相 + 三月轨道/满月，避免首帧/切主题卡顿
- [x] 113-p7 **静憩氛围预烘焙**：月光柱/光晕/星云带烘成离屏 Canvas；银河落尘用拖尾/圆点/星芒精灵 `drawImage`，去掉每帧 `createRadialGradient` / `createLinearGradient`
- [x] 113-p8 **祈愿预烘焙**：轨道虚线+节点圆+光晕一张图旋转绘制；Primogem 光晕打进精灵，点击帧无额外 gradient
- [x] 113-p9 **静憩-only ~30fps**：仅呼吸/落尘在动时 `setTimeout(33)` 续帧；拖尾/悬停/点击仍 60fps；`restBlend` 按 dt 步进
- [x] 113-p10 **原石数组就地压缩**：`updateClickPrimogems` 不每帧 `.filter()` 分配

**性能要点（原型验收）**

| 项 | 手段 |
| --- | --- |
| rAF | `needsConstellationFrame()` 静止无动画时停循环；`pointermove` / `pointerdown` / `wakeLoop()` 唤醒；静憩-only 约 30fps |
| 轨道 | `bakeHoverOrbitSprite` 离屏 conic → `drawImage` 旋转，无每帧 `createConicGradient` |
| 月相 | `bakeTrailMoonSprite` / `bakeHoverMoonSprite` 缓存；reduced-motion 简化为实心圆 |
| 指针 | Columbina / Damselette / sleep / Kuuhenki / wish / Primogem 纯 `drawImage`，无 `shadowBlur` |
| 静憩 | `bakeRestGlowSprite` + `bakeRestGalaxySprites`；隐藏页清 `restFpsTimer` |
| 祈愿 | `bakeWishOrbitSprite` + `bakePrimogemWithGlow` |
| 悬停拾取 | `elementFromPoint` 节流 ~60ms（`hoverPickT`） |
| 后台页 | `visibilitychange` 隐藏时 `cancelAnimationFrame` |

**关键配置（`SCHEMES.d`，合入时迁到 TS 常量）**

- `nodeSpacing: 27`、`maxTrailNodes: 9`、`spriteMaxPx: 48`、`anchorMaxPx: 20`
- `spriteOffsetX/Y`、`spriteHotX/Y`、`anchorHotX/Y` — 热点与线稿间距
- `pointerAnchor`、`moonSpawnMs`
- 祈愿：`clickWishMs`、`clickPointerFadeMs`、`wishMaxPx`、`wishHotX/Y`、`wishOffsetX/Y`、`clickPrimogemCount`、`clickPrimogemOrbitR`、`clickOrbitDotCount`
- 静憩：`restAfterMs: 2000`、`restSleepMaxPx`、`restSleepHotX/Y`、`restHangPivotX/Y`、`restContactX/Y`、`restKuuOffsetX/Y`、`restRockHz`

**P0 — 合入生产（先做）**

- [x] 113-1 将 `shared.js` 引擎迁为 **composable + Canvas 组件**：`useMoonlitCursor` + `CursorTrail.vue`（单全屏 Canvas / 单 rAF）；指针坐标不进 Vue 响应式；保留 `ui.cursorTrailActive` 与 `AppShell` 挂载
- [x] 113-2 SVG 迁入 `frontend/src/assets/cursor/`，栅格化 light/dark 线稿绑定 **站点 theme**（`cursorThemeFromSite`，abstract → dark；勿写死 preview `data-preview-theme`）
- [x] 113-3 `pointer: fine` + 触屏隐藏；`prefers-reduced-motion` 对齐 Vue：`cursorTrailActive` 为 false 时不挂载；引擎内仍保留 113-p5 降级
- [x] 113-4 输入框 / `contenteditable` / 文本光标区例外（恢复系统光标、不画自定义指针）；hover 对接 `.toc-row`、`[data-cursor-hover="project"]`、`.timeline-card`、`a`/`button`
- [x] 113-10 合入 **静憩态**（sleep + Kuuhenki + 氛围预烘焙 + 停驻 2s + 静憩-only 30fps）；SVG 迁入 `frontend/src/assets/cursor/`
- [x] 113-11 合入 **祈愿点击**（替换 water：指针完全淡出 → wish → Primogem 散落 + 轨道预烘焙）；`applySpriteFadeAlpha` 与原型一致；更新 `DESIGN.md` §11

**P1 — 体验与契约**

- [x] 113-5 悬停 link / project 调参入口：`CONSTELLATION_HOVER_TUNING`（目录行内收 / 项目卡外张）；与 DESIGN §9 目录行 vs 可点击卡对齐
- [x] 113-6 清理旧字母拖尾 CSS 令牌（`--cursor-trail-dot`）；i18n 工具提示改为「月相拖尾」
- [x] 113-7 `DESIGN.md` §11 指针/拖尾契约；`DESIGN-BRIEF.md` 注明已选方案 D 星座月相

**P2 — 清理**

- [x] 113-8 `shared.js` 移除方案 A–C 死代码（旧月牙拖尾/音符/粒子/连线拖尾等）；**保留** 方案 D 的 `moonFeathers` / `spawnMoonVanishFeathers` / `drawMoonFeather`
- [x] 113-9 首页 + 详情页 30s 无泄漏；拖尾开关多次切换无残留监听；**阅读静止时 rAF 应休眠**（见 113-p1）
  - 验收（内置浏览器 `localhost:5173`）：空白处停住后拖尾绘制 **0 fps**（trail retract 后、rest 前）；2s 后静憩-only **~29 fps**；首页/文章详情各静置 30s 堆内存无单调上涨；开关 6 次 `pointermove` 监听随启停在 0↔1 之间，不累加
  - 修复：空闲时在 `update()` 衰减 `hoverPhase`，避免停在空白处后悬停相位卡住导致 rAF 一直 60fps

**⚠️ 回归 / 风险**

- Canvas + `cursor: none` 勿挡 hit-test（原型用 `elementFromPoint` 做 hover）
- Columbina 线稿仅用用户自抠 SVG，合入前确认素材授权
- 深色 cyan 辉光在浅色纸面需单独调 theme tuning

**涉及文件**

`designed/moonlit-cursor-options/`、`CursorTrail.vue`、`useMoonlitCursor.ts`、`moonlitCursorEngine.ts`、`moonlitCursorFx.ts`、`moonlitCursorConfig.ts`、`AppShell.vue`、`stores/ui.ts`、`cursor-trail.css`、`DESIGN.md`

**验收**

- [ ] 静态原型与合入后 Vue 行为一致（拖尾、悬停三月、静憩 sleep/Kuuhenki、点击祈愿、idle 收回）
- [ ] 三主题 + 移动端（触屏无自定义指针）
- [ ] 顶栏关闭后零 Canvas 开销

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

## 112 · 2026-08-23 图片背景模糊调节器

**状态**：已完成

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

**方向**：顶栏工具区与主导航视觉统一——方案 G 分段胶囊 + 药丸 link；工具全展开时按密度原型方案 A 收紧尺寸；修复选中态溢出与溢出面板遮挡悬浮提示。

**方案对照**（`designed/nav-tools-options/` → G；`designed/nav-bar-density-options/` → A）

| 代号 | 名称 | 结果 |
| --- | --- | --- |
| D | 圆钮 + 胶囊 | 曾合入，后由 G 替代 |
| G | 分段胶囊 + 左侧药丸 | **已合入生产** |
| A（密度） | 缩小药丸与胶囊 | **已合入生产** |

- [x] 111-1 工具钮方案预览 HTML：`designed/nav-tools-options/`（A–D 工具区；E/F/G 整栏统一对比）
- [x] 111-2 方案 G 合入：`SiteNav` 分段胶囊（首页 \| 创作·社区·栖息）；`nav-toolbar.css` 药丸工具钮 + 与 `.link.active` 同色开启态
- [x] 111-3 密度预览 HTML：`designed/nav-bar-density-options/`；选定方案 A 后收紧药丸 padding / 字号 / 图标与顶栏间距
- [x] 111-4 胶囊内边距略增 + 选中呼吸 `scale` 收敛，避免绿底药丸超出 hairline 外框
- [x] 111-5 溢出「更多工具」面板：`card-overflow-visible` + `[data-nav-tip]:hover` 提升至 `z-index: 80`，修复提示被面板挡住

**涉及文件**

`AppShell.vue`、`SiteNav.vue`、`SiteNavGroup.vue`、`ThemeDayNightToggle.vue`、`nav-toolbar.css`、`main.css`、`designed/nav-tools-options/`、`designed/nav-bar-density-options/`

---

## 110 · 2026-08-23 笔记界面优化

**状态**：已完成

**方向**：项目笔记列表与首页「LATEST · 最新文章」目录行对齐——整行可点、hairline 分隔、轻底色 hover，不套方案 G。

- [x] 110-1 笔记列表交互：`PostCard` 改为 `RouterLink.toc-row` 包裹整行；`page-toc-row.css` 与 `HomeView` 共用样式

**涉及文件**

`PostCard.vue`、`ProjectNotesView.vue`、`page-toc-row.css`、`HomeView.vue`、`i18n/locales/{zh,en}.json`

---

## 109 · 2026-08-23 项目 / 博客详情页完善

**状态**：已完成

**方向**：详情页画廊查看与滚动侧栏；与 108 独立，避免同文件大规模冲突。

**依赖 / 冲突**：建议先合 108 再动 `PostDetailView` / `ProjectDetailView` 侧栏逻辑（已按此顺序完成）。

**P0 — 图片查看**

- [x] 109-1 项目详情画廊：宽屏悬停右侧玻璃卡片局部放大；点击全屏遮罩；滚轮缩放 + 左键拖拽平移；提示/关闭按钮样式（绿提示、红关闭）；`sanitizeMediaUrl` 修复反斜杠路径 404；导入时 `project_md.py` 规范化 gallery URL

**P1 — 滚动侧栏**

- [x] 109-2 题录滚出后侧栏稳定展示：去掉 scroll scrub，改为 enter/leave 动画；全屏查看器图片区域铺满视口

**涉及文件**

`GalleryImagePreview.vue`、`GalleryBlock.vue`、`mediaUrl.ts`、`project_md.py`、`useDetailScrollSidebar.ts`、`DetailScrollSidebar.vue`、`PostDetailView.vue`、`ProjectDetailView.vue`、`i18n/locales/{zh,en}.json`

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

