- 图片
python scripts/media_tools/import_film_media.py

- 音乐
python scripts/music_tools/import_music.py

- 项目
python scripts/projects_tools/import_projects.py

- 文章
python scripts/import_markdown_posts.py


- SQL
python scripts/run_sql.py

- 留言板（二期）
  - 站长回复：`POST /api/messages/<public_id>/reply`（需站长 OAuth 登录）
  - 审核：`GET /api/messages/admin?status=pending`、`PATCH /api/messages/admin/<public_id>` body `{ "action": "approve"|"reject"|"hide"|"restore" }`
  - CLI：`python scripts/moderate_message.py approve <public_id>`
  - 关闭自动发布：`.env` 设 `MESSAGE_AUTO_PUBLISH=false`，新留言为待审，站长在留言页「待审核」Tab 或 CLI 通过

- 友链
  - 建表：`python scripts/run_sql.py --file friend_link.sql`
  - 示例数据：`python scripts/seed_friend_links.py`
  - 公开：`GET /api/friends`、`GET /api/friends/special`、`GET /api/friends/site-profile`
  - 申请：`GET /api/friends/captcha`、`POST /api/friends/applications`（匿名，默认待审）
  - 审核：`GET /api/friends/admin?status=pending`、`PATCH /api/friends/admin/<public_id>`（需站长 OAuth）
  - CLI：`python scripts/moderate_friend.py approve <public_id>`