"""
批量导入 backend/import/film 下的媒体到 media 表。

能力：
- 递归扫描子目录（例如 homeView/right_panel/small_me.gif）
- 支持 image / gif / video
- 复制文件到 CONTENT_ROOT/media/film/...（保留相对目录结构）
- 写入 media(url, type, title, article_id, tags)
- 同 URL 自动跳过，避免重复导入

用法（在 backend 目录下，已配置 .env）:
  python scripts/media_tools/import_film_media.py
  python scripts/media_tools/import_film_media.py --article-id 1 --tags "home,film"
  python scripts/media_tools/import_film_media.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_backend))

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402

ROOT_FILM_DIR = _backend / "import" / "film"
MEDIA_ROOT = config.CONTENT_ROOT / "media"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
GIF_EXTS = {".gif"}
VIDEO_EXTS = {".mp4", ".webm", ".mov"}
ALL_EXTS = IMAGE_EXTS | GIF_EXTS | VIDEO_EXTS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import film assets into media table.")
    parser.add_argument("--source", default=str(ROOT_FILM_DIR), help="源目录（默认 backend/import/film）")
    parser.add_argument("--article-id", type=int, default=None, help="关联文章 id（可选）")
    parser.add_argument("--tags", default="", help="逗号分隔标签（可选）")
    parser.add_argument("--dry-run", action="store_true", help="仅预览，不复制文件、不写数据库")
    return parser.parse_args()


def media_type_by_suffix(suffix: str) -> str | None:
    s = suffix.lower()
    if s in GIF_EXTS:
        return "gif"
    if s in VIDEO_EXTS:
        return "video"
    if s in IMAGE_EXTS:
        return "image"
    return None


def scan_media_files(source: Path) -> list[Path]:
    out: list[Path] = []
    for p in source.rglob("*"):
        if p.is_file() and p.suffix.lower() in ALL_EXTS:
            out.append(p)
    return sorted(out)


def main() -> None:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    if not source.is_dir():
        raise SystemExit(f"源目录不存在: {source}")

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    files = scan_media_files(source)
    if not files:
        print("未发现可导入媒体文件。")
        return

    media_film_root = (MEDIA_ROOT / "film").resolve()
    if not args.dry_run:
        media_film_root.mkdir(parents=True, exist_ok=True)

    conn = connect()
    inserted = 0
    skipped = 0
    copied = 0
    try:
        cur = conn.cursor()
        for src in files:
            rel = src.relative_to(source).as_posix()
            mtype = media_type_by_suffix(src.suffix)
            if not mtype:
                skipped += 1
                continue

            dst = media_film_root / rel
            url = f"/api/media/files/film/{rel}"
            title = src.stem

            cur.execute("SELECT id FROM media WHERE url = %s LIMIT 1", (url,))
            if cur.fetchone():
                skipped += 1
                continue

            if not args.dry_run:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                copied += 1

                cur.execute(
                    """
                    INSERT INTO media (url, type, title, article_id, tags)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (url, mtype, title, args.article_id, json.dumps(tags, ensure_ascii=False)),
                )
                inserted += 1

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    finally:
        conn.close()

    print(
        json.dumps(
            {
                "source": str(source),
                "total_found": len(files),
                "inserted": inserted,
                "copied": copied,
                "skipped": skipped,
                "dry_run": args.dry_run,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
