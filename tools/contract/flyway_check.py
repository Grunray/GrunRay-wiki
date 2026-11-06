"""隔离库上验证 Flyway：空库 migrate，已有库 baseline。

不读取、不修改 grunray_wiki_contract，也不执行带 DROP TABLE 的 schema.sql。
库名写死，且 MYSQL_HOST 必须是回环地址。

  backend\\.venv\\Scripts\\python.exe tools/contract/flyway_check.py
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402
from setup_sandbox import read_local_mysql_credentials  # noqa: E402

EMPTY = "grunray_wiki_flyway_empty"
BASELINE = "grunray_wiki_flyway_baseline"
ALLOWED = frozenset({EMPTY, BASELINE})
V1 = C.REPO_ROOT / "backend-java/src/main/resources/db/migration/V1__baseline.sql"
SENTINEL = "baseline-sentinel"


def log(msg: str) -> None:
    print(f"[flyway] {msg}", flush=True)


def _sql_statements(text: str) -> list[str]:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    lines = [line for line in text.splitlines() if not line.strip().startswith("--")]
    parts = []
    for chunk in "\n".join(lines).split(";"):
        statement = chunk.strip()
        if statement:
            if re.search(r"\bDROP\s+(TABLE|DATABASE)\b", statement, re.IGNORECASE):
                raise SystemExit("拒绝：V1 里出现 DROP")
            parts.append(statement)
    return parts


def _connect(creds: dict[str, str], database: str | None):
    import pymysql

    return pymysql.connect(
        host=creds["MYSQL_HOST"],
        port=int(creds["MYSQL_PORT"]),
        user=creds["MYSQL_USER"],
        password=creds["MYSQL_PASSWORD"],
        database=database,
        charset="utf8mb4",
        autocommit=True,
    )


def recreate(creds: dict[str, str], name: str) -> None:
    if name not in ALLOWED or not re.fullmatch(r"[a-z0-9_]+", name):
        raise SystemExit(f"拒绝重建库 {name!r}")
    conn = _connect(creds, None)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT @@hostname AS host, @@port AS port")
            row = cur.fetchone()
            log(f"MySQL hostname={row[0]} port={row[1]}，只操作 {name}")
            cur.execute(f"DROP DATABASE IF EXISTS `{name}`")
            cur.execute(
                f"CREATE DATABASE `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        conn.close()


def apply_v1(creds: dict[str, str], name: str) -> None:
    if name not in ALLOWED:
        raise SystemExit(f"拒绝在 {name!r} 执行 V1")
    statements = _sql_statements(V1.read_text(encoding="utf-8"))
    conn = _connect(creds, name)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            current = cur.fetchone()[0]
            if current != name:
                raise SystemExit(f"拒绝：DATABASE()={current!r}")
            for statement in statements:
                cur.execute(statement)
    finally:
        conn.close()


def query(creds: dict[str, str], name: str, sql: str, args=()):
    conn = _connect(creds, name)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            if cur.fetchone()[0] != name:
                raise SystemExit("拒绝：连错库")
            cur.execute(sql, args)
            return cur.fetchall()
    finally:
        conn.close()


def execute(creds: dict[str, str], name: str, sql: str, args=()) -> None:
    conn = _connect(creds, name)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            if cur.fetchone()[0] != name:
                raise SystemExit("拒绝：连错库")
            cur.execute(sql, args)
    finally:
        conn.close()


def java_bin() -> str:
    home = os.environ.get("JAVA_HOME", "").strip()
    if not home:
        guessed = Path.home() / ".jdks/jdk-21.0.13+9"
        if (guessed / "bin/java.exe").is_file():
            home = str(guessed)
            os.environ["JAVA_HOME"] = home
    if home:
        candidate = Path(home) / "bin" / ("java.exe" if os.name == "nt" else "java")
        if candidate.is_file():
            return str(candidate)
    raise SystemExit("找不到 java，请设置 JAVA_HOME")


def package() -> None:
    mvnw = C.REPO_ROOT / "backend-java" / ("mvnw.cmd" if os.name == "nt" else "mvnw")
    env = os.environ.copy()
    env["JAVA_HOME"] = str(Path(java_bin()).parents[1])
    log("mvn compile")
    subprocess.check_call(
        [str(mvnw), "-q", "-DskipTests", "compile"],
        cwd=C.REPO_ROOT / "backend-java",
        env=env,
    )


def run_java(creds: dict[str, str], database: str, command: str) -> None:
    if database not in ALLOWED or command not in {"migrate", "baseline"}:
        raise SystemExit("拒绝启动 Flyway")
    env = os.environ.copy()
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        env.pop(key, None)
    env.update(
        {
            "JAVA_HOME": str(Path(java_bin()).parents[1]),
            "MYSQL_HOST": creds["MYSQL_HOST"],
            "MYSQL_PORT": creds["MYSQL_PORT"],
            "MYSQL_USER": creds["MYSQL_USER"],
            "MYSQL_PASSWORD": creds["MYSQL_PASSWORD"],
            "MYSQL_DATABASE": database,
            "GRUNRAY_FLYWAY_COMMAND": command,
        }
    )
    mvnw = C.REPO_ROOT / "backend-java" / ("mvnw.cmd" if os.name == "nt" else "mvnw")
    proc = subprocess.run(
        [
            str(mvnw),
            "-q",
            "-DskipTests",
            "compile",
            "org.codehaus.mojo:exec-maven-plugin:3.5.0:java",
            "-Dexec.classpathScope=runtime",
            "-Dexec.mainClass=tech.grunray.wiki.ops.FlywayTool",
        ],
        cwd=C.REPO_ROOT / "backend-java",
        env=env,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        timeout=120,
    )
    interesting = [
        line
        for line in (proc.stdout + "\n" + proc.stderr).splitlines()
        if "[flyway]" in line or "拒绝" in line or "ERROR" in line or "Exception" in line
    ]
    for line in interesting:
        log(line)
    if proc.returncode != 0:
        raise SystemExit(f"Java Flyway 退出 {proc.returncode}")


def tables(creds: dict[str, str], name: str) -> set[str]:
    rows = query(creds, name, "SHOW TABLES")
    return {row[0] for row in rows}


def main() -> None:
    if not V1.is_file():
        raise SystemExit(f"找不到 {V1}")
    creds = read_local_mysql_credentials()
    if creds["MYSQL_HOST"] not in C.LOOPBACK_HOSTS:
        raise SystemExit("拒绝：不是回环地址")
    package()

    log(f"空库 {EMPTY}")
    recreate(creds, EMPTY)
    run_java(creds, EMPTY, "migrate")
    found = tables(creds, EMPTY)
    for required in ("category", "post", "fragment", "xiqi_page", "xiqi_recommend", "xiqi_about", "flyway_schema_history"):
        if required not in found:
            raise SystemExit(f"空库缺少表 {required}")
    count = query(creds, EMPTY, "SELECT COUNT(*) FROM category")[0][0]
    if int(count) != 3:
        raise SystemExit(f"category 行数 {count}，期望 3")
    history = query(creds, EMPTY, "SELECT version, type, success FROM flyway_schema_history")
    if history != (("1", "SQL", 1),):
        raise SystemExit(f"空库历史异常 {history}")
    execute(
        creds,
        EMPTY,
        "INSERT INTO site_now (id, doing, reading) VALUES (1, %s, %s)",
        (SENTINEL, "keep"),
    )
    run_java(creds, EMPTY, "migrate")
    doing = query(creds, EMPTY, "SELECT doing FROM site_now WHERE id = 1")[0][0]
    if doing != SENTINEL:
        raise SystemExit(f"第二次 migrate 改动了数据 doing={doing!r}")
    if query(creds, EMPTY, "SELECT version, type FROM flyway_schema_history") != (("1", "SQL"),):
        raise SystemExit("第二次 migrate 多写了历史")
    log("空库 migrate 通过，重复执行没有清表")

    log(f"已有库 {BASELINE}")
    recreate(creds, BASELINE)
    apply_v1(creds, BASELINE)
    execute(
        creds,
        BASELINE,
        "INSERT INTO site_now (id, doing, reading) VALUES (1, %s, %s)",
        (SENTINEL, "keep"),
    )
    run_java(creds, BASELINE, "baseline")
    doing = query(creds, BASELINE, "SELECT doing FROM site_now WHERE id = 1")[0][0]
    if doing != SENTINEL:
        raise SystemExit(f"baseline 改动了已有数据 doing={doing!r}")
    history = query(creds, BASELINE, "SELECT version, type, success FROM flyway_schema_history")
    if history != (("1", "BASELINE", 1),):
        raise SystemExit(f"baseline 历史异常 {history}")
    run_java(creds, BASELINE, "migrate")
    doing = query(creds, BASELINE, "SELECT doing FROM site_now WHERE id = 1")[0][0]
    if doing != SENTINEL:
        raise SystemExit("baseline 之后的 migrate 改动了数据")
    if query(creds, BASELINE, "SELECT version, type FROM flyway_schema_history") != (("1", "BASELINE"),):
        raise SystemExit("baseline 之后的 migrate 又执行了 V1")
    log("已有库 baseline 通过，随后 migrate 没有执行 V1")
    log("两条路径都通过。库仍保留，可手动 DROP DATABASE grunray_wiki_flyway_empty / grunray_wiki_flyway_baseline")


if __name__ == "__main__":
    main()
