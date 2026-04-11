# 文章 Markdown 模板（导入用）

将待发布的 `.md` 放入 **`backend/import/markdown/`**（或自定义目录），在 `backend` 下执行：

`python scripts/import_markdown_posts.py`

脚本会解析 YAML front matter、保存正文到 `content/posts/<slug>.md`，并 **upsert** 到 MySQL。

---

## 基本结构

```markdown
---
title: 文章标题
slug: url-段-唯一
type: article
tags: [vue3, jwt]
summary: "一句话摘要"
---

正文内容，支持 Markdown 语法。
```

- **第一行必须是 `---`**，然后是 **YAML**，再以 **`---`** 结束，后面是正文。
- `summary` 里若写 `...` 可能被 YAML 当成特殊含义，请用**引号**包起来。

---

## 必填字段

| 字段 | 说明 |
|------|------|
| `title` | 标题 |
| `slug` | URL 段，仅字母、数字、`_`、`-`，全局唯一 |
| `type` | `article`（杂项）、`project_note`（项目笔记）、`algorithm`（算法） |

---

## 常用可选字段

| 字段 | 说明 |
|------|------|
| `tags` | 标签数组，如 `[vue, jwt]`；也可写成逗号分隔字符串。为空时脚本会用 **jieba** 从标题+摘要+正文自动抽关键词 |
| `summary` | 摘要 |
| `id` | 写入 `post.legacy_id`；不填则自动生成 `md-<slug>` |
| `locale` | 默认 `zh` |
| `pinned` | `true` / `false` |
| `pinned_order` | 数字，置顶排序，越小越靠前 |
| `published_at` | 如 `2026-03-30T10:00:00` 或 `2026-03-30 10:00:00` |
| `updated_at` | 同上；不填则用 `published_at` |
| `cover` | 封面图 URL |

---

## `type: project_note` 时额外必填

| 字段 | 说明 |
|------|------|
| `project_id` | 对应前端 `projects.json` 里项目的 `id` |

可选：`role`、`feature_key`

---

## `type: algorithm` 时可选字段

| 字段 | 说明 |
|------|------|
| `difficulty` | 如 easy / medium |
| `oj` | 平台 |
| `problem_id` | 题号 |
| `series` | 系列名 |

---

## 与前端静态数据的关系

- **正式内容**：以 **数据库 + `content/posts/*.md` 正文** 为准；通过 API 给前端读。
- 仓库里 `frontend/src/content/data/` 下的**临时 JSON** 仅作开发/迁移参考，**不是**真实数据源。
