# 友链（friend_link）导入工具

## 建表

已有数据库增量执行：

```bash
cd backend
python scripts/run_sql.py --file friend_link.sql
```

全新初始化可直接用 `sql/schema.sql`（已包含 `friend_link`）。

## 编写 Markdown

模板见：`import/friend_link/_template/friend_link.template.md`

将 `.md` 放在 **`import/friend_link/` 根目录**（不要放在 `_template` 内；脚本**不递归**子目录）。

## 导入

```bash
cd backend
python scripts/friend_link_tools/import_friend_links.py
```

常用参数：

- `--dir import/friend_link` 指定目录
- `--id friend-apos` 只导入一条（`public_id` 或文件名 stem）
- `--dry-run` 校验不写库

按 `public_id` upsert：重复执行会更新同一条记录。

## 与旧脚本

`scripts/friend_link_tools/seed_friend_links.py` 仍可用，但推荐改用本导入流程维护 `import/friend_link/*.md`。

审核 CLI：`python scripts/friend_link_tools/moderate_friend.py approve <public_id>`

## 相关 API

- `GET /api/friends`
- `GET /api/friends/special`（特殊链接见 `data/friend_special_links.json`）
- `GET /api/friends/site-profile`
- `POST /api/friends/applications`
