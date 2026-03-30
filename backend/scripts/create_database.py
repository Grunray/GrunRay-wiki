"""
在 MySQL 中创建 .env 里 MYSQL_DATABASE 指定的空库（若不存在）。

不指定 database 连接服务器，因此可在「库尚未创建」时运行。

用法（在 backend 目录、已配置 .env）:

  python scripts/create_database.py

然后再执行:

  python scripts/run_sql.py
  python scripts/seed_from_json.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_backend / ".env", override=True)

import pymysql  # noqa: E402

from app.config import config  # noqa: E402

# 防止标识符注入：库名仅允许常见安全字符
_SAFE_DB_NAME = re.compile(r"^[a-zA-Z0-9_]+$")


def main() -> None:
    name = (config.MYSQL_DATABASE or "").strip()
    if not name or not _SAFE_DB_NAME.match(name):
        print(
            "MYSQL_DATABASE 无效或包含非法字符（仅允许字母、数字、下划线）。",
            file=sys.stderr,
        )
        sys.exit(1)

    conn = pymysql.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()
        print(f"已确保数据库存在: `{name}` （主机 {config.MYSQL_HOST}:{config.MYSQL_PORT}，用户 {config.MYSQL_USER}）")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
