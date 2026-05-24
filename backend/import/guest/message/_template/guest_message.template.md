---
# 必填：稳定 public_id（重复导入按此 upsert）；省略则用 msg-{文件名}
public_id: msg-your-id

# 必填：显示名
author_name: 访客昵称

# 正文二选一：此处 content，或写在 --- 下方
content: |
  留言正文，可多行。

# 可选
avatar_url: https://avatars.githubusercontent.com/u/0?v=4
provider: github
profile_url: https://github.com

# 可选：关联已导入的 guest_user（须先 import_guest_users）
# guest_user:
#   provider: github
#   provider_user_id: "9919"

# 可选：pending | published | hidden | rejected（默认 published）
status: published
is_owner: false
created_at: '2026-05-12 14:22:00'

# 可选：站长/访客回复（单条）
reply:
  public_id: msg-your-id-reply
  author_name: 站长名
  content: 回复内容
  avatar_url: /favicon.jpg
  is_owner: true
  created_at: '2026-05-13 10:00:00'
---

也可把顶层 content 写在本段（会覆盖 front matter 中的 content）。
