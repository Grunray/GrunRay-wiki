# 内容读取工具说明

该目录用于存放后端“文章读取/解析/关键词”相关脚本，避免与数据库初始化脚本混在一起。

## 使用方法
把要导入的 .md 都放进这个目录，然后在 backend 目录执行：

python scripts/import_markdown_posts.py
如果希望放在别的路径，可以用参数指定，例如：

python scripts/import_markdown_posts.py --dir D:\我的文章\inbox
相对路径是相对于你运行命令时的当前目录；在 backend 下也可以用：

python scripts/import_markdown_posts.py --dir import/markdown
格式仍按仓库里的 designed/template.md（YAML front matter + 正文）。

## 工具列表

### `extract_keywords.py`
- **作用**：从文本或 Markdown 中抽取关键词（使用 `jieba` 的 TF-IDF）。
- **典型用途**：为 `post.keywords` 提供自动建议词，辅助人工校对。
- **示例**：
  - `python scripts/content_tools/extract_keywords.py content/posts/foo.md`
  - `python scripts/content_tools/extract_keywords.py --text "Vue3 与 Flask 后端联调"`
  - `type content\posts\foo.md | python scripts/content_tools/extract_keywords.py --stdin`

### `md_to_html.py`
- **作用**：将 Markdown 文件转换为 HTML 片段（与 API 渲染逻辑一致）。
- **典型用途**：本地快速检查 Markdown 渲染效果。
- **示例**：
  - `python scripts/content_tools/md_to_html.py content/posts/foo.md`
  - `python scripts/content_tools/md_to_html.py --stdin < content/posts/foo.md`

## 依赖

请先在 `backend` 目录执行：

`pip install -r requirements.txt`

其中已包含：
- `markdown`（Markdown 渲染）
- `jieba`（中文关键词抽取）

## 说明

- **正式导入文章到数据库**：请把待导入 `.md` 放到 `backend/import/markdown/`（或 `--dir` 指定目录），在 `backend` 下执行根目录脚本  
  `python scripts/import_markdown_posts.py`（格式见 `designed/template.md`）。本目录的 `extract_keywords.py` 会被该流程在「无 tags」时调用。
- 数据库建库/建表仍使用：
  - `scripts/create_database.py`
  - `scripts/run_sql.py`
- 开发用全量种子（会清空表）：`scripts/seed_from_json.py`
