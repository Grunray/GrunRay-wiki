"""搭建接口契约沙箱：复制后端代码到 .contract-sandbox/backend，写独立 .env，建库并灌合成数据。

用法（仓库根目录，使用 backend 虚拟环境的 python）:

  backend\\.venv\\Scripts\\python.exe tools/contract/setup_sandbox.py --reset

安全约束：
- 只连接回环地址上的 MySQL，库名固定为 grunray_wiki_contract；
- 执行 schema.sql（含 DROP TABLE）前打印实际连接的主机 / 端口 / 账号，并断言 DATABASE()；
- 所有脚本路径必须位于沙箱内；仓库 backend/content、backend/import 的 git 状态前后必须一致。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

SANDBOX_COPY_DIRS = ("app", "scripts", "sql")
SANDBOX_COPY_FILES = ("run.py",)
SQL_KNOWN_ORDER = ("schema.sql", "wiki_project.sql", "music_track.sql")
KNOWN_FULL_RUN_FAILURE = "guest_user_blocked.sql"


def log(msg: str) -> None:
    print(f"[setup] {msg}", flush=True)


def read_local_mysql_credentials() -> dict[str, str]:
    from dotenv import dotenv_values

    env_path = C.REPO_BACKEND / ".env"
    if not env_path.is_file():
        raise SystemExit(f"找不到 {env_path}，无法读取本地 MySQL 账号")
    values = dotenv_values(env_path)
    out = {
        "MYSQL_HOST": (values.get("MYSQL_HOST") or "127.0.0.1").strip(),
        "MYSQL_PORT": (values.get("MYSQL_PORT") or "3306").strip(),
        "MYSQL_USER": (values.get("MYSQL_USER") or "root").strip(),
        "MYSQL_PASSWORD": values.get("MYSQL_PASSWORD") or "",
    }
    if out["MYSQL_HOST"] not in C.LOOPBACK_HOSTS:
        raise SystemExit(f"拒绝：backend/.env 的 MYSQL_HOST={out['MYSQL_HOST']!r} 不是回环地址")
    return out


def git_status_snapshot() -> str:
    proc = subprocess.run(
        ["git", "status", "--porcelain", "-uall", "--", "backend/content", "backend/import"],
        cwd=C.REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return proc.stdout


def reset_sandbox() -> None:
    root = C.SANDBOX_ROOT
    if root.name != ".contract-sandbox" or root.parent.resolve() != C.REPO_ROOT.resolve():
        raise SystemExit(f"沙箱路径异常，拒绝删除: {root}")
    if root.exists():
        log(f"删除旧沙箱 {root}")
        shutil.rmtree(root)


def copy_backend_code() -> None:
    C.SANDBOX_BACKEND.mkdir(parents=True, exist_ok=True)
    ignore = shutil.ignore_patterns("__pycache__", "*.pyc")
    for name in SANDBOX_COPY_DIRS:
        dst = C.SANDBOX_BACKEND / name
        if dst.exists():
            shutil.rmtree(C.assert_inside_sandbox(dst))
        shutil.copytree(C.REPO_BACKEND / name, dst, ignore=ignore)
    for name in SANDBOX_COPY_FILES:
        shutil.copy2(C.REPO_BACKEND / name, C.SANDBOX_BACKEND / name)
    for sub in ("import", "data", "content"):
        src = C.FIXTURES_DIR / sub
        dst = C.SANDBOX_BACKEND / sub
        if dst.exists():
            shutil.rmtree(C.assert_inside_sandbox(dst))
        shutil.copytree(src, dst)
    for d in (C.RESULTS_DIR, C.MAIL_DIR, C.LOG_DIR, C.RUN_DIR):
        d.mkdir(parents=True, exist_ok=True)
    log("已复制 app/ scripts/ sql/ run.py 与合成 fixtures")


def _image(path: Path, size: tuple[int, int], color: tuple[int, int, int], fmt: str) -> None:
    from PIL import Image, ImageDraw

    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    w, h = size
    for i in range(0, w, 16):
        draw.line([(i, 0), (w - i, h)], fill=(255 - color[0], 255 - color[1], 255 - color[2]), width=2)
    if fmt == "GIF":
        frames = [img, img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)]
        frames[0].save(path, format="GIF", save_all=True, append_images=frames[1:], duration=200, loop=0)
    else:
        img.save(path, format=fmt)


def _fake_mp3(path: Path, size: int, seed: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = b"ID3\x04\x00\x00\x00\x00\x00\x00"
    body = bytes((seed + i * 7) % 256 for i in range(size - len(header)))
    path.write_bytes(header + body)


def generate_binary_fixtures() -> None:
    imp = C.SANDBOX_BACKEND / "import"
    media = C.SANDBOX_BACKEND / "content" / "media"
    _image(imp / "film/homeView/right_panel/film-01.png", (320, 200), (180, 60, 40), "PNG")
    _image(imp / "film/homeView/right_panel/film-02.jpg", (320, 200), (40, 90, 160), "JPEG")
    _image(imp / "film/homeView/right_panel/film-03.gif", (160, 100), (30, 140, 80), "GIF")
    _image(imp / "film/homeView/center/avatar/avatar-contract.png", (128, 128), (200, 180, 120), "PNG")
    _image(imp / "film/main/background/bg-contract.png", (640, 360), (230, 225, 210), "PNG")
    _fake_mp3(imp / "music/contract-track-a.mp3", 65536, 1)
    _fake_mp3(imp / "music/contract-track-b.mp3", 32768, 2)
    _image(media / "xiqi/fragments/frag-contract-daily.png", (300, 300), (90, 90, 140), "PNG")
    _image(media / "xiqi/recommendations/rec-contract-editor.png", (96, 96), (20, 120, 200), "PNG")
    _image(media / "xiqi/pages/fragments/hero-contract.png", (800, 300), (120, 100, 80), "PNG")
    log("已生成合成图片 / 音频")


def _env_value(v: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_./:@,+\-]*", v):
        return v
    if "'" not in v:
        return f"'{v}'"
    return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_sandbox_env(creds: dict[str, str]) -> Path:
    lines = {
        **creds,
        "MYSQL_DATABASE": C.CONTRACT_DB,
        "CONTENT_ROOT": "content",
        "PORT": str(C.FLASK_PORT),
        "FLASK_DEBUG": "0",
        "SECRET_KEY": secrets.token_hex(32),
        "OAUTH_PUBLIC_BASE": C.FLASK_BASE,
        "FRONTEND_ORIGIN": C.FRONTEND_ORIGIN,
        "CORS_ORIGINS": f"{C.FRONTEND_ORIGIN},http://127.0.0.1:5173",
        "GITHUB_CLIENT_ID": "contract-github-client",
        "GITHUB_CLIENT_SECRET": "contract-github-secret",
        "GOOGLE_CLIENT_ID": "contract-google-client",
        "GOOGLE_CLIENT_SECRET": "contract-google-secret",
        "MESSAGE_AUTO_PUBLISH": "false",
        "MESSAGE_ADMIN_PAGE_SIZE": "20",
        "MESSAGE_IP_COOLDOWN_SEC": "60",
        "MESSAGE_RATE_LIMIT_PER_USER": "10",
        "MESSAGE_OWNER_REPLY_COOLDOWN_SEC": "10",
        "MESSAGE_SENSITIVE_WORDS_PATH": "data/sensitive_words.txt",
        "MESSAGE_OWNER_PROFILE_URLS": C.OWNER_PROFILE_URL,
        "MESSAGE_OWNER_GITHUB_IDS": C.OWNER_GITHUB_ID,
        "MESSAGE_OWNER_GOOGLE_IDS": "",
        "SITE_OWNER_NAME": "GrunRay",
        "SITE_OWNER_AVATAR_URL": "/favicon.jpg",
        "FRIEND_AUTO_PUBLISH": "false",
        "FRIEND_IP_COOLDOWN_SEC": "120",
        "FRIEND_APPLICATION_MAX_PER_IP_PER_DAY": "5",
        "FRIEND_SPECIAL_LINKS_PATH": "data/friend_special_links.json",
        "FRIENDS_SITE_TITLE": "GrunRay 契约站",
        "FRIENDS_SITE_URL": C.SITE_URL,
        "FRIENDS_SITE_LOGO_URL": "",
        "FRIENDS_SITE_DESCRIPTION": "契约沙箱的合成站点描述",
        "NOTIFY_EMAIL_ENABLED": "true",
        "SMTP_HOST": C.HOST,
        "SMTP_PORT": str(C.SMTP_PORT),
        "SMTP_USE_SSL": "true",
        "SMTP_USER": "contract-smtp-user",
        "SMTP_PASSWORD": "contract-smtp-pass",
        "NOTIFY_EMAIL_TO": "owner@contract.example.test",
        "NOTIFY_EMAIL_FROM": "noreply@contract.example.test",
    }
    env_path = C.assert_inside_sandbox(C.SANDBOX_BACKEND / ".env")
    body = "".join(f"{k}={_env_value(v)}\n" for k, v in lines.items())
    env_path.write_text("# 契约沙箱专用，由 tools/contract/setup_sandbox.py 生成\n" + body, encoding="utf-8")
    log(f"已写沙箱 .env（MYSQL_DATABASE={C.CONTRACT_DB}，PORT={C.FLASK_PORT}）")
    return env_path


def prepare_database(creds: dict[str, str], *, drop_existing: bool) -> None:
    import pymysql

    base = dict(
        host=creds["MYSQL_HOST"],
        port=int(creds["MYSQL_PORT"]),
        user=creds["MYSQL_USER"],
        password=creds["MYSQL_PASSWORD"],
        charset="utf8mb4",
    )
    conn = pymysql.connect(**base)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT @@hostname, @@port, CURRENT_USER(), VERSION()")
            hostname, port, user, version = cur.fetchone()
            log(f"MySQL 实际连接: hostname={hostname} port={port} current_user={user} version={version}")
            if drop_existing:
                cur.execute(f"DROP DATABASE IF EXISTS `{C.CONTRACT_DB}`")
                log(f"已删除旧库 {C.CONTRACT_DB}")
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{C.CONTRACT_DB}` "
                "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()
    finally:
        conn.close()

    conn = pymysql.connect(**base, database=C.CONTRACT_DB)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            (current_db,) = cur.fetchone()
    finally:
        conn.close()
    if current_db != C.CONTRACT_DB:
        raise SystemExit(f"拒绝：重连后 DATABASE()={current_db!r}，不是 {C.CONTRACT_DB}")
    log(f"重连断言通过：DATABASE()={current_db}")


def sandbox_env() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("MYSQL_")}
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    env["NO_PROXY"] = "127.0.0.1,localhost"
    return env


def run_in_sandbox(script: str, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    path = C.assert_inside_sandbox(C.SANDBOX_BACKEND / script)
    if not path.is_file():
        raise SystemExit(f"沙箱内找不到脚本: {path}")
    proc = subprocess.run(
        [str(C.backend_python()), str(path), *args],
        cwd=C.SANDBOX_BACKEND,
        env=sandbox_env(),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if check and proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f"沙箱脚本失败: {script} {' '.join(args)}（exit {proc.returncode}）")
    return proc


def assert_sandbox_config() -> None:
    code = (
        "import json; from pathlib import Path; from app.config import config;"
        "print(json.dumps({'db': config.MYSQL_DATABASE, 'host': config.MYSQL_HOST,"
        "'content_root': str(config.CONTENT_ROOT), 'env': str(Path('.env').resolve())}))"
    )
    proc = subprocess.run(
        [str(C.backend_python()), "-c", code],
        cwd=C.SANDBOX_BACKEND,
        env=sandbox_env(),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    info = json.loads(proc.stdout.strip().splitlines()[-1])
    if info["db"] != C.CONTRACT_DB:
        raise SystemExit(f"拒绝：沙箱 config.MYSQL_DATABASE={info['db']!r}")
    if info["host"] not in C.LOOPBACK_HOSTS:
        raise SystemExit(f"拒绝：沙箱 config.MYSQL_HOST={info['host']!r}")
    C.assert_inside_sandbox(Path(info["content_root"]))
    log(f"沙箱 config 核对通过：db={info['db']} content_root={info['content_root']}")


def sql_run_order() -> list[str]:
    names = sorted(p.name for p in (C.SANDBOX_BACKEND / "sql").glob("*.sql"))
    ordered = [n for n in SQL_KNOWN_ORDER if n in names]
    ordered += [n for n in names if n not in SQL_KNOWN_ORDER]
    return ordered


def apply_schema() -> dict[str, object]:
    run_sql = C.assert_inside_sandbox(C.SANDBOX_BACKEND / "scripts" / "run_sql.py")
    log(f"run_sql 路径核对通过：{run_sql}")
    full = run_in_sandbox("scripts/run_sql.py", check=False)
    (C.RESULTS_DIR / "sql-full-run.log").write_text(
        f"exit={full.returncode}\n--- stdout ---\n{full.stdout}\n--- stderr ---\n{full.stderr}",
        encoding="utf-8",
    )
    completed = set(re.findall(r"完成: (\S+?\.sql)", full.stdout))
    failed_at = None
    m = re.findall(r">>> (\S+?\.sql)", full.stdout)
    if full.returncode != 0 and m:
        failed_at = m[-1]
    log(f"全量 run_sql exit={full.returncode} 完成 {len(completed)} 个文件，失败于 {failed_at}")

    individually: list[str] = []
    for name in sql_run_order():
        if name in completed:
            continue
        if name == KNOWN_FULL_RUN_FAILURE:
            continue
        run_in_sandbox("scripts/run_sql.py", "--file", name)
        individually.append(name)
    log(f"逐个补跑: {individually}")
    if failed_at and failed_at != KNOWN_FULL_RUN_FAILURE:
        raise SystemExit(f"全量 run_sql 失败于意外文件 {failed_at}，见 results/sql-full-run.log")
    return {
        "full_run_exit": full.returncode,
        "full_run_failed_at": failed_at,
        "completed_in_full_run": sorted(completed),
        "run_individually": individually,
    }


def import_fixtures() -> list[dict[str, str]]:
    steps = [
        ("scripts/content_tools/import_markdown_posts.py", "--dir", "import/markdown"),
        ("scripts/projects_tools/import_projects.py", "--dir", "import/projects"),
        ("scripts/xiqi_tools/import_xiqi.py", "fragments", "--dir", "import/xiqi/fragments"),
        ("scripts/xiqi_tools/import_xiqi.py", "recommendations", "--dir", "import/xiqi/recommendations"),
        ("scripts/xiqi_tools/import_xiqi.py", "pages", "--dir", "import/xiqi/pages"),
        ("scripts/xiqi_tools/import_xiqi.py", "about", "--file", "import/xiqi/about/resume.md"),
        ("scripts/friend_link_tools/import_friend_links.py", "--dir", "import/friend_link"),
        ("scripts/guest_tools/user/import_guest_users.py", "--dir", "import/guest/user"),
        ("scripts/guest_tools/message/import_guest_messages.py", "--dir", "import/guest/message"),
        ("scripts/media_tools/import_film_media.py", "--source", "import/film", "--tags", "contract,film"),
        ("scripts/music_tools/import_music.py", "--source", "import/music", "--tags", "contract"),
    ]
    out = []
    for script, *args in steps:
        proc = run_in_sandbox(script, *args)
        failed = re.search(r"失败\s*([1-9]\d*)", proc.stdout) or re.search(r"^ERR(OR)?\b", proc.stdout + proc.stderr, re.M)
        if failed:
            print(proc.stdout)
            print(proc.stderr, file=sys.stderr)
            raise SystemExit(f"导入脚本 exit=0 但报告了失败: {script} {' '.join(args)}")
        out.append({"cmd": " ".join([script, *args]), "stdout_tail": proc.stdout.strip()[-400:]})
        log(f"导入完成: {script} {' '.join(args)}")
    return out


def table_counts(creds: dict[str, str]) -> dict[str, int]:
    import pymysql

    conn = pymysql.connect(
        host=creds["MYSQL_HOST"],
        port=int(creds["MYSQL_PORT"]),
        user=creds["MYSQL_USER"],
        password=creds["MYSQL_PASSWORD"],
        database=C.CONTRACT_DB,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DATABASE()")
            if cur.fetchone()[0] != C.CONTRACT_DB:
                raise SystemExit("拒绝：统计时 DATABASE() 不符")
            cur.execute("SHOW TABLES")
            tables = [r[0] for r in cur.fetchall()]
            counts = {}
            for t in tables:
                cur.execute(f"SELECT COUNT(*) FROM `{t}`")
                counts[t] = int(cur.fetchone()[0])
            return counts
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="搭建接口契约沙箱")
    parser.add_argument("--reset", action="store_true", help="删除旧沙箱目录并重建契约库")
    args = parser.parse_args()

    before = git_status_snapshot()
    creds = read_local_mysql_credentials()
    if args.reset:
        reset_sandbox()
    copy_backend_code()
    generate_binary_fixtures()
    write_sandbox_env(creds)
    assert_sandbox_config()
    prepare_database(creds, drop_existing=args.reset)
    schema = apply_schema()
    imports = import_fixtures()
    counts = table_counts(creds)

    after = git_status_snapshot()
    unchanged = before == after
    summary = {
        "database": C.CONTRACT_DB,
        "sandbox_backend": str(C.SANDBOX_BACKEND),
        "schema": schema,
        "imports": imports,
        "table_counts": counts,
        "repo_content_import_git_status_unchanged": unchanged,
    }
    (C.RESULTS_DIR / "seed-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(f"表行数: {counts}")
    if not unchanged:
        raise SystemExit("警告：仓库 backend/content 或 backend/import 的 git 状态发生变化，请检查")
    log("仓库 backend/content、backend/import 的 git 状态前后一致")


if __name__ == "__main__":
    main()
