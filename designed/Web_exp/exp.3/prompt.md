# 实验 3：JavaScript / jQuery 交互 — 说明

在 **exp.2**（外部 CSS、`css/style.css`）基础上，本实验将脚本外置为 **`js/main.js`**，通过 **jQuery 3.7（CDN）** 与原生 API 实现页面交互。

## 作业要点对照

| 要求 | 实现位置 |
|------|----------|
| jQuery 引入与 `$()`、选择器、事件、DOM | `index.html` CDN + `js/main.js` |
| 至少三类交互 | 导航选项卡、主题切换、歌单搜索、侧栏收起、返回顶部、Toast |
| 表单校验与展示 | `#prefsForm` 非空/范围/日期格式；`#diaryForm` 非空；`#formFeedback` |
| DOM 动态增删 | `#playlistEl`、`#listenLog`、`#dropList` 由脚本生成 |
| 多类事件 | `click`、`change`、`input`、`keydown`、`pointer*`、拖放、`scroll` |
| jQuery 动画 | `fadeIn`/`fadeOut`（Toast、拖放卡片）、`slideUp`/`slideDown`（侧栏、反馈区）、`animate`（返回顶部） |
| 数据动态更新 | Canvas 环、SVG 电平、`progress`/`meter`、播放状态文案 |
| 多媒体与文件 | 播放控制、拖放预览与删除、状态提示 |
| 外置脚本、无 `onclick` | 仅 `js/main.js`，无行内事件属性 |

## 运行

在 `exp.3` 目录执行 `python -m http.server 8765`，访问 `http://localhost:8765/index.html`。
