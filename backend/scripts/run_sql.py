"""
执行 backend/sql 目录下的 SQL 文件（MySQL）。

用法（在 backend 目录下，已配置 .env）:

  # 按文件名排序执行 sql 目录内全部 .sql
  python scripts/run_sql.py

  # 只执行指定文件（相对 sql/ 目录）
  python scripts/run_sql.py --file schema.sql

依赖: pip install -r requirements.txt
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))

from dotenv import load_dotenv  # noqa: E402

# 先于 app.config 加载，确保脚本能读到 backend/.env
load_dotenv(_backend / ".env", override=True)

import pymysql  # noqa: E402
from pymysql.err import OperationalError  # noqa: E402

from app.config import config  # noqa: E402

_SQL_DIR = _backend / "sql"


def _strip_sql_comments(text: str) -> str:
    """去掉块注释 /* */ 与行注释 --（整行）。"""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    lines_out: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines_out.append(line)
    return "\n".join(lines_out)


def _split_statements(text: str) -> list[str]:
    """
    按分号拆成多条语句（适用于常规 DDL/DML，不含字符串内分号）。
    """
    cleaned = _strip_sql_comments(text)
    parts: list[str] = []
    for chunk in cleaned.split(";"):
        s = chunk.strip()
        if s:
            parts.append(s)
    return parts


def _connect():
    return pymysql.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DATABASE,
        charset="utf8mb4",
    )


def _fail_auth_hint(err: OperationalError) -> None:
    env_path = _backend / ".env"
    msg = str(err.args[1]) if len(err.args) > 1 else ""

    if "using password: NO" in msg:
        print(
            "\nMySQL 拒绝连接 (1045)，且未使用密码 (using password: NO)。"
            "请确认 backend/.env 已配置 MYSQL_PASSWORD，且脚本能读到该文件。\n"
            f"  .env 路径: {env_path.resolve()}",
            file=sys.stderr,
        )
        return

    print(
        "\nMySQL 拒绝连接 (1045)，已携带密码 (using password: YES)。"
        "说明 .env 已加载，但服务器拒绝了该账号/密码或连接来源。\n"
        "  1. 用同一账号在命令行或 Workbench 手动登录验证密码是否正确\n"
        "  2. 确认 MySQL 里存在对应用户，例如: CREATE USER ... / 核对主机为 localhost 或 %\n"
        "  3. 若用户仅绑定在 127.0.0.1，可尝试 MYSQL_HOST=127.0.0.1（你当前已是）\n"
        "  4. 检查: SHOW GRANTS FOR CURRENT_USER;\n"
        f"  5. .env 路径: {env_path.resolve()}",
        file=sys.stderr,
    )


def run_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8-sig")
    statements = _split_statements(text)
    if not statements:
        print(f"跳过（无有效语句）: {path.name}")
        return 0

    try:
        conn = _connect()
    except OperationalError as e:
        if e.args[0] == 1045:
            _fail_auth_hint(e)
        raise
    try:
        with conn.cursor() as cur:
            for i, stmt in enumerate(statements, 1):
                cur.execute(stmt)
                print(f"  [{i}/{len(statements)}] OK")
        conn.commit()
        print(f"完成: {path.name}（共 {len(statements)} 条）")
        return len(statements)
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="执行 backend/sql 下的 SQL 文件")
    parser.add_argument(
        "--file",
        "-f",
        help="仅执行该文件（位于 sql/ 目录下，例如 schema.sql）",
    )
    args = parser.parse_args()

    if not _SQL_DIR.is_dir():
        print("找不到目录:", _SQL_DIR, file=sys.stderr)
        sys.exit(1)

    if args.file:
        target = _SQL_DIR / args.file
        if not target.is_file():
            print("找不到文件:", target, file=sys.stderr)
            sys.exit(1)
        files = [target]
    else:
        files = sorted(_SQL_DIR.glob("*.sql"))
        if not files:
            print("sql 目录下没有 .sql 文件:", _SQL_DIR, file=sys.stderr)
            sys.exit(1)

    env_file = _backend / ".env"
    if not env_file.is_file():
        print(
            f"提示: 未找到 {env_file}，将使用环境变量或默认空密码。"
            "若 MySQL 需要密码，请复制 .env.example 为 .env 并填写 MYSQL_PASSWORD。\n",
            file=sys.stderr,
        )

    print(f"数据库: {config.MYSQL_HOST}:{config.MYSQL_PORT}/{config.MYSQL_DATABASE} 用户: {config.MYSQL_USER}")
    for f in files:
        print(f"\n>>> {f.name}")
        run_file(f)
    print("\n全部执行结束。")


if __name__ == "__main__":
    main()
