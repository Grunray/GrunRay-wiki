"""
栖息（xiqi）import 工具：碎念、页面 Hero、关于页履历、推荐条目。

用法（在 backend 目录）:

  python scripts/xiqi_tools/import_xiqi.py fragments
  python scripts/xiqi_tools/import_xiqi.py fragments --dry-run
  python scripts/xiqi_tools/import_xiqi.py fragments --id frag-f4-daily-rain

  python scripts/xiqi_tools/import_xiqi.py pages
  python scripts/xiqi_tools/import_xiqi.py pages --page fragments

  python scripts/xiqi_tools/import_xiqi.py about
  python scripts/xiqi_tools/import_xiqi.py about --dry-run

  python scripts/xiqi_tools/import_xiqi.py recommendations
  python scripts/xiqi_tools/import_xiqi.py recommendations --dry-run
  python scripts/xiqi_tools/import_xiqi.py recommendations --id rec-cursor
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

try:
    from dotenv import load_dotenv  # noqa: E402

    load_dotenv(_backend / ".env", override=True)
except ImportError:
    pass

from app.about_md import parse_about_markdown, validate_about_meta  # noqa: E402
from app.about_repo import upsert_about  # noqa: E402
from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402
from app.fragment_md import parse_fragment_markdown, validate_fragment_meta  # noqa: E402
from app.fragment_repo import upsert_fragment  # noqa: E402
from app.recommend_md import parse_recommend_markdown, validate_recommend_meta  # noqa: E402
from app.recommend_repo import upsert_recommend  # noqa: E402
from app.xiqi_md_write import render_about_markdown  # noqa: E402
from app.xiqi_page_md import parse_xiqi_page_markdown, validate_xiqi_page_meta  # noqa: E402
from app.xiqi_page_repo import upsert_page  # noqa: E402
from app.xiqi_paths import (  # noqa: E402
    ABOUT_RESUME_FILENAME,
    IMPORT_XIQI_ABOUT,
    IMPORT_XIQI_FRAGMENTS,
    IMPORT_XIQI_PAGES,
    IMPORT_XIQI_RECOMMENDATIONS,
)


def iter_markdown_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for path in sorted(root.glob("*.md")):
        if path.name.startswith("_"):
            continue
        out.append(path)
    return out


def import_fragments(*, root: Path, public_id: str, dry_run: bool) -> int:
    files = iter_markdown_files(root)
    if public_id:
        files = [p for p in files if p.stem == public_id or p.name == f"{public_id}.md"]
        if not files:
            print(f"未找到 public_id={public_id!r} 的 Markdown", file=sys.stderr)
            return 1

    if not files:
        print(f"目录无 Markdown: {root}", file=sys.stderr)
        return 1

    errors = 0
    conn = None if dry_run else connect()
    try:
        for md_path in files:
            try:
                meta, body = parse_fragment_markdown(md_path)
                row = validate_fragment_meta(meta, body, md_path)
                content_path = config.CONTENT_ROOT / row["md_url"]
                print(f"{'[dry-run] ' if dry_run else ''}import {md_path.name} -> {content_path}")
                if dry_run:
                    print(json.dumps(row, ensure_ascii=False, indent=2, default=str))
                    continue
                content_path.parent.mkdir(parents=True, exist_ok=True)
                content_path.write_text(row["body"] + "\n", encoding="utf-8")
                cur = conn.cursor()
                upsert_fragment(cur, row)
                conn.commit()
            except Exception as e:
                errors += 1
                print(f"ERROR {md_path.name}: {e}", file=sys.stderr)
    finally:
        if conn:
            conn.close()

    return 1 if errors else 0


def import_pages(*, root: Path, page: str, dry_run: bool) -> int:
    files = iter_markdown_files(root)
    if page:
        files = [p for p in files if p.stem == page]
        if not files:
            print(f"未找到 page={page!r} 的配置 Markdown", file=sys.stderr)
            return 1

    if not files:
        print(f"目录无 Markdown: {root}", file=sys.stderr)
        return 1

    errors = 0
    conn = None if dry_run else connect()
    try:
        for md_path in files:
            try:
                meta, body = parse_xiqi_page_markdown(md_path)
                row = validate_xiqi_page_meta(meta, body, md_path)
                print(f"{'[dry-run] ' if dry_run else ''}import page {row['page']} <- {md_path.name}")
                if dry_run:
                    print(json.dumps(row, ensure_ascii=False, indent=2, default=str))
                    continue
                cur = conn.cursor()
                upsert_page(cur, row)
                conn.commit()
            except Exception as e:
                errors += 1
                print(f"ERROR {md_path.name}: {e}", file=sys.stderr)
    finally:
        if conn:
            conn.close()

    return 1 if errors else 0


def import_about(*, md_path: Path, dry_run: bool) -> int:
    if not md_path.is_file():
        print(f"未找到关于页履历 Markdown: {md_path}", file=sys.stderr)
        return 1

    errors = 0
    conn = None if dry_run else connect()
    try:
        try:
            meta, body = parse_about_markdown(md_path)
            row = validate_about_meta(meta, body, md_path)
            md_text = render_about_markdown(
                profile=row["profile"],
                status=row["status"],
                note=row.get("note") or "",
            )
            content_path = config.CONTENT_ROOT / row["md_url"]
            print(f"{'[dry-run] ' if dry_run else ''}import about -> {content_path}")
            if dry_run:
                preview = {
                    "status": row["status"],
                    "md_url": row["md_url"],
                    "profile": row["profile"],
                }
                print(json.dumps(preview, ensure_ascii=False, indent=2, default=str))
            else:
                content_path.parent.mkdir(parents=True, exist_ok=True)
                content_path.write_text(md_text, encoding="utf-8")
                cur = conn.cursor()
                upsert_about(cur, {"status": row["status"], "md_url": row["md_url"]})
                conn.commit()
        except Exception as e:
            errors += 1
            print(f"ERROR {md_path.name}: {e}", file=sys.stderr)
    finally:
        if conn:
            conn.close()

    return 1 if errors else 0


def import_recommendations(*, root: Path, public_id: str, dry_run: bool) -> int:
    files = iter_markdown_files(root)
    if public_id:
        files = [p for p in files if p.stem == public_id or p.name == f"{public_id}.md"]
        if not files:
            print(f"未找到 public_id={public_id!r} 的 Markdown", file=sys.stderr)
            return 1

    if not files:
        print(f"目录无 Markdown: {root}", file=sys.stderr)
        return 1

    errors = 0
    conn = None if dry_run else connect()
    try:
        for md_path in files:
            try:
                meta, body = parse_recommend_markdown(md_path)
                row = validate_recommend_meta(meta, body, md_path)
                content_path = config.CONTENT_ROOT / row["md_url"]
                print(f"{'[dry-run] ' if dry_run else ''}import {md_path.name} -> {content_path}")
                if dry_run:
                    print(json.dumps(row, ensure_ascii=False, indent=2, default=str))
                    continue
                content_path.parent.mkdir(parents=True, exist_ok=True)
                content_path.write_text(row["body"] + "\n", encoding="utf-8")
                cur = conn.cursor()
                upsert_recommend(cur, row)
                conn.commit()
            except Exception as e:
                errors += 1
                print(f"ERROR {md_path.name}: {e}", file=sys.stderr)
    finally:
        if conn:
            conn.close()

    return 1 if errors else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Import xiqi fragments, pages, about, or recommendations")
    sub = parser.add_subparsers(dest="command", required=True)

    p_frag = sub.add_parser("fragments", help="导入碎念 Markdown")
    p_frag.add_argument(
        "--dir",
        type=str,
        default=str(IMPORT_XIQI_FRAGMENTS),
        help="碎念 import 目录",
    )
    p_frag.add_argument("--id", type=str, default="", help="仅导入指定 public_id")
    p_frag.add_argument("--dry-run", action="store_true")

    p_pages = sub.add_parser("pages", help="导入页面 Hero 配置")
    p_pages.add_argument(
        "--dir",
        type=str,
        default=str(IMPORT_XIQI_PAGES),
        help="页面 import 目录",
    )
    p_pages.add_argument("--page", type=str, default="", help="仅导入 fragments/about/recommend")
    p_pages.add_argument("--dry-run", action="store_true")

    p_about = sub.add_parser("about", help="导入关于页履历 Markdown")
    p_about.add_argument(
        "--file",
        type=str,
        default=str(IMPORT_XIQI_ABOUT / ABOUT_RESUME_FILENAME),
        help="履历 import 文件路径",
    )
    p_about.add_argument("--dry-run", action="store_true")

    p_rec = sub.add_parser("recommendations", help="导入推荐条目 Markdown")
    p_rec.add_argument(
        "--dir",
        type=str,
        default=str(IMPORT_XIQI_RECOMMENDATIONS),
        help="推荐 import 目录",
    )
    p_rec.add_argument("--id", type=str, default="", help="仅导入指定 public_id")
    p_rec.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()
    if args.command == "fragments":
        code = import_fragments(
            root=Path(args.dir).resolve(),
            public_id=args.id.strip(),
            dry_run=args.dry_run,
        )
    elif args.command == "pages":
        code = import_pages(
            root=Path(args.dir).resolve(),
            page=args.page.strip(),
            dry_run=args.dry_run,
        )
    elif args.command == "recommendations":
        code = import_recommendations(
            root=Path(args.dir).resolve(),
            public_id=args.id.strip(),
            dry_run=args.dry_run,
        )
    else:
        code = import_about(
            md_path=Path(args.file).resolve(),
            dry_run=args.dry_run,
        )
    raise SystemExit(code)


if __name__ == "__main__":
    main()
