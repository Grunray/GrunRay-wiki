[简体中文](README.zh-CN.md)

# GrunRay Wiki

A personal wiki with the tone of a printed magazine. The site is a Vue 3 single-page app. Article metadata lives in MySQL, and the Markdown bodies live under `backend/content/`.

The production API is **Java 21 + Spring Boot 3.5.x** (`backend-java/`). The Flask app in `backend/` stays in the tree for rollback and for the content-import scripts.

## Stack

| Part | Choice |
| --- | --- |
| Frontend | Vue 3, Vite, TypeScript, Pinia, Vue Router |
| Production API | Java 21, Spring Boot 3.5.x, Spring MVC, JdbcClient |
| Rollback API | Python, Flask, gunicorn |
| Database | MySQL 8 |
| Content | Markdown files plus front matter |

Visual tokens and motion live in [`docs/DESIGN.md`](docs/DESIGN.md). Do not introduce a second palette.

## Layout

```
frontend/        Vue app
backend-java/    production API
backend/         Flask API, content/, import/, SQL, import scripts
docs/            design, accessibility, API contract, migration notes
tools/contract/  local contract sandbox (never points at production)
designed/        static prototypes, not served in production
```

## Local development

Use a local MySQL database and `backend/.env` copied from `backend/.env.example`. Do not reuse the server `.env`.

Frontend, from `frontend/`:

```bash
npm ci
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:5000`. To talk to the Java API instead:

```bash
# PowerShell
$env:VITE_API_PROXY = "http://127.0.0.1:5010"
npm run dev
```

Flask, from `backend/` after the virtualenv is activated:

```bash
python run.py
```

That listens on `http://127.0.0.1:5000`. Setup, schema, and Markdown import are in [`backend/README.md`](backend/README.md). `sql/schema.sql` contains `DROP TABLE`; confirm the host and database name before running it.

Java, after `mvnw -B -DskipTests package` in `backend-java/`. Export `MYSQL_*` and an absolute `CONTENT_ROOT`, then:

```bash
java -jar target/grunray-wiki-api.jar --spring.profiles.active=local
```

The `local` profile listens on `8080` unless `PORT` is set. The contract sandbox uses `5010`. The app does not run Flyway on startup.

## Tests

From the repo root, with the backend virtualenv and JDK 21:

```bash
cd frontend && npx vue-tsc -b && npx vite build
cd backend && pytest          # no MySQL; install requirements-dev.txt first
cd backend-java && ./mvnw verify
```

On Windows the Maven command is `mvnw.cmd`. The full local suite (pytest, Java, frontend, Flask/Java contract cases, Flyway, rollback drill) is `python tools/contract/run_dev_suite.py`. It refuses non-loopback databases. See [`tools/contract/README.md`](tools/contract/README.md).

## Documentation

| Topic | Where |
| --- | --- |
| Design and motion | [`docs/DESIGN.md`](docs/DESIGN.md) |
| Keyboard and focus | [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) |
| HTTP contract | [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) |
| Java migration | [`docs/JAVA_MIGRATION.md`](docs/JAVA_MIGRATION.md) |
| What shipped | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |
| Known pitfalls | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) |
| Open work | [`TODO.md`](TODO.md) |
| Agent entry | [`AGENTS.md`](AGENTS.md) |

## Production

Deploy steps, the systemd units, and the Nginx upstream are in [`DEPLOY_SERVER.md`](DEPLOY_SERVER.md). The public API is `grunray-wiki-java` on `127.0.0.1:5010`. `grunray-wiki` (Flask on port 5000) is stopped and kept for rollback. Shipping a new jar is a separate upload from the Flask tree; do not put it inside `deploy-backend.tar`.
