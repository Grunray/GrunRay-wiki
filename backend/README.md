# GrunRay Wiki — Flask API

只读 JSON API，MySQL 存储文章元数据，`content/` 下存放 Markdown 正文。

## 环境

- Python 3.10+
- MySQL 8+（推荐）

## 初始化

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# 编辑 .env：至少填写 MYSQL_PASSWORD（若 MySQL 用户有密码）与 MYSQL_DATABASE
```

若出现 `Access denied ... (using password: NO)`，说明未读到密码：请确认 `backend/.env` 存在且含 `MYSQL_PASSWORD=你的密码`。

若出现 `cryptography package is required for ... caching_sha2_password`，说明 MySQL 8 使用了默认认证插件，请执行 `pip install -r requirements.txt`（已包含 `cryptography`）。

初始化顺序建议：

1. **创建数据库**（若出现 `Unknown database 'xxx'`，先执行本步）

```bash
python scripts/create_database.py
```

2. **建表**（`sql/` 下脚本）

```bash
# 执行 sql 目录下全部 .sql（按文件名排序）
python scripts/run_sql.py

# 或只执行某一个文件
python scripts/run_sql.py --file schema.sql
```

也可手动：`mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS grunray_wiki ..."` 再执行 `run_sql.py`。

3. **导入文章（推荐：Markdown 源）**  
   将 `.md` 按 `designed/template.md` 放入 `backend/import/markdown/`，然后：

```bash
python scripts/import_markdown_posts.py
```

可选：`python scripts/import_markdown_posts.py --dir 你的目录`

4. **（可选）开发用全量种子**（会 **清空** `post` 表，读前端临时 JSON）：

```bash
python scripts/seed_from_json.py
```

## 启动

```bash
python run.py
```

默认 `http://127.0.0.1:5000`。

## API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/posts` | 列表；`?type=algorithm` / `project_note` / `article`；`?project_id=` 筛选项目笔记 |
| GET | `/api/posts/<slug>` | 详情（含 `body` Markdown）；加 `?html=1` 多返回 `body_html` |
| GET | `/api/search?q=` | 搜索（方案 C + 应用层评分） |
| GET | `/api/posts/<slug>/related?limit=5` | 关键词相似推荐 |

前端开发：在 `frontend` 目录 `npm run dev`，Vite 已将 `/api` 代理到本服务。

## 文章工具（Markdown / 关键词）

| 能力 | 说明 |
|------|------|
| `app/markdown_util.py` | `render_markdown_to_html()`：Markdown → HTML |
| `app/keywords_extract.py` | `extract_keywords()`：jieba TF-IDF 抽词（中文为主） |
| `app/keywords_match.py` | 搜索方案 C、打分（与 `app/search.py` 一致，供 API 使用） |
| `scripts/content_tools/md_to_html.py` | 命令行：把 `.md` 转为 HTML 片段 |
| `scripts/content_tools/extract_keywords.py` | 命令行：从文件或 `--text` 抽词，默认打印 JSON 数组 |

文章详情接口：`GET /api/posts/<slug>?html=1` 在原有 `body`（Markdown 源）外增加 **`body_html`**（服务端渲染）。

依赖：`pip install -r requirements.txt`（含 `markdown`、`jieba`）。

脚本详细说明见：`scripts/content_tools/README.md`。

Markdown 导入流程与字段约定见仓库根目录 `designed/template.md`。
