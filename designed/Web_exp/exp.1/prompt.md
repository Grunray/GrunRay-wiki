# 实验 1：独立 HTML5 音乐播放器 — 生成与实现说明

## 原始实验要求

需独立设计并实现一个功能完整、符合工程规范的 PC 端单页 Web 应用。主题为音乐播放器。具体说明：

1. **语义化页面结构**：使用 `<header>`、`<nav>`、`<main>`、`<section>`、`<article>`、`<aside>`、`<footer>`、`<figure>` + `<figcaption>` 等构建清晰的桌面端三栏或多区布局（左侧导航 + 中间主内容区 + 右侧详情/工具面板）。
2. **增强型表单**：使用 `type="date"`、`type="range"`、`type="number"`、`type="color"`、`<datalist>`、`<optgroup>`、`<output>`、`<progress>`、`<meter>`、`<fieldset>` + `<legend>` 等实现数据录入功能。
3. **图形绘制**：使用 Canvas 或 SVG 实现可交互的进度可视化组件，数据支持动态更新。
4. **多媒体播放**：使用 `<video>` + 自定义控制条（播放/暂停、进度、音量、倍速、全屏），并搭配 `<audio>` 实现音乐或背景音乐。
5. **拖放与文件 API**：使用 Drag & Drop API + File API 实现文件/图片拖入、预览、删除；默认尝试加载与 HTML 同目录或 `media/` 下的曲目列表（需通过本地 HTTP 服务打开，见 `index.html` 页脚说明）。
6. **地理定位 API**：使用 Geolocation API 获取用户位置，并根据位置提供相关提示或功能。

## 参考代码

结合 `frontend/src/components/music/FloatingMusicPlayer.vue`：可借鉴其 `<audio>` 驱动的播放/暂停、上一首/下一首、`timeupdate` 同步、可拖动/点击的进度轨、音量 `range` 与 `localStorage` 持久化等思路；独立页面需去掉 Vue/Pinia/API 依赖，并按要求扩展为三栏布局、`<video>`、Canvas/SVG、表单控件、拖放与定位。

## 三栏内容建议

| 区域 | 语义标签 | 建议内容 |
|------|-----------|----------|
| 左栏 | `<nav>` + `<section>` | 歌单、分类筛选；`<fieldset>` + `<legend>` 包裹筛选条件 |
| 中栏 | `<main>` + `<article>` | 当前曲目、`<figure>` 封面、`<video>` + 自定义控制条、`<audio>` 主音乐 |
| 右栏 | `<aside>` | Canvas/SVG 环形进度、上传预览、地理位置卡片、部分表单展示 |
| 页眉/页脚 | `<header>` / `<footer>` | 标题、主题切换、实验与运行方式说明 |

## 给实现者 / Agent 的完整提示词（已落地为同目录 `index.html`）

请将以下说明作为实现约束（本仓库已在 `designed/Web_exp/exp.1/index.html` 中实现一版，可按课程要求改歌单与媒体文件）。

**任务说明**

基于 `FloatingMusicPlayer.vue` 作为**交互与视觉参考**（不复制 Vue/Pinia/API）；交付**单文件** `index.html`（HTML5 + CSS3 + 原生 JS），样式变量对齐 `frontend/src/styles/themes/tokens.light.css`（及可选深色 `tokens.dark.css`），无构建、无框架。

**从 Vue 组件借鉴**

- `<audio>` + `timeupdate` / `loadedmetadata` 同步时间与总时长。
- 进度：时间行 + 可点击/拖动 seek（Pointer Events）；另加 **Canvas 或 SVG** 环形/波形类可视化并与播放进度绑定。
- 播放控制：播放/暂停、上/下一曲、音量 `range`；可选用 `localStorage` 保存音量、曲目索引、播放位置。
- 歌单数据：独立页改为相对路径列表、`media/playlist.json` 或用户拖入文件，不调用项目后端。

**实验规范**

1. 语义化三栏布局（`header` / `nav` / `main` / `article` / `aside` / `footer` / `figure` + `figcaption`）。
2. 表单元素：`date`、`range`、`number`、`color`、`datalist`、`optgroup`、`output`、`progress`、`meter`、`fieldset` + `legend`，且与页面逻辑或展示关联。
3. Canvas 或 SVG 可交互进度可视化，随 `audio` 更新。
4. `<video>` 自定义控制条：播放/暂停、进度、音量、倍速、全屏；`<audio>` 承担主音乐或 BGM。
5. 拖放 + File API：预览列表与删除；默认曲目通过 `./media/*.mp3` 与可选 `playlist.json` 在 **HTTP 本地服务** 下加载（`file://` 下受浏览器限制需拖放）。
6. Geolocation：请求权限，在侧栏展示坐标或提示，并用简单规则给出「与位置相关」的播放建议文案。

**工程要求**

- PC 宽度优先；Flex/Grid、过渡；基本 `aria-*` 与键盘可用性。
- 页脚注明：参考了浮动播放器的哪些点，以及为满足课程新增哪些模块。

**视觉**

- 使用与项目一致的浅色/深色 CSS 变量（主色 `#a0ccab`、正文 `#334F52`、玻璃拟态卡片等）。
