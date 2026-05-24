from __future__ import annotations

from typing import Any

_ROW_SELECT = """
    SELECT id, status, md_url, updated_at
    FROM xiqi_about
"""


def get_about(cur) -> dict[str, Any] | None:
    cur.execute(f"{_ROW_SELECT} WHERE id = 1")
    return cur.fetchone()


def upsert_about(cur, row: dict[str, Any]) -> None:
    cur.execute(
        """
        INSERT INTO xiqi_about (id, status, md_url)
        VALUES (1, %s, %s)
        ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            md_url = VALUES(md_url)
        """,
        (row["status"], row["md_url"]),
    )
