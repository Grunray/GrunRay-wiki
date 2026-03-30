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

3. **导入示例数据**（从仓库内 `frontend/src/content/data/posts.json` 生成 `content/posts/*.md` 并写入表）：

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
| GET | `/api/posts/<slug>` | 详情（含从 `md_url` 读取的正文 `body`） |
| GET | `/api/search?q=` | 搜索（方案 C + 应用层评分） |
| GET | `/api/posts/<slug>/related?limit=5` | 关键词相似推荐 |

前端开发：在 `frontend` 目录 `npm run dev`，Vite 已将 `/api` 代理到本服务。
