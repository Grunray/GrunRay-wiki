[English](README.md)

# GrunRay Wiki

个人编辑式 wiki，气质是纸面杂志。站点是 Vue 3 单页应用。文章元数据在 MySQL，Markdown 正文在 `backend/content/`。

生产 API 是 **Java 21 + Spring Boot 3.5.x**（`backend-java/`）。`backend/` 里的 Flask 仍留在仓库里，用于回退和内容导入脚本。

## 技术栈

| 部分 | 选型 |
| --- | --- |
| 前端 | Vue 3、Vite、TypeScript、Pinia、Vue Router |
| 生产 API | Java 21、Spring Boot 3.5.x、Spring MVC、JdbcClient |
| 回退 API | Python、Flask、gunicorn |
| 数据库 | MySQL 8 |
| 内容 | Markdown 文件与 front matter |

视觉令牌和动效以 [`docs/DESIGN.md`](docs/DESIGN.md) 为准。不要另起一套配色。

## 目录

```
frontend/        Vue 应用
backend-java/    生产 API
backend/         Flask API、content/、import/、SQL、导入脚本
docs/            设计、无障碍、接口契约、迁移说明
tools/contract/  本机契约沙箱（不要指向生产库）
designed/        静态原型，生产环境不提供
```

## 本地开发

使用本机 MySQL，并从 `backend/.env.example` 复制出 `backend/.env`。不要拿服务器上的 `.env` 来用。

前端在 `frontend/`：

```bash
npm ci
npm run dev
```

Vite 开发服务器把 `/api` 代理到 `http://127.0.0.1:5000`。要改打 Java API：

```bash
# PowerShell
$env:VITE_API_PROXY = "http://127.0.0.1:5010"
npm run dev
```

Flask 在 `backend/`，先激活虚拟环境：

```bash
python run.py
```

默认监听 `http://127.0.0.1:5000`。建库、建表和 Markdown 导入见 [`backend/README.md`](backend/README.md)。`sql/schema.sql` 含 `DROP TABLE`，执行前先核对主机和库名。

Java 在 `backend-java/` 执行 `mvnw -B -DskipTests package` 之后，导出 `MYSQL_*` 和绝对路径 `CONTENT_ROOT`，再运行：

```bash
java -jar target/grunray-wiki-api.jar --spring.profiles.active=local
```

`local` 配置在未设置 `PORT` 时监听 `8080`。契约沙箱用的是 `5010`。应用启动不会跑 Flyway。

## 测试

在仓库根目录，准备好后端虚拟环境和 JDK 21：

```bash
cd frontend && npx vue-tsc -b && npx vite build
cd backend && pytest          # 不连 MySQL；先安装 requirements-dev.txt
cd backend-java && ./mvnw verify
```

Windows 上 Maven 命令是 `mvnw.cmd`。整套本机测试（pytest、Java、前端、Flask/Java 契约用例、Flyway、回退演练）是 `python tools/contract/run_dev_suite.py`。脚本会拒绝非回环数据库。说明见 [`tools/contract/README.md`](tools/contract/README.md)。

## 文档

| 主题 | 位置 |
| --- | --- |
| 设计与动效 | [`docs/DESIGN.md`](docs/DESIGN.md) |
| 键盘与焦点 | [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) |
| HTTP 契约 | [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) |
| Java 迁移 | [`docs/JAVA_MIGRATION.md`](docs/JAVA_MIGRATION.md) |
| 已发生的变更 | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |
| 已知坑 | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) |
| 未完成的工作 | [`TODO.md`](TODO.md) |
| 编码代理入口 | [`AGENTS.md`](AGENTS.md) |

## 生产

部署步骤、systemd 单元和 Nginx 上游写在 [`DEPLOY_SERVER.md`](DEPLOY_SERVER.md)。对外 API 是 `grunray-wiki-java`，监听 `127.0.0.1:5010`。`grunray-wiki`（Flask，端口 5000）已停，留作回退。更新 jar 要单独上传，不要打进 `deploy-backend.tar`。
