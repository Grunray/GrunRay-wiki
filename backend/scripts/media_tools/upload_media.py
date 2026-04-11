"""
静态博客写入脚本：上传媒体并写入 media 表。

用法（在 backend 目录下，已配置 .env）:
  python scripts/media_tools/upload_media.py --file "D:/tmp/demo.jpg" --type image --title "demo"
  python scripts/media_tools/upload_media.py --file "D:/tmp/demo.mp4" --type video --article-id 1 --tags "film,anime"
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import uuid
from pathlib import Path

_backend = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_backend))

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402

ALLOWED_TYPES = {"image", "gif", "video"}
EXT_BY_TYPE = {
    "image": {".jpg", ".jpeg", ".png", ".webp"},
    "gif": {".gif"},
    "video": {".mp4", ".webm", ".mov"},
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Upload one media file and insert DB record.")
    p.add_argument("--file", required=True, help="本地文件路径")
    p.add_argument("--type", required=True, choices=sorted(ALLOWED_TYPES), help="媒体类型")
    p.add_argument("--title", default="", help="标题（可选）")
    p.add_argument("--article-id", type=int, default=None, help="关联 post.id（可选）")
    p.add_argument("--tags", default="", help="逗号分隔标签（可选）")
    return p.parse_args()


def main():
    args = parse_args()
    src = Path(args.file).expanduser().resolve()
    if not src.is_file():
        raise SystemExit(f"文件不存在: {src}")

    suffix = src.suffix.lower()
    if suffix not in EXT_BY_TYPE[args.type]:
        raise SystemExit(f"文件后缀 {suffix} 与 type={args.type} 不匹配")

    media_dir = config.CONTENT_ROOT / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    save_name = f"{uuid.uuid4().hex}{suffix}"
    dst = media_dir / save_name
    shutil.copy2(src, dst)

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    url = f"/api/media/files/{save_name}"
    title = args.title.strip() or None

    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO media (url, type, title, article_id, tags)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (url, args.type, title, args.article_id, json.dumps(tags, ensure_ascii=False)),
        )
        conn.commit()
        media_id = cur.lastrowid
    finally:
        conn.close()

    print(
        json.dumps(
            {
                "id": media_id,
                "url": url,
                "type": args.type,
                "title": title,
                "article_id": args.article_id,
                "tags": tags,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
