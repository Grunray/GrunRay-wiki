# 方案 D 合入生产 · 代理用排雷图

> 给执行合并的 agent 读。选定方案 = **D · 墨起扇鸣**（先描绘线稿，画定后扇形随暖光扫开）。
> 原型即规格：`index.html` / `shared.css` / `shared.js`（本目录）；关键帧、时长、缓动以原型为准，不要凭感觉重调。
> 开干前先读根 `AGENTS.md`、`docs/DESIGN.md` §9（Motion Policy）与 §12（Home Hero）、§14（资源预算）。

## 0. 方案 D 时序（精确规格，来自原型）

| 阶段 | 时间 | 内容 |
| --- | --- | --- |
| 一段·描绘 | 0 → ~1.9s | 354 path `stroke-dashoffset` 自绘；`delay = dist/MaxDist × 1100ms`，`dur = min(340 + len×0.35, 1050)`，ease `cubic-bezier(0.4,0,0.2,1)` |
| 二段·扫扇 | 1.95s 起 | `.stack` 打 `d-inked`：扇形 `--sweep 0→1`（1.0s，delay .05s，`cubic-bezier(0.22,1,0.36,1)`）；beam 贴扇缘 `133°→157°`（1.05s，delay .1s）；base 淡入 .8s；描绘层淡出 .75s（delay .2s） |
| 撤场 | 3.25s | 描绘层 `display:none` |
| 环境态 | 3.4s 起 | wash 呼吸 7s（.08↔.14）+ 整图漂浮 13s（±5px），均 infinite，仅 full 档 |

卡片入场（mast .05s / 问候 .12s / peek .2s）维持现有 `page-enter-home.css`，不与本动画互相等待。

## 1. 落地文件清单

- 新增 `frontend/src/composables/useHomeStageArtIntro.ts`（编排：取线稿→描绘→扫扇→撤场）
- 新增 `frontend/src/styles/page-home-stage-intro.css`（预隐藏 + 关键帧 + 环境态），HomeView 引入
- 改 `frontend/src/views/HomeView.vue`：`.home-stage-art-stack` 内加 beam 节点 + 描绘层节点（v-html 或 ref 容器）
- 改 `frontend/src/composables/homeStageArtWedge.ts`：导出扇形几何常量供 CSS 变量用（见 P3）
- 资产：`polonia_sandoren_line.svg` 复制到 `frontend/public/art/`（见 P4）
- 文档：`docs/DESIGN.md` §12 结构契约补 beam/描绘层节点 + 「SVG 临时描绘层」例外一句；`docs/CHANGELOG.md` 当日条目

## 2. 合并会踩的坑（按处理优先级排）

### P1 预隐藏写反 = 全站底图消失（最高危）

原型里 `[data-scheme="d"] .base { opacity: 0 }` 这类**默认隐藏**是给「确认要播」的场景的。生产没有 scheme 切换，若把预隐藏写成无条件规则，则 JS 失败 / REDUCED 档 / 取线稿超时时任一发生，**底图永远不可见**（比没动画还糟）。

- 对策：预隐藏选择器必须挂在一个 **JS 武装类**（如 `.stage-intro--armed`）上——composable 确认 `isMotionFull()` 且线稿就绪后才打到 `.home-stage-art-stack` 上，CSS 只认 `.stage-intro--armed .home-stage-art-base { opacity: 0 }`。
- 任何失败分支（fetch 失败、`getTotalLength` 抛错、超时）= 移除武装类，一切回退现状。
- 与 `page-enter-home.css` 同一纪律：REDUCED/MINIMAL 仍要能看见内容（AGENTS.md §3.5：不是永远预隐藏）。

### P2 蜗牛开屏把首访观众的 D 整个盖住

`SplashWoniuOverlay` 是 `App.vue` 里叠在 RouterView 上的 iframe 遮罩，**首页在它底下照常 mount、page-enter 照常播完**。首访（`localStorage grunray_splash_woniu_v1` 无值 + `ui.motionCut` 为假）时蜗牛播完 + 头像飞入 + iris 揭幕约数秒——D 若随 mount 开播，首访者一秒都看不到。

- 推荐：首访场次**延迟**到蜗牛落幕再播 D。组件内 `dismiss()` / iris 完成处没有对外信号，需加一个 `ui` store 标记（如 `splashWoniuActive`，`visible=true/false` 两处同步），composable watch 它：首访 → 等落幕再播；非首访 → 直接播。iris 揭幕（820ms）露出纸面的瞬间接 D 的一段描绘，是最理想的接力点。
- 可接受的简化版：首访跳过 D（后续进首页再播）。要在 PR 描述里写明取舍。
- 禁止：把 D 的开始硬编码成 `setTimeout(几秒)` 猜蜗牛时长。

### P3 扇形几何两处写死会漂移

原型 `shared.css` 把 `82.7428%` / `312.5%` / `468.75%` / `19.5deg` 硬编码进 clip-path calc。生产的几何单一来源是 `homeStageArtWedge.ts`（`HOME_STAGE_ART_WEDGE`：顶点 1270.93,0、夹角 39°、中轴 -45°）。预设一改，CSS 就错。

- 对策：`homeStageArtWedge.ts` 增导出**派生常量**（apex%、半径换算 312.5%/468.75%、半角 19.5deg），HomeView 挂载时写成 CSS 变量（如 `--wedge-apex-x`）挂到 `.home-stage-art-stack` 的 style 上；`page-home-stage-intro.css` 的 clip-path 全部 `var()` 引用。`homeStageArtWedgeClipPath()` 保留给静态终态。

### P4 内联 clip-path 绑定与扫扇冲突

现在 tint / wash 是 `:style="{ clipPath: stageArtWedgeClip }"`——**内联样式优先级压过样式表**，CSS 的 `--sweep` 动画推不动它。

- 对策（推荐）：播放期由 composable 用 `element.style.clipPath` 逐帧写（rAF 插值两条射线角，`homeStageArtWedge.ts` 加一个 `wedgeClipPathAt(p)` 纯函数复用同一几何），终态写回 `stageArtWedgeClip`；不引入 `@property` 依赖。
- 备选：撤掉内联 clip，改 CSS 类 + `@property --sweep`（原型路线）。Chrome 111+ 才支持 calc 内 `sin()/cos()`，且要处理「未注册 @property 的浏览器自定义属性不插值直接跳变」——写了回退再选这条。
- 无论哪条：播完必须恢复成与今天逐像素一致的静态扇形（拿 `homeStageArtWedgeClipPath()` 字符串对比）。

### P5 线稿 SVG 资产化与主题重着色

线稿 354 path 全是内联 `style="fill:none;stroke:#2b2823;stroke-width:2.5px"`，是**浅色档墨**。深色扇形墨 `#abde6b`、abstract `#f4f1e8`（`HOME_STAGE_ART_WEDGE_COLOR` 同键）——描绘层的 stroke 必须随主题换。

- 资产放 `frontend/public/art/polonia_sandoren_line.svg`（复制自 `designed/home-hero-relayout/`，别反向引用 designed/，那是选型区不是运行时路径）。
- 重着色两选一：fetch 后字符串替换 `#2b2823` → 当前主题墨色；或 CSS `.draw-layer path { stroke: <墨色> !important }`（inline style 只有 `!important` 能压）。推荐后者，SVG 原文不动。
- 主题在播放中途被切：描绘层颜色不追（一次性动画），但 WebP 会换源——若二段未开始，直接把描绘层撤了走静态（提前 `d-inked` + 撤场），别让观众看到错色线稿定格。

### P6 往 Vue 管的 DOM 里塞 SVG 的正确姿势

`new DOMParser().parseFromString()` 拿到的是 **SVG 文档**，`appendChild(svg)` 跨文档节点在现代浏览器虽能跑，但绕过 Vue 的 VDOM 管理，后续 patch 可能把它清掉或报警。

- 对策：描绘层节点用 `v-html="lineArtSvg"`（Vue 不追踪 v-html 内部），或 ref 容器 + 在 `onUnmounted` 里 `replaceChildren()` 清干净。二选一，别混用。
- 注入只发生一次（首次播放前）；播完 `display:none` 即可，不要反复插拔。

### P7 计时器与 WAAPI 泄漏

`setTimeout`（挂 `d-inked`、撤描绘层）和 354 个 `el.animate()` 在路由切走 / 组件卸载时必须全清：`onUnmounted` 里 `clearTimeout` 全部 + `getAnimations().forEach(cancel)`（或自建句柄数组，原型 `p.anim` 同款）。漏清 = 卸载后回调打空 ref（`classList` of null）或动画挂在游离节点上白跑。

### P8 动效档门禁（照抄 Motion Policy，不要发明）

- 只有 `isMotionFull()` 才播；`reduced` / `minimal` / 手机壳层 = 静态现状（底图 + 静态扇形直接可见）。
- 组件内**禁止**再写 `matchMedia('(prefers-reduced-motion)')` / `isMobile` 判断（DESIGN.md §9 明令）。
- 环境态两条 infinite（呼吸 / 漂浮）也只挂 full；档在播中途被用户切到 reduced：CSS 侧用 `html[data-motion]:not([data-motion='full'])` 选择器兜底撤掉动画与预隐藏，不要依赖 JS 监听。

### P9 每次进首页都播，还是只播一次

与 `page-enter` 一致性：现在每次路由进首页卡片都重播，D 默认**每次进首页都播**（含列表→详情→返回）。3.2s 是否烦人交给用户定——若要做「每 session 一次」，用 `sessionStorage` 记 key（参考 `utils/sessionJsonCache.ts` 模式），并在 PR 里写明。默认不做门控。

### P10 照片背景开关的分支

`.home-stage-art` 是 `v-if="!photoBackgroundEnabled"`——用户进站后手动关照片背景，节点是**后挂载**的。此时不要补播 D（画面已在眼前，播=闪烁）；只在 HomeView `onMounted` 且节点已存在时考虑播。composable 里判断「首次挂载即在场」才武装。

### P11 单根模板与 `:class` 硬规则（DESIGN.md §12）

- 新节点（beam、描绘层）只能加在 `.home-stage-art-stack` 内部；`.home-layout` 仍须单根，根外连注释都不能加。
- 播/不播的状态类（`.stage-intro--armed` 等）打在 **`home-stage-art-stack`** 这个子节点上，可以走 Vue `:class`；**禁止**把任何开关态 `:class` 绑到 `homeRoot`（会冲掉 `page-enter--play` / `home-fonts-ready`，整页 opacity:0）。

### P12 性能预算（§14）

- 221KB 线稿只在「full 档 + 关照片背景 + 首页」才 fetch，进 HomeView chunk 之外的独立请求（浏览器 HTTP 缓存即可，不必 sessionStorage）；fetch 加超时（~1.5s）超时回退静态。
- `getTotalLength()` × 354 + `getBBox()` × 354 一次性成本约几 ms，放在双 rAF 后、描绘起点前同步算完即可，不要进每帧。
- 失败静默：任何异常 → 回退静态，不弹错、不写 console.error 噪音（`console.warn` 一次可接受）。

### P13 窄屏叠加关系

窄屏（≤640px）`.home-stage-art-stack` 用 `translate: -50% -38%` 定位（独立 CSS `translate` 属性）。入场关键帧只许动 `transform` / `opacity` / `filter`，**不要**碰 `translate` 属性，否则把窄屏定位冲掉。原型 A 用 `scale`、C 用 `transform: translateY` 都是安全的。

### P14 环境态与 `data-home-stage-covered`

纸面盖住首屏后 `.home-stage` 是 `content-visibility: hidden`——呼吸/漂浮动画还在跑但不渲染，开销可忽略，**不要**为此加滚动监听去停动画（多出来的监听才是真开销）。漂浮只动 `transform`，不影响 sticky/布局，无需 `will-change`。

## 3. 验收清单（合并后逐条过）

- [ ] `npx vue-tsc -b` 与 `npx vite build` 通过
- [ ] 浅色 / 深色 / abstract 三主题各播一次：描绘层 stroke 颜色对、终态扇形与 `homeStageArtWedgeClipPath()` 逐像素一致
- [ ] `html[data-motion="reduced"]` 与 `"minimal"`：无预隐藏残留，静态直接可见
- [ ] 首访（清 `grunray_splash_woniu_v1`）：蜗牛落幕接 D 的接力符合 P2 选定策略
- [ ] 进站后开关照片背景：不补播、不闪
- [ ] 播放中途切主题 / 切路由：无报错、无定格线稿残留、无计时器泄漏
- [ ] 窄屏 480px：art cover 定位不被入场动画冲掉
- [ ] `docs/DESIGN.md` §12 结构契约补节点、`docs/CHANGELOG.md` 当日 1–2 句

## 4. 原型 ↔ 生产对照

| 原型（本目录） | 生产落点 |
| --- | --- |
| `shared.js playDraw('d-inked', 1950, 3250)` | `useHomeStageArtIntro.ts` 编排主函数 |
| `prepareLineArt()`（DOMParser + getTotalLength + getBBox） | 同上，线稿改从 `/art/polonia_sandoren_line.svg` fetch（原型是 `line-art.js` 内嵌字符串） |
| `shared.css [data-scheme="d"]` 全部规则 | `page-home-stage-intro.css`，预隐藏改挂武装类（P1） |
| `@keyframes a-sweep-open`（calc + sin/cos） | P4 选定路线；推荐改 `wedgeClipPathAt(p)` + rAF 写内联 |
| `@keyframes d-beam`（133°→157°） | 同名关键帧入生产 CSS，几何常量走 CSS 变量（P3） |
| `#mock.minimal` 整组 | `html[data-motion]:not([data-motion='full'])` 兜底规则（P8） |
