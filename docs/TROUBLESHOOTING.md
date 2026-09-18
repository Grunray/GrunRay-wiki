# GrunRay wiki — TROUBLESHOOTING.md

> 踩过坑的**现象 → 根因 → 解法**，方便下次对照。不是任务清单，也不是对外变更日志。
>
> **分工**：代理总入口 → [`AGENTS.md`](../AGENTS.md)；未修完的活 → [`TODO.md`](../TODO.md)；已合入摘要 → [`CHANGELOG.md`](./CHANGELOG.md)；视觉 / 无障碍契约 → [`DESIGN.md`](./DESIGN.md)、[`ACCESSIBILITY.md`](./ACCESSIBILITY.md)。本文件只留可复用的排障知识。

## 怎么写一条

1. 复制下方「条目骨架」，贴到对应分区**最上方**（新坑在上）。
2. 标题用一句话现象，可搜；状态：`已解决` / `仍复现` / `仅记录`。
3. **不要**整段粘贴 TODO 的 `- [x]` / P0；修好后 TODO 勾掉，这里保留解法。
4. 若已进 CHANGELOG，可写「见 CHANGELOG · YYYY-MM-DD / 批次 NNN」。

### 条目骨架（复制用）

```markdown
### {一句话现象}

- **状态**：已解决 | 仍复现 | 仅记录
- **环境**：（可选）浏览器 / 主题 / MOTION 档 / 窄屏壳层 / 后端是否起
- **现象**：……
- **根因**：……
- **解法**：……
- **相关**：`path/to/file`、批次 NNN、可选 [CHANGELOG · 日期](./CHANGELOG.md#yyyy-mm-dd)
- **防再犯**：（可选）一句话约束，给后人 / AI
```

---

## 前端 · 动效 / REDUCED

### REDUCED 下正文在 DOM 里但不显示

- **状态**：已解决
- **环境**：`html[data-motion=reduced]`（用户选 REDUCED 或系统 reduce → MINIMAL 同类）
- **现象**：页面有节点，视觉空白；像是「取消动画后内容永远藏着」。
- **根因**：`page-enter-*.css` 用 `:not(.page-enter--play)` 预隐藏；跳过动画时若没打上 `page-enter--play`，内容一直 opacity 0。预隐藏规则曾绑在系统 media 上，用户 REDUCED 也会中招。
- **解法**：`playPageEnter` / `stampPageEnterPlay` 在 motion cut 时仍加 `page-enter--play`；预隐藏只挂在 `html[data-motion=full]`。
- **相关**：`usePageEnterAnimation.ts`、`page-enter-*.css`、批次 151 · [CHANGELOG · 2026-09-18](./CHANGELOG.md#2026-09-18)
- **防再犯**：REDUCED / MINIMAL 是「瞬切可见」，不是「永远预隐藏」。

### REDUCED 下页脚 GrunRay 大字常驻挡住正文

- **状态**：已解决
- **环境**：同上
- **现象**：`footer-grunray-brand-reveal` 一直露在视口里。
- **根因**：降级时把 `--reveal-progress` 钉成 1，或 CSS 对 reduced 写了 `clip-path: none`。
- **解法**：clip 仍跟滚动进度；JS 赋真实 `progress`；仅真正揭开后（`.is-fully-revealed`）才 `clip-path: none`。
- **相关**：`useFooterGrunRayReveal.ts`、`footer-grunray.css`、批次 151
- **防再犯**：REDUCED 可以砍扭曲 rAF，但不要把「揭开进度」伪造为已到底。

### 关碎念 / 推荐详情时控制台 aria-hidden 警告

- **状态**：已解决
- **环境**：桌面 editorial 分栏；点关闭钮或 Esc
- **现象**：`Blocked aria-hidden on an element because its descendant retained focus`；焦点在 `.xiqi-detail-close`，祖先 `aside.xiqi-split-detail` 已 `aria-hidden` / `inert`。
- **根因**：关面板瞬间焦点还在关闭钮上，同时面板被标隐藏。
- **解法**：关之前把焦点归还名录行（打开时记下的触发器），再清 `selectedKey`。
- **相关**：`XiqiSplitLayout.vue`、`ACCESSIBILITY.md` §4、批次 149 跟进
- **防再犯**：任何 `aria-hidden` / `inert` 前，先移走内部焦点。

### 路由离开钩子 `parentNode` 报错

- **状态**：已解决
- **环境**：REDUCED 或跳过 GSAP 的路由 `out-in` 转场
- **现象**：`TypeError: Cannot read properties of null (reading 'parentNode')`，栈在 `onRouteLeave`。
- **根因**：跳过动画时同步调用 `done()`，Vue / GSAP 拆节点与钩子交错。
- **解法**：`killTweensOf` + 仍连接时再 `clearProps`；`requestAnimationFrame(() => done())`，勿同步 `done()`。
- **相关**：`AppShell.vue`、批次 151
- **防再犯**：JS 转场 skip 路径一律异步收尾。

---

## 前端 · 壳层 / 构建

### （模板占位）生产构建后玻璃 / 照片背景异常

- **状态**：仅记录（历史；早期已修）
- **现象**：生产包液态玻璃失效，或照片背景随页面高度错误缩放。
- **根因**：（见当时 PR；常见为构建后 CSS 选择器 / 变量未进包，或高度算在错误容器上。）
- **解法**：对照 [PR #2](https://github.com/Grunray/GrunRay-wiki/pull/2)；本地用 `vite build` + `preview` 复现，勿只看 `dev`。
- **相关**：[CHANGELOG · 2026-06-03](./CHANGELOG.md#2026-06-03)

---

## 后端 · 环境 / 测试

### pytest / pip 装到系统 Python，而不是项目 venv

- **状态**：已解决（流程）
- **现象**：`pip install -r requirements-dev.txt` 后 `pytest` 找不到 `app`，或包装进了全局环境。
- **根因**：未激活 `backend/.venv`（或 `backend/venv`），命令用了别的解释器。
- **解法**：先 `cd backend`，再 `. .\.venv\Scripts\Activate.ps1`（或 `python -m pip` / `python -m pytest` 显式指向该 venv）。CI 每次干净安装，不依赖本机 venv。
- **相关**：`TODO.md` 开发命令、`backend/README.md`、批次 153
- **防再犯**：本地测试命令默认假定「已激活后端 venv」；文档写清 Activate。

### Access denied / cryptography required（MySQL 8）

- **状态**：仅记录
- **现象**：连库报 `Access denied ... (using password: NO)`，或 `cryptography package is required for ... caching_sha2_password`。
- **根因**：未读到 `backend/.env` 里的 `MYSQL_PASSWORD`；或未装 `cryptography`。
- **解法**：确认 `.env` 存在且密码非空；`pip install -r requirements.txt`（已含 cryptography）。
- **相关**：`backend/README.md`、`app/config.py`

---

## 索引（可选维护）

| 关键词 | 条目 |
| --- | --- |
| REDUCED / page-enter | [正文不显示](#reduced-下正文在-dom-里但不显示) |
| footer clip | [页脚大字常驻](#reduced-下页脚-grunray-大字常驻挡住正文) |
| aria-hidden / 焦点 | [关详情警告](#关碎念--推荐详情时控制台-aria-hidden-警告) |
| parentNode / 路由 | [路由离开报错](#路由离开钩子-parentnode-报错) |
| venv / pytest | [pip 装错环境](#pytest--pip-装到系统-python而不是项目-venv) |
