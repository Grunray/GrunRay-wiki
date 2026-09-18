# GrunRay wiki — ACCESSIBILITY.md

> 键盘与读屏契约。视觉语言仍以 [DESIGN.md](./DESIGN.md) 为准；本文件不另开皮肤。
> 批次 **149**（2026-09-18）扫过壳层后的主导航、汉堡抽屉、Read sheet、出站确认。

## 1. 原则

- 不碰鼠标也能走完：顶栏 → 主内容 → 抽屉 / sheet → 出站确认。
- 打开的模态（抽屉、Read sheet、顶栏溢出）必须：**焦点陷阱**、**Esc 关闭**、**关闭后焦点回到触发器**。
- 可见焦点环沿用全局 `:focus-visible`（2px `accent`，offset 2px）。顶栏工具钮不得靠 hover 才露交互态。
- 动效遵守系统 `prefers-reduced-motion` 与用户 MOTION 档（见 DESIGN §9）；FULL 不能抬过系统 reduce。本文件不重复降级细则。

## 2. Skip link 与主内容

- 页顶第一条可 Tab 控件是 Skip link（`nav.skipToMain`），默认移出视口，`:focus-visible` 时落在纸面上。
- 目标是 `<main id="main" tabindex="-1">`。激活后焦点落到 `#main`，不要只改 hash 却不移动焦点。
- `#main` 包住 `RouterView`，不要包顶栏。

## 3. 汉堡抽屉

- 触发器：`aria-expanded`、`aria-controls="mobile-nav-drawer"`、开/关两套 `aria-label`。
- 面板：`role="dialog"` `aria-modal="true"`。打开后焦点进抽屉内第一个可聚焦控件（关闭钮）；Tab / Shift+Tab 不逃出抽屉。
- `Esc` 或点遮罩关闭；关闭后焦点回到汉堡钮。
- 实现：`AppShell.vue` + `useFocusTrap`。

## 4. Read sheet（碎念 / 推荐 · 手机壳层）

- 窄屏 editorial 详情是底部 sheet，不是右栏。`role="dialog"` `aria-modal="true"`，关闭钮有 `aria-label`。
- 打开时记下触发行（名录按钮 / 链接），焦点进 sheet（优先关闭钮）；Tab 困在面板内。
- `Esc` 关闭；关闭后焦点回到打开前的触发行。
- 桌面分栏不是 dialog，不套陷阱。关闭时若焦点还在详情内（关闭钮），先归还名录行，再给面板 `inert` / `aria-hidden`。
- 实现：`XiqiSplitLayout.vue`。

## 5. 顶栏溢出菜单

- 触发器：`aria-expanded`、`aria-controls="nav-overflow-panel"`。
- 打开后面板 `role="dialog"` `aria-modal="true"`；Tab 在面板工具钮之间循环；`Esc` 与点外侧关闭，焦点归还触发器。
- 工具钮 `:focus-visible` 与 hover 同等可见（字色 + 底线 + 全局 outline）。
- 实现：`AppShell.vue`、`nav-toolbar.css`。

## 6. 出站确认

- `/leave/redirect`：取消 / 继续可 Tab；进入页后焦点落在「继续前往」。
- `Esc`：本页取消返回 `return_to`；`tab=1` 则尝试关页。
- 进行中文案与关页失败提示用 `role="status"`；关页失败另加 `aria-live="assertive"`。
- 实现：`SiteLeaveRedirectView.vue`。

## 7. 验收清单（批次 149）

1. Tab 到 Skip link → 激活后焦点在 `#main`，顶栏被跳过。
2. 窄屏：打开汉堡 → Tab 只在抽屉内 → 选一页或 Esc / 关闭 → 焦点回到汉堡钮。
3. 碎念（或推荐）窄屏：打开一条 Read sheet → Esc 关闭 → 焦点回到该名录行。
4. 出站确认：Tab 在取消 / 继续之间；Esc 取消；关页失败时读屏能听到提示。
5. 桌面：打开顶栏溢出 → 键盘走到各工具钮且焦点环可见 → Esc 关闭，焦点回到溢出触发器。
