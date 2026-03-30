"""
从 frontend/src/content/data/posts.json 导入 MySQL，并写入 Markdown 文件。

用法（在 backend 目录下，已配置 .env）:
  python scripts/seed_from_json.py

依赖: 已执行 sql/schema.sql 建表。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))

from app.config import config  # noqa: E402
from app.db import connect  # noqa: E402

_REPO_ROOT = _backend.parent
_POSTS_JSON = _REPO_ROOT / "frontend" / "src" / "content" / "data" / "posts.json"


def map_type(front_type: str) -> tuple[int, int]:
    """返回 (db_type, category_id)"""
    if front_type == "algorithm":
        return 2, 3
    if front_type == "project_note":
        return 1, 2
    if front_type == "article":
        return 0, 1
    raise ValueError(f"unknown type: {front_type}")


def build_extra(item: dict) -> dict:
    t = item["type"]
    if t == "algorithm":
        out = {}
        for k in ("difficulty", "oj", "problem_id", "series"):
            if item.get(k) is not None:
                out[k] = item[k]
        return out
    if t == "project_note":
        out = {}
        for k in ("project_id", "role", "feature_key"):
            if item.get(k) is not None:
                out[k] = item[k]
        return out
    return {}


def iso_to_mysql_dt(s: str | None) -> str | None:
    if not s:
        return None
    s = s.strip()
    if "T" in s:
        s = s.replace("Z", "").split(".")[0]
        return s.replace("T", " ")
    return s


def main():
    if not _POSTS_JSON.is_file():
        print("找不到", _POSTS_JSON)
        sys.exit(1)

    data = json.loads(_POSTS_JSON.read_text(encoding="utf-8"))
    posts_dir = config.CONTENT_ROOT / "posts"
    posts_dir.mkdir(parents=True, exist_ok=True)

    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM post")
        cur.execute("ALTER TABLE post AUTO_INCREMENT = 1")
        conn.commit()

        for item in data:
            slug = item["slug"]
            body = item.get("body") or ""
            md_rel = f"posts/{slug}.md"
            md_path = posts_dir / f"{slug}.md"
            md_path.write_text(body, encoding="utf-8")

            db_type, cat_id = map_type(item["type"])
            tags = item.get("tags") or []
            keywords_json = json.dumps(tags, ensure_ascii=False)
            extra = build_extra(item)
            extra_json = json.dumps(extra, ensure_ascii=False) if extra else None

            published = iso_to_mysql_dt(item.get("published_at"))
            updated = iso_to_mysql_dt(item.get("updated_at")) or published

            cur.execute(
                """
                INSERT INTO post (
                  legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                  views, published_at, updated_at, locale, pinned, pinned_order, cover, extra
                ) VALUES (
                  %s, %s, %s, %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    item.get("id"),
                    slug,
                    item["title"],
                    md_rel,
                    item.get("summary") or "",
                    keywords_json,
                    cat_id,
                    db_type,
                    0,
                    published,
                    updated,
                    item.get("locale") or "zh",
                    1 if item.get("pinned") else 0,
                    int(item.get("pinned_order") or 9999),
                    item.get("cover"),
                    extra_json,
                ),
            )
        conn.commit()
        print(f"已导入 {len(data)} 条 post，Markdown 目录: {posts_dir}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
