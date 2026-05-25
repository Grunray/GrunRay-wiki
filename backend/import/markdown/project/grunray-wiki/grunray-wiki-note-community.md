---
title: 社区：留言板与友链
slug: grunray-wiki-note-community
type: project_note
tags:
  - Vue
  - 留言
  - 友链
  - OAuth
summary: MessagesView 与 Friends 系列页面、OAuth 会话、验证码与审核 API 说明。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 6
published_at: '2026-05-25T18:00:00'
updated_at: '2026-05-25T18:00:00'
project_id: proj-grunray-wiki
---

## 界面布局

主导航「社区」下拉包含留言与友链，对应三条路由。

### 留言 `/messages` — `frontend/src/views/MessagesView.vue`

- 顶区：OAuth 登录状态（GitHub / Google）、排序（最新/最早）。
- Tab：公开留言流 / 站长待审列表（仅站长可见 `feedTab === 'pending'`）。
- 列表：树形留言与回复，头像带提供方角标（`MessageAvatarWithProvider.vue`）。
- 发表区：验证码 + 正文（长度上限 500，与后端 `.env` 一致）；站长可对单条回复、审核（通过/隐藏/拒绝）。
- 入场：`page-enter-message.css` + `playPageEnter`。

### 友链 `/friends` — `frontend/src/views/FriendsView.vue`

- 已发布友链卡片网格：封面、头像（`resolveFriendAvatar` / favicon 回退）、描述、标签。
- 顶部或侧栏展示「特别友链」条（`GET /api/friends/special` 静态 JSON 配置）。
- 入口链到申请页。

### 友链申请 `/friends/apply` — `frontend/src/views/FriendsApplyView.vue`

- 表单：站点名、URL、描述、邮箱、验证码等。
- 提交后进入待审状态（默认不自动发布，见 `FRIEND_AUTO_PUBLISH`）。

## 数据与 API

### 认证（留言 OAuth，友链申请可选登录）

| 能力 | API | 前端 |
|------|-----|------|
| 可用提供方 | `GET /api/auth/providers` | `messageAuth.ts` → `fetchMessageAuthProviders` |
| 当前用户 | `GET /api/auth/me` | `fetchMessageAuthUser` |
| 跳转登录 | `GET /api/auth/{github\|google}?return_to=` | `startMessageOAuth` |
| 登出 | `POST /api/auth/logout` | `logoutMessageAuth` |

会话为 Flask cookie，`credentials: 'include'`。站长判定见 `backend/.env` 的 `MESSAGE_OWNER_PROFILE_URLS`、`MESSAGE_OWNER_*_IDS`。

### 留言 `messageApi.ts` → `backend/app/routes/messages_api.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/messages/captcha` | 图形/文本验证码 |
| GET | `/api/messages?sort=&page=&size=` | 已发布列表 |
| POST | `/api/messages` | 发表（body + captcha） |
| POST | `/api/messages/:public_id/reply` | 回复 |
| GET | `/api/messages/admin?status=pending` | 站长待审列表 |
| PATCH | `/api/messages/admin/:public_id` | 审核状态 |

限流、敏感词、IP 冷却由后端配置（`MESSAGE_*` 环境变量）。

### 友链 `friendsApi.ts` → `backend/app/routes/friends_api.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/friends/captcha` | 申请验证码 |
| GET | `/api/friends` | 已发布友链列表 |
| GET | `/api/friends/special` | 特别友链 JSON |
| GET | `/api/friends/site-profile` | 本站信息（申请页展示） |
| POST | `/api/friends/applications` | 匿名提交申请 |
| GET/PATCH | `/api/friends/admin` | 站长审核（需 OAuth 站长） |

导入种子：`backend/import/friend_link/`，脚本 `scripts/friend_link_tools/import_friend_links.py`。

## 关键文件

| 职责 | 路径 |
|------|------|
| 留言页 | `frontend/src/views/MessagesView.vue` |
| 友链列表 | `frontend/src/views/FriendsView.vue` |
| 友链申请 | `frontend/src/views/FriendsApplyView.vue` |
| 留言 API | `frontend/src/services/messageApi.ts` |
| 留言 OAuth | `frontend/src/services/messageAuth.ts` |
| 友链 API | `frontend/src/services/friendsApi.ts` |
| 留言后端 | `backend/app/routes/messages_api.py` |
| 友链后端 | `backend/app/routes/friends_api.py` |
| 认证后端 | `backend/app/routes/auth_api.py` |
| 留言入场样式 | `frontend/src/styles/page-enter-message.css` |
| 友链页样式 | `frontend/src/styles/page-friends.css`、`page-enter-friends.css` |

## 实现要点

1. **审核默认关闭自动发布**：`MESSAGE_AUTO_PUBLISH` / `FRIEND_AUTO_PUBLISH` 为 false 时，新内容需站长在 admin API 或后续 CLI 通过后才会出现在公开列表。
2. **留言树**：`parent_id` 关联；前端 `openReplyId` / `replyDrafts` 管理就地回复 UI。
3. **与壳层关系**：社区页使用标准 `app-main` 内边距（非 full-viewport）；SEO 使用 `useSeoMeta` + i18n `messages.*` / `friends.*`。
4. **安全**：`return_to` 路径白名单校验（`auth_api._safe_return_to`）；友链 URL 规范化存入 `url_normalized` 防重复。
