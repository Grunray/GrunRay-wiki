"""本机阶段 5 演练：冒烟、Java 写入后 Flask 仍能读、契约库备份恢复、256MB 堆。

不连生产库，不改 Nginx / systemd。只使用回环上的 grunray_wiki_contract，
备份恢复落到 grunray_wiki_restore_drill，验完即删。

  backend\\.venv\\Scripts\\python.exe tools/contract/rollback_drill.py
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402
import run_cases  # noqa: E402
import services  # noqa: E402
from setup_sandbox import read_local_mysql_credentials  # noqa: E402

RESTORE_DB = "grunray_wiki_restore_drill"
MARKER = "rollback-drill-java"
SMOKE = (
    "/api/health",
    "/api/posts?size=1",
    "/api/posts/contract-article-basic?html=1",
    "/rss.xml",
    "/sitemap.xml",
    "/robots.txt",
    "/api/friends",
    "/api/messages/captcha",
    "/api/site/now",
)


def log(msg: str) -> None:
    print(f"[drill] {msg}", flush=True)


def _mysql():
    import pymysql

    creds = read_local_mysql_credentials()
    if creds["MYSQL_HOST"] not in C.LOOPBACK_HOSTS:
        raise SystemExit("拒绝：MySQL 不是回环地址")
    return creds


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


def find_dump() -> str | None:
    found = shutil.which("mysqldump")
    if found:
        return found
    for candidate in (
        Path(r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"),
        Path(r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"),
    ):
        if candidate.is_file():
            return str(candidate)
    return None


def backup_restore(creds: dict[str, str]) -> None:
    if RESTORE_DB == C.CONTRACT_DB or not RESTORE_DB.startswith("grunray_wiki_restore_"):
        raise SystemExit("拒绝恢复库名")
    dump = find_dump()
    if not dump:
        raise SystemExit("找不到 mysqldump，备份演练中止")
    cnf = C.RUN_DIR / "mysql-drill.cnf"
    C.RUN_DIR.mkdir(parents=True, exist_ok=True)
    cnf.write_text(
        "\n".join(
            [
                "[client]",
                f"host={creds['MYSQL_HOST']}",
                f"port={creds['MYSQL_PORT']}",
                f"user={creds['MYSQL_USER']}",
                f"password={creds['MYSQL_PASSWORD']}",
            ]
        ),
        encoding="utf-8",
    )
    try:
        admin = _connect(creds, None)
        try:
            with admin.cursor() as cur:
                cur.execute("SELECT DATABASE()")
                cur.execute(f"DROP DATABASE IF EXISTS `{RESTORE_DB}`")
                cur.execute(
                    f"CREATE DATABASE `{RESTORE_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
        finally:
            admin.close()
        sql = C.RUN_DIR / "contract.sql"
        log(f"mysqldump {C.CONTRACT_DB}")
        with sql.open("wb") as out:
            subprocess.check_call(
                [
                    dump,
                    f"--defaults-extra-file={cnf}",
                    "--single-transaction",
                    "--no-tablespaces",
                    C.CONTRACT_DB,
                ],
                stdout=out,
            )
        mysql = str(Path(dump).with_name("mysql.exe" if os.name == "nt" else "mysql"))
        log(f"恢复到 {RESTORE_DB}")
        with sql.open("rb") as src:
            subprocess.check_call([mysql, f"--defaults-extra-file={cnf}", RESTORE_DB], stdin=src)
        src_conn = _connect(creds, C.CONTRACT_DB)
        dst_conn = _connect(creds, RESTORE_DB)
        try:
            with src_conn.cursor() as cur:
                cur.execute("SELECT DATABASE()")
                if cur.fetchone()[0] != C.CONTRACT_DB:
                    raise SystemExit("拒绝：源库不对")
                cur.execute("SELECT COUNT(*) FROM post")
                src_posts = int(cur.fetchone()[0])
            with dst_conn.cursor() as cur:
                cur.execute("SELECT DATABASE()")
                if cur.fetchone()[0] != RESTORE_DB:
                    raise SystemExit("拒绝：恢复库不对")
                cur.execute("SELECT COUNT(*) FROM post")
                dst_posts = int(cur.fetchone()[0])
        finally:
            src_conn.close()
            dst_conn.close()
        if src_posts < 1 or src_posts != dst_posts:
            raise SystemExit(f"恢复后 post 行数不一致 src={src_posts} dst={dst_posts}")
        log(f"库恢复通过 post={dst_posts}")
        sample = C.SANDBOX_BACKEND / "content/posts/contract-article-basic.md"
        digest = hashlib.sha256(sample.read_bytes()).hexdigest()
        copied = C.RUN_DIR / "content-backup" / sample.name
        copied.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(sample, copied)
        if hashlib.sha256(copied.read_bytes()).hexdigest() != digest:
            raise SystemExit("content 副本哈希不一致")
        log(f"content 副本通过 {sample.name} sha256={digest[:12]}")
    finally:
        cnf.unlink(missing_ok=True)
        admin = _connect(creds, None)
        try:
            with admin.cursor() as cur:
                cur.execute(f"DROP DATABASE IF EXISTS `{RESTORE_DB}`")
        finally:
            admin.close()
        log(f"已删除 {RESTORE_DB}")


def smoke(base: str) -> None:
    run_cases.API_BASE = base
    client = run_cases.Client("smoke")
    for path in SMOKE:
        route, _, query = path.partition("?")
        params = dict(part.split("=", 1) for part in query.split("&") if part)
        response = client.get(route, query=params or None)
        if response.status != 200:
            raise SystemExit(f"冒烟失败 {base}{path} -> {response.status}")
        log(f"冒烟 200 {path}")


def rollback() -> None:
    run_cases.API_BASE = C.JAVA_BASE
    owner = run_cases.Client("owner")
    _, callback = run_cases.oauth_login(owner, "owner")
    if callback.status not in (302, 303):
        raise SystemExit(f"站长登录失败 {callback.status}")
    written = owner.request(
        "PUT",
        "/api/site/now",
        json_body={"doing": MARKER, "reading": "flask-can-read"},
    )
    if written.status != 200 or written.json()["data"]["doing"] != MARKER:
        raise SystemExit(f"Java 写入失败 {written.status} {written.text[:200]}")
    log("Java 已写入 site/now")
    run_cases.API_BASE = C.FLASK_BASE
    seen = run_cases.Client("flask").get("/api/site/now")
    if seen.status != 200 or seen.json()["data"]["doing"] != MARKER:
        raise SystemExit(f"Java 仍在时 Flask 读不到写入 {seen.text[:200]}")
    log("Flask 在 Java 运行时读到同一行")
    pids = services._load_pids()
    services._stop("java", pids)
    services._save_pids(pids)
    again = run_cases.Client("flask-after").get("/api/site/now")
    if again.status != 200 or again.json()["data"]["doing"] != MARKER:
        raise SystemExit("停掉 Java 后 Flask 读不到写入")
    log("回退演练通过：只留 Flask 仍能读 Java 写过的此刻状态")


def memory() -> None:
    os.environ["JAVA_TOOL_OPTIONS"] = "-Xmx256m"
    pids = services._load_pids()
    services._stop("java", pids)
    pids["java"] = services._start("java", ["--profile", "default"])
    services._save_pids(pids)
    run_cases.API_BASE = C.JAVA_BASE
    health = run_cases.Client("heap").get("/api/health")
    if health.status != 200:
        raise SystemExit(f"-Xmx256m 后健康检查失败 {health.status}")
    pid = pids["java"]
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            (
                "$java = Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" "
                "| Where-Object { $_.CommandLine -like '*grunray-wiki-api.jar*' }; "
                "if (-not $java) { throw '找不到 java.exe' }; "
                "$p = Get-Process -Id $java.ProcessId; "
                "[pscustomobject]@{pid=$p.Id; workingSet=$p.WorkingSet64; parent=%s; commandLine=$java.CommandLine} "
                "| ConvertTo-Json -Compress"
            )
            % pid,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    log(f"-Xmx256m wrapper={pid} {proc.stdout.strip()}")


def ensure_services() -> None:
    if not (C.SANDBOX_BACKEND / ".env").is_file():
        subprocess.check_call([sys.executable, str(C.TOOLS_DIR / "setup_sandbox.py")])
    subprocess.check_call([sys.executable, str(C.TOOLS_DIR / "services.py"), "start", "--java"])


def main() -> None:
    creds = _mysql()
    ensure_services()
    try:
        smoke(C.JAVA_BASE)
        rollback()
        memory()
        backup_restore(creds)
    finally:
        subprocess.call([sys.executable, str(C.TOOLS_DIR / "services.py"), "stop"])
    log("本机演练结束。未连接生产主机，未改 Nginx / systemd")


if __name__ == "__main__":
    main()
