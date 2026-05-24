# 内容（post）导入与读取工具

## 导入文章

把要导入的 `.md` 放进 `backend/import/markdown/`，在 `backend` 目录执行：

```bash
python scripts/content_tools/import_markdown_posts.py
```

指定目录：

```bash
python scripts/content_tools/import_markdown_posts.py --dir D:\我的文章\inbox
python scripts/content_tools/import_markdown_posts.py --dir import/markdown
```

格式见仓库根目录 `designed/template.md`（YAML front matter + 正文）。

## 开发用 JSON 种子

会**清空** `post` 表后全量写入（需恢复 `frontend/src/content/data/posts.json` 或改脚本路径）：

```bash
python scripts/content_tools/seed_from_json.py
```

## 辅助脚本

### `extract_keywords.py`

- 从文本或 Markdown 抽取关键词（jieba TF-IDF）
- 导入流程在「无 tags」时会调用
- 示例：`python scripts/content_tools/extract_keywords.py content/posts/foo.md`

### `md_to_html.py`

- Markdown → HTML 片段（与 API 渲染一致）
- 示例：`python scripts/content_tools/md_to_html.py content/posts/foo.md`

## 依赖

在 `backend` 目录：`pip install -r requirements.txt`（含 `markdown`、`jieba`）。

## 数据库

- 建库：`scripts/create_database.py`
- 建表：`scripts/run_sql.py`
