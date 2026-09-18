# GrunRay wiki — AGENTS.md

> **给编码代理读的入口。** 人读 TODO / DESIGN 即可；你开任务前先扫本文件，再按表下钻，不要整本 TODO 当上下文塞进对话。

## 1. 这是什么

Vue 3 + Vite + Pinia 个人编辑式 wiki（纸面杂志气质），Flask 后端 + Markdown 内容。气质与令牌以设计契约为准，**禁止另起一套视觉语言**。

## 2. 文档地图（先选对文件）

| 需求 | 读 | 不要做 |
| --- | --- | --- |
| 未完成任务 / 优先级 / 验收 / 涉及文件 | [`TODO.md`](TODO.md) | 不要把勾选清单抄进 CHANGELOG 或排障文 |
| 视觉 / 动效 / 令牌契约 | [`docs/DESIGN.md`](docs/DESIGN.md)（根 [`DESIGN.md`](DESIGN.md) 只是指针） | 不要凭「好看」改色或加第二强调色 |
| 键盘 / Skip / 焦点陷阱 | [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | 关面板前勿先 `aria-hidden` / `inert` 内部仍聚焦的节点 |
| 已合入摘要（按日） | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | 不要贴 `- [x]` / P0 / 大段文件列表 |
| 已踩坑：现象 → 根因 → 解法 | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | 未修完的活仍写 TODO，不要只写在这里 |
| 博客 / 项目 Markdown 导入格式 | [`.cursor/skills/create-blog-md`](.cursor/skills/create-blog-md/SKILL.md)、[`create-project-md`](.cursor/skills/create-project-md/SKILL.md) | 不要自创 front matter 字段 |
| 路由 SEO / OG / JSON-LD | [`.cursor/skills/seo-head-vue`](.cursor/skills/seo-head-vue/SKILL.md) | — |

排障新条目：复制 `TROUBLESHOOTING.md` 文首「条目骨架」，贴到对应分区**最上方**。

## 3. 硬约束（每次都遵守）

1. **对用户用简体中文**；代码标识符与既有英文文件名保持一致。
2. **UI / 动效**：先读 `docs/DESIGN.md`（尤其 Motion Policy、令牌、纸面气质）。不要发明第二套组件皮肤；实况对照路由 `/design`。
3. **用户规则优先**：未要求则不 commit / 不 push / 不改 git config；不主动开 PR。
4. **最小改动**：只改任务需要的文件；不为「顺便」大重构或扩写无关文档。
5. **动效档**：尊重 `html[data-motion]`（full / reduced / minimal）。REDUCED / MINIMAL = 瞬切可见 + 可砍装饰，**不是**永远预隐藏、也不是伪造页脚「已揭开」。已知坑见 TROUBLESHOOTING。
6. **焦点与 inert**：给容器加 `aria-hidden` / `inert` 之前，先把焦点移出该子树。
7. **路由 / GSAP skip**：跳过动画时不要在同步钩子里 `done()` / 拆还连着的节点；用 `rAF` 异步收尾（见 TROUBLESHOOTING）。

## 4. 开干前检查清单

按任务类型勾读（不必全读）：

- [ ] **UI / 样式**：`docs/DESIGN.md` 相关节 + 现有同页 CSS / 组件，禁止引入 Inter/紫渐变/通用卡片堆叠等外来默认审美覆盖本站纸面编辑语言。
- [ ] **无障碍 / 抽屉 / sheet / 出站页**：`docs/ACCESSIBILITY.md`。
- [ ] **怪现象 / 回归**：先搜 `docs/TROUBLESHOOTING.md` 与 CHANGELOG 近日条目。
- [ ] **批次任务**：只读 `TODO.md` 该批次块（状态、清单、涉及文件、验收），不要整文件通读。
- [ ] **后端测试**：同一 `backend` venv（`.venv` 或 `venv`）→ Activate → `pip install -r requirements-dev.txt` → `pytest`（不连 MySQL）。前端：`npx vue-tsc -b`、`npx vite build`。命令见 TODO「开发命令」。

## 5. 收工时写哪

| 发生了什么 | 更新 |
| --- | --- |
| 勾完 TODO 项 / 关批次 | `TODO.md` 勾选与状态行；状态旁加 CHANGELOG 日链 |
| 合入或当日可对外说的效果 | `docs/CHANGELOG.md` 对应日下 1–2 句 + 可选批次号 |
| 可复用的坑与解法 | `docs/TROUBLESHOOTING.md` 新条目（最上） |
| 契约变更（令牌 / 动效 / a11y） | 改 `DESIGN.md` 或 `ACCESSIBILITY.md`，CHANGELOG 提一句 |

未完成的活**只**留在 TODO；不要把进行中清单搬进 CHANGELOG。

## 6. 仓库速览

```
frontend/     Vue 应用（views / components / styles / composables）
backend/      Flask API、content、import、sql、tests
docs/         DESIGN · ACCESSIBILITY · CHANGELOG · TROUBLESHOOTING
.cursor/skills/  内容与 SEO 技能（按需 Read SKILL.md）
designed/     静态设计原型（选型用，非运行时）
```

CI：`.github/workflows/ci.yml`（前端类型检查 + build，后端 pytest）。本地同命令。

## 7. 本文件怎么维护

- 只写**代理决策用**的短规则与指针；长契约仍放 `docs/*`。
- 新增「全站必守」约束时改 §3；新增文档类型时改 §2 表。
- 不要把本文件写成第二份 TODO。
