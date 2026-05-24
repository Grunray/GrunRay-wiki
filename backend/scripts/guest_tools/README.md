# 留言板（guest_user / guest_message）导入工具

## 建表

```bash
cd backend
python scripts/run_sql.py --file guest_message.sql
```

（`guest_user` 与 `guest_message` 在同一份 SQL 中。）

## 目录结构

```
import/guest/
  user/          # guest_user，仅扫描本层 *.md
    _template/
  message/       # guest_message，仅扫描本层 *.md
    _template/
```

模板：

- `import/guest/user/_template/guest_user.template.md`
- `import/guest/message/_template/guest_message.template.md`

## 导入顺序

1. 若留言需绑定 OAuth 用户，先导入用户：

```bash
python scripts/guest_tools/user/import_guest_users.py
```

2. 再导入留言（可含 `reply` 块）：

```bash
python scripts/guest_tools/message/import_guest_messages.py
```

## 常用参数

**用户**

- `--dry-run`
- `--provider github --provider-user-id 9919` 只导入一条

**留言**

- `--dry-run`
- `--id msg-traveler-seat` 只导入一条

按 `public_id` / `(provider, provider_user_id)` upsert，可重复执行。

## 与旧脚本

`scripts/guest_tools/message/seed_guest_messages.py` 仍可用，推荐改用 `import/guest/message/*.md`。

留言审核 CLI：`python scripts/guest_tools/message/moderate_message.py approve <public_id>`

## 相关 API

- `GET /api/messages`
- `POST /api/messages`（登录访客）
- `POST /api/messages/<public_id>/reply`（站长）
