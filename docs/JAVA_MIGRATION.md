# 后端迁 Java · 总体计划

> 用 Java 21 + Spring Boot 3.5.x 替换已上线的 Flask 后端。逐路由的验收基线见 [`API_CONTRACT.md`](API_CONTRACT.md)，勾选与进度见 [`TODO.md`](../TODO.md) 批次 156。
> 为避免和 TODO 批次号混淆，本文的迁移步骤统一称「阶段 0–5」。

| 项 | 值 |
| --- | --- |
| 当前阶段 | 阶段 5 本机演练已完成（2026-11-06）；生产主机未授权，未切换 |
| 基线 | Flask `0fb0ec6`，61 条业务路由 + 1 条内置 `static`（[`API_CONTRACT.md` §2](API_CONTRACT.md#2-路由索引)） |
| 生产 | 仍是 Flask：systemd `grunray-wiki`，gunicorn 3 worker，`127.0.0.1:5000`，Nginx 反代（[`API_CONTRACT.md` §1.9](API_CONTRACT.md#19-生产部署映射)） |
| 生产执行 | 每次都要另行授权；本计划内任何阶段都不默认动生产 |

## 1. 范围

**要迁**：在线 API（读、搜索、项目、栖息内容、媒体、订阅）、GitHub / Google 登录与站长判定、留言 / 友链 / 审核 / 封禁 / 验证码 / 限流 / 站长邮件、站长写入与上传、内容导入工具、部署运维（systemd、Nginx 上游、备份恢复）。

**不迁 / 不在本计划内**：前端重写与视觉调整；数据库表结构重设计（迁移期只做兼容所需的最小改动）；API_CONTRACT §4 里「修复另开批次」的产品问题（如首页显示隐藏项目笔记）。

**以什么为准**：当前仓库的 Flask 实现、Vue 调用方、已有 MySQL 数据与 `content/` 文件。文档与代码冲突时以代码和实测为准，并回写 API_CONTRACT。

## 2. 技术与目录

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | Java 21（LTS） | 目标主机需实测 JDK 21 与内存（阶段 5） |
| 框架 | Spring Boot 3.5.x + Spring MVC | 同步模型，对应 Flask 的请求 / 响应语义；不上 WebFlux |
| 构建 | Maven Wrapper（`mvnw` / `mvnw.cmd`） | 仓库内固定 Maven 版本，CI 与本机同命令 |
| 数据访问 | Spring JDBC `JdbcClient` | 手写 SQL，对齐 Flask 现有查询与排序；不用 ORM 自动生成 SQL |
| 数据库 | 现有 MySQL | 复用表、ID、slug、`md_url`、front matter、媒体 URL；Flyway 只在阶段 4 做基线，**应用启动不自动迁移** |
| 安全 | Spring Security + OAuth2 Client | 阶段 3；会话 Cookie、CSRF、站长判定 |
| 测试 | JUnit 5 + MockMvc；隔离 MySQL 集成测试 | 普通测试不连生产；隔离库建法同 `tools/contract/setup_sandbox.py` |

目录（并行实现，Flask 的 `backend/` 原样保留）：

```
backend-java/
  mvnw  mvnw.cmd  .mvn/wrapper/  pom.xml
  src/main/java/…/wiki/
    common/     响应信封、时间格式、错误处理、限流、验证码
    post/       文章、搜索、相关推荐
    project/    项目卡片
    xiqi/       碎念、推荐、栖息页、关于、此刻
    media/      媒体文件（Range / WebP）、胶片流、音乐
    feed/       RSS、sitemap、robots
    auth/       OAuth、会话、站长判定
    message/    留言、回复、审核、封禁
    friend/     友链、申请、审核
    notify/     站长邮件
    importer/   导入 CLI（阶段 4）
  src/main/resources/  application.yml + 各 profile
  src/test/java/…
```

按业务分包，包内按需要拆 `web` / `service` / `repository`，不强求三层齐全。根包名在阶段 1 定。

## 3. 迁移期规则

1. **契约优先**。每条路由按 API_CONTRACT 逐项保留：HTTP 方法、路径、查询参数与默认值、状态码、JSON 字段与类型、缺失字段与 `null`、排序、分页、时间格式、错误结构。动态值（UUID、时间戳、验证码题目、Cookie 值）用可验证的规则（格式、范围）比对，**不靠忽略字段或排序掩盖差异**。
2. **差异分三类**，每条都要在 API_CONTRACT 记一笔、在 CHANGELOG 说明：

   | 类别 | 处理 | 现有条目 |
   | --- | --- | --- |
   | 必须一致 | 默认 | 除下两行外全部 |
   | 允许的修正 | Java 直接修，对照测试标为预期差异 | `/api/search` 同分 500（§4.2）、`coverIndex` 非整数 500、碎念 `publicId` 路径穿越（必须修）、import-db 失败不回收文件、`/api/**` 未知路由 / 405 / 500 改回 JSON（状态码不变）（§4.7、§6） |
   | 需要前端配合 | 和前端改动同批交付 | CSRF（§6 #14）；切换后全员重新登录（§6 #2） |

3. **并行与回退**。Flask 一直保留到阶段 5 结束，用于行为对照和生产回退。生产切换时**只开放一个写入后端**；Java 写入的数据必须能被 Flask 继续读取，这是回退的前提。
4. **数据隔离**。Java 与 Flask 用同一份隔离 MySQL 测试数据和内容副本做对照；写入类用例每个后端各用一份独立副本，避免互相污染。普通测试不连生产 MySQL；`schema.sql` 含 `DROP TABLE`，执行前先核对实际连接的主机和库名。
5. **配置**。Java 不读 `backend/.env`（Flask 用 `override=True` 加载，会覆盖环境变量）；所有配置走 Spring profile 与环境变量，OAuth 端点可配置（测试指向 `mock_oauth`）。`MESSAGE_AUTO_PUBLISH` 代码默认与 `.env.example` 相反，Java 要显式二选一。
6. **每批交付**写清：修改范围、验证命令、通过项、未验证项，能独立审阅和复测。

## 4. 对照测试

阶段 0 留下的 `tools/contract/` 是对照测试的起点：

| 脚本 | 作用 | 后续要改 |
| --- | --- | --- |
| `setup_sandbox.py` | 建 `grunray_wiki_contract`（先核对主机 / 库名 / 脚本路径）、复制 `content/` `import/`、灌合成夹具 | 支持给 Java 另建一份写入用的库与内容副本 |
| `services.py` | 启停 Flask 5001、模拟 OAuth 5002、SMTP 1025 | 加 Java 进程（端口避开 5000–5002，阶段 1 定） |
| `run_cases.py` | 125 个用例，匿名 / 访客 / 站长三类会话 | `--base` / `--ids` / `--label` 指向 Java 5010；阶段 2 读用例与阶段 3 写入用例均已对 Java 通过 |
| `compare_bases.py` | 阶段 1 已迁的 GET 路径，Flask 与 Java JSON 规范化比对 | 后续阶段往 `PATHS` 里加路由 |
| `crosscheck.py` | 索引 ↔ `url_map` ↔ 实测结果 ↔ Vue 请求 | Java 加一份路由导出，确认 62 条全覆盖（阶段 2+） |

Java 自己的测试：每个迁移批次把 API_CONTRACT 里该批路由的关键成功与失败用例写成 JUnit 契约测试（MockMvc + 隔离 MySQL）。关键 SQL、JSON 字段、事务、导入、Flyway 都用隔离 MySQL 做集成测试。用现有 Vue（Vite 代理指向 Java）跑通主要访客与站长流程。

## 5. 阶段

### 阶段 0 · 盘点契约（已完成 2026-11-06）

- 产出 [`API_CONTRACT.md`](API_CONTRACT.md)：62 条「方法 + 路径」的索引与详情、全局约定、代码与调用方不一致 11 条、接口层风险 15 条、测试数据与复跑命令。
- 产出 `tools/contract/`：隔离沙箱、模拟 OAuth / SMTP、125 个用例（全部通过）、交叉核对脚本。
- 未覆盖：真实 GitHub / Google、真实 SMTP、生产 Nginx、Linux MIME 表、多 worker 下的限流（API_CONTRACT 标「待实测」）。

### 阶段 1 · 工程骨架与第一条链路（已完成 2026-11-06）

- 建 `backend-java/`：Java 21、Spring Boot 3.5.16、Maven Wrapper 3.9.14、profile `contract` / `local` / `prod`；CI `bash ./mvnw -B verify`（不连 MySQL）。
- 打通 `/api/health`、`GET /api/posts`（含过滤）与 `GET /api/posts/<slug>?html=1`。列表旁路 `latest-updated` / `random-recommend` 一并实现，避免 `/{slug}` 误吃字面路径。
- 全局件：信封 A / B、裸对象、`pinned_order` 0→9999、四种时间格式里的 Post ISO、CORS（`/api/**` 白名单 + 凭证）、`/api/**` 未知路由 / 405 / 500 回 JSON 信封 B（允许的修正）。
- **Markdown**：flexmark（FIXED_INDENT + 自研删除线）+ 从 Pygments 导出的词法表，输出 `.codehilite` 与 Pygments 类名。验收口径 DOM 等价；夹具逐字节一致；行内 `A<B` 按 CommonMark 转义（API_CONTRACT §4.12）。
- 对照：`run_cases.py --base http://127.0.0.1:5010`；`compare_bases.py` 比对 Flask 5001 与 Java 5010。Java 进程由 `services.py start --java` 拉起，读沙箱 `.env` 的 MYSQL_*，**不读**仓库 `backend/.env`。
- 验收：R01–R08、R11–R14 对 Java 通过；Flask↔Java JSON 比对通过。Vue 用 `VITE_API_PROXY=http://127.0.0.1:5010 npm run dev` 看博客列表/详情（封面图等媒体仍走未迁接口，会 404）。
- 未做：搜索、项目、媒体、RSS、OAuth、写入；独立写入库（本阶段只读，与 Flask 共用 `grunray_wiki_contract`）。

### 阶段 2 · 公开读取（已完成 2026-11-06）

- 迁完搜索、相关文章、项目列表/详情、媒体文件（Range、条件请求、WebP、demo）、媒体列表、胶片栏、曲目、碎念、推荐、栖息页、关于、此刻、RSS、sitemap、robots、`GET /`。
- 搜索复用库里已有关键词；`published_at` 为 NULL 的并列结果返回 200（NULL 视为最早），不再复刻 Flask 的 500。
- RSS / sitemap 正文与 Flask 逐字节一致。Tomcat 把 `Content-Type` 里的 `charset` 写成无空格，契约比对忽略这处空白。
- 验收：对 Java 5010 跑 A、G、R、F 与 X01，除下面三条预先约定的差异外 63/63 通过。G01 / G02 仍是 JSON 404 / 405（§4.7）；R17b 的 NULL 日期是 200（§4.2）。未在 Nginx 下重放 demo iframe，R31 已确认 `index.html` 与 `app.js` 的 MIME。

### 阶段 3 · 身份与写入（已完成 2026-11-06）

- 登录保留 `/api/auth/{github,google}` 与回调、回跳清洗、站长判定。会话 Cookie 仍是 `session`。外呼可配置，沙箱指向模拟 OAuth。
- CSRF：Cookie `XSRF-TOKEN`，写请求带 `X-XSRF-TOKEN`。前端留言、友链、此刻、站长编辑已带上。
- 留言、友链、审核、封禁、验证码、限流、站长邮件（失败不影响提交）已迁。邮件失败日志写 `owner mail failed: SMTPDataError`，契约脚本同时看 `java.log`。
- `PUT /api/site/now`、站长名录、上传、import-file / import-db 已迁。碎念 `publicId` 含 `..` 或非法字符时拒绝写入；`coverIndex` 不是整数返回 400 JSON；入库校验失败不留下新文件（API_CONTRACT §6 #7、#15）。
- 验收：对 Java 5010 按顺序跑 U、M、FR、X **55/55**，自动发布档 B **5/5**。随后补上契约没覆盖的三处：import Markdown 与 Flask 字段对齐（补测后 U/FR/X **39/39**）、友链头像与邮箱写入及已发布 URL 查重、删掉盖住 TypeScript 的未跟踪 `.js` 后 Vite 解析到 `.ts`。

### 阶段 4 · 导入 CLI 与运维（已完成 2026-11-06）

导入脚本不在 Java 里重写一套。在线渲染、审核、单条栖息写入已经在 Java；批量导入仍用现有 Python，避免和 jieba、front matter 再分叉。带 `DROP TABLE` 的 `schema.sql` 不再作为已有库的建表入口。

| 脚本 | 用途 | 去向 |
| --- | --- | --- |
| `content_tools/import_markdown_posts.py` | 文章导入（缺关键词时调用 jieba） | 切换前仍用本脚本。不批量重算已有 `post.keywords` |
| `content_tools/extract_keywords.py` | jieba TF-IDF | 仍用本脚本。Java 不引入第二套分词，见下方语料 |
| `content_tools/md_to_html.py` | 离线把 Markdown 转成 HTML | 在线正文改由 Java `MarkdownRenderer`。脚本只留作离线抽查 |
| `content_tools/seed_from_json.py` | 旧 JSON 全量灌 `post`（会清空表） | 退役。正式数据走 Markdown 导入 |
| `projects_tools/import_projects.py` | 项目卡片 | 切换前仍用本脚本 |
| `xiqi_tools/import_xiqi.py` | 碎念 / 栖息页 / 关于 / 推荐批量导入 | 切换前仍用本脚本。单条写入用 Java `import-file` / `import-db` |
| `media_tools/import_film_media.py` | 胶片目录登记 | 切换前仍用本脚本 |
| `media_tools/upload_media.py` | 本地文件登记进 `media` | 栖息配图改 `POST /api/xiqi/media`。本脚本只留作非栖息媒体登记 |
| `media_tools/sync_film_media_from_import.py` | 按 import 目录删除胶片和库记录 | 不迁。会删数据，只允许人工在确认后执行 |
| `music_tools/import_music.py` | 曲目 | 切换前仍用本脚本 |
| `friend_link_tools/import_friend_links.py` | 友链 Markdown 导入 | 切换前仍用本脚本。申请和审核已在 Java |
| `friend_link_tools/seed_friend_links.py` | 内联示例友链 | 退役。改 `import_friend_links.py` |
| `friend_link_tools/moderate_friend.py` | 友链审核 CLI | 退役。改 `PATCH /api/friends/admin/<public_id>` |
| `guest_tools/user/import_guest_users.py` | 批量补历史访客 | 切换前仍用本脚本。登录仍会 upsert |
| `guest_tools/message/import_guest_messages.py` | 留言 Markdown 导入 | 切换前仍用本脚本 |
| `guest_tools/message/seed_guest_messages.py` | 内联示例留言 | 退役。改 `import_guest_messages.py` |
| `guest_tools/message/moderate_message.py` | 留言审核 CLI | 退役。改留言审核 API |
| `create_database.py` | 按库名建空库 | 仍用本脚本。Flyway 不执行 `CREATE DATABASE` |
| `run_sql.py` | 按文件执行 `backend/sql/` | 退役为建表入口。`schema.sql` 含 `DROP TABLE`，禁止再对已有库全量执行 |

中文抽词：固定 4 段合成语料，`top_k=8`，结果在 `backend-java/src/test/resources/keywords/jieba.json`。jieba 会把 `public_id` 拆成 `public` / `id`，也会留下「不要」「时要」这种功能词。Java 不实现另一套分词，也不 `UPDATE` 历史关键词。缺关键词的新文章继续用 `extract_keywords.py`。

Flyway：`V1__baseline.sql` 去掉了一切 `DROP`。`application.yml`、`application-prod.yml`、`application-contract.yml` 都是 `spring.flyway.enabled=false`，启动不迁移。入口是 `FlywayTool`，只接受回环地址上的 `grunray_wiki_flyway_empty` 与 `grunray_wiki_flyway_baseline`。

验收（2026-11-06，本机回环 MySQL）：`python tools/contract/flyway_check.py`。空库 migrate 后有 `category` 3 行和栖息表，历史为 `1 / SQL`；再 migrate 一次，事先写入的 `site_now` 还在。已有库先手工建表并写入标记，baseline 后历史为 `1 / BASELINE`，标记还在；随后 migrate 没有执行 V1。两个隔离库还留着，不用了可以 `DROP DATABASE grunray_wiki_flyway_empty;` 和 `DROP DATABASE grunray_wiki_flyway_baseline;`。没有对 `grunray_wiki_contract` 和生产库执行。

### 阶段 5 · 演练与切换（本机演练完成 2026-11-06；生产主机未执行）

生产主机上的 systemd、Nginx 和数据库**没有动**。`DEPLOY_SERVER.md` 要求改 Nginx / 证书 / MySQL 必须另行授权，这次只在本机隔离环境做了能做的部分。

本机命令：`python tools/contract/rollback_drill.py`（回环 MySQL，库 `grunray_wiki_contract`）。

- 冒烟（Java 5010，全部 200）：`/api/health`、`/api/posts?size=1`、`/api/posts/contract-article-basic?html=1`、`/rss.xml`、`/sitemap.xml`、`/robots.txt`、`/api/friends`、`/api/messages/captcha`、`/api/site/now`。
- 回退：Java 以站长身份把此刻写成 `rollback-drill-java`。Flask 5001 立刻读到同一行。停掉 Java 之后，只留 Flask，读到的仍是这行。说明回退时 Nginx 切回 Flask，已写入的数据不用倒回去。
- 备份恢复：`mysqldump --single-transaction` 导出契约库，导入 `grunray_wiki_restore_drill`，`post` 行数都是 5。`content/posts/contract-article-basic.md` 副本的 SHA-256 前 12 位是 `00574b7e4446`。验完已删除恢复库。
- 内存：本机不是 2 GB 的 Linux 主机。Java 加上 `-Xmx256m`（日志有 `Picked up JAVA_TOOL_OPTIONS: -Xmx256m`），健康检查之后 `java.exe` 工作集约 256 MB（268128256 字节）。这是 2 GB 机器上给 JVM 的起点，上生产前仍要在那台机器上看 MySQL 和 Nginx 剩下多少。

切换时只让一个进程接受写入。Nginx 只改上游，location 不动：

```nginx
# 切到 Java 时。回退把 5010 改回 5000。
proxy_pass http://127.0.0.1:5010;
```

`/api/`、`/rss.xml`、`/sitemap.xml`、`/robots.txt` 一起改。切到 Java 之前停掉 systemd `grunray-wiki`（gunicorn :5000）；回退时先拉起 Flask，再把上游改回 5000，然后停掉 Java。两边不要同时对外写。

Java 用单独的 unit，监听 5010，堆先封在 256 MB。`EnvironmentFile` 用服务器现有的 `backend/.env`（不要用开发机的 `.env` 覆盖它），`PORT=5010` 写在 `EnvironmentFile` 之后，避免被 Flask 的 `PORT=5000` 盖住。`SPRING_PROFILES_ACTIVE=prod`。启动不跑 Flyway。切换后所有人要重新登录；写请求要带 CSRF。

未做：没有登录 `118.25.138.103`，没有安装 JDK、没有改 unit、没有 `nginx -t`、没有在 2 GB 主机上量 RSS。这些要等单独授权。生产切换不在默认部署动作里。

## 6. 主要风险

接口层的风险以 [API_CONTRACT §6](API_CONTRACT.md#6-迁移风险清单接口层) 为准，这里只列迁移层面的：

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Markdown 与代码高亮输出对不齐 | 正文排版、代码配色变化 | 阶段 1 快照比对后选型；差异写明 |
| 中文抽词替代（jieba） | 新导入文章的标签、搜索、相关推荐漂移 | 阶段 4 固定语料对比；历史数据不重算 |
| Spring Security 默认行为（OAuth 路径、登录跳转、CSRF） | 回调地址失效、前端写请求 403 | 阶段 3 显式改路径与未登录响应；CSRF 与前端同批 |
| 2 GB 主机内存 | JVM 与 MySQL 争内存 | 本机 `-Xmx256m` 时工作集约 256 MB；生产主机尚未实测 |
| 会话不可迁移 | 切换后全员重新登录 | 接受；低峰切换并公告 |
| 进程内限流 | 多实例失效，XFF 可伪造 | 第一版单实例；可信 XFF 另开批次 |
| 文件与数据库双写 | 半成品文件、重复导入 | 阶段 3 定补偿规则并测失败路径 |
| 旧 SQL 含 `DROP TABLE` | 误连现网清表 | 先核对主机与库名；Flyway 基线前审查；启动不自动迁移 |
