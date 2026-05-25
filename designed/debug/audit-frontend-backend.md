# GrunRay_wiki 前后端审计清单

**审计日期：** 2026-05-25  
**范围：** `frontend/`、`backend/` 运行时应用（不含修复实现）  
**说明：** 仅记录经代码核对可复现的问题；**未发现问题处不捏造**；设计取舍与真实缺陷分开标注。

---

## 图例

| 严重度 | 含义 |
|--------|------|
| **高** | 生产安全、数据泄露、XSS 等需优先处理 |
| **中** | 逻辑错误、不一致接线、明显 UX/数据问题 |
| **低** | 死代码、文档/i18n、局部体验差异 |
| **信息** | 功能未全站铺开（可能是刻意设计）或运维提示 |

---

## 一、隐患（安全 / 部署 / 数据边界）

### 后端

| # | 严重度 | 问题 | 位置 | 说明 |
|---|--------|------|------|------|
| B1 | 高 | 默认弱密钥与数据库密码 | `backend/app/config.py` L69–74 | 未配置 `.env` 时 `MYSQL_PASSWORD="123456"`、`SECRET_KEY="dev-change-me-in-production"`，误部署生产风险大。 |
| B2 | 高 | 开发服务器绑定与 DEBUG | `backend/run.py` L9–10 | `host="0.0.0.0"` 且 `FLASK_DEBUG=1` 时可能暴露 Werkzeug 调试能力；`.env.example` 示例含 `FLASK_DEBUG=1`。 |
| B3 | 中 | 未发布文章对 API 公开 | `backend/app/routes/read_api.py` | `_fetch_all_posts`、`GET /api/posts/<slug>`、`search`、`random-recommend`、`latest-updated` **无** `published_at IS NOT NULL` 过滤；草稿可通过 slug 取全文（含 `?html=1` 的 `body_html`）。 |
| B4 | 中 | hidden 项目笔记在列表 API 可见 | `read_api.py` `list_posts` 等 | `GET /api/projects/<slug>` 对 `status=hidden` 返回 404，但 `/api/posts` 仍返回 `type=project_note` 且 `project_id` 属于 hidden 的条目；RSS 会排除（见 `rss_feed.py` L79–92）。 |
| B5 | 中 | RSS 与 REST 可见性不一致 | `rss_feed.py` vs `read_api.py` | RSS 注释写「与博客列表可见性一致」，实际 RSS 过滤 `published_at` + hidden 笔记，REST 未同等过滤。 |
| B6 | 中 | 会话 Cookie 未强制 Secure | `backend/app/__init__.py` | 有 `HTTPONLY`、`SameSite=Lax`，无 `SESSION_COOKIE_SECURE`；HTTPS 生产若混用 HTTP 可能泄露 cookie。 |
| B7 | 中 | IP 限流可伪造 | `message_rate_limit.py`、`friend_rate_limit.py` | `client_ip` 取 `X-Forwarded-For` 首段，无受信代理配置时客户端可伪造 IP。 |
| B8 | 中 | 站长上传无体积上限 | `xiqi_admin_api.py` `_save_upload` | 已通过 session 的站长可 `file.save()`，存在磁盘占满风险。 |
| B9 | 中 | Markdown HTML 未消毒 | `markdown_util.py` | `markdown.markdown()` 允许内联 HTML；`?html=1` 与碎念/推荐详情共用该路径。 |
| B10 | 中 | OAuth 回调基址易配错 | `config.py` `OAUTH_PUBLIC_BASE` | 默认 `http://localhost:5173`；生产 API/前端不同源且未改时 OAuth 失败；命名易与 `FRONTEND_ORIGIN` 混淆。 |
| B11 | 低 | 站长识别依赖 profile_url | `site_owner.py`、`auth_oauth.py` | Google OAuth 的 `profile_url` 可能为空或与配置 URL 不一致，仅 Google 站长时可能无法识别。 |
| B12 | 低 | 验证码强度偏弱 | `message_captcha.py`、`friend_captcha.py` | 两位加法 + session 存答案；主要依赖 OAuth/限流。 |
| B13 | 信息 | `GET /` 暴露 content_root | `app/__init__.py` | 返回 `content_root` 绝对路径，便于部署侦察。 |
| B14 | 信息 | 限流为进程内 dict | 各 `*_rate_limit.py` | 多 worker/重启后限额重置。 |

**已核对较安全（不作为缺陷列出）：** SQL 查询以参数化为主；OAuth 有 `state` 校验；站长写接口需 session；留言/友链有基础 HTML 模式拦截；媒体路径有 `resolve()` + `startswith(content_root)` 约束。

### 前端

| # | 严重度 | 问题 | 位置 | 说明 |
|---|--------|------|------|------|
| F1 | 高 | 文章/栖 Qi 详情 `v-html` 无消毒 | `PostDetailView.vue`、`FragmentsView.vue`、`RecommendView.vue` | 使用 API 返回的 `body_html` / `bodyHtml` 直接 `v-html`；与 `markdownPreview.ts`（DOMPurify）及 `MarkdownBlock.vue` 不一致。 |
| F2 | 中 | compose 路由无守卫 | `router/index.ts`、`FragmentComposeView.vue` | `/fragments/compose` 无 `beforeEnter`；仅 `onMounted` 后非站长 `router.replace`，首屏可能短暂露出编辑 UI。 |
| F3 | 中 | `fetch` credentials 分裂 | `api/http.ts` vs `*Api.ts` | `apiGet` 为 `same-origin`；留言/友链/碎念/推荐等为 `include`；若 `VITE_API_BASE_URL` 跨域，会话行为不一致。 |
| F4 | 中 | 友链 API 失败静默回退 mock | `friendsApi.ts` L87–102 | `catch` 返回 `MOCK_FRIEND_LINKS` / `MOCK_SPECIAL_LINKS`，生产可能展示假数据且无错误提示。 |
| F5 | 信息 | 无 CSP / 安全头 | `vite.config.ts` | 仅 dev 代理 `/api`、`/rss.xml`；生产依赖外部反向代理，仓库内无 CSP 配置。 |
| F6 | 信息 | 静态 `index.html` 几乎无 SEO meta | `frontend/index.html` L28 | 仅 `<title>GrunRay</title>`；爬虫不执行 JS 时看不到 `useSeoMeta` 注入的 description/OG（SPA 常见限制，非逻辑 bug）。 |

---

## 二、小功能 / 能力未全项目一致

| # | 严重度 | 现象 | 已应用范围 | 未应用 / 差异 | 备注 |
|---|--------|------|------------|---------------|------|
| U1 | 中 | 博客可见性过滤 | 前端 `contentRepository.listPostsForBlog` 过滤 hidden 项目笔记 | **未**过滤 `published_at` 为空；`HomeView` 直连 `latest-updated` / `random-recommend` 无客户端过滤 | 与 B3、B4 后端问题叠加 |
| U2 | 中 | RSS 与列表语义 | `rss_feed.py` | REST `/api/posts*`、首页随机/最新接口 | 需后端统一或前端补过滤 |
| U3 | 中 | `MESSAGE_AUTO_PUBLISH` 默认 | 代码默认 `True`（`config.py` L96） | `.env.example` 为 `false`（L35） | 未配 `.env` 时与文档示例相反；`TODO.md` 已提到留言审核诉求 |
| U4 | 中 | API 文档 | `app/__init__.py` 已注册 RSS、messages、friends、xiqi、auth | `backend/README.md` API 表未完整收录 | 运维/协作易漏 |
| U5 | 低 | 栖 Qi 两阶段发布 | `xiqi_admin_api` 上传/导入文件 | 需手动跑 `import_xiqi.py` 才入库 | 「保存成功但站点未更新」体验断层 |
| U6 | 低 | Xiqi 分栏 + 页脚锁定 | `XiqiSplitLayout` + `useXiqiSplitFooter` | **仅** `FragmentsView`、`RecommendView` | About 有 `XiqiPageHero` 但无分栏；**可能是产品设计**，若计划「栖 Qi 页统一分栏」则属未铺开 |
| U7 | 低 | Markdown 代码块 UX | `useMarkdownCodeCopy` + `.body-markdown` 深度样式 | **仅** `PostDetailView` | 碎念/推荐详情有 `body-markdown` 类但无复制按钮与 codehilite 样式 |
| U8 | 低 | HTTP 客户端封装 | `api/http.ts` `apiGet` | 7+ 个 service 各自 `apiUrl` + envelope + `credentials: 'include'` | 修一处易漏一处 |
| U9 | 低 | 栖 Qi 页面 CSS 类 | `page-xiqi.css` + `page-enter-xiqi.css` | `FragmentComposeView` 用 `compose-page`，无 `page-enter-xiqi.css` | 入场动画/布局与其他栖 Qi 页不一致 |
| U10 | 信息 | 新页脚组件 | `FooterGrunRayMetaBar`、`FooterExternalLinks` | 已通过 `AppShell` → `FooterGrunRayPanel` **全站**挂载 | **无问题**：已全站应用 |
| U11 | 信息 | `useSeoMeta` | 所有已注册路由视图（含 `NotFoundView`） | `NavPlaceholderView` 有 SEO 但未接入 router | 见 L1 |
| U12 | 信息 | `appMainLayout: 'full-viewport'` | home、fragments、compose、about、recommend | blog、projects、messages、friends 等为默认布局 | 多为 intentional 全屏栖 Qi/首页 |

---

## 三、Bug / 逻辑错误

| # | 严重度 | 问题 | 位置 | 说明 |
|---|--------|------|------|------|
| G1 | 中 | 首页 session 缓存命中后不再请求 API | `HomeView.vue` L35–39、62–66、79–83 | 头像、最新三篇、随机推荐在 `sessionStorage` 命中时直接 `return`；同会话内后端更新不可见。对比 `BlogView.vue` L116–127：有 cache 仍 `await listPostsForBlog` 刷新。 |
| G2 | 中 | 未发布稿可出现在首页「最新」 | 后端 `latest-updated` + 前端 G1 | 后端未过滤 `published_at IS NULL`；缓存加重陈旧问题。 |
| G3 | 中 | 未发布稿可通过 slug 直接访问 | `get_post` + `PostDetailView` | 前端 `canAccessPostPublic` 只查 hidden 项目，**不**查 `published_at`。 |
| G4 | 低 | 无 DB 记录时栖 Qi 页配置默认 `published` | `fragments_api.py` L73–75 | `GET /api/xiqi/pages/<page>` 无行时仍返回 `status: "published"` 的默认 hero，可能掩盖未导入。 |
| G5 | 低 | `getRawPosts` 未使用 | `contentRepository.ts` L155–157 | 全仓库无引用，死代码。 |
| G6 | 低 | `NavPlaceholderView` 未接线 | `views/NavPlaceholderView.vue` | router 无 import；`navTitleKey` 未在 `vue-router-meta.d.ts` 声明。 |
| G7 | 低 | Mock 数据未使用 | `mockFragments.ts`、`mockMessages.ts` | `MOCK_FRAGMENTS`、`MOCK_GUEST_MESSAGES` 无引用（友链 mock 仍在 `friendsApi` 失败路径使用）。 |
| G8 | 低 | 页脚邮箱链接 `href="#"` 仍 `target="_blank"` | `externalLinks.ts`、`FooterExternalLinks.vue` | 行为怪异，非安全漏洞。 |

---

## 四、已核对「无问题」或「非缺陷」项（避免误报）

| 项 | 结论 |
|----|------|
| `useSeoMeta` | 所有 **已注册** 路由视图均已调用。 |
| `AppShell` + `FooterGrunRayPanel` | 全站包裹，新页脚结构已接入。 |
| 留言列表正文 | `MessagesView` 文本插值，非 `v-html`。 |
| OAuth `return_to` | 后端 `_safe_return_to` 校验，非开放重定向。 |
| SQL 注入（常规查询） | 用户输入多经 `%s` 参数化；fragment/recommend 的 `ORDER BY` 仅 `newest`/`oldest`。 |
| `XiqiSplitLayout` 仅两页 | 与 About 单栏 Hero 并存，更像 **产品分区**；若需统一交互再列为 U6 实施项。 |
| `frontend/dist` 未提交 | 当前为 untracked 构建产物，非仓库污染（`frontend/.gitignore` 需自行确认是否忽略 dist）。 |
| CORS 仅 `/api/*` | `/rss.xml` 无 CORS 对浏览器跨域拉取可能受限；同源或反代一般无影响。 |

---

## 五、与 `TODO.md` 的对应（现状核对）

| TODO 项 | 代码现状 |
|---------|----------|
| 留言审核机制 | `MESSAGE_AUTO_PUBLISH` 默认 **true**（B 端），与 TODO「发布直接通过」一致；`.env.example` 建议 false，易与默认行为混淆（U3）。 |
| 友链板块 | 已有 `FriendsView`、`friendsApi`、后端 friends 路由；失败回退 mock（F4）。 |
| RSS | 后端 `GET /rss.xml` 已实现，过滤严于 REST（B5）。 |

---

## 六、建议处理优先级（仅排序，**本次不实施修复**）

1. **生产配置：** 覆盖 `SECRET_KEY`、数据库密码，关闭 `FLASK_DEBUG`，HTTPS 下评估 `SESSION_COOKIE_SECURE`（B1、B2、B6）。
2. **公开数据边界：** `read_api` 统一 `published_at` + hidden 笔记策略，与 RSS、`contentRepository` 对齐（B3–B5、U1–U2、G2–G3）。
3. **XSS 面：** 后端消毒或前端对线上 `v-html` 统一 DOMPurify（B9、F1）。
4. **首页数据新鲜度：** `HomeView` 缓存策略（G1）。
5. **API/文档/默认值：** credentials 统一、README 补全、`MESSAGE_AUTO_PUBLISH` 默认与示例一致（F3、U4、U3）。
6. **体验一致：** Xiqi 详情 Markdown 代码块样式/复制（U7）；友链失败勿静默 mock（F4）。

---

## 七、审计方法

- 子代理探索 + 维护者对关键路径二次 `grep`/`read` 核实（`read_api.py`、`rss_feed.py`、`contentRepository.ts`、`HomeView.vue`、`router/index.ts` 等）。
- 未运行自动化测试或渗透测试；**动态行为**（如 OAuth 实机、多 worker 限流）需在部署环境复验。

---

*本文件为问题清单，不包含修复 diff。需要按项修复时请指定编号。*
