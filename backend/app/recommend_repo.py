from __future__ import annotations

import json
from typing import Any

_ROW_SELECT = """
    SELECT id, public_id, category, rating, title, status, md_url, images, cover_index,
           summary, url, created_at, updated_at
    FROM xiqi_recommend
"""


def list_published(
    cur,
    *,
    category: str | None = None,
    rating: int | None = None,
    sort: str = "newest",
    page: int = 1,
    size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    size = min(max(1, size), 50)
    offset = (page - 1) * size
    order = "DESC" if sort != "oldest" else "ASC"

    where = ["status = %s"]
    params: list[Any] = ["published"]
    if category:
        where.append("category = %s")
        params.append(category)
    if rating is not None:
        where.append("rating = %s")
        params.append(rating)

    where_sql = " AND ".join(where)
    cur.execute(f"SELECT COUNT(*) AS cnt FROM xiqi_recommend WHERE {where_sql}", params)
    total = int((cur.fetchone() or {"cnt": 0})["cnt"])

    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE {where_sql}
        ORDER BY created_at {order}, id {order}
        LIMIT %s OFFSET %s
        """,
        (*params, size, offset),
    )
    return cur.fetchall() or [], total


def get_by_public_id(cur, public_id: str) -> dict[str, Any] | None:
    cur.execute(f"{_ROW_SELECT} WHERE public_id = %s", (public_id,))
    return cur.fetchone()


def upsert_recommend(cur, row: dict[str, Any]) -> None:
    images_json = json.dumps(row.get("images") or [], ensure_ascii=False)
    cur.execute(
        """
        INSERT INTO xiqi_recommend (
            public_id, category, rating, title, status, md_url, images, cover_index,
            summary, url, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            category = VALUES(category),
            rating = VALUES(rating),
            title = VALUES(title),
            status = VALUES(status),
            md_url = VALUES(md_url),
            images = VALUES(images),
            cover_index = VALUES(cover_index),
            summary = VALUES(summary),
            url = VALUES(url),
            created_at = VALUES(created_at)
        """,
        (
            row["public_id"],
            row["category"],
            row["rating"],
            row["title"],
            row["status"],
            row["md_url"],
            images_json,
            row["cover_index"],
            row["summary"],
            row.get("url"),
            row["created_at"],
        ),
    )
