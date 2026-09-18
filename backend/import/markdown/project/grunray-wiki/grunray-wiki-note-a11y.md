---
title: 无障碍：键盘路径与焦点归还
slug: grunray-wiki-note-a11y
type: project_note
tags:
  - Vue
  - 无障碍
  - 键盘
summary: Skip link、汉堡抽屉、Read sheet 与出站确认的焦点陷阱；关面板前先把焦点移出，再标 aria-hidden。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 12
published_at: '2026-09-19T02:30:00'
updated_at: '2026-09-19T02:30:00'
project_id: proj-grunray-wiki
---

## 界面布局

这条线不另做皮肤。纸面、强调色和焦点环仍跟 `docs/DESIGN.md`；键盘与读屏的约定写在 `docs/ACCESSIBILITY.md`（批次 149）。目标是不碰鼠标也能走完：顶栏 → 主内容 → 抽屉或 sheet → 出站确认。

页顶第一条可 Tab 的控件是 Skip link（文案键 `nav.skipToMain`）。默认移出视口，`:focus-visible` 时落到纸面上。激活后焦点必须进 `<main id="main" tabindex="-1">`，不要只改 hash。`#main` 只包 `RouterView`，不包顶栏。

打开的模态只有三处，行为同一套：

| 表面 | 何时是对话框 | 关闭后焦点回到 |
|------|----------------|----------------|
| 汉堡抽屉 | 窄屏壳层，`role="dialog"` | 汉堡钮 |
| 碎念 / 推荐 Read sheet | 仅手机壳层底部 sheet | 打开前的名录行 |
| 顶栏溢出菜单 | 桌面工具溢出面板 | 溢出触发器 |

三处都要：焦点陷阱、`Esc` 关闭、关闭后焦点归还触发器。可见焦点环用全局 `:focus-visible`（2px `accent`，offset 2px）。顶栏工具钮不能靠 hover 才看得出能点。

桌面栖息分栏**不是**对话框，不套陷阱。出站确认是独立路由 `/leave/redirect`，也不是抽屉。

## 数据与 API

无障碍状态不进接口，也不单独落库。

| 能力 | 落点 |
|------|------|
| Skip / 抽屉 / 溢出 | `AppShell.vue`，陷阱用 `useFocusTrap` |
| Read sheet 与桌面分栏关详情 | `XiqiSplitLayout.vue` |
| 出站键盘与读屏提示 | `SiteLeaveRedirectView.vue` |
| 焦点环 | 全局 `:focus-visible`，溢出钮在 `nav-toolbar.css` |

抽屉触发器带 `aria-expanded`、`aria-controls="mobile-nav-drawer"`，开和关各一套 `aria-label`。打开后焦点先进关闭钮，Tab / Shift+Tab 不逃出面板。点遮罩与 `Esc` 同等关闭。

Read sheet 同样 `aria-modal="true"`。打开时记下触发行（名录按钮或链接），焦点优先进关闭钮。`Esc` 后回到该行，而不是落到 `body`。

溢出面板 `id="nav-overflow-panel"`。Tab 在面板里的工具钮之间循环。工具钮的 `:focus-visible` 要和 hover 一样能看见（字色、底线、全局 outline）。

出站页进入后焦点落在「继续前往」。`Esc`：本页取消则回 `return_to`；`tab=1`（新标签）则尝试关页。进行中的句子用 `role="status"`；关页失败再加 `aria-live="assertive"`，否则读屏听不到。

## 关键文件

| 职责 | 路径 |
|------|------|
| 契约 | `docs/ACCESSIBILITY.md` |
| 壳层、Skip、抽屉、溢出 | `frontend/src/components/layout/AppShell.vue` |
| 焦点陷阱 | `frontend/src/composables/useFocusTrap.ts` |
| 栖息分栏 / Read sheet | `frontend/src/components/xiqi/XiqiSplitLayout.vue` |
| 出站确认 | `frontend/src/views/SiteLeaveRedirectView.vue` |
| 溢出焦点样式 | `frontend/src/styles/nav-toolbar.css` |

## 实现要点

1. **先移焦点，再隐藏。** 给容器加 `aria-hidden` 或 `inert` 之前，内部不能还握着焦点。关碎念 / 推荐详情时，若焦点还在 `.xiqi-detail-close` 上就标隐藏，浏览器会报 `Blocked aria-hidden`。正确顺序是 `releaseDetailFocus()`：把焦点还给打开时记下的名录行，再清选中项。桌面分栏和手机 sheet 都走这一步；只有 sheet 才启用陷阱。
2. **Skip 要移动焦点。** 只写 `href="#main"` 不够。激活后焦点应落在 `#main` 上，否则读屏仍停在顶栏。
3. **不要把分栏做成 dialog。** 宽屏右栏是阅读栏，Tab 应能在名录和正文之间来回。陷阱只在 `data-mobile-shell` 的底部 sheet 上打开。
4. **动效降级不在这篇展开。** 系统 `prefers-reduced-motion` 与用户 MOTION 档见动效笔记；FULL 不能抬过系统 reduce。本篇不复制那张能力表。
5. **验收按五条走。** Skip 跳过顶栏；窄屏抽屉 Tab 不逃出、关闭回汉堡；窄屏 sheet 关闭回该行；出站 Tab 在取消 / 继续之间，关页失败能被读到；桌面溢出键盘可达且焦点环可见，`Esc` 回到触发器。
