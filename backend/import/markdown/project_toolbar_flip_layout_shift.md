---
title: 顶栏工具按钮 FLIP 后出现「右移再回弹」的布局抖动
slug: project-toolbar-flip-layout-shift
type: article
tags:
- Vue3
- FLIP
- CSS
- 布局
- 动画
summary: 记录顶栏在「面板打开功能 → 工具槽出现」过程中，因幽灵占位脱离 flex 流导致 FLIP 后二次重排的现象，以及改为流内占位、分离 Transition 与弹跳动画的修复思路。
series: 项目与工程
locale: zh
pinned: false
pinned_order: 9999
published_at: '2026-05-03T17:50:00'
updated_at: '2026-05-03T17:50:00'
---

## 问题背景

顶栏右侧在「新按钮出现」或相关动画播完后，会出现：**新出现的按钮以及左侧已有按钮整体先向右侧轻微移动，再回到正确位置**，视觉上像「抽一下」。

一开始容易猜成：动画阶段没有给按钮预留占位，结束后浏览器重新算位置导致抖动。这个方向**对了一半**：确实和「占位与布局宽度不一致」有关，但更精确的原因在下面。

## 原因分析

顶栏工具区使用 **FLIP**（先拍布局快照，再算位移用 `transform` 过渡）时，若在「幽灵阶段」把占位元素设为 **`position: absolute`**，则该占位 **不参与 flex 子项的宽度分配**。

于是会出现：

1. FLIP 计算时，整行按「较窄」的 flex 布局量到位移；
2. 动画结束、按钮真正以 **流内（in-flow）** 形式参与布局时，整行突然多出约 **2rem**（圆形按钮宽度）等宽度；
3. 浏览器再排一次版，表现为 **先右移、再回到稳定位置**。

换句话说：**不是单纯「没预留位置」一句话能概括，而是幽灵阶段与最终阶段的「参与 flex 的方式」不一致**，导致 FLIP 与最终布局不一致。

实现上，槽位位移逻辑集中在 `useHeaderToolbarLayoutShift.ts`（`captureToolbarFlipSlots`、`playToolbarFlipBeforeReveal` 等），与 `AppShell.vue` 顶栏右侧 `headerRightRef` 内带 `data-toolbar-flip` 的槽位配合使用。

## 修改要点

### 1) 幽灵占位改回流内，稳定 flex 宽度

对 `.toolbar-shift-ghost` **不要使用绝对定位**占满槽位，而是：

- 固定 **`width` / `height`（如 2rem）**，与真实圆形按钮一致；
- **`flex-shrink: 0`**，避免被挤扁；
- **`visibility: hidden`** + **`pointer-events: none`**，视觉上不可见但仍占位。

这样在 **narrow → wide → FLIP 全过程** 中，目标槽位宽度与真实按钮一致，FLIP 结束后不会因「占位从脱离文档流变回流内」再触发一次整行重排。

对应样式思路（与当前 `AppShell.vue` 中注释一致）：幽灵占位参与 flex，避免 FLIP 结束后再插入流内按钮导致整行二次重排。

### 2) 避免不必要的二次 `key` 递增与重复挂载

若对同一槽位 **多次递增** `:key`（例如 photo / trail / music 相关逻辑里重复触发），可能造成 **先卸载再挂载** 的一帧宽度丢失，或 `Transition` 再跑一遍 enter，与 FLIP 叠在一起。修复方向是：**只在需要的时机 bump key**，避免「为动画而动画」导致的额外重排。

（具体以各 `*BarEnterKey` 的调用路径为准，原则是：**少一次 remount，就少一次布局不确定**。）

### 3) FLIP 结束后再做「出现」弹跳，并与 Vue Transition 解耦

- **幽灵阶段**：`Transition` 的 **enter 时长置为 0**（例如通过 `photoToolbarTransitionMs` 等在 `*BarGhost` 为 true 时把 `enter` 设为 0），避免与 FLIP 后的位移再叠一层 Vue enter 缩放。
- **幽灵关闭后**：给真实按钮加一次性 class（如 `toolbar-slot-spring-pop`），用与顶栏工具 enter **同一套 keyframes**（如 `nav-toolbar-tool-btn-pop`）做弹跳。
- 在 **`animationend`** 里移除 class，并校验 **`ev.target === ev.currentTarget`** 与 **`animationName`**（如 `nav-toolbar-tool-btn-pop`），避免子元素或其它呼吸类动画误触清理逻辑。若个别浏览器对 `animationName` 大小写敏感，可再收紧判断。

这样既保留「**先 FLIP、再出现**」的节奏，又不会在出现结束后因布局突变再抖一下。

## 可记结论

- **FLIP 的「前后两帧布局」必须在同一套 flex 规则下可比较**；幽灵若脱离 flex 宽度，就会在结束瞬间「补宽度」造成整行抖动。
- **动画分层**：位移用 FLIP / Web Animations；出现感用一次性 CSS keyframes；Vue `Transition` 的 enter 在幽灵阶段关闭，避免双重动画与二次布局。

## 注意事项

- **`prefers-reduced-motion`** 时应跳过 FLIP 弹跳或缩短时长，避免对系统「减少动效」设置不友好。
- 顶栏右侧多个圆形工具若拆成多个 flex 子项，可能与 `gap` 叠出「假空白」；当前实现里用 **`header-toolbar-cluster` + `display: contents` 子容器** 等结构控制间距，改幽灵方案时注意不要破坏这一层间距语义。
