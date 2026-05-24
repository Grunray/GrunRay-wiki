"""
将 `backend/import/guest/user` 根目录下 Markdown 写入 `guest_user` 表。

模板：`import/guest/user/_template/guest_user.template.md`
仅扫描该目录一层 `*.md`（不递归；跳过 `_template` 与以下划线开头的文件）。

用法（backend 目录、已配置 .env、已执行 guest_message.sql 建表）:

  python scripts/guest_tools/user/import_guest_users.py
  python scripts/guest_tools/user/import_guest_users.py --dry-run
  python scripts/guest_tools/user/import_guest_users.py --provider github --provider-user-id 9919
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

_backend = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(_backend))

try:
    from dotenv import load_dotenv  # noqa: E402

    load_dotenv(_backend / ".env", override=True)
except ImportError:
    pass

from app.db import connect  # noqa: E402
from app.guest_user_md import parse_guest_user_markdown, validate_guest_user_meta  # noqa: E402


def iter_markdown_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for path in sorted(root.glob("*.md")):
        if path.name.startswith("_"):
            continue
        out.append(path)
    return out


def upsert_guest_user(cur, row: dict[str, Any]) -> None:
    cur.execute(
        """
        INSERT INTO guest_user (
            provider, provider_user_id, login, name, email, avatar_url, profile_url
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            login = VALUES(login),
            name = VALUES(name),
            email = VALUES(email),
            avatar_url = VALUES(avatar_url),
            profile_url = VALUES(profile_url),
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            row["provider"],
            row["provider_user_id"],
            row["login"],
            row["name"],
            row["email"],
            row["avatar_url"],
            row["profile_url"],
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import guest_user from Markdown")
    parser.add_argument(
        "--dir",
        type=str,
        default=str(_backend / "import" / "guest" / "user"),
        help="访客用户 Markdown 目录（默认 import/guest/user）",
    )
    parser.add_argument("--provider", type=str, default="", help="仅导入指定 provider")
    parser.add_argument(
        "--provider-user-id",
        type=str,
        default="",
        help="与 --provider 合用，仅导入一条",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"目录不存在: {root}")

    files = iter_markdown_files(root)
    if args.provider.strip() and args.provider_user_id.strip():
        want_p = args.provider.strip().lower()
        want_id = args.provider_user_id.strip()
        filtered: list[Path] = []
        for p in files:
            meta, _ = parse_guest_user_markdown(p)
            prov = (meta.get("provider") or "").strip().lower()
            puid = str(meta.get("provider_user_id") or meta.get("id") or "").strip()
            if prov == want_p and puid == want_id:
                filtered.append(p)
        files = filtered
        if not files:
            raise SystemExit(f"未找到 provider={want_p!r} provider_user_id={want_id!r}")

    if not files:
        print("未找到可导入的 .md")
        return

    prepared: list[dict[str, Any]] = []
    for path in files:
        meta, body = parse_guest_user_markdown(path)
        row = validate_guest_user_meta(meta, body, path)
        prepared.append(row)
        print(
            f"OK parse: {path.relative_to(_backend)} -> "
            f"{row['provider']}:{row['provider_user_id']} ({row['name']})"
        )

    if args.dry_run:
        print("--dry-run：未写入数据库")
        return

    conn = connect()
    try:
        cur = conn.cursor()
        for row in prepared:
            upsert_guest_user(cur, row)
        conn.commit()
        print(f"已写入 {len(prepared)} 条 guest_user")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
