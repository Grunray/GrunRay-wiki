from __future__ import annotations

from typing import Any

_ROW_SELECT = """
    SELECT page, hero_image_url, hero_image_alt, status, updated_at
    FROM xiqi_page
"""


def get_page(cur, page: str) -> dict[str, Any] | None:
    cur.execute(f"{_ROW_SELECT} WHERE page = %s", (page,))
    return cur.fetchone()


def upsert_page(cur, row: dict[str, Any]) -> None:
    cur.execute(
        """
        INSERT INTO xiqi_page (page, hero_image_url, hero_image_alt, status)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            hero_image_url = VALUES(hero_image_url),
            hero_image_alt = VALUES(hero_image_alt),
            status = VALUES(status)
        """,
        (
            row["page"],
            row.get("hero_image_url"),
            row.get("hero_image_alt") or "",
            row["status"],
        ),
    )
