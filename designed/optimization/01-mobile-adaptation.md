# 01 · 移动端适配

## 目标
站点原本面向桌面设计，手机端有横向溢出、顶栏拥挤、交互元素过小等问题。本轮做全面响应式适配。

## 断点统一
全站统一两档断点，消除此前各处零散、不一致的 media query：

| 断点 | 目标设备 |
|---|---|
| `≤ 768px` | 平板 / 手机 |
| `≤ 480px` | 小屏手机 |

## 覆盖范围（约 20 个文件）
- **全局基线** `styles/main.css`：容器、间距、字号在两档断点下收敛；
- **顶栏 / 导航** `AppShell` / `SiteNav` / `SiteNavGroup`：手机改**两行布局**，触控目标增大；
- **列表 / 详情**：Blog / Projects / PostDetail / ProjectDetail / markdown 阅读版式；
- **表单 / 互动页**：Messages（留言）/ friends / about / compose / 404；
- **UI 组件 / 音乐播放器 / 开屏**：音乐播放器在 `≤768px` **默认收起**（避免遮挡）；
- **`index.html`**：`viewport` 加 `viewport-fit=cover`（适配刘海屏安全区）。

## 关键处理
- **光标拖尾**（`cursor-trail`）在触屏设备隐藏：`@media (max-width: 768px), (hover: none) and (pointer: coarse) { display: none }` —— 触屏没有鼠标，拖尾无意义且耗性能；
- **零横向溢出**：在 375px / 320px 视口逐页核查，无任何水平滚动条。

## 验证
逐页在 375px（iPhone SE/标准）与 320px（极窄）视口检查：版式正常、无溢出、触控目标够大。
