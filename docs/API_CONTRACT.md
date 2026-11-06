# 接口契约（Flask 基线 · Java 迁移阶段 0）

> 现有 Flask 后端对外行为的逐条盘点，是 Java 重写的验收基线。**以本文为准判断「兼容」**；行为要改，先在这里记一笔再动代码。
> 总体迁移计划见 [`JAVA_MIGRATION.md`](JAVA_MIGRATION.md)。

| 项 | 值 |
| --- | --- |
| 盘点日期 | 2026-11-06 |
| Flask 基线 | `0fb0ec6`（2026-10-11，合并 #59）；盘点期间 `backend/app` 无未提交改动 |
| 依赖版本 | Flask 3.1.3、Werkzeug 3.1.8、flask-cors 4.0.2、Markdown 3.10.2、Pygments 2.20.0（`backend/.venv`） |
| 规模 | 61 条业务路由 + 1 条 Flask 内置 `static`，共 62 个「方法 + 路径」 |
| 实测 | 契约沙箱 125 个用例全部通过（默认配置档 120，自动发布档 5） |
| 证据 | `.contract-sandbox/results/`（不入库，可随时重建），脚本在 [`tools/contract/`](../tools/contract/) |
| 交叉核对 | `tools/contract/crosscheck.py`：索引 ↔ Flask `url_map` ↔ 实测结果 ↔ Vue 源码请求，0 处不一致（§5） |

## 0. 怎么读

**状态标记**（索引「状态」列与详情行尾）：

| 标记 | 含义 |
| --- | --- |
| 「本地实测通过」/〔实测 R02〕 | 在契约沙箱（127.0.0.1:5001 + 合成库 `grunray_wiki_contract` + 模拟 OAuth / SMTP）真实请求过，断言全部通过；括号内为用例号 |
| 「代码已确认」/〔代码〕 | 读 Flask 源码确认，沙箱没跑到（多为数据库异常分支、TTL 过期等难构造的路径） |
| 「待实测」/〔待实测〕 | 依赖沙箱无法代表的环境：真实 GitHub / Google、真实 SMTP、生产 Nginx、Linux 的 MIME 表、多 worker |

路由级状态按主路径给；同一路由里没跑到的分支在详情里单独标。用例号前缀：A 应用级、G 全局行为、R `read_api`、F `fragments_api`、U `auth_api`、M `messages_api`、FR `friends_api`、X `xiqi_admin_api`、B 自动发布配置档。

**Vue 调用**写到 service 行号，括号里是调用它的视图；`—` 表示前端源码里没有这条路径（爬虫、部署探活或无人调用，见 §4）。

**示例脱敏**：`captchaId`、OAuth `state`、`Set-Cookie` 值统一写 `<redacted>`；账号、邮箱、域名都是合成数据（`*.contract.example.test`）。

## 1. 全局约定

### 1.1 响应形态

后端同时存在四种外形，Java 必须**按路由**复刻，不能统一成一种：

| 形态 | 成功 | 失败 | 用在哪 |
| --- | --- | --- | --- |
| 信封 A | `{"code":0,"data":…,"message":""}` | `{"code":1,"data":[],"message":"…"}` | `read_api` 的 `media/list`、`media/list/filmfeed`、`music/tracks` |
| 信封 B | 同上 | `{"code":1,"data":null,"message":"…"}` | `fragments_api`、`auth_api` 的 JSON 接口、`messages_api`、`friends_api`、`xiqi_admin_api` |
| 裸对象 | `{"posts":[…]}`、`{"post":…}`、`Post`、`{"query","results"}`、`{"projects":[…]}`、`Project` | `{"error":"not_found"}`（404）；`/api/posts` 的参数错误走信封 A | `read_api` 的文章、搜索、项目 |
| 其他 | `{"ok":true}`、`{"service","content_root"}`、XML、纯文本、302、文件流 | Flask HTML 错误页 | `health`、`/`、RSS / sitemap / robots、OAuth、`media/files` |

- 信封里的 `code` 失败时恒为 `1`，靠 HTTP 状态区分（400 / 401 / 403 / 404 / 429 / 500）〔实测〕。
- 未注册路由 → 404、方法不允许 → 405（带 `Allow` 头），都是 Flask 默认 **HTML** 页，不是 JSON〔实测 G01 G02〕。
- 未捕获异常 → 500 HTML（`FLASK_DEBUG=0`）〔实测 R17b X11〕。`read_api` 与 `xiqi_admin_api` 的大部分读写没有 `try`，数据库故障直接 500 HTML；`messages_api` / `friends_api` 会包成信封 500〔代码〕。
- `Content-Type: application/json`（不带 charset）；中文以 `\uXXXX` 转义输出（Flask 3 不读 `JSON_AS_ASCII`），键按字母序〔实测〕。Java 用 Jackson 直接输出 UTF-8 在语义上等价，做字节级比对时要先做 JSON 规范化。
- RSS / sitemap 的 `Content-Type` 带 charset。Tomcat 会写成 `charset=utf-8`（分号后无空格），Flask 是 `charset=utf-8` 前有空格。契约比对忽略这处空白。Java 的 `/api/**` 未知路由、405、未捕获异常回 JSON 信封（§4.7）；搜索 NULL 日期不再 500（§4.2）。

### 1.2 CORS

- 只作用于 `/api/*`；`origins = CORS_ORIGINS`（默认 `http://localhost:5173,http://127.0.0.1:5173`）；`supports_credentials=True`〔实测 G04 G06〕。
- 允许的 Origin：回显到 `Access-Control-Allow-Origin`，加 `Access-Control-Allow-Credentials: true` 与 `Vary: Origin`〔实测 G04〕。不允许的 Origin：不回任何 CORS 头，也没有 `Vary`〔实测 G05〕。
- 请求**不带** Origin 时，flask-cors（`always_send`）仍回 `Access-Control-Allow-Origin`，值为排序后第一个 origin（沙箱是 `http://127.0.0.1:5173`）〔实测 R22〕。浏览器不受影响，比对工具要忽略。
- `Vary` 是**追加**：WebP 协商响应会带两条 `Vary`（`Accept` 与 `Origin`）〔实测 R23〕。
- 预检 `OPTIONS` 由 Flask 自动应答 200，`Allow` 列出该路径的方法〔实测 G04〕。

### 1.3 会话与身份

- Flask 默认签名 Cookie `session`：`HttpOnly`、`SameSite=Lax`、`Path=/`，无 `Expires` / `Max-Age`（浏览器会话级），未设 `Secure`〔实测 U03〕。内容是 itsdangerous 签名的 JSON，可读不可改〔代码〕。**Java 读不了 Flask 的 Cookie，切换当天所有人需重新登录**（风险见 §6）。
- 会话键：

| 键 | 写入 | 读取 / 清除 |
| --- | --- | --- |
| `message_user` | OAuth 回调成功 | 所有需登录接口；`/api/auth/logout` 清除 |
| `oauth_state` / `oauth_return_to` | `GET /api/auth/{github,google}` | 回调时 `pop`（无论成败） |
| `message_captcha` | `GET /api/messages/captcha` | `POST /api/messages` 校验时 `pop` |
| `friend_captcha` | `GET /api/friends/captcha` | `POST /api/friends/applications` 校验时 `pop` |

- `message_user` 结构〔实测 U12 U13 U14〕：`provider`（`github`/`google`）、`id`（**字符串**）、`login`（Google 为 email）、`name`、`email`、`avatar_url`、`profile_url`（Google 为 `null`）、`guest_user_id`（库内自增 id）。
- **站长判定** `is_site_owner`〔代码，实测 U12〕：`profile_url` 规范化后属于 `MESSAGE_OWNER_PROFILE_URLS`，或 GitHub id 属于 `MESSAGE_OWNER_GITHUB_IDS`，或 Google id 属于 `MESSAGE_OWNER_GOOGLE_IDS`。每次请求拿会话快照现算。
- 权限三档：**公开**；**登录**（会话里有 `guest_user_id`）；**站长**。未登录 401（文案「请先登录」，留言 / 回复接口另有文案），已登录非站长 403「需要站长权限」〔实测 M10 FR07 X02〕。
- 读过 session 的响应带 `Vary: Cookie`〔实测〕。
- 没有 CSRF token。写接口靠 `SameSite=Lax`（跨站 POST 不带 Cookie）+ CORS 白名单 + `get_json(silent=True)`（非 JSON 的 Content-Type 解析为空 body）〔代码〕。

### 1.4 时间格式

同一个库里的时间字段，按接口出四种格式，前端各自解析，Java 必须逐字段复刻〔实测〕：

| 格式 | 示例 | 字段 |
| --- | --- | --- |
| `YYYY-MM-DDTHH:MM:SS.000Z` | `2026-10-01T08:00:00.000Z` | Post 的 `published_at` / `updated_at`（库内无时区值直接拼 `Z`，不做换算）；为空时 `""` |
| `YYYY-MM-DD` | `2026-03-01` | Project 的 `start_date` / `end_date` |
| `YYYY-MM-DD HH:MM:SS` | `2026-10-01 08:00:00` | 项目详情 `related_posts[].published_at`、媒体 / 曲目的 `created_at` / `updated_at`、`site/now` 的 `updatedAt` |
| `YYYY-MM-DDTHH:MM:SS` | `2026-10-02T21:30:00` | 碎念、推荐、留言、友链的 `createdAt` / `updatedAt`；`xiqi/pages`、`xiqi/about` 的 `updatedAt` |

### 1.5 限流与验证码

限流全部是**进程内字典**：重启清零、多 worker / 多实例互不共享（生产是 gunicorn 3 个 worker，见 §1.9，同一 IP 落到不同 worker 时实际上限会放宽）；只在**成功写入后**记数；IP 取 `X-Forwarded-For` 第一段，没有才用 `remote_addr`，伪造 XFF 即可绕过〔代码，实测时每个客户端用不同 XFF 证明〕。

| 机制 | 键 | 默认 | 文案（HTTP 429） | 证据 |
| --- | --- | --- | --- | --- |
| 留言 IP 冷却 | IP | 60 s `MESSAGE_IP_COOLDOWN_SEC` | 提交过于频繁，请稍后再试 | 〔实测 M06〕 |
| 留言每用户每小时 | `guest_user_id` | 10 `MESSAGE_RATE_LIMIT_PER_USER` | 已达到本小时留言上限，请稍后再试 | 〔实测 B03，档位 2〕 |
| 回复 IP 冷却（对所有人，变量名叫 OWNER） | IP | 10 s `MESSAGE_OWNER_REPLY_COOLDOWN_SEC` | 回复过于频繁，请稍后再试 | 〔实测 M09〕 |
| 友链 IP 冷却 | IP | 120 s `FRIEND_IP_COOLDOWN_SEC` | 提交过于频繁，请稍后再试 | 〔实测 FR05〕 |
| 友链 IP 每日 | IP | 5 `FRIEND_APPLICATION_MAX_PER_IP_PER_DAY` | 今日申请次数已达上限，请明日再试 | 〔实测 B05，档位 2〕 |

验证码（留言与友链各一套，逻辑相同）：`a + b`（各 1–20），答案存在会话里，每次取新题覆盖旧题；TTL 300 s（`MESSAGE_CAPTCHA_TTL_SEC` / `FRIEND_CAPTCHA_TTL_SEC`）；校验时先 `pop`，**答错也作废**〔实测 M05〕。文案依次：缺 id 或答案「请完成验证码」→ 会话里没有或已过期「验证码已过期，请刷新后重试」→ id 不符「验证码无效，请刷新后重试」→ 答案错「验证码答案错误」，全部 400。TTL 过期分支〔代码〕。

### 1.6 站长邮件

- 条件：`NOTIFY_EMAIL_ENABLED` 且 SMTP 主机、账号、密码、收件人都配齐；否则静默跳过〔代码〕。
- 访客留言、访客回复（`pending=False`）、所有友链申请都会发；**站长自己的留言 / 回复不发**〔实测 M06 M09 M15 FR05 B03 B04〕。
- 在 daemon 线程里发送（`SMTP_SSL` + login，或 `SMTP` + `STARTTLS`），失败只记一行 `owner mail failed: <异常类名>`，接口照常 200〔实测 M16〕。`SMTP_SSL` 未传 `ssl` context，不校验证书〔代码〕；真实邮箱服务商行为〔待实测〕。

### 1.7 影响契约的配置项

| 配置 | 代码默认 | `.env.example` | 影响 |
| --- | --- | --- | --- |
| `MESSAGE_AUTO_PUBLISH` | **`true`** | `false` | `POST /api/messages` 返回 `data:null` 待审，还是直接返回留言对象；**两处默认值相反**，Java 要二选一并写清 |
| `FRIEND_AUTO_PUBLISH` | `false` | `false` | 申请直接发布且**不查 URL 冲突**〔实测 B05〕 |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | 同 | OAuth 回跳、邮件链接、友链 logo 回退 |
| `OAUTH_PUBLIC_BASE` | `http://localhost:5173` | 同 | OAuth `redirect_uri` 前缀 |
| `FRIENDS_SITE_URL` | 回退 `FRONTEND_ORIGIN` | — | RSS / sitemap / robots 的站点前缀 |
| `CONTENT_ROOT` | `content` | — | Markdown 正文与 `media/files` 根目录；`GET /` 会暴露其绝对路径 |
| `GITHUB_*` / `GOOGLE_*` | 空 | 空 | `providers` 结果；未配置时发起登录直接回跳 `auth_error=*_not_configured`〔实测 B01 B02〕 |

### 1.8 共享对象

**Post**（列表项）〔实测 R02〕：`id`（`legacy_id`，没有则数字 id 转字符串）、`slug`、`locale`（默认 `zh`）、`title`、`summary`、`published_at`、`updated_at`、`tags`（`keywords` JSON，字符串数组）、`category_id`（int，空为 0）、`pinned`、`pinned_order`（**`0` 与空都输出 `9999`**）、`type`（`article` / `project_note` / `algorithm`）；`cover` 仅非空时出现。`algorithm` 另带 `difficulty`、`oj`、`problem_id`、`series`；`project_note` 另带 `project_id`、`role`、`feature_key`（这些可为 `null`）。详情另带 `body`（读 `CONTENT_ROOT/md_url`，读不到为 `""`），`?html=1` 时再带 `body_html`。

```json
{"category_id":1,"cover":"/api/media/files/film/main/background/bg-contract.png","id":"contract-001","locale":"zh","pinned":false,"pinned_order":9999,"published_at":"2026-10-01T08:00:00.000Z","slug":"contract-article-basic","summary":"合成样本……","tags":["契约","Markdown","测试"],"title":"契约样本：基础文章","type":"article","updated_at":"2026-10-05T09:30:00.000Z"}
```

**Project**〔实测 R40〕：`id`（`public_id`）、`slug`、`locale`、`title`、`summary`、`tags`、`status`（`published` / `archived` / `hidden`）、`layout`（原样 JSON 数组）；`featured`、`year`、`start_date`、`end_date`、`github_url`、`demo_url` 有值才出现；列表接口在 `related_posts_json` 非空时原样带上它，详情接口去掉它、改给合并后的 `related_posts`。

**Fragment**〔实测 F01 F04〕：列表 `id`、`content`（库内 summary）、`mood`（`rant` / `sketch` / `flash` / `daily`）、`createdAt`，有图时 `imageUrl` / `imageAlt`（封面图）。详情另带 `body`、`bodyHtml`，有图时 `images[{url,alt}]`、`coverIndex`。站长接口另带 `status`。

**Recommend**〔实测 F09 F11〕：列表 `id`、`category`（`software` / `opensource` / `anime`）、`rating`（1–5）、`title`、`summary`、`createdAt`，可选 `url`、`imageUrl`、`imageAlt`。详情另带 `body`、`bodyHtml`、`images`、`coverIndex`。站长接口另带 `status`。

**Message**〔实测 M02〕：`id`（`public_id`，导入数据为可读 id，新建为 UUID）、`author`、`avatarUrl`、`provider`、`profileUrl`、`isOwner`（库内 `is_owner` 或 `profile_url` 命中站长名单）、`content`、`createdAt`、`replies[]`（回复对象同结构但无 `replies`，按时间正序）。站长接口另带 `status`（0 待审 / 1 发布 / 2 隐藏 / 3 拒绝）。

**Friend**〔实测 FR01 FR07〕：公开 `id`、`name`、`url`、`description`，有值才出现 `avatar`、`cover`、`tags`。站长接口另带 `status`、`sortOrder`、`createdAt`、`updatedAt`，有值时 `contactEmail`。

### 1.9 生产部署映射

依据 [`DEPLOY_SERVER.md`](../DEPLOY_SERVER.md) §0、§4 与 `designed/optimization/04`、`06`、`09`，全部是〔代码已确认（文档）〕，生产行为〔待实测〕；仓库里没有 nginx conf 和 systemd unit 正文。

| 外部路径 | Nginx | 到达后端 |
| --- | --- | --- |
| `/api/…` | `location ^~ /api/` → `127.0.0.1:5000`（必须前缀优先，否则 demo 的 `index.html` 被 `~* \.html$` 抢走） | 全部 `/api` 路由 |
| `/rss.xml`、`/sitemap.xml`、`/robots.txt` | `location =` 精确匹配，带 `Host`、`X-Real-IP`、`X-Forwarded-For: $proxy_add_x_forwarded_for`、`X-Forwarded-Proto` | 对应路由 |
| `/`、`/static/…`、其他 | `try_files … /index.html`（SPA） | 不到后端；Flask 的 `/` 与 `/static/…` 在生产不可达 |

- 后端：systemd `grunray-wiki`，`gunicorn -w 3 --timeout 60 -b 127.0.0.1:5000 run:app`（3 个 sync worker），机器 2 核 / 2 GB，`WorkingDirectory` 为 `backend/` 以便加载 `.env`。
- Nginx 开 gzip（含 `application/json`、`application/rss+xml`、`text/plain`），后端自己不压缩。
- `$proxy_add_x_forwarded_for` 会保留客户端自带的 XFF，所以后端取的「第一段」可被客户端控制（§1.5）。
- `/api/` 段的其余 `proxy_set_header`、`client_max_body_size` 在文档里省略为 `...`，以服务器 conf 为准〔待实测〕。Java 切换时只换 `proxy_pass` 上游，不改 location。

## 2. 路由索引

<!-- route-index:start -->
| # | 方法 | 路径 | 用途 | 权限 | 状态 | 用例 | Flask | Vue 调用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | `/` | 服务信息 | 公开 | 本地实测通过 | A01 | `__init__.py:28` | — |
| 2 | GET | `/rss.xml` | RSS 2.0 | 公开 | 本地实测通过 | A02 G06 | `__init__.py:35` | `FooterGrunRayMetaBar.vue:34`、`index.html:31`（链接） |
| 3 | GET | `/sitemap.xml` | 站点地图 | 公开 | 本地实测通过 | A03 | `__init__.py:47` | — |
| 4 | GET | `/robots.txt` | 爬虫规则 | 公开 | 本地实测通过 | A04 | `__init__.py:59` | — |
| 5 | GET | `/static/<path:filename>` | Flask 内置静态目录（未使用） | 公开 | 本地实测通过 | G03 | Flask 内置（app.py:278） | — |
| 6 | GET | `/api/health` | 探活 | 公开 | 本地实测通过 | R01 G05 | `read_api.py:150` | — |
| 7 | GET | `/api/posts` | 文章列表 | 公开 | 本地实测通过 | R02 R03 R04 R05 R06 R07 R08 | `read_api.py:155` | `contentRepository.ts:100`（BlogView:141、PostDetailView:108）、`:130`（ProjectNotesView:32）、`:156` |
| 8 | GET | `/api/posts/latest-updated` | 最近更新 3 篇 | 公开 | 本地实测通过 | R09 | `read_api.py:188` | `HomeView.vue:144` |
| 9 | GET | `/api/posts/random-recommend` | 随机 1 篇 | 公开 | 本地实测通过 | R10 | `read_api.py:206` | `HomeView.vue:161` |
| 10 | GET | `/api/posts/<slug>` | 文章详情 | 公开 | 本地实测通过 | R11 R12 R13 R14 | `read_api.py:225` | `contentRepository.ts:136`（PostDetailView:104） |
| 11 | GET | `/api/search` | 关键词搜索 | 公开 | 本地实测通过 | R15 R16 R17 R17b | `read_api.py:249` | — |
| 12 | GET | `/api/posts/<slug>/related` | 相关文章 | 公开 | 本地实测通过 | R18 R19 R20 R21 | `read_api.py:275` | — |
| 13 | GET | `/api/media/files/<path:filename>` | 媒体文件（含 WebP 协商、Range） | 公开 | 本地实测通过 | R22 R23 R24 R25 R26 R27 R28 R29 R30 R31 | `read_api.py:317` | 静态 URL：`pagePhotoBackgrounds.ts:6`–`30`、`siteAvatar.ts:5`、`main.css:22`、`projects.json:24`；及各接口返回的图片 / 音频 URL |
| 14 | GET | `/api/media/list` | 媒体列表 | 公开 | 本地实测通过 | R32 R33 R34 R35 | `read_api.py:328` | `HomeView.vue:122` |
| 15 | GET | `/api/media/list/filmfeed` | 胶片栏白名单列表 | 公开 | 本地实测通过 | R36 R37 | `read_api.py:467` | `FilmFeed.vue:55` |
| 16 | GET | `/api/music/tracks` | 曲目列表 | 公开 | 本地实测通过 | R38 R39 | `read_api.py:409` | `FloatingMusicPlayer.vue:658` |
| 17 | GET | `/api/projects` | 项目列表 | 公开 | 本地实测通过 | R40 R41 | `read_api.py:512` | `contentRepository.ts:21`（HomeView:173、ProjectsView:137、ProjectDetailView:65、ProjectNotesView:30、PostDetailView:103、PostCard:26） |
| 18 | GET | `/api/projects/<slug>` | 项目详情 + 关联文章 | 公开 | 本地实测通过 | R42 R43 | `read_api.py:538` | — |
| 19 | GET | `/api/fragments` | 碎念列表 | 公开 | 本地实测通过 | F01 F02 F03 | `fragments_api.py:36` | `fragmentsApi.ts:77`（FragmentsView:127） |
| 20 | GET | `/api/fragments/<public_id>` | 碎念详情 | 公开 | 本地实测通过 | F04 F05 | `fragments_api.py:55` | `fragmentsApi.ts:81`（FragmentsView:146） |
| 21 | GET | `/api/xiqi/pages/<page>` | 栖息页 hero 配置 | 公开 | 本地实测通过 | F06 F07 | `fragments_api.py:68` | `fragmentsApi.ts:85`（XiqiPageHero:53） |
| 22 | GET | `/api/xiqi/about` | 关于页履历 | 公开 | 本地实测通过 | F08 | `fragments_api.py:78` | `aboutApi.ts:17`（AboutView:44） |
| 23 | GET | `/api/recommendations` | 推荐列表 | 公开 | 本地实测通过 | F09 F10 | `fragments_api.py:99` | `recommendApi.ts:74`（RecommendView:120） |
| 24 | GET | `/api/recommendations/<public_id>` | 推荐详情 | 公开 | 本地实测通过 | F11 | `fragments_api.py:131` | `recommendApi.ts:78`（RecommendView:139） |
| 25 | GET | `/api/auth/providers` | 可用 OAuth 提供方 | 公开 | 本地实测通过 | U01 B01 | `auth_api.py:57` | `messageAuth.ts:52`（MessagesView:314） |
| 26 | GET | `/api/auth/me` | 当前会话用户 | 公开 | 本地实测通过 | U02 | `auth_api.py:67` | `messageAuth.ts:56`（MessagesView:315、HomeView:193、FriendsView:66、FragmentsView:249、RecommendView:188、FriendsAdminView:210、SiteNowEditView:73、XiqiOwnerEditView:123、FragmentComposeView:210、RecommendComposeView:212） |
| 27 | POST | `/api/auth/logout` | 登出 | 公开 | 本地实测通过 | U15 | `auth_api.py:77` | `messageAuth.ts:65`（MessagesView:348） |
| 28 | GET | `/api/auth/github` | 发起 GitHub 登录 | 公开 | 本地实测通过 | U03 | `auth_api.py:112` | `oauthRedirect.ts:30` 整页跳转（OAuthRedirectView:67） |
| 29 | GET | `/api/auth/google` | 发起 Google 登录 | 公开 | 本地实测通过 | U04 B02 | `auth_api.py:117` | `oauthRedirect.ts:30` 整页跳转（OAuthRedirectView:67） |
| 30 | GET | `/api/auth/github/callback` | GitHub 回调 | 公开 | 本地实测通过 | U05 U06 U07 U08 U09 U10 U11 U12 U13 | `auth_api.py:166` | —（提供方回跳；前端在 MessagesView:362–378、SplashWoniuOverlay:61 读结果） |
| 31 | GET | `/api/auth/google/callback` | Google 回调 | 公开 | 本地实测通过 | U14 | `auth_api.py:171` | —（同上） |
| 32 | GET | `/api/messages/captcha` | 留言验证码 | 公开 | 本地实测通过 | M01 | `messages_api.py:65` | `messageApi.ts:48`（MessagesView:298） |
| 33 | GET | `/api/messages` | 公开留言列表 | 公开 | 本地实测通过 | M02 M03 | `messages_api.py:163` | `messageApi.ts:61`（MessagesView:155） |
| 34 | POST | `/api/messages` | 发留言 | 登录 | 本地实测通过 | M04 M05 M06 M07 M15 M16 B03 B04 | `messages_api.py:184` | `messageApi.ts:69`（MessagesView:402） |
| 35 | POST | `/api/messages/<public_id>/reply` | 回复留言 | 登录 | 本地实测通过 | M08 M09 | `messages_api.py:259` | `messageApi.ts:80`（MessagesView:222） |
| 36 | GET | `/api/messages/admin` | 留言审核列表 | 站长 | 本地实测通过 | M10 M11 | `messages_api.py:70` | `messageApi.ts:100`（MessagesView:170、320） |
| 37 | PATCH | `/api/messages/admin/<public_id>` | 审核动作 | 站长 | 本地实测通过 | M12 | `messages_api.py:107` | `messageApi.ts:109`（MessagesView:244） |
| 38 | DELETE | `/api/messages/admin/<public_id>` | 删除留言及回复 | 站长 | 本地实测通过 | M14 | `messages_api.py:129` | `messageApi.ts:119`（MessagesView:265） |
| 39 | POST | `/api/messages/admin/<public_id>/block` | 拉黑作者 | 站长 | 本地实测通过 | M13 | `messages_api.py:146` | `messageApi.ts:126`（MessagesView:284） |
| 40 | GET | `/api/friends/captcha` | 友链验证码 | 公开 | 本地实测通过 | FR04 | `friends_api.py:46` | `friendsApi.ts:134`（FriendsApplyView:134） |
| 41 | GET | `/api/friends` | 公开友链 | 公开 | 本地实测通过 | FR01 | `friends_api.py:51` | `friendsApi.ts:103`（FriendsView:64） |
| 42 | GET | `/api/friends/special` | 特殊链接 | 公开 | 本地实测通过 | FR02 | `friends_api.py:72` | `friendsApi.ts:112`（FriendsView:65） |
| 43 | GET | `/api/friends/site-profile` | 本站友链资料 | 公开 | 本地实测通过 | FR03 | `friends_api.py:77` | `friendsApi.ts:121`（FriendsApplyView:193） |
| 44 | POST | `/api/friends/applications` | 申请友链 | 公开 | 本地实测通过 | FR05 FR06 B05 | `friends_api.py:89` | `friendsApi.ts:141`（FriendsApplyView:164） |
| 45 | GET | `/api/friends/admin` | 友链审核列表 | 站长 | 本地实测通过 | FR07 | `friends_api.py:152` | `friendsApi.ts:162`（FriendsAdminView:113） |
| 46 | PATCH | `/api/friends/admin/<public_id>` | 友链审核 / 编辑 | 站长 | 本地实测通过 | FR08 | `friends_api.py:193` | `friendsApi.ts:177`（FriendsAdminView:136、166） |
| 47 | GET | `/api/site/now` | 首页「此刻」 | 公开 | 本地实测通过 | X01 | `xiqi_admin_api.py:116` | `siteNowApi.ts:36`（HomeView:182、SiteNowEditView:41） |
| 48 | PUT | `/api/site/now` | 写「此刻」 | 站长 | 本地实测通过 | X02 | `xiqi_admin_api.py:127` | `siteNowApi.ts:43`（SiteNowEditView:57） |
| 49 | GET | `/api/xiqi/admin/fragments` | 碎念管理列表 | 站长 | 本地实测通过 | X03 | `xiqi_admin_api.py:298` | `fragmentsAdminApi.ts:214`（XiqiOwnerEditView:104） |
| 50 | GET | `/api/xiqi/admin/fragments/<public_id>` | 碎念管理详情 | 站长 | 本地实测通过 | X04 | `xiqi_admin_api.py:326` | `fragmentsAdminApi.ts:220`（FragmentComposeView:229） |
| 51 | GET | `/api/xiqi/admin/recommendations` | 推荐管理列表 | 站长 | 本地实测通过 | X05 | `xiqi_admin_api.py:341` | `fragmentsAdminApi.ts:240`（XiqiOwnerEditView:100） |
| 52 | GET | `/api/xiqi/admin/recommendations/<public_id>` | 推荐管理详情 | 站长 | 本地实测通过 | X06 | `xiqi_admin_api.py:371` | `fragmentsAdminApi.ts:247`（RecommendComposeView:230） |
| 53 | POST | `/api/xiqi/media` | 上传图片（按 scope） | 站长 | 本地实测通过 | X07 | `xiqi_admin_api.py:386` | `fragmentsAdminApi.ts:100`（FragmentComposeView:129、RecommendComposeView:124） |
| 54 | POST | `/api/fragments/media` | 旧路径：碎念图片 | 站长 | 本地实测通过 | X08 | `xiqi_admin_api.py:395` | — |
| 55 | POST | `/api/recommendations/media` | 旧路径：推荐图片 | 站长 | 本地实测通过 | X09 | `xiqi_admin_api.py:524` | — |
| 56 | POST | `/api/xiqi/hero-media` | 旧路径：页面 hero 图 | 站长 | 本地实测通过 | X10 | `xiqi_admin_api.py:564` | — |
| 57 | POST | `/api/fragments/import-file` | 碎念写 import 文件 | 站长 | 本地实测通过 | X11 | `xiqi_admin_api.py:404` | `fragmentsAdminApi.ts:109`（FragmentComposeView:196） |
| 58 | POST | `/api/fragments/import-db` | 碎念写文件并入库 | 站长 | 本地实测通过 | X12 | `xiqi_admin_api.py:415` | `fragmentsAdminApi.ts:119`（FragmentComposeView:196） |
| 59 | POST | `/api/recommendations/import-file` | 推荐写 import 文件 | 站长 | 本地实测通过 | X13 | `xiqi_admin_api.py:533` | `fragmentsAdminApi.ts:129`（RecommendComposeView:198） |
| 60 | POST | `/api/recommendations/import-db` | 推荐写文件并入库 | 站长 | 本地实测通过 | X14 | `xiqi_admin_api.py:544` | `fragmentsAdminApi.ts:139`（RecommendComposeView:198） |
| 61 | POST | `/api/xiqi/pages/import-file` | 页面配置写 import 文件 | 站长 | 本地实测通过 | X15 | `xiqi_admin_api.py:435` | `fragmentsAdminApi.ts:149`（无视图调用） |
| 62 | POST | `/api/xiqi/about/import-file` | 关于页写 import 文件 | 站长 | 本地实测通过 | X16 | `xiqi_admin_api.py:474` | — |
<!-- route-index:end -->

Flask 位置是 `url_map` 导出的视图源码首行（装饰器行）；`routes/` 下文件省略目录。

## 3. 路由详情

参数表里「—」表示无默认值；所有 query 参数都是字符串，按说明转换。

### 3.1 应用级（`backend/app/__init__.py`）

#### 1. `GET /` — 服务信息

- 响应 200 `{"service":"GrunRay wiki API","content_root":"<CONTENT_ROOT 绝对路径>"}`〔实测 A01〕。
- **暴露服务器绝对路径**（沙箱里是 `E:\…\.contract-sandbox\backend\content`）。Java 版建议去掉 `content_root`；任何调用方都不依赖它（§5）。

#### 2. `GET /rss.xml` — RSS 2.0

- 200，`Content-Type: application/rss+xml; charset=utf-8`，无 CORS 头〔实测 A02 G06〕。
- 条目：`published_at` 非空的文章，按 `published_at DESC, id DESC` 取 150 行，丢掉**所属项目 hidden** 的项目笔记后截 50 条〔实测 A02，条数上限〔代码〕〕。
- `link` / `guid` = `{FRIENDS_SITE_URL}/blog/{slug}`；`pubDate` 为 RFC 822 GMT（库内时间按 UTC 解释）；`category` 是前端 type 字符串；`description` 为压空白的 summary，空则省略〔实测 A02〕。
- 频道：`title` = `FRIENDS_SITE_TITLE`（回退 `SITE_OWNER_NAME`），`description` = `FRIENDS_SITE_DESCRIPTION`，`<image>` 用友链 logo（同 #43 的回退规则），`lastBuildDate` 取第一条的发布时间〔代码〕。

#### 3. `GET /sitemap.xml` — 站点地图

- 200，`application/xml; charset=utf-8`〔实测 A03〕。
- 10 个静态页（`/`、`/blog`、`/projects`、`/fragments`、`/recommend`、`/friends`、`/about`、`/messages`、`/legal`、`/design`，各有固定 changefreq / priority）+ 文章 `/blog/{slug}`（规则同 RSS，上限 1000，`lastmod` 取 `updated_at` 或 `published_at` 的日期）+ 非 hidden 项目 `/projects/{slug}`（**含 archived**，`lastmod` 取 `start_date`）〔实测 A03，优先级与上限〔代码〕〕。

#### 4. `GET /robots.txt`

- 200，正文 `User-agent: *`、`Allow: /`、`Disallow: /api/`、`Sitemap: {站点}/sitemap.xml`〔实测 A04〕。
- `Content-Type` 实际是 **`text/plain; charset=utf-8; charset=utf-8`**（`mimetype` 里自带 charset，Werkzeug 又追加一次）〔实测 A04〕。Java 输出单个 charset 即可，属于修正。

#### 5. `GET /static/<path:filename>` — Flask 内置

- `backend/app/static/` 不存在，任何请求 404 HTML〔实测 G03〕。Java 不需要实现；生产若有反代把 `/static` 转给后端，切换后行为不变（都是 404）〔待实测〕。

### 3.2 读接口（`read_api.py`，前缀 `/api`）

本组没有 `try`：数据库不可用时一律 500 HTML〔代码〕。

#### 6. `GET /api/health`

- 200 `{"ok":true}`，不查数据库〔实测 R01〕。部署探活用；Java 若改成查库，需要另开路径，别改这条的语义。

#### 7. `GET /api/posts` — 文章列表

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `type` | string | — | `article` / `project_note` / `algorithm`；未知值 → 200 空列表〔实测 R04〕 |
| `project_id` | string | — | 只返回 `extra.project_id` 等于它的**项目笔记**，不必同时传 `type`〔实测 R05 R06〕 |
| `category_id` | int | — | 空串视为未传；非整数 → 400 信封 A `invalid category_id`〔实测 R07 R08〕 |

- 200 裸对象 `{"posts":[Post…]}`，不含 `body`，**不分页**，一次返回全表〔实测 R02〕。
- 排序 `published_at IS NULL, published_at DESC, id DESC`（无发布时间的排最后）〔实测 R02〕。前端拿到后自己再排一次：置顶优先 → `pinned_order` 升序 → `published_at` 降序（`contentRepository.ts:35`）。
- **包含所属项目 hidden 的项目笔记**；博客页在前端按项目列表过滤（`contentRepository.ts:102`）〔实测 R02〕。
- 关键词为空的文章导入时会被 jieba 补 `tags`，所以 `tags` 不一定是作者写的〔实测 R02〕。

#### 8. `GET /api/posts/latest-updated` — 最近更新

- 200 `{"posts":[Post…]}`，最多 3 条，按 `COALESCE(updated_at, published_at, created_at) DESC, id DESC`〔实测 R09〕。
- 不过滤隐藏项目笔记，首页直接展示（§4.1）〔实测 R09〕。

#### 9. `GET /api/posts/random-recommend` — 随机推荐

- 200 `{"post":Post}`，`ORDER BY RAND() LIMIT 1`，范围是全部文章（含无发布时间的、隐藏项目笔记）〔实测 R10〕。
- 表空时 404 `{"error":"not_found"}`〔代码〕。

#### 10. `GET /api/posts/<slug>` — 文章详情

| 参数 | 位置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `slug` | path | string（不含 `/`） | — | |
| `html` | query | string | — | `1` / `true` / `yes`（不区分大小写）时附 `body_html` |

- 200 裸 `Post` + `body`（+ `body_html`）〔实测 R11 R12〕。`body_html` 由 Python-Markdown 渲染：`nl2br`、表格、`~~删除线~~` → `<del>`、代码块 `codehilite`（Pygments 的 `<span class="k">` 等类名），前端样式依赖这些类名〔实测 R12〕。
- Java（阶段 1）用 flexmark + 自研 Pygments 词法表，验收口径是 **DOM 等价**（`MarkdownSnapshotTest`）；夹具文章与 Flask 逐字节一致。已知差异见 §4.12。
- 隐藏项目下的笔记照常 200，可见性由前端 `canAccessPostPublic` 判断〔实测 R13〕。
- 不存在 → 404 `{"error":"not_found"}`；前端靠 404 显示「文章不存在」（`contentRepository.ts:138`）〔实测 R14〕。
- 路由优先级：`latest-updated`、`random-recommend` 是字面路径，优先于 `<slug>`〔实测 R09 R10〕。

#### 11. `GET /api/search` — 关键词搜索

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `q` | string | `""` | 按空白拆词；拆完为空 → `{"query":q,"results":[]}`〔实测 R15〕 |

- 200 `{"query":原样回显,"results":[Post…]}`，不分页。每个词（不区分大小写的子串）都要命中标题、摘要或某个关键词（AND）〔实测 R16〕；打分 `ln(views+1)`，每个词命中标题 +10、摘要 +3、关键词 +6，同一词在同一字段只计一次（`keywords_match.py`）〔代码〕。
- 排序键 `(-分数, -views, published_at)`：同分按发布时间**升序**（旧的在前）〔实测 R17b〕。
- **Bug**：同分的两篇里一篇 `published_at` 为 NULL 时，Python 拿 `datetime` 和 `""` 比较抛 `TypeError` → 500 HTML。沙箱复现：`GET /api/search?q=样本`〔实测 R17b〕。Java 版按「NULL 视为最早」实现即可，属于修正。
- 前端博客搜索是客户端子串过滤，不调这个接口（§4.4）。

#### 12. `GET /api/posts/<slug>/related` — 相关文章

| 参数 | 位置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `slug` | path | string | — | 不存在 → 404 `{"error":"not_found"}`〔实测 R21〕 |
| `limit` | query | int | `5` | 钳到 1–20；非整数回退 5〔实测 R19 R20〕 |

- 200 `{"posts":[Post…]}`，不含自身，按「与当前文章 `tags` 的交集个数」降序、`views` 降序、`published_at` 升序〔实测 R18〕。与 #11 同样的排序键，理论上同样会因 NULL 日期 500，夹具未触发〔代码〕。

#### 13. `GET /api/media/files/<path:filename>` — 媒体文件

- 根目录 `CONTENT_ROOT/media`；`filename` 可含 `/`。
- **WebP 协商**：`Accept` 含 `image/webp` 且原图是 `.jpg` / `.jpeg` / `.png` 时，转码到 `media/.webp_cache/{filename}.webp`（质量 82，按 mtime 失效）再返回：`Content-Type: image/webp`、`Cache-Control: public, max-age=86400`、`Vary: Accept`（外加 CORS 的 `Vary: Origin`）〔实测 R23〕。gif / webp 与其他类型不转〔实测 R24〕。没装 Pillow 或转码失败时静默回原图〔代码〕。
- **原图**：`send_from_directory`，`Cache-Control: no-cache`，带 `ETag`、`Last-Modified`、`Accept-Ranges: bytes`，**不带 `Vary: Accept`**〔实测 R22〕。`If-None-Match` 命中 → 304〔实测 R25〕。
- **Range**：`bytes=0-99` → 206 + `Content-Range: bytes 0-99/65536`；越界 → 416 HTML + `Content-Range: bytes */65536`〔实测 R26 R27 R28〕。音乐播放器拖动进度依赖它。
- MIME 由 Python `mimetypes` 推断：沙箱（Windows）里 mp3 为 `audio/mpeg`，js 为 `application/javascript; charset=utf-8`，html 为 `text/html; charset=utf-8`〔实测 R26 R31〕；Linux 生产机〔待实测〕。
- 项目 demo 整站也走这里（`/api/media/files/demos/<name>/v1/index.html` 及其相对资源），前端用 iframe 嵌入〔实测 R31〕。
- 路径穿越（`..%2F`）与不存在 → 404 HTML〔实测 R29 R30〕。

#### 14. `GET /api/media/list` — 媒体列表

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | int | `1` | 下限 1 |
| `size` | int | `20` | 钳到 1–100；`page` / `size` 非整数 → 400 信封 A `invalid page/size`〔实测 R35〕 |
| `type` | string | — | 小写后精确匹配（`image`、`gif`…） |
| `tag` | string | — | `tags` JSON 数组包含该值 |
| `article_id` | int | — | 非整数 → 400 `invalid article_id`〔实测 R35〕 |
| `folder` | string | — | 去掉首尾 `/` 后按 `url LIKE '/api/media/files/{folder}/%'` 过滤 |

- 200 信封 A，`data` 是数组（**没有 total**）：`{id,url,type,title,article_id,tags,created_at}`，按 `created_at DESC, id DESC`〔实测 R32 R33 R34〕。
- 首页用 `folder=film/homeView/center/avatar&size=1` 取头像〔实测 R33〕。

#### 15. `GET /api/media/list/filmfeed` — 胶片栏

- 同 #14 的分页参数，`size` 默认 50；只返回 `film/homeView/right_panel/` 下的媒体〔实测 R36 R37〕。

#### 16. `GET /api/music/tracks` — 曲目

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` / `size` | int | `1` / `50` | 同 #14，`size` 上限 100 |
| `tag` | string | — | 同 #14 |
| `post_id` | int | — | 非整数 → 400 `invalid post_id`〔实测 R39〕 |

- 200 信封 A，`data` 数组：`{id,url,title,artist,duration_sec,post_id,tags,sort_order,created_at,updated_at}`，按 `sort_order ASC, id ASC`〔实测 R38〕。播放器请求 `size=50`。

#### 17. `GET /api/projects` — 项目列表

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `include_archived` | bool 字符串 | `true` | `1` / `true` / `yes` 以外都视为 false，排除 archived〔实测 R41〕 |

- 200 `{"projects":[Project…]}`，永远排除 hidden；按 `start_date IS NULL, start_date DESC, id DESC`〔实测 R40〕。
- 前端只调这一次（`include_archived=true`）并缓存，项目详情页、项目笔记页、博客过滤都基于这份缓存〔代码，前端〕。

#### 18. `GET /api/projects/<slug>` — 项目详情

- 200 `Project`，去掉 `related_posts_json`，加 `related_posts`：先按 `related_posts_json` 手动列出（`pinned` 的在前，按 slug 补 `title` / `published_at`，`source:"manual"`），再追加 `extra.project_id` 指向本项目的项目笔记（`source:"auto"`，按 `published_at` 字符串降序），按 slug 去重〔实测 R42〕。

```json
{"label":"背景文章","pinned":true,"published_at":"2026-10-01 08:00:00","slug":"contract-article-basic","source":"manual","title":"契约样本：基础文章"}
```

- hidden 或不存在 → 404 `{"error":"not_found"}`〔实测 R43〕。
- **前端没有调用**：详情页直接用 #17 的缓存，不展示合并后的关联文章（§4.3）。

### 3.3 碎念 / 推荐 / 栖息页（`fragments_api.py`，前缀 `/api`，信封 B）

#### 19. `GET /api/fragments`

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `mood` | string | — | 小写后精确匹配；未知值 → 空列表〔实测 F02〕 |
| `sort` | string | `newest` | `newest` / `oldest`，其他值回退 `newest` |
| `page` / `size` | int | `1` / `50` | `size` 钳到 1–50；非整数 → 400 `invalid page/size`，`data:null`〔实测 F03〕 |

- 200 `{"items":[Fragment…],"total","page","size"}`，只含 published，按 `created_at` 排序〔实测 F01 F02〕。

#### 20. `GET /api/fragments/<public_id>`

- 200 Fragment 详情（`body` + `bodyHtml`）〔实测 F04〕；不存在或非 published → 404 信封 B `message:"not_found"`〔实测 F05〕。

#### 21. `GET /api/xiqi/pages/<page>`

- `page` 去空白转小写后查库〔实测 F06〕。
- 200 `{"page","heroImageUrl","heroImageAlt","status","updatedAt"}`〔实测 F06〕。
- 页面不存在、未知页面名或 status 为 hidden：**仍 200**，返回默认值且 `status` 写死 `"published"`、`heroImageUrl:null`、`updatedAt:null`〔实测 F07〕。

#### 22. `GET /api/xiqi/about`

- 200 履历对象：`alias`、`genderAge`、`email`（公开）、`intro`、`awards[{id,label,tier}]`、`education{schoolPublic,degree,major,period}`、`internship{companyPublic,role,period}`、`club{namePublic,role,period}`、`certificates[]`、`updatedAt`；`*Raw` 隐私字段不下发〔实测 F08〕。
- 未发布、正文文件缺失、Markdown 校验失败 → 200 `data:null`（前端回退本地数据）〔代码〕。

#### 23. `GET /api/recommendations`

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `category` | string | — | `software` / `opensource` / `anime`；其他 → 400 `invalid category`〔实测 F10〕 |
| `rating` | int | — | 1–5；越界或非整数 → 400 `invalid rating`〔实测 F10〕 |
| `sort` / `page` / `size` | | `newest` / `1` / `50` | 同 #19 |

- 200 分页结构同 #19，`items` 为 Recommend；无 summary 时导入阶段已从正文抽取〔实测 F09〕。

#### 24. `GET /api/recommendations/<public_id>`

- 200 Recommend 详情；草稿或不存在 → 404 信封 B `not_found`〔实测 F11〕。

### 3.4 登录（`auth_api.py`，前缀 `/api/auth`）

#### 25. `GET /api/auth/providers`

- 200 信封 `{"github":bool,"google":bool}`，按 client id **与** secret 是否都配置〔实测 U01 B01〕。

#### 26. `GET /api/auth/me`

- 未登录 200 `data:null`〔实测 U02〕；登录后返回 §1.3 的 `message_user` 加 `isSiteOwner`〔实测 U12 U13 U14〕。前端所有站长页靠它判断显示与跳转。

#### 27. `POST /api/auth/logout`

- 200 `data:true`，只清 `message_user`（验证码等其余会话键保留）；GET → 405 HTML〔实测 U15〕。

#### 28 / 29. `GET /api/auth/github`、`GET /api/auth/google` — 发起登录

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `return_to` | string | `/messages` | 必须匹配 `^/[a-zA-Z0-9/_\-?=&%.]*$` 且不以 `//` 开头，否则改为 `/messages`〔实测 U10〕；前端 `oauthRedirect.ts:3` 用同一正则 |

- 写会话 `oauth_return_to`、`oauth_state`（随机串），302 到提供方〔实测 U03 U04〕：
  - GitHub：`https://github.com/login/oauth/authorize?client_id=…&redirect_uri={OAUTH_PUBLIC_BASE}/api/auth/github/callback&scope=read:user user:email&state=<redacted>`
  - Google：`https://accounts.google.com/o/oauth2/v2/auth?client_id=…&redirect_uri=…/google/callback&response_type=code&scope=openid email profile&state=<redacted>&access_type=online&prompt=select_account`
- 提供方未配置：302 回 `{FRONTEND_ORIGIN}{return_to}?auth_error={github|google}_not_configured`〔实测 B02〕。

#### 30 / 31. `GET /api/auth/{github,google}/callback` — 回调

所有结果都是 302 回前端 `{FRONTEND_ORIGIN}{return_to}`（`return_to` 已含 `?` 时用 `&` 拼接），按顺序判断：

| 条件 | 回跳 query | 证据 |
| --- | --- | --- |
| 会话没有 state，或 `state` 不符 | `auth_error=invalid_state`（`return_to` 取不到时用 `/messages`） | 〔实测 U05 U06〕 |
| 带 `error` 参数 | `auth_error={error 原值，URL 编码}` | 〔实测 U07 U11〕 |
| 缺 `code` | `auth_error=missing_code` | 〔实测 U08〕 |
| 换 token / 取用户信息失败，或写库失败 | `auth_error={provider}_failed` | 〔实测 U09；写库失败〔代码〕〕 |
| 成功 | `auth=success`，并写 `message_user` | 〔实测 U12 U13 U14〕 |

- 换 token 时带与发起时相同的 `redirect_uri`〔实测 U12，模拟服务记录〕。
- GitHub 用户无公开 email 时再调 `/user/emails` 取主邮箱〔实测 U13〕；Google 的 `login` 取 email、`profile_url` 为空〔实测 U14〕。
- 登录即 upsert `guest_user`；**被拉黑的用户仍能登录**，只是不能发言〔实测 M13〕。
- 真实 GitHub / Google 的错误码、限速、邮箱权限差异〔待实测〕。

### 3.5 留言（`messages_api.py`，前缀 `/api/messages`，信封 B）

#### 32. `GET /api/messages/captcha`

- 200 `{"captchaId":"<redacted>","question":"13 + 15 = ?"}`，写会话 `message_captcha`〔实测 M01〕。

#### 33. `GET /api/messages`

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `sort` | string | `newest` | `newest` / `oldest` |
| `page` / `size` | int | `1` / `20` | `size` 钳到 1–50；非整数 → 400「分页参数无效」〔实测 M03〕 |

- 200 `{"items":[Message…],"total","page","size"}`；只含 published 的**顶层**留言，`total` 也只数顶层；每条带 published 回复〔实测 M02〕。前端请求 `size=50`。数据库异常 → 500「留言列表加载失败」〔代码〕。

#### 34. `POST /api/messages` — 发留言

请求体 JSON：`content`（string）、`captchaId`、`captchaAnswer`。按顺序校验：

1. 未登录 → 401「请先登录后再留言」〔实测 M04〕
2. 验证码（§1.5）→ 400〔实测 M05〕
3. IP 冷却 → 429〔实测 M06〕
4. `content` 非字符串 → 400「请填写留言内容」；去 HTML 后长度不在 2–500 → 400「内容长度需在 2–500 字之间」；含 `<script` / `<iframe` / `javascript:` / `on*=` / `data:text/html` → 400「内容包含不允许的 HTML 或脚本」；命中敏感词表 → 400「内容含有不允许的词语，请修改后重试」〔实测 M07〕
5. 每用户每小时上限 → 429〔实测 B03〕
6. 用户被拉黑 → 403「您的账号已被限制留言」〔实测 M13〕
7. 写库失败 → 500「留言保存失败」〔代码〕

- 成功：`MESSAGE_AUTO_PUBLISH=false` 时 200 `data:null`、`message:"留言已提交，等待审核"`〔实测 M06 M15〕；为 true 时 200 `data:Message`、`message:"留言发布成功"`〔实测 B03 B04〕。站长发言同样走这个开关，`is_owner` 置真〔实测 M15 B04〕。
- 邮件见 §1.6。

#### 35. `POST /api/messages/<public_id>/reply` — 回复

请求体 `{"content":string}`，**不要验证码**。按顺序：未登录 401「请先登录后再回复」→ `content` 非字符串 400「请填写回复内容」→ 回复 IP 冷却 429 → 内容校验 400 → 被拉黑 403 → 父留言不存在（含「回复的回复」，只认顶层）404「留言不存在」→ 父留言未发布 400「仅可对已发布的留言回复」〔实测 M08 M09 M13〕。

- 成功 200 `data:` 父留言（含全部回复），`message:"回复成功"`。**回复不经审核直接发布**，与 `MESSAGE_AUTO_PUBLISH` 无关；访客回复也会发站长邮件〔实测 M09〕。

#### 36. `GET /api/messages/admin`

| 参数（query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `status` | string | `pending` | `pending` / `published` / `hidden` / `rejected`；未知值回退 `pending`（没有 `all`）〔实测 M11〕 |
| `sort` | string | `newest` | |
| `page` / `size` | int | `1` / `30` | `MESSAGE_ADMIN_PAGE_SIZE`，上限 50 |

- 200 分页结构，`items` 为带 `status` 的 Message（只含顶层）〔实测 M11〕；权限 401 / 403〔实测 M10〕。前端用 `status=pending&size=1` 取待审数做角标（MessagesView:320）。

#### 37. `PATCH /api/messages/admin/<public_id>` — 审核

请求体 `{"action": "approve" | "reject" | "hide" | "restore"}`：

| 动作 | 允许的当前状态 → 目标 | 否则 400 |
| --- | --- | --- |
| `approve` | 待审 0 / 隐藏 2 → 发布 1 | 当前状态无法通过审核 |
| `reject` | 待审 0 → 拒绝 3 | 仅待审核留言可拒绝 |
| `hide` | 发布 1 → 隐藏 2 | 仅已发布留言可隐藏 |
| `restore` | 隐藏 2 → 发布 1 | 仅已隐藏留言可恢复 |

- 成功 200 `data:` 带 `status` 的 Message，`message:"操作成功"`〔实测 M12〕。
- 缺 `action` → 400「请指定审核动作 action」；未知动作 → 400「未知的审核动作」；**不存在或是回复 id → 400「留言不存在」（不是 404）**〔实测 M12〕。

#### 38. `DELETE /api/messages/admin/<public_id>`

- 200 `data:null`、`message:"留言已删除"`，外键级联删除其回复〔实测 M14〕。
- 不存在、已删除、或传回复 id → 400「留言不存在」（回复无法单独删除）〔实测 M14〕。

#### 39. `POST /api/messages/admin/<public_id>/block` — 拉黑

- 200 `data:null`、`message:"已拉黑该用户"`：标记 `guest_user.is_blocked`，把该用户已发布的顶层留言改为**隐藏**、待审的改为**拒绝**；已有回复不动〔实测 M13，回复不变〔代码〕〕。
- 站长的留言 → 400「无法拉黑站长」；留言没有关联登录用户 → 400「该留言未关联登录用户，无法拉黑」；不存在 → 400「留言不存在」〔实测 M13〕。

### 3.6 友链（`friends_api.py`，前缀 `/api/friends`，信封 B）

#### 40. `GET /api/friends/captcha`

- 同 #32，会话键 `friend_captcha`〔实测 FR04〕。

#### 41. `GET /api/friends`

- 参数同 #33（`size` 默认 50）。200 分页结构，`items` 为公开 Friend，只含 published，按 `sort_order DESC, created_at {sort}`〔实测 FR01〕。
- 前端出错时回退内置 mock 数据（§4.5）。

#### 42. `GET /api/friends/special`

- 200 `{"items":[{id,title,url,description,icon?}]}`，读 `data/friend_special_links.json`；缺 `id` 等必填项的条目丢弃，`icon` 不在白名单的只去掉 `icon`〔实测 FR02〕。

#### 43. `GET /api/friends/site-profile`

- 200 `{"title","url","logo","description"}`：`title` = `FRIENDS_SITE_TITLE`，`url` = `FRIENDS_SITE_URL`，`description` = `FRIENDS_SITE_DESCRIPTION`；`logo` 为空时回退 **`{FRONTEND_ORIGIN}/favicon.jpg`**（不是 `FRIENDS_SITE_URL`），相对路径也拼 `FRONTEND_ORIGIN`〔实测 FR03〕。

#### 44. `POST /api/friends/applications` — 申请

请求体 JSON：`siteName`、`siteUrl`、`description`、`contactEmail`、可选 `avatarUrl`，加 `captchaId` / `captchaAnswer`。**不需要登录**。顺序：验证码 400 → IP 冷却 / 每日上限 429 → 字段校验 400 → 写库失败 500「申请保存失败」〔实测 FR05 FR06 B05〕。

| 字段校验（沙箱实测文案） | |
| --- | --- |
| `siteUrl` | 「站点地址须为 http:// 或 https://」「站点地址格式不正确」 |
| `contactEmail` | 「请填写联系邮箱」「邮箱格式不正确」 |
| `avatarUrl` | 「头像地址格式不正确，请使用 http:// 或 https://」 |
| `siteName` 含 HTML | 「内容包含不允许的 HTML 或脚本」 |
| `description` | 「简介不能超过 200 个字符」 |

- 成功 200 `data:{"publicId":"<uuid>"}`；`FRIEND_AUTO_PUBLISH=false` 时 `message:"申请已提交，等待审核"`，为 true 时 `"友链已发布"`，且**不检查 URL 是否与已发布友链重复**（公开列表会出现两条同站点）〔实测 FR05 B05〕。
- 总会发站长邮件（若配置）〔实测 FR05〕。

#### 45. `GET /api/friends/admin`

- `status` 多一个 `all`（按 `status ASC, created_at {sort}`）；其余同 #36，`size` 默认 `FRIEND_ADMIN_PAGE_SIZE`=30〔实测 FR07〕。

#### 46. `PATCH /api/friends/admin/<public_id>` — 审核 / 编辑

请求体可同时带字段更新（`name`、`url`、`description`、`avatarUrl`、`contactEmail`、`sortOrder`）与 `action`（同 #37 四个动作，文案把「留言」换成「申请 / 友链」）。

- 先更新字段，再执行动作，二者在**同一事务**：动作失败时字段更新一起回滚〔实测 FR08〕。
- `approve` 时若规范化 URL 与已发布友链相同 → 400「该站点 URL 已有已发布友链，无法通过审核」；改 `url` 撞车 → 400「该站点 URL 已有已发布友链」〔实测 FR08，后者〔代码〕〕。
- `sortOrder` 非整数 → 400「排序值无效」；空 body → 400「请指定审核动作 action 或要更新的字段」；不存在 → 400「友链不存在」〔实测 FR08〕。
- 成功 200 `data:` 站长 Friend，`message:"操作成功"`〔实测 FR08〕。

### 3.7 站长内容（`xiqi_admin_api.py`，前缀 `/api`，信封 B）

除 #47 外都要求站长（401 / 403）〔实测 X02–X16〕。本组没有统一 `try`，未预期的异常 → 500 HTML。

#### 47. `GET /api/site/now`

- 200 `{"doing","reading","updatedAt"}`；无记录时全为 `null`；读库异常也回全 `null`（不报错）〔实测 X01，异常分支〔代码〕〕。

#### 48. `PUT /api/site/now`

- 请求体 `{"doing","reading"}`，每个字段去 HTML 标签、去首尾空白，空串存 NULL，上限 200 字（400「doing 最多 200 字」）〔实测 X02〕。
- **整体覆盖**：没传的字段被清空〔实测 X02〕。200 `data:` 新值、`message:"已更新此刻状态"`。写库异常 → 500 HTML〔代码〕。

#### 49 / 51. `GET /api/xiqi/admin/fragments`、`GET /api/xiqi/admin/recommendations`

- 参数同公开列表，另加 `status`（`published` / `hidden` / `draft`，空或 `all` 不过滤，其他 → 400）；`size` 上限 **100**；推荐的 `category` 不做白名单校验〔实测 X03 X05〕。
- 200 分页结构，每项多 `status`〔实测 X03 X05〕。前端请求 `size=100`。

#### 50 / 52. `GET /api/xiqi/admin/{fragments,recommendations}/<public_id>`

- 200 详情 + `status`，含草稿；`bodyHtml` 恒为 `""`（编辑器自己渲染）〔实测 X04 X06〕。不存在 → 404 `not_found`〔实测 X04 X06〕。

#### 53. `POST /api/xiqi/media` — 上传

- `multipart/form-data`：`file`（必填）、`alt`（可选）；`scope` 先读 query 再读表单〔实测 X07〕。
- `scope`：`fragments` / `recommendations` / `pages/{fragments|about|recommend}`；其他 → 400「未知 media scope」「未知页面 scope」〔实测 X07〕。
- 扩展名白名单 `.jpg .jpeg .png .webp .gif`（按文件名后缀，不看内容）→ 否则 400「不支持的文件类型: .xxx」；缺文件 → 400「缺少 file 字段」〔实测 X07〕。
- 保存为 `media/xiqi/{scope}/{uuid4hex}{ext}`，200 `{"url":"/api/media/files/xiqi/…","alt":…}`，上传后立即可经 #13 读取〔实测 X07〕。
- 没有大小上限（Flask 未设 `MAX_CONTENT_LENGTH`），由反代限制〔代码；生产 Nginx〔待实测〕〕。
- 权限检查在 scope 之前：匿名 401〔实测 X07〕。

#### 54 / 55. `POST /api/fragments/media`、`POST /api/recommendations/media`

- 等价于 #53 固定 `scope=fragments` / `recommendations`〔实测 X08 X09〕。前端已不调用。

#### 56. `POST /api/xiqi/hero-media`

- `page`（query 或表单）必须是 `fragments` / `about` / `recommend`，**校验先于鉴权**：匿名带非法 page 得到 400 而不是 401〔实测 X10〕。
- 等价于 #53 `scope=pages/{page}`，`data` 多一个 `page`〔实测 X10〕。前端已不调用。

#### 57. `POST /api/fragments/import-file` — 碎念写 import

请求体 JSON（camelCase，兼容 snake_case）：`publicId`（缺省自动生成 `frag-YYYYMMDD-xxxxxxxx`）、`mood`（默认 `daily`）、`status`（默认 `draft`）、`createdAt`（默认当前时间）、`bodyMarkdown`（或 `body`，必填）、`images[{url,alt}]`、`coverIndex`。

- 写 `import/xiqi/fragments/{publicId}.md`，200 `{"publicId","path","importCommand"}`，`message` 提示运行导入命令；**不入库**〔实测 X11〕。
- `path` 相对 `import/`，分隔符随操作系统（Windows 上是 `xiqi\fragments\…`）〔实测 X11〕。
- mood / status 非法、正文为空 → 400〔实测 X11〕；`coverIndex` 越界重置为 0〔实测 X12〕。
- **Bug**：`coverIndex` 不是整数 → `int()` 抛异常 → 500 HTML〔实测 X11〕。
- **Bug**：`publicId` 不校验，`../x` 会写到 `import/xiqi/fragments/` 之外〔实测 X11〕。推荐接口（#59）先校验，没有这个问题。

#### 58. `POST /api/fragments/import-db`

- 同 #57 先写文件，再解析入库（同时写 `content/xiqi/fragments/` 正文），200 `data` 多 `imported:true`、`message:"已写入数据库"`，公开列表立即可见〔实测 X12〕。
- 入库校验失败 → 400（如 publicId 不合法），**但 import 文件已经写下，不回收**〔实测 X12〕；数据库异常 → 500「写入数据库失败」〔代码〕。

#### 59 / 60. `POST /api/recommendations/import-file`、`/import-db`

- 字段：`publicId`（缺省 `rec-YYYYMMDD-xxxxxxxx`）、`category`（默认 `software`）、`status`（默认 `draft`）、`title`（必填）、`rating`（默认 5，1–5）、`url`（须 http(s)）、`summary`、`createdAt`、`bodyMarkdown`、`images`、`coverIndex`。
- 先用导入脚本同一套规则校验（publicId 8–64 位字母数字 `_-`），再写文件，所以非法 id 和穿越都在写文件前被拒〔实测 X13 X14〕。`rating` 非整数 / 越界、`title` 空、`url` 非 http(s) → 400〔实测 X13 X14〕。
- `coverIndex` 非整数同样 500 HTML〔代码〕。

#### 61. `POST /api/xiqi/pages/import-file`

- 请求体 `page`（`fragments` / `about` / `recommend`）、`status`（`published` / `hidden`，默认 published）、`heroImageUrl`、`heroImageAlt`；写 `import/xiqi/pages/{page}.md`，200 `{"page","path","importCommand"}`〔实测 X15〕。前端定义了调用函数但没有页面使用。

#### 62. `POST /api/xiqi/about/import-file`

- 请求体是 #22 的 camelCase 结构（可含 `*Raw` 隐私字段）+ `status` + `note`；按导入规则校验（缺 `alias` 等必填项 → 400「缺少必填字段 alias: resume.md」）后写 `import/xiqi/about/resume.md`〔实测 X16〕。
- 只写 import 文件，公开接口要等运行导入脚本才变〔实测 X16〕。前端没有调用。

## 4. 代码与调用方不一致

每条都在契约沙箱复现过（除特别标注）。复现命令里的 `$B` 指 `http://127.0.0.1:5001`。

### 4.1 首页会展示隐藏项目下的笔记

- **已修（2026-11-07）**：`latest-updated` 与 `random-recommend` 排除所属项目为 hidden 的项目笔记，与博客列表、RSS 一致。契约 R09 / R10 已改。

### 4.2 `/api/search` 在同分且有未发布文章时 500

- **复现**：`curl -i "$B/api/search?q=样本"` → 500 HTML〔实测 R17b〕。前端目前不调用，线上无感知。
- **迁移处理**：Java 视 NULL 为最早，返回 200，属于允许的修正。

### 4.3 项目详情接口无人调用

- **已修（2026-11-07）**：项目详情页先请求 `GET /api/projects/<slug>`，失败再退回列表缓存。

### 4.4 博客搜索与 `/api/search` 是两套语义

- 博客页关键词是客户端子串匹配（`contentRepository.ts:108`–`113`，标题 + 摘要 + 标签），`/api/search` 是分词 AND + 打分，前端不用。迁移不受影响，但两者结果不同，验收时不要拿一个去对另一个。

### 4.5 友链接口出错时前端显示 mock 数据

- **已修（2026-11-07）**：友链列表、特殊链接、本站资料请求失败时不再塞入 mock。列表页显示加载失败；申请页仍保留本地站点名作为复制用底稿。

### 4.6 部分请求绕过 `VITE_API_BASE_URL`

- **已修（2026-11-07）**：首页、胶片栏、头像和页面背景里的 `/api/` 地址走 `apiUrl()`。`main.css` 里的首屏默认背景仍是同源相对路径，路由切换后由脚本按 `VITE_API_BASE_URL` 改写。

### 4.7 非 JSON 错误让前端报解析错误

- 前端 service 一律 `await res.json()` 再看 `code`。遇到 Flask 的 HTML 404 / 405 / 500（如 #57 `coverIndex:"x"`），前端抛 `SyntaxError`，用户看到的是通用错误而不是后端文案。
- **复现**：站长登录后 `POST $B/api/fragments/import-file`，body `{"bodyMarkdown":"x","images":[{"url":"/a.png"}],"coverIndex":"x"}` → 500 `text/html`〔实测 X11〕。
- **迁移处理**：Java 对 `/api/**` 的未知路由、405、500 统一返回 JSON 信封是**允许的改进**，前端只会更好；但状态码保持不变。

### 4.8 开发代理只转发 `/api` 与 `/rss.xml`

- `vite.config.ts:17`–`25` 没有 `/sitemap.xml`、`/robots.txt`、`/`；dev 环境访问这两个文件得到 SPA 的 `index.html`。生产由 Nginx 转发〔待实测〕。代理目标端口 5000，契约沙箱用 5001，互不冲突。

### 4.9 `robots.txt` 双 charset、友链 logo 回退到前端域名

- `Content-Type: text/plain; charset=utf-8; charset=utf-8`〔实测 A04〕。
- `site-profile.logo` 与 RSS `<image>` 在未配置 logo 时用 `FRONTEND_ORIGIN/favicon.jpg`，而站点 URL 用 `FRIENDS_SITE_URL`；生产两者相同则无影响〔实测 FR03〕。

### 4.10 前端排序对无发布时间的文章不稳定

- **已修（2026-11-07）**：`sortPosts` 把空字符串和非法日期当成最早，比较结果不再是 `NaN`。无发布时间的文章稳定排在有发布时间的文章之后。

### 4.11 没有前端调用的路由

`/`、`/sitemap.xml`、`/robots.txt`、`/static/…`、`/api/health`、`/api/search`、`/api/posts/<slug>/related`、`/api/projects/<slug>`、`/api/fragments/media`、`/api/recommendations/media`、`/api/xiqi/hero-media`、`/api/xiqi/about/import-file`、两个 OAuth 回调（由提供方调用）；`/api/xiqi/pages/import-file` 只有 service 函数、没有页面使用。Java 迁移照样实现（外部可能有书签、爬虫、脚本调用），是否下线另开批次决定。

### 4.12 行内 `A<B` 被 Python-Markdown 当成 HTML 标签吃掉

- **现象**：`algorithm-luogu-p1347.md` 正文有「A<B，可以转化为图中A->B」。Python-Markdown 的行内 HTML 正则把 `<B，…>` 当成标签，输出里这段字消失。Java 按 CommonMark 把 `<` 转成 `&lt;`，文字保留。
- **复现**：`tools/contract/md_snapshots.py` 对该文的 Flask HTML 与 `backend-java` 的 `MarkdownRenderer` 比对（登记在 `known-differences.txt`）。
- **迁移处理**：允许的修正；前端 `.markdown-reading` 样式不依赖被吃掉的那段 HTML。

## 5. 交叉核对

`backend\.venv\Scripts\python.exe tools/contract/crosscheck.py` 读本文 §2 索引，逐行核对：

| 核对项 | 结果 |
| --- | --- |
| 索引 ↔ Flask `app.url_map`（`dump_routes.py` 导出） | 62 ↔ 62，方法、路径一一对应；Flask 位置行号一致 |
| 索引「本地实测通过」↔ `cases-*.json` | 62 条都有通过的用例，索引列出的用例号全部存在、通过、且打在对应路由上；没有漏列的用例 |
| Vue 源码字面量 → Flask 规则 | `frontend/src` 的 `.ts` / `.vue` / `.css` / `.json` 与 `index.html` 中 60 处 `/api/…`、`/rss.xml` 字面量全部匹配到 Flask 规则，0 处悬空；`oauthRedirect.ts:30` 的 `/api/auth/${provider}` 按模板匹配（`provider` 类型限定为 `github` / `google`） |
| 没有前端字面量的规则 | 14 条，与 §4.11 列表一致 |
| Vite 代理未覆盖 | `/`、`/robots.txt`、`/sitemap.xml`、`/static/<path:filename>`（§4.8） |

已编译的 `*.js` / `*.vue.js` 是 `vue-tsc` 产物，不算调用方，脚本不扫。HTTP 方法由人工对照 service 代码核过（字面量扫描看不到方法）。

## 6. 迁移风险清单（接口层）

| # | 风险 | 影响 | 处理 |
| --- | --- | --- | --- |
| 1 | 四种响应外形、两种错误 `data`（`[]` / `null`）、四种时间格式 | 前端解析失败或显示错乱 | 按本文逐路由复刻；契约测试用 JSON 规范化比对 |
| 2 | Flask 签名 Cookie 无法被 Java 读取 | 切换当天全员掉登录 | 接受；公告或选低峰切换。OAuth 回调地址不变，重新登录即可 |
| 3 | 进程内限流 / 验证码存会话 | Java 多实例时失效；XFF 可伪造 | 第一版单实例 + 内存实现保持一致；只信任反代追加的 XFF 另开批次 |
| 4 | `MESSAGE_AUTO_PUBLISH` 代码默认 true 与 `.env.example` false 相反 | 漏配时行为翻转 | Java 配置显式必填，或默认取 `.env.example` 的 false 并写进 CHANGELOG |
| 5 | Markdown 渲染（Python-Markdown + Pygments 类名）与 jieba 关键词 | 正文 HTML、标签、搜索结果不一致 | 渲染与关键词抽取是最难对齐的部分，单列阶段；先用快照比对 `body_html` |
| 6 | WebP 转码、Range、ETag、MIME | 图片 / 音频 / demo 失效 | 契约测试覆盖 R22–R31；MIME 表以 Linux 生产为准 |
| 7 | 已知 bug：#11 搜索 500、#57 `coverIndex` 500、#57 路径穿越、#58 失败不回收文件 | 修了就和 Flask 不一致 | Java 已修正：搜索 NULL 日期返回 200；`coverIndex` 非整数返回 400 JSON；碎念 `publicId` 含 `..` 或非法字符时 400 且不写文件；入库失败删除本次新文件。Flask 对照仍保留原行为 |
| 8 | 隐藏项目笔记在公开接口可见（§4.1） | 信息泄露（轻） | 已修：`latest-updated` 与 `random-recommend` 排除 hidden 项目笔记（批次 157） |
| 9 | 文件系统耦合：`content/`、`import/` 由接口直接读写 | Java 部署目录、权限、路径分隔符 | Java 读同一份 `CONTENT_ROOT`；`path` 字段统一用 `/` |
| 10 | 导入脚本（`scripts/`）与接口共享校验规则；`guest_message` / `friend_link` 的 `public_id` 是 `CHAR(36)`，导入脚本允许 64 位 | 超长 id 导入时被截断或报错 | 导入脚本暂留 Python；Java 校验与表结构对齐 |
| 11 | `schema.sql` 含 `DROP TABLE`，且不能整体重跑（`guest_user_blocked.sql` 重复加列、`site_now` 无 `IF NOT EXISTS`）；无数据时 `updated_at` NOT NULL 会让导入失败却退出码 0 | 误连现网会清表；新环境建库失败 | Flyway 基线前先审 SQL；应用启动不自动迁移；测试库按本沙箱步骤建（先核对主机与库名） |
| 12 | `config.py:9` `load_dotenv(backend/.env, override=True)`：`.env` 覆盖 shell 里的环境变量 | 在 shell 里改库名不生效，测试可能连到 `.env` 里的库 | Java 只读自己的 profile / 环境变量，不读 `backend/.env`；对照测试每个后端单独一份配置 |
| 13 | OAuth 端点写死在 `auth_oauth.py`（github.com、api.github.com、accounts.google.com、oauth2.googleapis.com、www.googleapis.com） | 只能靠打补丁指向模拟服务 | Java 端点走配置，测试指向 `mock_oauth` |
| 14 | 当前没有 CSRF 防护（§1.3）；Spring Security 默认开 CSRF | 现有前端的写请求会被拒 | **预期差异**：阶段 3 前端配合（如读 `XSRF-TOKEN` Cookie 回传请求头），CHANGELOG 说明 |
| 15 | 文件与数据库双写：#57 / #59 只写 import 文件，#58 / #60 先写文件再入库，失败不回收（#58） | 半成品文件、重复导入 | Java 定义补偿：入库失败删本次新写文件；同 `publicId` 重复提交按覆盖处理并写清 |

## 7. 测试数据与复跑

开发环境的分层、目录和一条命令见 [`tools/contract/README.md`](../tools/contract/README.md)。不连生产库。

- **数据库**：`grunray_wiki_contract`（本机 MySQL）。`setup_sandbox.py --reset` 先打印实际连接的主机、端口、用户和 `DATABASE()`，主机不是回环地址就拒绝，并且只删除这个库。
- **夹具**：`tools/contract/fixtures/`，全部合成。图片和 mp3 由脚本生成。
- **隔离**：代码和内容复制到 `.contract-sandbox/backend/`。模拟 OAuth `127.0.0.1:5002`，SMTP `127.0.0.1:1025`，Flask `5001`，Java `5010`。
- **结果**：`.contract-sandbox/results/`，不提交。

```powershell
backend\.venv\Scripts\python.exe tools\contract\run_dev_suite.py
```

这条命令依次跑 Flask pytest、Java `mvnw verify`、前端类型检查和 build，然后重置契约库，分别对 Java 和 Flask 跑 default 与 autopublish，再跑 Flyway 隔离库和回退演练。写入用例按顺序依赖，重跑前必须先停服务再 `--reset`。

不再需要时：

```sql
DROP DATABASE IF EXISTS grunray_wiki_contract;
DROP DATABASE IF EXISTS grunray_wiki_flyway_empty;
DROP DATABASE IF EXISTS grunray_wiki_flyway_baseline;
```

再删除 `.contract-sandbox/` 即可。
