"""
将 backend/import/music 下的音频导入到 music_track 表，并复制到 CONTENT_ROOT/media/music/。

- 默认扫描 .mp3（可扩展 AUDIO_EXTS）
- URL 形如 /api/media/files/music/<相对路径>，与现有 GET /api/media/files/<path> 一致
- 同 url 已存在则跳过

用法（在 backend 目录、已配置 .env、已建 music_track 表）:

  python scripts/music_tools/import_music.py

  python scripts/music_tools/import_music.py --source import/music
  python scripts/music_tools/import_music.py --tags bgm,player
  python scripts/music_tools/import_music.py --post-id 1
  python scripts/music_tools/import_music.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_backend))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_backend / ".env", override=True)

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402

ROOT_MUSIC_DIR = _backend / "import" / "music"
MEDIA_MUSIC_ROOT = config.CONTENT_ROOT / "media" / "music"

AUDIO_EXTS = {".mp3"}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Import music files into music_track + content/media/music/")
    p.add_argument("--source", default=str(ROOT_MUSIC_DIR), help="源目录（默认 backend/import/music）")
    p.add_argument("--tags", default="", help="逗号分隔标签（可选）")
    p.add_argument("--post-id", type=int, default=None, help="关联 post.id（可选）")
    p.add_argument("--sort-base", type=int, default=0, help="sort_order 起始值，仅对新插入行递增（默认 0）")
    p.add_argument("--dry-run", action="store_true", help="仅预览，不复制、不写库")
    return p.parse_args()


def scan_audio_files(source: Path) -> list[Path]:
    out: list[Path] = []
    for p in source.rglob("*"):
        if p.is_file() and p.suffix.lower() in AUDIO_EXTS:
            out.append(p)
    return sorted(out)


def main() -> None:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    if not source.is_dir():
        raise SystemExit(f"源目录不存在: {source}")

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    files = scan_audio_files(source)
    if not files:
        print("未发现可导入音频（.mp3）。")
        return

    music_root = MEDIA_MUSIC_ROOT.resolve()
    if not args.dry_run:
        music_root.mkdir(parents=True, exist_ok=True)

    conn = connect()
    inserted = 0
    skipped = 0
    copied = 0
    sort_i = int(args.sort_base)
    try:
        cur = conn.cursor()
        for src in files:
            rel = src.relative_to(source).as_posix()
            url = f"/api/media/files/music/{rel}"
            title = src.stem

            cur.execute("SELECT id FROM music_track WHERE url = %s LIMIT 1", (url,))
            if cur.fetchone():
                skipped += 1
                continue

            if args.dry_run:
                continue

            dst = music_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

            cur.execute(
                """
                INSERT INTO music_track (url, title, artist, duration_sec, post_id, tags, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    url,
                    title,
                    None,
                    None,
                    args.post_id,
                    json.dumps(tags, ensure_ascii=False) if tags else None,
                    sort_i,
                ),
            )
            inserted += 1
            sort_i += 1

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
                "dest": str(music_root),
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
