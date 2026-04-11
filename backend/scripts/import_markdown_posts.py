"""
将「待导入文件夹」内的 Markdown（YAML front matter + 正文）解析后写入 MySQL，并把正文保存到 content/posts/<slug>.md。

约定格式见仓库根目录 designed/template.md。

用法（在 backend 目录、已配置 .env、已建表）:

  # 默认读取 backend/import/markdown 下全部 .md
  python scripts/import_markdown_posts.py

  # 指定目录
  python scripts/import_markdown_posts.py --dir E:\\articles\\inbox

  # 若 slug 已存在则更新（默认即 upsert）
  python scripts/import_markdown_posts.py --dir import/markdown

依赖: pip install -r requirements.txt
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_backend / ".env", override=True)

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402
from app.keywords_extract import extract_keywords  # noqa: E402
from app.md_import import parse_markdown_file, validate_and_normalize  # noqa: E402


def map_type(front_type: str) -> tuple[int, int]:
    if front_type == "algorithm":
        return 2, 3
    if front_type == "project_note":
        return 1, 2
    if front_type == "article":
        return 0, 1
    raise ValueError(f"unknown type: {front_type}")


def iso_to_mysql_dt(s: str | None) -> str | None:
    if not s:
        return None
    s = str(s).strip()
    if "T" in s:
        s = s.replace("Z", "").split(".")[0]
        return s.replace("T", " ")
    return s


def build_keywords(tags: list[str], title: str, summary: str, body: str) -> list[str]:
    """tags 优先；为空时用 jieba 从标题+摘要+正文补关键词。"""
    if tags:
        return tags
    blob = f"{title}\n{summary}\n{body}"
    return extract_keywords(blob, top_k=12)


def upsert_post(cur, row: dict) -> None:
    cur.execute(
        """
        INSERT INTO post (
          legacy_id, slug, title, md_url, summary, keywords, category_id, type,
          views, published_at, updated_at, locale, pinned, pinned_order, cover, extra
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
          legacy_id = VALUES(legacy_id),
          title = VALUES(title),
          md_url = VALUES(md_url),
          summary = VALUES(summary),
          keywords = VALUES(keywords),
          category_id = VALUES(category_id),
          type = VALUES(type),
          published_at = VALUES(published_at),
          updated_at = VALUES(updated_at),
          locale = VALUES(locale),
          pinned = VALUES(pinned),
          pinned_order = VALUES(pinned_order),
          cover = VALUES(cover),
          extra = VALUES(extra)
        """,
        (
            row["legacy_id"],
            row["slug"],
            row["title"],
            row["md_url"],
            row["summary"],
            row["keywords_json"],
            row["category_id"],
            row["db_type"],
            row["views"],
            row["published_at"],
            row["updated_at"],
            row["locale"],
            row["pinned"],
            row["pinned_order"],
            row["cover"],
            row["extra_json"],
        ),
    )


def main() -> None:
    default_dir = _backend / "import" / "markdown"
    p = argparse.ArgumentParser(description="从 Markdown 文件夹导入文章到数据库")
    p.add_argument(
        "--dir",
        "-d",
        default=str(default_dir),
        help=f"含 .md 的目录（默认: {default_dir}）",
    )
    args = p.parse_args()
    inbox = Path(args.dir)
    if not inbox.is_dir():
        print("目录不存在:", inbox.resolve(), file=sys.stderr)
        sys.exit(1)

    md_files = sorted(inbox.glob("*.md"))
    if not md_files:
        print("该目录下没有 .md 文件:", inbox.resolve())
        return

    posts_dir = config.CONTENT_ROOT / "posts"
    posts_dir.mkdir(parents=True, exist_ok=True)

    conn = connect()
    ok, fail = 0, 0
    try:
        cur = conn.cursor()
        for path in md_files:
            try:
                meta_raw, body = parse_markdown_file(path)
                norm = validate_and_normalize(meta_raw, body)
                db_type, cat_id = map_type(norm["type"])

                tags = norm["tags"]
                kw = build_keywords(tags, norm["title"], norm["summary"], body)
                keywords_json = json.dumps(kw, ensure_ascii=False)

                extra = norm["extra"]
                extra_json = json.dumps(extra, ensure_ascii=False) if extra else None

                published = iso_to_mysql_dt(norm.get("published_at"))
                updated = iso_to_mysql_dt(norm.get("updated_at")) or published

                slug = norm["slug"]
                md_rel = f"posts/{slug}.md"
                md_path = posts_dir / f"{slug}.md"
                md_path.write_text(body, encoding="utf-8")

                row = {
                    "legacy_id": norm["legacy_id"],
                    "slug": slug,
                    "title": norm["title"],
                    "md_url": md_rel,
                    "summary": norm["summary"],
                    "keywords_json": keywords_json,
                    "category_id": cat_id,
                    "db_type": db_type,
                    "views": 0,
                    "published_at": published,
                    "updated_at": updated,
                    "locale": norm["locale"],
                    "pinned": 1 if norm["pinned"] else 0,
                    "pinned_order": norm["pinned_order"],
                    "cover": norm["cover"],
                    "extra_json": extra_json,
                }
                upsert_post(cur, row)
                conn.commit()
                print(f"OK  {slug}  <- {path.name}")
                ok += 1
            except Exception as e:
                conn.rollback()
                print(f"ERR {path.name}: {e}", file=sys.stderr)
                fail += 1
    finally:
        conn.close()

    print(f"\n完成：成功 {ok}，失败 {fail}。正文目录: {posts_dir.resolve()}")


if __name__ == "__main__":
    main()
