---
title: 动效降级：偏好、运行时档与可见性
slug: grunray-wiki-note-motion
type: project_note
tags:
  - Vue
  - 动效
  - 性能
summary: 用户偏好与 html[data-motion] 分开；REDUCED 是瞬切可见，不是预隐藏，也不是把页脚伪造为已揭开。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 13
published_at: '2026-09-19T02:30:00'
updated_at: '2026-09-19T02:30:00'
project_id: proj-grunray-wiki
---

## 界面布局

动效契约在 `docs/DESIGN.md` §9（批次 151）。导航里选的是**用户偏好**，组件只读**运行时档**。两套三态不要混，也不要在各个组件里再写 `matchMedia`、`isMobile` 或 `fps < 40`。

偏好放在顶栏溢出面板，刊头 `MOTION · 动效`，三项是 `AUTO / REDUCED / FULL`（跟随系统 / 降级 / 完整）。外观是纸面加 `.ed-action`，不要药丸开关。

| 偏好 `ui.motionPreference` | 含义 | 存储 |
|----------------------------|------|------|
| `auto` | 跟随系统，默认 | `localStorage ui.motionPreference` |
| `reduced` | 永久手动降级 | 同上 |
| `full` | 尽可能完整 | 同上 |

运行时档写到 `html[data-motion]`，取值 `full` / `reduced` / `minimal`。CSS 里的 `@media (prefers-reduced-motion)` 只当系统底线；用户手动 REDUCED 靠 dataset，因为此时系统媒体查询仍是 no-preference。

解析从高到低：

1. 系统 `prefers-reduced-motion: reduce` → 一律 `minimal`。AUTO、REDUCED、FULL 都不能抬上去。
2. 手机壳层（`max-width: 768px`）强制关掉持续 rAF 特效（拖尾、FPS、照片背景、音乐展开，页脚只留 ICP）。**不改**偏好存储，也**不把** `data-motion` 写成 `minimal`。短 hover 仍可走 CSS。
3. 用户选 `reduced` → `reduced`。
4. 用户点了性能建议的同意 → 写入 `reduced`。只建议，禁止静默改档。
5. 用户 `full` 且系统不是 reduce → `full`。
6. `auto` 且系统无偏好 → `full`。低端机或采样异常只提高「弹出建议」的概率。

REDUCED 仍要像这份纸面刊：砍持续消耗，留着色和排版。MINIMAL 才对应系统无障碍，非必要动画关掉。

## 数据与 API

不走后端。状态在 Pinia `frontend/src/stores/ui.ts`。

| 名字 | 谁写 | 谁读 |
|------|------|------|
| `motionPreference` | 溢出面板、性能气泡同意 | 只用于解析 |
| `motionLevel` | 由上面的顺序算出来 | 组件、`html[data-motion]` |
| `motionHintDismissed` | 忽略建议时 | 本会话不再弹 |
| `cursorTrail` | 拖尾开关 | 仅 `full` 且开关为开才挂载 Canvas |

性能建议是附件，不是常驻探测器。首次进入、本会话还没结论、页面可见时，空闲约 8 秒后再采约 8 秒。异常再确认一轮。两轮仍异常且人在前台，才从 MOTION 旁边出纸面气泡，不是中央对话框。同意才写入 `reduced`；忽略记 `ui.motionHintDismissed`。禁止因为 FPS 低就自动关特效，禁止用 FPS 浮层当降级探测器。浮层仍是手动调试，关掉就停 rAF。

一轮算异常要同时满足：平均帧率低于约 0.65 倍刷新率，且窗内至少 8 次帧时间超过 50ms。`hardwareConcurrency` ≤ 4 或 `deviceMemory` ≤ 4 时，长帧次数可降到 5，仍须两轮、页面可见、不是后台长帧。

## 降级对照

组件不要各自发明第四档。能力差一览（桌面；窄屏另有壳层强制关，见上）：

| 能力 | full | reduced | minimal |
|------|------|---------|---------|
| 页脚 GrunRay 扭曲 rAF | 开 | 关；滚动揭开仍走 clip | 同左 |
| 月相拖尾 Canvas | 尊重开关 | 不挂载 | 不挂载 |
| 页面入场 | 现时长 | 瞬切，仍打 `page-enter--play` | 瞬切 |
| 顶栏滚动胶囊 | 开 | 保持横条 | 保持横条 |
| 顶栏 FLIP / spring | 开 | 关 | 关 |
| 方案 G 翻角 / 花藤 / 位移 | 开 | 只留着色 | 只留着色 |
| 普通 CSS hover、下划线 | 开 | 开 | 开 |
| 音乐是否可播 | 开 | 开 | 开（不自动播） |
| 碟片持续旋转 | 开 | 关 | 关 |
| 照片 blur-up | 开 | 直接到位 | 直接到位 |
| 开屏蜗牛 | 开 | 跳过 | 跳过 |
| 滚动 | smooth | 可保留 | `auto` |

拖尾默认关，只有 `localStorage ui.cursorTrail=1` 才动态加载引擎。音乐播放器点开展开才挂。这些是首屏预算（批次 150），和降级表叠在一起：即使档位是 `full`，没打开也不进包。

## 关键文件

| 职责 | 路径 |
|------|------|
| 契约 | `docs/DESIGN.md` §9 |
| 偏好与运行时档 | `frontend/src/stores/ui.ts` |
| 短窗建议 | `frontend/src/composables/useMotionPerformanceHint.ts` |
| 入场 play 类 | `frontend/src/composables/usePageEnterAnimation.ts` |
| 页脚 clip | `frontend/src/composables/useFooterGrunRayReveal.ts` |
| 路由离开收尾 | `frontend/src/components/layout/AppShell.vue` |
| 已踩坑 | `docs/TROUBLESHOOTING.md` 动效一节 |

## 实现要点

1. **REDUCED 是瞬切可见，不是永远预隐藏。** `page-enter-*.css` 的预隐藏只挂在 `html[data-motion=full]`。跳过动画时仍要 `stampPageEnterPlay` / 打上 `page-enter--play`。漏了这一步，节点在 DOM 里，opacity 一直是 0。
2. **不要把揭开进度伪造为 1。** 降级可以停掉页脚扭曲 rAF，但 `--reveal-progress` 仍跟真实滚动。只有 `.is-fully-revealed` 之后才 `clip-path: none`。若在 reduced 上写死 `clip-path: none`，大字会常驻挡住正文。
3. **跳过 GSAP 时不要同步 `done()`。** 路由 `out-in` 或分栏关闭若在同步钩子里拆还连着的节点，会报 `parentNode` 为 null。先 `killTweensOf`，节点仍连接再 `clearProps`，然后 `requestAnimationFrame(() => done())`。`clearProps` 不要把详情正文的 opacity 清没。
4. **胶囊不属于降级。** REDUCED / MINIMAL 下顶栏保持横条，不要收成滚动胶囊。
5. **壳层关工具不写存储。** 窄屏强制关拖尾、照片、FPS、音乐展开，离开窄屏要恢复用户原来的偏好。这和 MOTION 三档是两条线。
