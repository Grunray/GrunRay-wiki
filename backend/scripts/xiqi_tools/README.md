# 栖息（xiqi）import 工具

碎念、三页 Hero、关于页履历与推荐条目的 Markdown import 管线。目录约定：

| 类型 | import 源 | 运行时正文/媒体 |
|------|-----------|-----------------|
| 碎念 | `import/xiqi/fragments/*.md` | `content/xiqi/fragments/{public_id}.md` |
| 页面 Hero | `import/xiqi/pages/{page}.md` | 媒体 `content/media/xiqi/pages/{page}/` |
| **关于履历** | **`import/xiqi/about/resume.md`** | **`content/xiqi/about/resume.md`** |
| **推荐条目** | **`import/xiqi/recommendations/*.md`** | **`content/xiqi/recommendations/{public_id}.md`** |
| 碎念配图 | （front matter `images`） | `content/media/xiqi/fragments/` |
| 推荐配图 | `{public_id}.png` 于 `import/xiqi/media/recommendations/` | `content/media/xiqi/recommendations/` |

模板见 `import/xiqi/_template/`。

## 建表

```bash
python scripts/run_sql.py --file fragment.sql
python scripts/run_sql.py --file xiqi_page.sql
python scripts/run_sql.py --file xiqi_about.sql
python scripts/run_sql.py --file xiqi_recommend.sql
```

## 导入碎念

```bash
python scripts/xiqi_tools/import_xiqi.py fragments
python scripts/xiqi_tools/import_xiqi.py fragments --dry-run
python scripts/xiqi_tools/import_xiqi.py fragments --id frag-f4-daily-rain
```

流程：解析 front matter → 校验 → 写 `content/xiqi/fragments/{public_id}.md` → upsert `fragment` 表。

## 导入页面 Hero

```bash
python scripts/xiqi_tools/import_xiqi.py pages
python scripts/xiqi_tools/import_xiqi.py pages --page fragments
```

## 导入关于页履历

```bash
python scripts/xiqi_tools/import_xiqi.py about
python scripts/xiqi_tools/import_xiqi.py about --dry-run
```

流程：解析 `import/xiqi/about/resume.md` → 校验 → 写 `content/xiqi/about/resume.md`（完整 Markdown）→ upsert `xiqi_about` 表。

## 导入推荐条目

```bash
python scripts/xiqi_tools/import_xiqi.py recommendations
python scripts/xiqi_tools/import_xiqi.py recommendations --dry-run
python scripts/xiqi_tools/import_xiqi.py recommendations --id rec-cursor
```

流程：解析 front matter → 校验 → 写 `content/xiqi/recommendations/{public_id}.md`（仅正文）→ upsert `xiqi_recommend` 表。

## 站长 API（仅写 import + 媒体，不自动写 DB）

- `POST /api/xiqi/media?scope=fragments|recommendations|pages/fragments|pages/about|pages/recommend`
- `POST /api/fragments/import-file` — JSON 写 `import/xiqi/fragments/{public_id}.md`
- `POST /api/xiqi/pages/import-file` — JSON 写 `import/xiqi/pages/{page}.md`
- `POST /api/xiqi/about/import-file` — JSON 写 `import/xiqi/about/resume.md`
- `POST /api/recommendations/import-file` — JSON 写 `import/xiqi/recommendations/{publicId}.md`
- `POST /api/recommendations/media` — 等价 `scope=recommendations`

保存后需手动运行上述 import 命令，前台 API 才可见。

## 公开读 API

- `GET /api/fragments?mood=&sort=newest|oldest&page=&size=`
- `GET /api/fragments/<public_id>` — 含 `body`、`bodyHtml`
- `GET /api/xiqi/pages/<page>` — Hero 图 URL
- `GET /api/xiqi/about` — 关于页履历（camelCase JSON；未发布或无数据时 `data: null`）
- `GET /api/recommendations?category=&rating=&sort=newest|oldest&page=&size=` — 推荐列表
- `GET /api/recommendations/<public_id>` — 推荐详情，含 `body`、`bodyHtml`

## 示例碎念 Markdown

```yaml
---
public_id: frag-f4-daily-rain
mood: daily
status: published
created_at: '2026-05-15T21:30:00'
images: []
cover_index: 0
---

雨停之后操场味道很好。走了一圈，脑子终于从递归里出来了。
```

## 示例关于页履历 Markdown

见 `import/xiqi/about/resume.md` 与 `_template/about.template.md`。

隐私字段可用 `*_raw` / `*_public` 双字段，或在文本中使用：

```html
<xiqi-private label="专业排名（已隐藏）">专业排名前 30%</xiqi-private>
```

或 `<div data-xiqi-private data-label="说明">敏感正文</div>`。

## 示例推荐 Markdown

见 `import/xiqi/recommendations/` 与 `_template/recommendation.template.md`。

```yaml
---
public_id: rec-cursor
category: software
rating: 5
title: Cursor
status: published
created_at: '2026-05-20T10:00:00'
url: https://cursor.com
summary: 列表摘要
images: []
cover_index: 0
---

详情正文 Markdown。
```
