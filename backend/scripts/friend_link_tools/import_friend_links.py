"""
将 `backend/import/friend_link` 根目录下带 YAML front matter 的 Markdown 写入 `friend_link` 表。

约定与模板见：`import/friend_link/_template/friend_link.template.md`
仅扫描根目录 `*.md`（不递归子目录；`_template` 在子目录内不会被扫描）。

用法（在 backend 目录、已配置 .env、已执行 friend_link 建表）:

  python scripts/friend_link_tools/import_friend_links.py

  python scripts/friend_link_tools/import_friend_links.py --dir import/friend_link

  python scripts/friend_link_tools/import_friend_links.py --id friend-lvyneko

  python scripts/friend_link_tools/import_friend_links.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

try:
    from dotenv import load_dotenv  # noqa: E402

    load_dotenv(_backend / ".env", override=True)
except ImportError:
    pass

from app.db import connect  # noqa: E402
from app.friend_link_md import parse_friend_link_markdown, validate_friend_link_meta  # noqa: E402
from app.friend_link_repo import count_published_by_url_normalized  # noqa: E402
from app.friend_status import STATUS_PUBLISHED  # noqa: E402


def iter_markdown_files(root: Path) -> list[Path]:
    """仅根目录 .md，跳过以下划线开头的文件。"""
    out: list[Path] = []
    for path in sorted(root.glob("*.md")):
        if path.name.startswith("_"):
            continue
        out.append(path)
    return out


def _check_published_url_conflict(cur, row: dict[str, Any]) -> None:
    if int(row["status"]) != STATUS_PUBLISHED:
        return
    conflict = count_published_by_url_normalized(
        cur,
        row["url_normalized"],
        exclude_public_id=row["public_id"],
    )
    if conflict > 0:
        raise ValueError(
            f"已存在其他已发布友链使用相同 URL: {row['url_normalized']!r} "
            f"（当前 public_id={row['public_id']!r}）"
        )


def upsert_friend_link(cur, row: dict[str, Any]) -> None:
    _check_published_url_conflict(cur, row)
    tags_json = json.dumps(row["tags"], ensure_ascii=False) if row.get("tags") else None
    cur.execute(
        """
        INSERT INTO friend_link (
            public_id, name, url, url_normalized, description,
            avatar_url, cover_url, tags, contact_email, status, sort_order
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            url = VALUES(url),
            url_normalized = VALUES(url_normalized),
            description = VALUES(description),
            avatar_url = VALUES(avatar_url),
            cover_url = VALUES(cover_url),
            tags = VALUES(tags),
            contact_email = VALUES(contact_email),
            status = VALUES(status),
            sort_order = VALUES(sort_order)
        """,
        (
            row["public_id"],
            row["name"],
            row["url"],
            row["url_normalized"],
            row["description"],
            row["avatar_url"],
            row["cover_url"],
            tags_json,
            row["contact_email"],
            row["status"],
            row["sort_order"],
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import friend_link from Markdown")
    parser.add_argument(
        "--dir",
        type=str,
        default=str(_backend / "import" / "friend_link"),
        help="友链 Markdown 根目录（默认 backend/import/friend_link，仅扫描该目录一层）",
    )
    parser.add_argument(
        "--id",
        type=str,
        default="",
        help="仅导入指定 public_id（文件名 stem 或与 front matter 中 public_id 一致）",
    )
    parser.add_argument("--dry-run", action="store_true", help="只校验并打印，不写库")
    args = parser.parse_args()

    root = Path(args.dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"目录不存在: {root}")

    files = iter_markdown_files(root)
    if args.id.strip():
        want = args.id.strip()
        filtered: list[Path] = []
        for p in files:
            meta, _ = parse_friend_link_markdown(p)
            pid = (meta.get("public_id") or meta.get("id") or p.stem).strip()
            if pid == want or p.stem == want:
                filtered.append(p)
        files = filtered
        if not files:
            raise SystemExit(f"未找到 public_id={want!r} 对应的 Markdown")

    if not files:
        print("未找到可导入的 .md（仅扫描目录根层，已跳过以下划线开头的文件）")
        return

    prepared: list[dict] = []
    for path in files:
        meta, body = parse_friend_link_markdown(path)
        row = validate_friend_link_meta(meta, body, path)
        prepared.append(row)
        print(f"OK parse: {path.relative_to(_backend)} -> {row['public_id']} ({row['name']})")

    if args.dry_run:
        print("--dry-run：未写入数据库")
        return

    conn = connect()
    try:
        cur = conn.cursor()
        for row in prepared:
            upsert_friend_link(cur, row)
        conn.commit()
        print(f"已写入 {len(prepared)} 条 friend_link")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
