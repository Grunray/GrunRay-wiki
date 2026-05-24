---
# 必填：稳定对外 ID（重复导入时按此 upsert）；也可用 id 作为别名键
# 若省略，将使用文件名 stem，且须满足 8–64 位字母数字、下划线、连字符
public_id: friend-your-id

# 必填：站点名称（展示名）
name: 站点名称

# 必填：站点首页 URL（http/https）
url: https://example.com/

# 必填：简介（≤200 字）
description: 一句话介绍你的站点

# 可选
tags:
  - blog
  - dev

# 可选：头像 / 卡片封面（http/https）
avatar_url: null
cover_url: null

# 可选：联系邮箱（导入用，申请页仍会要求填写）
contact_email: null

# 可选：pending | published | hidden | rejected（默认 published）
status: published

# 可选：列表排序，数值越大越靠前（默认 0）
sort_order: 0
---

<!-- 以下为站长备注，当前版本不会写入数据库，可写互链说明、审核记录等 -->
