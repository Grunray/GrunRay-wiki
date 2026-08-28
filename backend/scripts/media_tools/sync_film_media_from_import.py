"""
================================================================================
⚠️  危险操作脚本 — 使用前必读（AI / 自动化请勿默认调用）
================================================================================

本脚本会根据 backend/import/film（或 --source）的 **当前文件列表**，删除
CONTENT_ROOT/media/film/ 下「已不在 import 中」的副本，并 DELETE media 表中
对应 url 记录。

典型场景：你从 import/film 删了 xiaoye.gif，希望站点与数据库一并去掉。

【重要约束】
- 仅当用户 **明确说明** 要执行「import 同步删除 / prune / sync 删除」时才运行。
- 自动化助手、CI、日常 import 流程 **不得** 默认调用本脚本。
- 执行前务必先 --dry-run 预览将删除项，确认无误后再加 --confirm。

【不会触碰】
- upload_media.py 写入的随机文件名（url 为 /api/media/files/{uuid}.ext，无 film/ 前缀）
- import 目录中仍存在的文件及其 media 记录

【会删除】
- media.url = /api/media/files/film/<相对路径> 且 import 中已无该相对路径的记录
- CONTENT_ROOT/media/film/<相对路径> 文件
- 若存在 WebP 磁盘缓存：CONTENT_ROOT/media/.webp_cache/film/<相对路径>.webp

【额外保护】
- import 源目录为空但库里有 film 记录时，默认拒绝执行（含 --confirm）；
  仅当确要清空全部 import film 时，额外加 --allow-empty-source。

用法（在 backend 目录下，已配置 .env）:
  python scripts/media_tools/sync_film_media_from_import.py --dry-run
  python scripts/media_tools/sync_film_media_from_import.py --confirm
  python scripts/media_tools/sync_film_media_from_import.py --source path/to/film --dry-run

================================================================================
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_backend))

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402
from app.media_webp import WEBP_CACHE_DIRNAME  # noqa: E402

ROOT_FILM_DIR = _backend / "import" / "film"
MEDIA_ROOT = config.CONTENT_ROOT / "media"
FILM_URL_PREFIX = "/api/media/files/film/"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
GIF_EXTS = {".gif"}
VIDEO_EXTS = {".mp4", ".webm", ".mov"}
ALL_EXTS = IMAGE_EXTS | GIF_EXTS | VIDEO_EXTS


def parse_args() -> argparse.Namespace:
    """解析 CLI 参数。使用前请先阅读本文件顶部说明。"""
    parser = argparse.ArgumentParser(
        description="Prune film media DB rows and files not present in import/film.",
        epilog="危险脚本：请先阅读文件顶部说明，并优先使用 --dry-run。",
    )
    parser.add_argument(
        "--source",
        default=str(ROOT_FILM_DIR),
        help="import 源目录（默认 backend/import/film）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅列出将删除的项，不写库、不删文件",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="确认执行删除（未指定时即使扫描到孤儿也不会删）",
    )
    parser.add_argument(
        "--allow-empty-source",
        action="store_true",
        help="当 import 源目录无任何媒体文件时仍允许删除全部 film 记录（极度危险）",
    )
    return parser.parse_args()


def scan_media_files(source: Path) -> list[Path]:
    """
    递归扫描 import 源目录中的可识别媒体文件。
    使用前请先阅读本文件顶部说明。
    """
    out: list[Path] = []
    for p in source.rglob("*"):
        if p.is_file() and p.suffix.lower() in ALL_EXTS:
            out.append(p)
    return sorted(out)


def build_expected_relative_paths(source: Path, files: list[Path]) -> set[str]:
    """
    由 import 扫描结果构建应保留的 film 相对路径集合（posix）。
    使用前请先阅读本文件顶部说明。
    """
    return {p.relative_to(source).as_posix() for p in files}


def url_to_film_relative(url: str) -> str | None:
    """
    将 media.url 解析为 film 下的相对路径；非 film 前缀返回 None。
    使用前请先阅读本文件顶部说明。
    """
    if not url or not url.startswith(FILM_URL_PREFIX):
        return None
    rel = url[len(FILM_URL_PREFIX):].strip()
    if not rel or rel.startswith("/") or ".." in rel.split("/"):
        return None
    return rel


def fetch_film_media_rows(cur) -> list[tuple[int, str]]:
    """
    查询 media 表中所有 film 路径记录 (id, url)。
    使用前请先阅读本文件顶部说明。
    """
    cur.execute(
        """
        SELECT id, url
        FROM media
        WHERE url LIKE %s
        ORDER BY id
        """,
        (f"{FILM_URL_PREFIX}%",),
    )
    rows = cur.fetchall()
    out: list[tuple[int, str]] = []
    for row in rows:
        rid = int(row["id"])
        url = str(row["url"] or "")
        out.append((rid, url))
    return out


def delete_content_files(media_root: Path, rel: str) -> dict[str, bool]:
    """
    删除 CONTENT_ROOT/media/film/<rel> 及对应 WebP 缓存（若存在）。
    使用前请先阅读本文件顶部说明。
    """
    removed: dict[str, bool] = {"main": False, "webp_cache": False}
    main_path = (media_root / "film" / rel).resolve()
    film_root = (media_root / "film").resolve()
    try:
        main_path.relative_to(film_root)
    except ValueError:
        return removed

    if main_path.is_file():
        main_path.unlink()
        removed["main"] = True

    cache_path = (media_root / WEBP_CACHE_DIRNAME / f"film/{rel}.webp").resolve()
    cache_root = (media_root / WEBP_CACHE_DIRNAME).resolve()
    try:
        cache_path.relative_to(cache_root)
        if cache_path.is_file():
            cache_path.unlink()
            removed["webp_cache"] = True
    except ValueError:
        pass

    return removed


def find_orphan_rows(
    db_rows: list[tuple[int, str]],
    expected_rels: set[str],
) -> list[dict[str, object]]:
    """
    找出 import 中已不存在对应文件的 media 记录。
    使用前请先阅读本文件顶部说明。
    """
    orphans: list[dict[str, object]] = []
    for media_id, url in db_rows:
        rel = url_to_film_relative(url)
        if rel is None:
            continue
        if rel not in expected_rels:
            orphans.append({"id": media_id, "url": url, "rel": rel})
    return orphans


def prune_orphans(
    orphans: list[dict[str, object]],
    media_root: Path,
    dry_run: bool,
) -> tuple[int, int]:
    """
    删除孤儿 media 记录及磁盘文件。
    使用前请先阅读本文件顶部说明；非 dry-run 会永久删除数据。
    """
    deleted_rows = 0
    deleted_files = 0
    conn = connect()
    try:
        cur = conn.cursor()
        for item in orphans:
            media_id = int(item["id"])
            rel = str(item["rel"])
            url = str(item["url"])

            if dry_run:
                main_exists = (media_root / "film" / rel).is_file()
                print(f"[dry-run] would DELETE media id={media_id} url={url} file_exists={main_exists}")
                continue

            cur.execute("DELETE FROM media WHERE id = %s", (media_id,))
            removed = delete_content_files(media_root, rel)
            if removed["main"] or removed["webp_cache"]:
                deleted_files += 1
            deleted_rows += 1
            print(
                f"deleted media id={media_id} url={url} "
                f"file={removed['main']} webp_cache={removed['webp_cache']}"
            )

        if dry_run:
            conn.rollback()
        else:
            conn.commit()
    finally:
        conn.close()

    return deleted_rows, deleted_files


def main() -> None:
    """入口。使用前请先阅读本文件顶部说明。"""
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    if not source.is_dir():
        raise SystemExit(f"源目录不存在: {source}")

    if not args.dry_run and not args.confirm:
        raise SystemExit(
            "拒绝执行：未指定 --confirm。请先 --dry-run 预览，确认后再加 --confirm。"
            "使用前请阅读本脚本文件顶部说明。"
        )

    files = scan_media_files(source)
    expected_rels = build_expected_relative_paths(source, files)
    media_root = MEDIA_ROOT.resolve()

    conn = connect()
    try:
        cur = conn.cursor()
        db_rows = fetch_film_media_rows(cur)
    finally:
        conn.close()

    orphans = find_orphan_rows(db_rows, expected_rels)

    if orphans and not expected_rels and not args.allow_empty_source:
        msg = (
            "拒绝执行：import 源目录中未发现任何媒体文件，"
            f"但数据库仍有 {len(orphans)} 条 film 记录将被删除。"
            "若确为清空 import，请额外指定 --allow-empty-source。"
        )
        if args.dry_run:
            print(f"[dry-run 警告] {msg}")
        else:
            raise SystemExit(msg)
    deleted_rows, deleted_files = prune_orphans(orphans, media_root, args.dry_run)

    print(
        json.dumps(
            {
                "source": str(source),
                "import_files": len(files),
                "film_media_rows": len(db_rows),
                "orphans": len(orphans),
                "orphan_urls": [o["url"] for o in orphans],
                "deleted_rows": deleted_rows if not args.dry_run else 0,
                "deleted_file_entries": deleted_files if not args.dry_run else 0,
                "dry_run": args.dry_run,
                "confirm": args.confirm,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
