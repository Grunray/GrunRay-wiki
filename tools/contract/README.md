# 开发环境测试

这里只测本机。不连生产库，不改 Nginx / systemd，不覆盖服务器上的 `.env`。

## 放哪

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| Flask 单测 | `backend/tests/` | pytest，不连 MySQL |
| Java 单测 | `backend-java/src/test/java/` | 按包放，和 `src/main/java` 对齐 |
| Java 夹具 | `backend-java/src/test/resources/` | Markdown 金样、关键词语料 |
| 契约夹具 | `tools/contract/fixtures/` | 合成文章、项目、友链、留言、栖息页 |
| 契约脚本 | `tools/contract/*.py` | 建库、启停、用例、对照、Flyway、回退 |
| 跑完的结果 | `.contract-sandbox/results/` | 已 gitignore，不要提交 |
| 沙箱代码与内容 | `.contract-sandbox/backend/` | `setup_sandbox.py` 复制出来的，不要手改当源 |

Flyway 的建表脚本在 `backend-java/src/main/resources/db/migration/`，那是迁移文件，不是测试夹具。应用启动不会执行它。

## 一条命令

在仓库根目录：

```powershell
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-21.0.13+9"   # 本机已有 JDK 21 时可省略
backend\.venv\Scripts\python.exe tools\contract\run_dev_suite.py
```

顺序是：

1. `pytest`（`backend/`）
2. `mvnw verify`（`backend-java/`，不连 MySQL）
3. `vue-tsc -b` 和 `vite build`（`frontend/`）
4. 重置 `grunray_wiki_contract`，同时拉起 SMTP `1025`、模拟 OAuth `5002`、Flask `5001`、Java `5010`
5. `compare_bases.py`：同一组 GET，Flask 与 Java 对 JSON
6. Java 跑完 default 阶段，再切 autopublish 档跑 B01–B05（中间不重置库）
7. 再重置一次，Flask 跑 default 和 autopublish
8. `flyway_check.py`：空库 `grunray_wiki_flyway_empty`、已有库 `grunray_wiki_flyway_baseline`
9. `rollback_drill.py`：Java 写入此刻后停掉 Java，Flask 仍能读到；并做一次库备份恢复

主机不是回环地址会直接拒绝。`schema.sql` 含 `DROP TABLE`，只允许沙箱脚本在核对库名之后使用。

只要某一层失败，后面的步骤不再跑。

## 单独复跑

```powershell
$py = "backend\.venv\Scripts\python.exe"
& $py tools\contract\setup_sandbox.py --reset
& $py tools\contract\services.py start --java
& $py tools\contract\compare_bases.py
& $py tools\contract\run_cases.py --base http://127.0.0.1:5010 --phase default --label java
& $py tools\contract\services.py restart-java --profile autopublish
& $py tools\contract\run_cases.py --base http://127.0.0.1:5010 --phase autopublish --label java-b
& $py tools\contract\services.py stop
```

用例按编号顺序依赖登录、留言和友链状态。有失败时 `run_cases.py` 退出码为 1。不要拆开跑写入用例，重跑前先 `stop`，再 `setup_sandbox.py --reset`。

Java 相对 Flask 已约定的差异（用例里已按目标分支）：

- 未知路由 / 405 返回 JSON 信封，不是 HTML
- 搜索时 `published_at` 为 NULL 返回 200，NULL 视为最早
- 碎念 `coverIndex` 不是整数返回 400 JSON
- 碎念 `publicId` 含 `..` 或非法字符时拒绝写入
- 碎念入库失败会删掉这次新建的 import 文件

## 脚本

| 脚本 | 作用 |
| --- | --- |
| `setup_sandbox.py` | 建契约库、复制代码和合成夹具、导入 |
| `services.py` | 启停 SMTP、模拟 OAuth、Flask、Java |
| `run_cases.py` | 契约用例。`--phase default` 或 `autopublish`，`--base` 指向 5001 或 5010 |
| `compare_bases.py` | 同一组 GET 的 JSON 对照 |
| `crosscheck.py` | 契约索引、Flask 路由、实测结果、Vue 请求交叉核对 |
| `flyway_check.py` | 空库 migrate 与已有库 baseline |
| `rollback_drill.py` | 回退读取、冒烟、备份恢复、`-Xmx256m` |
| `md_snapshots.py` | 生成整站 `body_html` 快照，给 Java 单测可选比对 |

## 结束时

```sql
DROP DATABASE IF EXISTS grunray_wiki_contract;
DROP DATABASE IF EXISTS grunray_wiki_flyway_empty;
DROP DATABASE IF EXISTS grunray_wiki_flyway_baseline;
```

然后可以删掉 `.contract-sandbox/`。
