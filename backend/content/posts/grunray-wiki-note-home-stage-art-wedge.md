## 背景与观感

关照片背景时，首页首屏右侧不是一整张线稿，而是**同一构图、两套画**被一块扇形切开：

- **扇形外**：改线稿前的**填充插画**（有色块、有体积）。
- **扇形内**：当前**线稿**，描边换成扇形墨；再盖一层 10% 透明的同色扇形底。

开照片背景时整块舞台艺术不挂载（看 `body` 照片），本文只谈关背景这一支。契约见 `DESIGN.md` §12。

两套画最初都是 SVG。生产不能把约 40 万字符的描摹 SVG 当热路径（Chrome 会卡），所以栅格成 1536×1024 的 WebP 再叠层；几何与换墨方式与 SVG 原型一致。

## 两张图分别是什么

同一 `viewBox="0 0 1536 1024"`，像素对齐，才能用同一套扇形去裁。

| 角色 | 源 SVG | 生产 WebP（三主题） |
|------|--------|---------------------|
| 扇形外 · 填充 | Git 里改线稿前的 `polonia_sandoren.svg` 等（原型副本 `designed/home-hero-wedge/filled-*.svg`） | `/art/polonia_sandoren.webp`、`-dark.webp`、`-abstract.webp` |
| 扇形内 · 线稿 | `designed/home-hero-relayout/polonia_sandoren_line.svg`（`fill: none`，只改 `stroke`） | `/art/polonia_sandoren-wedge.webp`、`-dark-wedge.webp`、`-abstract-wedge.webp` |

线稿源只描边、不填色。主题差异来自 **stroke 颜色 = 扇形墨**，不是整图 `filter: invert`。

| 主题 | 扇形墨（线稿描边 + 扇形底） |
|------|------------------------------|
| light | `#38697a` |
| dark | `#abde6b` |
| abstract | `#f4f1e8` |

**不要**把扇形内描边改成纸面墨 `--ink`（浅色约 `#2B2823`）。填充图外沿本来就是深墨，内外同色时扇形边界会「消失」，看起来像没换图。必须用上表的 `--wedge`。

## 为何是两张，而不是一张切色

一张图做不到「外面填充、里面线稿」：填充稿没有干净的描边层；线稿没有色块体积。做法是**整幅叠两层**，只用扇形决定「上面那层露多少」。

原型（`designed/home-hero-wedge/`）在一张 SVG 里用两个 `clipPath`：

```
defs
  wedge-clip     ← 三角形扇形
  outside-clip   ← evenodd：整幅矩形挖掉扇形
舞台
  <g clip-path="outside"> 旧填充 </g>
  <g clip-path="wedge">    纸面 + 当前线稿（stroke: var(--wedge)）</g>
  扇形底 polygon（opacity 0.1，可关）
  虚线射线（调参用，生产关）
```

`outside-clip` 的 path 是「先画整幅 `M0,0H1536V1024H0Z`，再画扇形三角形」，`clip-rule: evenodd` 把洞挖掉，所以填充图只出现在扇形外。

线稿载入时会剥掉 path 上写死的 `stroke:…`，改由 CSS `stroke: var(--wedge)` 上色，这样调色盘改扇形墨时描边跟手变。

生产不再做 evenodd 挖洞：底图铺满，顶图用 `clip-path` 只露出扇形。视觉等价，DOM 更简单，也不用在运行时 parse SVG。

## 生产叠层（HomeView）

仅 `v-if="!photoBackgroundEnabled"` 时挂载。三层绝对定位铺满同一 `.home-stage-art-stack`（`aspect-ratio: 1536 / 1024`，`object-fit: fill`），保证 clip 百分比与图对齐。

```
.home-stage-art                ← 导航下缘 → COVER STORY 上缘；宽屏贴右
  .home-stage-art-stack
    img.home-stage-art-base    ← 填充 WebP，不裁
    img.home-stage-art-tint    ← 线稿 WebP，clip-path = 扇形
    div.home-stage-art-wash    ← 同 clip-path，background = 扇形墨，opacity: 0.1
```

主题切换只换两张 `src` 和 wash 的 `backgroundColor`，clip 字符串是常量，算一次即可。

宽屏：`.home-stage-art` 贴右，`max-width: min(78vw, 52rem)`，高度吃满舞台（底边停在 `--cover-peek-height`）。窄屏（≤640px）：不贴右，stack 按 cover 铺满舞台，锚点约 `50% 38%`，露出角色正脸；clip 仍按整幅 1536×1024 算，不要改成「只按可见区域」重算。

## 扇形怎么画

扇形不是 CSS 圆锥渐变，而是 **从顶点射出两条足够长的射线，再连成三角形**，用 `clip-path: polygon(...)` 裁切。

预设在 `frontend/src/composables/homeStageArtWedge.ts`，与原型 `designed/home-hero-wedge/shared.js` 对齐：

| 参数 | 值 | 含义 |
|------|----|------|
| viewBox | 1536 × 1024 | 与 WebP / SVG 一致 |
| 顶点 `(ax, ay)` | `(1270.93, 0)` | 画布上沿偏右；原型可拖圆点改，生产写死 |
| 夹角 `angle` | `39°` | 两射线之间的张角 |
| 中轴 `heading` | `-45°` | 相对**竖直向下**的偏角；负值向左下 |
| 射线长 `RAY` | 4800 | 远大于画布，保证三角形盖住可见区 |

方向约定：`0°` = 正下。终点：

```text
endX = ax + sin(θ) × RAY
endY = ay + cos(θ) × RAY
```

左射线 `θ = heading − angle/2`，右射线 `θ = heading + angle/2`。三点 `(ax, ay)`、左终点、右终点构成 polygon。再把用户坐标换成相对 viewBox 的百分比，这样 `object-fit: fill` 拉伸后 clip 仍咬住图：

```text
polygon(
  82.743% 0.000%,     /* 顶点 */
  …%, …%,             /* 左射线终点 */
  …%, …%              /* 右射线终点 */
)
```

原型里射线会再 `clipToViewBox` 收到画布边上，那只为了画辅助虚线；**clip 本身用未裁短的远点**，避免扇形在画布外被提前收口。生产默认**不画射线**。

扇形底（wash）与 tint **共用**这条 polygon：同色、10% 透明，让扇形里的线稿略沉进一块色淀，边界更可读。不要把 wash 做成整图色罩。

## 原型与生产的分工

| | 原型 `designed/home-hero-wedge/` | 生产 |
|--|----------------------------------|------|
| 填充 / 线稿 | 运行时 `fetch` SVG，塞进 `<g>` | 预栅格 WebP，`<img>` |
| 扇形外 | evenodd 挖洞 | 底图不裁，被上层挡住 |
| 扇形内换墨 | CSS `--wedge` 改 stroke | 栅格时就把 stroke 烤进对应 `-wedge.webp` |
| 调参 | 夹角 / 中轴滑杆、拖顶点、开关底与射线 | 常量；改几何只动 `homeStageArtWedge.ts` |
| `file://` | fetch 会被拦，需本地静态服务 | 不依赖 |

主题 SVG 只留在 `designed/`。不要把大 SVG 拷回 `frontend/public/art/`。

## 关键文件

| 职责 | 路径 |
|------|------|
| 叠层 DOM、主题换图 | `frontend/src/views/HomeView.vue`（`stageArtSrc` / `stageArtTintSrc` / `.home-stage-art-stack`） |
| 扇形几何与墨色 | `frontend/src/composables/homeStageArtWedge.ts` |
| 舞台定位、窄屏 cover 锚点、wash 透明度 | `frontend/src/styles/page-home-hero.css` |
| 生产位图 | `frontend/public/art/polonia_sandoren*.webp` |
| 线稿 SVG 源 | `designed/home-hero-relayout/polonia_sandoren_line.svg` |
| 调参原型 | `designed/home-hero-wedge/` |
| 首屏契约 | `DESIGN.md` §12 |

## 修改时注意

1. **两套图必须同构图、同 viewBox**。线稿重描之后，填充底图也要对齐；否则扇形里外错位。
2. 改夹角 / 顶点 / 中轴时，先在原型里看，再把数字抄进 `HOME_STAGE_ART_WEDGE`。只改 CSS `clip-path` 手写点数容易和 1536×1024 对不上。
3. 重烤 `-wedge.webp` 时只改线稿 `stroke` 为对应扇形墨，保持 `fill: none`。浅色不要烤成 `--ink`。
4. 热路径继续用 WebP。验收：关照片背景，浅 / 深 / abstract 各看一次扇形边界；开照片背景时舞台艺术消失。宽屏贴右、窄屏正脸，两边都要看。
5. `.home-layout` 必须单根，勿为叠层再包一层 fragment（会卡 `AppShell` 的 out-in Transition）。