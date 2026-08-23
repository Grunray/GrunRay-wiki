## 背景与现象

任务 **108.P0** 要求压低首页 Hero 横幅 `home-band`（内嵌横向 `FilmFeed`）的高度，让用户更快看到 Cover Story / Latest。

- **删文案**（去掉 `cover-kicker`「站点名 · tagline」）单独改，**不会**触发问题。
- **只改 `.home-band` 的 `height`**，且 `FilmFeed` 仍 `inset: 0` 铺满父级时，在 **Chrome / Edge** 打开首页会**卡死未响应**，CPU、内存、磁盘占用可飙到 95%–100%。
- **Cursor 内置浏览器** 往往不复现，必须在第三方浏览器里验。
- 开发终端常见：`ResizeObserver loop completed with undelivered notifications`。

## 界面与高度链条

首页 Hero 结构（`HomeView.vue`）：

```
.home-band（定可视高度，overflow: hidden）
  ├── FilmFeed.home-band-film（absolute; inset: 0 → 高度 = 父级）
  ├── .home-band-scrim（暗场渐变）
  └── .home-band-copy（刊名文案压底）
```

`FilmFeed` 横向模式（`horizontal`）关键 CSS（`FilmFeed.vue`）：

| 节点 | 尺寸逻辑 |
|------|----------|
| `.film-container` / `.film` | `height: 100%`（跟父级） |
| `.film-container--horizontal .track` | `top: 27px`；`height: calc(100% - 54px)`（上下齿孔各约 20px + 边距） |
| `.film-container--horizontal .frame` | `height: 100%`；`aspect-ratio: 4 / 5` → **格宽 ≈ 轨道高度 × 0.8** |

因此：**父级变矮 → 轨道变矮 → 单格变窄 → 整轨 `scrollWidth` 变小**。

无缝循环副本数由 `measureLoopCopies()` 计算：

```text
needed = min(MAX_REPEAT, max(2, ceil(viewport / setSize) + 1))
setSize = track.scrollWidth / repeatCount   // 横向为宽度
viewport = film.clientWidth                 // 横向为胶片视口宽
```

容器变矮后 `setSize` 变小，`needed` 会增大（上限 `MAX_REPEAT = 24`）。`loopItems` 会把 `items`（最多 50 条）复制 `repeatCount` 份，DOM 与图片数量成倍增加。

## 根因（为何会卡死）

旧实现里三件事叠在一起：

1. **`:key="repeatCount"` 绑在 `.track` 上** — `repeatCount` 一变，整条轨道及所有 `.frame` / `AppImage` **整棵子树销毁再建**，图片重新解码、读盘。
2. **`ResizeObserver` + 改 `repeatCount`** — 观察 `.film`（且曾在 `watch` 里再 `observe(track)`）；副本数变化引起布局变化，再次触发测量，形成反馈。
3. **`void nextTick(measureLoopCopies)` 递归** — 一次测量不够还会立刻再测，与上面叠加更易打满。

布局尚未稳定时，`setSize` 可能接近 0，`ceil(viewport / setSize)` 会直接顶到 `MAX_REPEAT`，瞬间制造海量 DOM 与媒体请求 — 表现为整机资源打满。

**结论**：问题不是「CSS 改错一个数字」，而是 **降高改变了横向胶片的格宽几何，触发了副本测量与整轨重挂载的恶性循环**。只裁切外框、不让内部变矮，可以避免卡死，但会挡住胶片上沿（齿孔、画面上方），不可接受。

## 失败尝试（勿单独复用）

| 尝试 | 结果 |
|------|------|
| 仅改 `.home-band { height }`，`FilmFeed` `inset: 0` | Chrome/Edge 卡死 |
| 去掉 `measureLoopCopies` 递归 | 仍卡 |
| 去掉 `ResizeObserver` | 仍卡（`:key` 仍在） |
| `track` 加 `min-height` + 上述修补 | 仍卡 |
| **外框变矮、`.home-band-film` 保持原高度并 `bottom: 0` 对齐** | 不卡，但**上沿被裁切**（齿孔/画面上方不可见） |

## 最终方案（2026-08-23）

### HomeView：变矮且铺满，不裁切

`.home-band` 使用较低高度；`.home-band-film` 仍 `inset: 0`，胶片与容器同高，上下齿孔完整可见。

| 断点 | 原高度 | 现高度 |
|------|--------|--------|
| 默认 | `clamp(19rem, 46vh, 28rem)` | `clamp(13rem, 32vh, 20rem)` |
| `max-width: 640px` | `clamp(15rem, 38vh, 22rem)` | `clamp(10rem, 26vh, 16rem)` |

### FilmFeed：副本测量与 DOM 稳定性

1. **去掉** `.track` 上的 `:key="repeatCount"` — 副本数变化只增删 `.frame` 节点，不整轨重挂载。
2. **`scheduleMeasureLoopCopies()`** — `ResizeObserver` 回调里用 `requestAnimationFrame` 合并测量，避免同帧连环触发。
3. **只观察 `filmRef`** — 不再在 `watch` 里对 `track` 做 `observe`。
4. **`measuring` 锁** — 更新 `repeatCount` 的同一轮不重入。
5. **`minSet` 门槛** — 布局未就绪（格宽过小）时不增大副本数；横向：`n × max(48, track.clientHeight × 0.45)`，纵向：`n × 80`。

变矮后单格变窄，`repeatCount` 从 2 增到约 12 属正常（宽屏填满），只要不再爆炸到 24 且反复重建即可。

## 关键文件

| 职责 | 路径 |
|------|------|
| Hero 高度与挂载 | `frontend/src/views/HomeView.vue`（`.home-band` / `.home-band-film`） |
| 胶片墙与副本逻辑 | `frontend/src/components/media/FilmFeed.vue`（`measureLoopCopies`、`scheduleMeasureLoopCopies`） |
| 首页入场（与本次无关，勿误改） | `frontend/src/styles/page-enter-home.css` |
| 任务记录 | `TODO.md` §108 |

## 修改时注意

1. **不要**只改 `.home-band` 高度而不动 `FilmFeed` 测量逻辑；**不要**恢复 `.track` 的 `:key="repeatCount"`。
2. **不要**用「外框矮、内部保持原高 + `overflow: hidden`」当最终方案 — 会裁掉胶片上沿。
3. 改 Hero / FilmFeed 后必须在 **Chrome 或 Edge** 打开 `/`，停留并滚动约 30 秒；同时目视确认**上下齿孔**都在容器内。
4. 删 `cover-kicker` 与降高独立；删字不触发本问题。
5. 若再调横向格比例（`aspect-ratio`、齿孔 `top`/`calc(100% - 54px)`），需重新在宽屏下看 `repeatCount` 与 frame 数量是否稳定。