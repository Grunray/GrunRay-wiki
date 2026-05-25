---
public_id: proj-grunray-wiki
slug: grunray-wiki
title: GrunRay Wiki — 个人成果与博客站
summary: Vue 3 + TypeScript + Vite 前端，Flask + MySQL 后端；Markdown 驱动内容，涵盖项目展示、算法博文、碎念、友链与留言等模块。
tags:
  - Vue
  - TypeScript
  - Flask
  - MySQL
  - Vite
  - Markdown
locale: zh
status: published
featured: true
year: 2026
start_date: '2026-03-30'
end_date: null
github_url: https://github.com/Grunray/GrunRay_wiki
demo_url: ''
layout:
  - type: overview
    title: 概览
    body: |
      GrunRay Wiki 是我正在维护的个人成果站与技术博客：集中展示独立项目、项目开发笔记、算法学习文章，并扩展了「栖息」板块的碎念、推荐清单与关于页履历，以及访客留言板与友链申请。

      设计原则来自仓库内 designed/site-design-spec.md：数据驱动、易于扩展——新增一篇博文、一个项目卡片或一条碎念，优先通过 Markdown 与 import 脚本写入数据库，而不是改业务页面代码。主站与项目 Demo 解耦：Demo 以独立子工程构建，静态产物由后端 /api/media/files/... 托管，详情页以 iframe 嵌入。

      仓库为 monorepo：frontend/（主站）、backend/（API 与内容）、demos/（可独立构建的演示页）、designed/（设计稿与规范）、backend/import/（各类内容的 Markdown 源）。
  - type: markdown
    title: 整体架构
    body: |
      ## 分层与职责

      | 层级 | 技术 | 职责 |
      |------|------|------|
      | 展示层 | Vue 3 SPA（Vite 构建） | 路由、组件、主题/i18n、SEO、Markdown 渲染与消毒 |
      | API 层 | Flask 3 + flask-cors | 只读/写 JSON API、会话 OAuth、静态媒体、RSS |
      | 存储层 | MySQL 8 | 元数据、索引字段、关系表（项目、留言、友链等） |
      | 内容层 | `backend/content/` | Markdown 正文、配图、Demo 静态包、BGM 等 |

      文章**正文不落库**：`post` 表仅存 `md_url`（相对 `CONTENT_ROOT` 的路径），详情接口按需读取文件；可选 `?html=1` 由服务端 `markdown` + Pygments 渲染 `body_html`。

      ## 开发联调

      - 后端：`cd backend && python run.py`，默认 `http://127.0.0.1:5000`
      - 前端：`cd frontend && npm run dev`，Vite 将 `/api` 与 `/rss.xml` **代理**到 Flask（见 `frontend/vite.config.ts`）
      - 生产：前端 `npm run build` 产出静态资源；API 与 `content/` 由同一 Flask 进程或反向代理统一对外

      ## Demo 子工程策略

      每个演示放在 `demos/<name>/`，通过 `demos/build-demo-assets.mjs`（`npm run build:demos`）构建后复制到 `content/media/demos/...`。`wiki_project.demo_url` 与 layout 中 `demoUrl` 指向 `/api/media/files/demos/.../index.html`，`DemoBlock` 用 iframe + sandbox 加载，避免 Demo 源码耦合进主站构建。
  - type: markdown
    title: 技术栈与依赖
    body: |
      ## 前端（`frontend/package.json`）

      - **框架**：Vue 3.5（`<script setup>` + TypeScript）
      - **路由**：vue-router 5（`createWebHistory`）
      - **状态**：Pinia 3
      - **国际化**：vue-i18n 11（`zh` / `en`，界面文案与正文 locale 分离）
      - **Markdown**：`marked` 解析 + `DOMPurify` 消毒（项目块、博文详情）
      - **SEO**：`@unhead/vue`，封装 `useSeoMeta`（title/description/canonical/OG/Twitter/JSON-LD）
      - **动效**：GSAP（部分页面过渡）；顶栏工具按钮 FLIP 动画（`useHeaderToolbarLayoutShift`）
      - **构建**：Vite 8 + `@vitejs/plugin-vue`；路径别名 `@` → `src`，`@xiqi_img` → `designed/xiqi_img`

      ## 后端（`backend/requirements.txt`）

      - Flask 3、flask-cors、python-dotenv
      - PyMySQL + **cryptography**（MySQL 8 `caching_sha2_password`）
      - **markdown**、Pygments（服务端 HTML）
      - **jieba**（中文关键词 TF-IDF 抽词）
      - **PyYAML**（front matter 解析）

      ## 数据库

      - MySQL 8+，字符集 `utf8mb4`；JSON 字段存 `keywords`、`layout`、`tags` 等
      - 初始化：`python scripts/create_database.py` → `python scripts/run_sql.py`（`sql/schema.sql` 及增量脚本）
  - type: markdown
    title: 数据模型与内容类型
    body: |
      ## 核心表（`backend/sql/schema.sql`）

      | 表 | 用途 |
      |------|------|
      | `category` | 杂项 / 项目 / 算法（与 `post.type` 对应，分类与展示类型解耦） |
      | `post` | 文章元数据：`slug`、`md_url`、`keywords`、`type`、`pinned`、`extra` |
      | `wiki_project` | 项目卡片：`layout`（展示块 JSON）、`status`、`related_posts_json` |
      | `fragment` | 碎念元数据 |
      | `xiqi_page` / `xiqi_about` / `xiqi_recommend` | 栖息 Hero、关于履历、推荐条目 |
      | `guest_user` / `guest_message` | 留言 OAuth 用户与留言树 |
      | `friend_link` | 友链申请与展示 |
      | `music_track` | 站点 BGM 列表 |
      | `media` | 媒体资源索引（胶片流等，预留扩展） |

      ## `post.type` 与前端类型

      | DB `type` | 前端 `type` | 说明 |
      |-----------|-------------|------|
      | 0 | `article` | 普通文章 |
      | 1 | `project_note` | 项目笔记，`extra.project_id` 必填 |
      | 2 | `algorithm` | 算法博文，`extra` 可含 `difficulty`、`series`、`oj` 等 |

      列表排序（全局一致）：`pinned` 优先 → `pinned_order` 升序 → `published_at` 降序。

      ## 项目展示块（`wiki_project.layout`）

      支持的 `type`（`frontend/src/project-blocks/registry.ts`）：

      - `overview` / `changelog` — 纯文本展示（不解析 Markdown）
      - `markdown` — Markdown 正文（marked + DOMPurify）
      - `demo` — iframe，`demoUrl` 或 `meta.demo_embed_html`
      - `gallery` — 图片 URL 列表

      未知 `type` 走 `FallbackBlock`，便于后续扩展块类型而不改路由。

      ## 项目状态

      - `published` / `archived` / `hidden`（`wiki_project.status`）
      - 列表 API：`GET /api/projects?include_archived=true|false`
      - 笔记可见性跟随所属项目（设计见 `designed/site-design-spec.md` §7）
  - type: markdown
    title: 前端路由与功能模块
    body: |
      ## 路由（`frontend/src/router/index.ts`）

      | 路径 | 页面 | 说明 |
      |------|------|------|
      | `/` | HomeView | 首页、胶片流 `FilmFeed`、入口 |
      | `/projects` | ProjectsView | 项目时间轴与标签筛选 |
      | `/projects/:slug` | ProjectDetailView | 布局块渲染 + SEO |
      | `/projects/:slug/notes` | ProjectNotesView | 关联 `project_note` 列表 |
      | `/blog` | BlogView | 统一博客视图（文章/算法/笔记过滤） |
      | `/blog/:slug` | PostDetailView | Markdown 正文、相关推荐 |
      | `/fragments` | FragmentsView | 碎念列表（栖息分栏） |
      | `/fragments/compose` | FragmentComposeView | 站长撰写（需 OAuth） |
      | `/about` | AboutView | 关于 + 履历 Markdown |
      | `/recommend` | RecommendView | 推荐清单 |
      | `/messages` | MessagesView | 留言板 |
      | `/friends` | FriendsView | 友链展示 |
      | `/friends/apply` | FriendsApplyView | 友链申请 |

      ## 全局壳层（`AppShell.vue`）

      - `SiteNav`：主导航；滚动紧凑模式 `useNavScrollCompact`
      - 主题：日/夜切换、按路由的照片背景 `pagePhotoBackgrounds`、部分页面「损坏」视觉 `pageCorruptState`
      - 音乐播放器：调用 `GET /api/music/tracks`，音频 URL 同源 `/api/media/files/music/...`
      - 光标轨迹、页脚 `FooterGrunRayPanel`（外链与元信息栏）
      - 工具栏溢出与 FLIP 过渡，减少布局跳动

      ## 其他前端能力

      - **胶片流**：`FilmFeed` → `GET /api/media/list/filmfeed?folder=...`（白名单目录 `film/homeView/right_panel`）
      - **搜索**：调用 `GET /api/search?q=`（方案 C + 应用层打分）
      - **相关文章**：`GET /api/posts/<slug>/related?limit=5`
      - **碎念/推荐详情**：Xiqi 分栏布局 `XiqiSplitLayout`，支持 mood 筛选与详情展开动画
  - type: markdown
    title: 后端 API 一览
    body: |
      ## 只读内容（`read_api` Blueprint，`/api`）

      | 方法 | 路径 | 说明 |
      |------|------|------|
      | GET | `/api/health` | 健康检查 |
      | GET | `/api/posts` | 列表；`type`、`project_id` 筛选 |
      | GET | `/api/posts/<slug>` | 详情；`?html=1` 附加 `body_html` |
      | GET | `/api/search?q=` | 多词 AND 匹配（title/summary/keywords）+ 打分排序 |
      | GET | `/api/posts/<slug>/related` | 关键词相似推荐 |
      | GET | `/api/projects` | 项目列表 |
      | GET | `/api/projects/<slug>` | 详情 + 合并 `related_posts`（手动 + 自动 project_note） |
      | GET | `/api/music/tracks` | BGM；`page`/`size`/`tag`/`post_id` |
      | GET | `/api/media/files/<path>` | `content/media/` 静态文件 |
      | GET | `/api/media/list/filmfeed` | 胶片资源列表 |

      响应 envelope：`{ code, data, message }`。

      ## 栖息 / 碎念（`fragments_api`）

      - `GET /api/fragments`、`GET /api/fragments/<public_id>`
      - `GET /api/xiqi/pages/<page>` — `fragments` | `about` | `recommend` Hero
      - `GET /api/xiqi/about` — 履历（支持 `<xiqi-private>` 隐私块）
      - `GET /api/recommendations`、`GET /api/recommendations/<public_id>`

      ## 认证（`auth_api`，`/api/auth`）

      - GitHub / Google OAuth 2.0；Flask session + `SESSION_COOKIE_SAMESITE=Lax`
      - 回调 `OAUTH_PUBLIC_BASE`；登录后跳转 `FRONTEND_ORIGIN` 安全路径
      - 站长判定：`MESSAGE_OWNER_PROFILE_URLS` / `MESSAGE_OWNER_*_IDS`（`.env`）

      ## 留言（`messages_api`）

      - 列表、发表、回复树；敏感词、IP/用户冷却、验证码 TTL
      - `MESSAGE_AUTO_PUBLISH` 控制是否待审（当前默认需审核）

      ## 友链（`friends_api`）

      - 公开列表、`/special` 特别友链 JSON
      - 匿名申请 + 验证码；站长 `PATCH` 审核

      ## 站长撰写（`xiqi_admin_api`）

      - 写 `import/xiqi/...` 源文件与上传媒体；**不自动写 DB**，需手动跑 import 脚本后前台可见

      ## RSS

      - `GET /rss.xml`（根路径，非 `/api`）：文章 + 算法 + 非 hidden 项目笔记，最多 50 条
  - type: markdown
    title: 搜索、关键词与推荐
    body: |
      ## 关键词抽取

      - `app/keywords_extract.py`：jieba TF-IDF，导入文章时可写入 `post.keywords`
      - CLI：`scripts/content_tools/extract_keywords.py`

      ## 搜索方案 C（`app/keywords_match.py`）

      查询按空白分词；**每个词**必须在 `title`、`summary` 或 `keywords` 中至少命中一处（词之间 **AND**）。

      打分（`score_post`）：

      - 标题命中 +10 / 关键词 +6 / 摘要 +3（每词每字段至多计一次）
      - 附加 `log(views+1)` 浏览量权重

      ## 相关文章

      `GET /api/posts/<slug>/related` 基于关键词重叠与可见性规则返回列表，供博文详情侧栏使用。
  - type: markdown
    title: 内容导入管线
    body: |
      所有 import 源在 `backend/import/`，导入后正文进入 `backend/content/`，元数据 upsert MySQL。

      | 内容 | 源目录 | 脚本 |
      |------|--------|------|
      | 博文/算法/笔记 | `import/markdown/` | `scripts/content_tools/import_markdown_posts.py` |
      | 项目卡片 | `import/projects/*.md` | `scripts/projects_tools/import_projects.py` |
      | 碎念 / Hero / 关于 / 推荐 | `import/xiqi/...` | `scripts/xiqi_tools/import_xiqi.py` |
      | 友链 | `import/friend_link/` | `scripts/friend_link_tools/import_friend_links.py` |
      | 留言种子 | `import/guest/` | `scripts/guest_tools/` |
      | BGM | `import/music/` | `scripts/music_tools/import_music.py` |
      | 胶片/截图 | `import/film/` | 复制到 `content/media/...`（配合媒体 API） |

      项目 Markdown 模板：`import/projects/_template/project.template.md`。博文模板见 `designed/template.md`。

      开发可选：`seed_from_json.py` 从前端临时 JSON 灌入 `post`（**会清空 post 表**，仅开发用）。
  - type: markdown
    title: 配置与环境变量
    body: |
      复制 `backend/.env.example` → `.env`，关键项：

      - **MySQL**：`MYSQL_*`、`CONTENT_ROOT=content`
      - **CORS / 前端**：`FRONTEND_ORIGIN`、`CORS_ORIGINS`
      - **OAuth**：`GITHUB_*`、`GOOGLE_*`、`OAUTH_PUBLIC_BASE`
      - **留言/友链**：长度限制、冷却、验证码 TTL、`MESSAGE_AUTO_PUBLISH`、`FRIEND_AUTO_PUBLISH`
      - **站长**：`MESSAGE_OWNER_PROFILE_URLS`、`SITE_OWNER_NAME`
      - **友链站点元信息**：`FRIENDS_SITE_URL`（RSS 链接根、OG 用）

      Flask `SECRET_KEY` 生产环境必须替换为随机长串。
  - type: changelog
    title: 里程碑
    body: |
      2026-03-30  Initial commit：GrunRay wiki 初版（前端、后端、设计资源）。

      2026-04-11  补充后端并调整前端界面。

      2026-04-18  主页与文章详情改版；音乐曲目 API 与悬浮播放器；胶片墙媒体接口与首页动效资源。

      2026-04-18  导航壳与音乐播放器联动；悬浮播放器交互扩展；首页与浅色主题微调。

      2026-04-22  项目（Project）全链路：wiki_project 数据模型、API、导入脚本；项目列表/详情与演示资源接入。

      2026-05-03  博客与项目页改版；算法路由并入统一阅读流；蜗牛开屏、导航图标、favicon 与胶片资源。

      2026-05-03  AppShell 顶栏与主题切换改版；工具栏 FLIP 与页面入场动效；路由 meta 与主站胶片背景。

      2026-05-04  接入 @unhead/vue 与 useSeoMeta，各主要页面动态 SEO。

      2026-05-04  项目详情 Markdown 展示块；补充项目内容与文章修订。

      2026-05-13  添加 MIT License。

      2026-05-21  友链与留言板全栈：OAuth、审核/限流/验证码；友链申请与留言页。

      2026-05-24  导航与页脚 GrunRay 品牌区；后端脚本按内容/友链/访客分目录。

      2026-05-24  栖息模块落地：关于/碎念/推荐页与 Markdown 导入；404 与 corrupt 主题。

      2026-05-25  栖息三页入场动画、详情面板与列表筛选 FLIP、关闭详情时主栏归位过渡等交互打磨（含分支合并）。

      2026-05-25  全局 Markdown 阅读样式抽离至 markdown-reading.css。

      2026-05-25  RSS 2.0 订阅 /rss.xml。

      2026-05-25  栖息分栏与页脚揭示联动优化。

      2026-05-25  新增 GrunRay Wiki 项目卡片与工程开发笔记。
related_posts:
  - slug: grunray-wiki-note-home
    label: 首页布局与 API
    pinned: true
  - slug: grunray-wiki-note-create
    label: 创作：项目与博客
    pinned: true
  - slug: grunray-wiki-note-shell
    label: 导航与页脚壳层
    pinned: false
  - slug: grunray-wiki-note-theme
    label: UI 主题与样式
    pinned: false
  - slug: grunray-wiki-note-patterns
    label: 前端复用模式
    pinned: false
  - slug: grunray-wiki-note-community
    label: 社区：留言与友链
    pinned: false
  - slug: grunray-wiki-note-xiqi
    label: 栖息：碎念与推荐
    pinned: false
  - slug: project-demo-architecture-vite-flask
    label: Demo 架构设计
    pinned: false
  - slug: demo-app-content-pipeline
    label: 内容管线说明
    pinned: false
  - slug: project-vue-database-no-mapping
    label: 库表与前端类型映射
    pinned: false
  - slug: project-toolbar-flip-layout-shift
    label: 顶栏 FLIP 动画
    pinned: false
---

正文区域当前版本不会写入数据库；项目展示内容以 layout 为准。
