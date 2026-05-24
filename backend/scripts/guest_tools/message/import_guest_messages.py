"""
将 `backend/import/guest/message` 根目录下 Markdown 写入 `guest_message` 表。

模板：`import/guest/message/_template/guest_message.template.md`
仅扫描该目录一层 `*.md`。可选 front matter `reply` 写入站长/访客回复。

建议先导入访客用户：`python scripts/guest_tools/user/import_guest_users.py`

用法:

  python scripts/guest_tools/message/import_guest_messages.py
  python scripts/guest_tools/message/import_guest_messages.py --dry-run
  python scripts/guest_tools/message/import_guest_messages.py --id msg-traveler-seat
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
from app.guest_message_md import parse_guest_message_markdown, validate_guest_message_meta  # noqa: E402


def iter_markdown_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for path in sorted(root.glob("*.md")):
        if path.name.startswith("_"):
            continue
        out.append(path)
    return out


def resolve_guest_user_id(cur, ref: dict[str, str] | None) -> int | None:
    if not ref:
        return None
    cur.execute(
        """
        SELECT id FROM guest_user
        WHERE provider = %s AND provider_user_id = %s
        LIMIT 1
        """,
        (ref["provider"], ref["provider_user_id"]),
    )
    row = cur.fetchone()
    if not row:
        raise ValueError(
            f"未找到 guest_user: {ref['provider']}:{ref['provider_user_id']}，"
            "请先运行 import_guest_users.py"
        )
    return int(row["id"])


def upsert_top_message(cur, row: dict[str, Any], guest_user_id: int | None) -> int:
    created_at = row.get("created_at")
    if created_at:
        cur.execute(
            """
            INSERT INTO guest_message (
                public_id, parent_id, guest_user_id, author_name, avatar_url,
                provider, profile_url, content, status, is_owner, created_at
            ) VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                guest_user_id = VALUES(guest_user_id),
                author_name = VALUES(author_name),
                avatar_url = VALUES(avatar_url),
                provider = VALUES(provider),
                profile_url = VALUES(profile_url),
                content = VALUES(content),
                status = VALUES(status),
                is_owner = VALUES(is_owner),
                created_at = VALUES(created_at),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                row["public_id"],
                guest_user_id,
                row["author_name"],
                row["avatar_url"],
                row["provider"],
                row["profile_url"],
                row["content"],
                row["status"],
                1 if row["is_owner"] else 0,
                created_at,
            ),
        )
    else:
        cur.execute(
            """
            INSERT INTO guest_message (
                public_id, parent_id, guest_user_id, author_name, avatar_url,
                provider, profile_url, content, status, is_owner
            ) VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                guest_user_id = VALUES(guest_user_id),
                author_name = VALUES(author_name),
                avatar_url = VALUES(avatar_url),
                provider = VALUES(provider),
                profile_url = VALUES(profile_url),
                content = VALUES(content),
                status = VALUES(status),
                is_owner = VALUES(is_owner),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                row["public_id"],
                guest_user_id,
                row["author_name"],
                row["avatar_url"],
                row["provider"],
                row["profile_url"],
                row["content"],
                row["status"],
                1 if row["is_owner"] else 0,
            ),
        )
    cur.execute("SELECT id FROM guest_message WHERE public_id = %s", (row["public_id"],))
    top = cur.fetchone()
    if not top:
        raise RuntimeError(f"upsert top message failed: {row['public_id']}")
    return int(top["id"])


def upsert_reply(
    cur,
    parent_id: int,
    reply: dict[str, Any],
    guest_user_id: int | None,
) -> None:
    created_at = reply.get("created_at")
    if created_at:
        cur.execute(
            """
            INSERT INTO guest_message (
                public_id, parent_id, guest_user_id, author_name, avatar_url,
                provider, profile_url, content, status, is_owner, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                parent_id = VALUES(parent_id),
                guest_user_id = VALUES(guest_user_id),
                author_name = VALUES(author_name),
                avatar_url = VALUES(avatar_url),
                provider = VALUES(provider),
                profile_url = VALUES(profile_url),
                content = VALUES(content),
                status = VALUES(status),
                is_owner = VALUES(is_owner),
                created_at = VALUES(created_at),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                reply["public_id"],
                parent_id,
                guest_user_id,
                reply["author_name"],
                reply["avatar_url"],
                reply["provider"],
                reply["profile_url"],
                reply["content"],
                reply["status"],
                1 if reply["is_owner"] else 0,
                created_at,
            ),
        )
    else:
        cur.execute(
            """
            INSERT INTO guest_message (
                public_id, parent_id, guest_user_id, author_name, avatar_url,
                provider, profile_url, content, status, is_owner
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                parent_id = VALUES(parent_id),
                guest_user_id = VALUES(guest_user_id),
                author_name = VALUES(author_name),
                avatar_url = VALUES(avatar_url),
                provider = VALUES(provider),
                profile_url = VALUES(profile_url),
                content = VALUES(content),
                status = VALUES(status),
                is_owner = VALUES(is_owner),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                reply["public_id"],
                parent_id,
                guest_user_id,
                reply["author_name"],
                reply["avatar_url"],
                reply["provider"],
                reply["profile_url"],
                reply["content"],
                reply["status"],
                1 if reply["is_owner"] else 0,
            ),
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import guest_message from Markdown")
    parser.add_argument(
        "--dir",
        type=str,
        default=str(_backend / "import" / "guest" / "message"),
        help="留言 Markdown 目录（默认 import/guest/message）",
    )
    parser.add_argument("--id", type=str, default="", help="仅导入指定 public_id 或文件名 stem")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"目录不存在: {root}")

    files = iter_markdown_files(root)
    if args.id.strip():
        want = args.id.strip()
        filtered: list[Path] = []
        for p in files:
            meta, _ = parse_guest_message_markdown(p)
            pid = (meta.get("public_id") or meta.get("id") or f"msg-{p.stem}").strip()
            if pid == want or p.stem == want:
                filtered.append(p)
        files = filtered
        if not files:
            raise SystemExit(f"未找到 public_id={want!r} 对应的 Markdown")

    if not files:
        print("未找到可导入的 .md")
        return

    prepared: list[dict[str, Any]] = []
    for path in files:
        meta, body = parse_guest_message_markdown(path)
        row = validate_guest_message_meta(meta, body, path)
        prepared.append(row)
        extra = " +reply" if row.get("reply") else ""
        print(f"OK parse: {path.relative_to(_backend)} -> {row['public_id']}{extra}")

    if args.dry_run:
        print("--dry-run：未写入数据库")
        return

    conn = connect()
    try:
        cur = conn.cursor()
        for row in prepared:
            top_uid = resolve_guest_user_id(cur, row.get("guest_user"))
            parent_id = upsert_top_message(cur, row, top_uid)
            reply = row.get("reply")
            if reply:
                reply_uid = resolve_guest_user_id(cur, reply.get("guest_user"))
                upsert_reply(cur, parent_id, reply, reply_uid)
        conn.commit()
        print(f"已处理 {len(prepared)} 条顶层留言（含回复）")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
