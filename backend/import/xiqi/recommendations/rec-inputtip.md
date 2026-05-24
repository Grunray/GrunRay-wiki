---
public_id: rec-inputtip
category: opensource
rating: 5
title: InputTip
status: published
created_at: '2026-05-24T11:30:00'
url: https://github.com/abgox/InputTip
summary: Windows 输入法状态提示与切换；中英文混打时一眼知道当前是中文还是英文。
images:
  - url: /api/media/files/xiqi/recommendations/rec-inputtip.png
    alt: InputTip 图标
cover_index: 0
---

[InputTip](https://github.com/abgox/InputTip) 是 abgox 开源的 Windows 输入法状态管理小工具。写代码、写 Markdown、在终端和浏览器之间来回切的时候，最怕的就是「以为在英文，其实还在中文」——InputTip 就是专门解决这个痛点的。

**为什么值得装**

- **状态一眼可见**：支持鼠标跟随、浮窗、符号等多种提示方案，当前输入法是中/英/全角半角，不用猜。
- **按窗口 / 热键切换**：可以给 VS Code、终端、浏览器等配规则，进窗口自动切到想要的输入法；也支持热键手动切换。
- **够轻**：后台常驻，资源占用低，不会像某些大而全的输入法套件那样拖慢机器。
- **可扩展**：支持状态导出，还有 [InputTip for VSCode](https://github.com/abgox/InputTip) 等周边集成。

技术栈基于 AutoHotkey v2，仓库在 GitHub 上维护活跃（AGPL-3.0）。文档站 [inputtip.abgox.com](https://inputtip.abgox.com) 把各方案讲得很细，按自己的习惯选一种提示方式即可。

**我的用法**

日常开发以英文输入为主，聊天和中文文档切中文。给 Cursor / 终端设英文，给飞书 / 微信设中文，再配合浮窗提示，基本不会再出现「打出一串拼音才发现没切回来」的情况。

**适合谁**

- Windows 用户，中英文频繁切换，且对输入法状态很敏感的人。
- 已经用 RIME、搜狗、微软拼音等，只缺一个「状态可见 + 自动切换」层的人。

Release 页直接下安装包即可；配置窗口规则花几分钟，后面每天省下来的纠错时间很划算。
