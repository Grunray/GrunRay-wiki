- 图片
python scripts/media_tools/import_film_media.py

- 音乐
python scripts/music_tools/import_music.py

- 项目
python scripts/projects_tools/import_projects.py

- 文章
python scripts/content_tools/import_markdown_posts.py

- 友链
python scripts/friend_link_tools/import_friend_links.py

- 留言（先 user 后 message）
python scripts/guest_tools/user/import_guest_users.py
python scripts/guest_tools/message/import_guest_messages.py


- SQL
python scripts/run_sql.py

- 留言板（二期）
  - 建表：`python scripts/run_sql.py --file guest_message.sql`
  - 导入用户：`python scripts/guest_tools/user/import_guest_users.py`（`import/guest/user/`）
  - 导入留言：`python scripts/guest_tools/message/import_guest_messages.py`（`import/guest/message/`）
  - 旧示例：`python scripts/guest_tools/message/seed_guest_messages.py`
  - 站长回复：`POST /api/messages/<public_id>/reply`（需站长 OAuth 登录）
  - 审核：`GET /api/messages/admin?status=pending`、`PATCH /api/messages/admin/<public_id>` body `{ "action": "approve"|"reject"|"hide"|"restore" }`
  - CLI：`python scripts/guest_tools/message/moderate_message.py approve <public_id>`
  - 关闭自动发布：`.env` 设 `MESSAGE_AUTO_PUBLISH=false`，新留言为待审，站长在留言页「待审核」Tab 或 CLI 通过

- 友链
  - 建表：`python scripts/run_sql.py --file friend_link.sql`
  - 导入：`python scripts/friend_link_tools/import_friend_links.py`（Markdown 见 `import/friend_link/`）
  - 旧示例脚本（可选）：`python scripts/friend_link_tools/seed_friend_links.py`
  - 公开：`GET /api/friends`、`GET /api/friends/special`、`GET /api/friends/site-profile`
  - 申请：`GET /api/friends/captcha`、`POST /api/friends/applications`（匿名，默认待审）
  - 审核：`GET /api/friends/admin?status=pending`、`PATCH /api/friends/admin/<public_id>`（需站长 OAuth）
  - CLI：`python scripts/friend_link_tools/moderate_friend.py approve <public_id>`

- 文章（开发）
  - JSON 全量种子（会清空 post，可选）：`python scripts/content_tools/seed_from_json.py`
