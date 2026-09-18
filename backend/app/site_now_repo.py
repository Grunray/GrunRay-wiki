from __future__ import annotations

import re
from typing import Any

_ROW_SELECT = """
    SELECT id, doing, reading, updated_at
    FROM site_now
"""

_MAX_LEN = 200
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def get_site_now(cur) -> dict[str, Any] | None:
    cur.execute(f"{_ROW_SELECT} WHERE id = 1")
    return cur.fetchone()


def upsert_site_now(cur, *, doing: str, reading: str) -> dict[str, Any]:
    cur.execute(
        """
        INSERT INTO site_now (id, doing, reading)
        VALUES (1, %s, %s)
        ON DUPLICATE KEY UPDATE
            doing = VALUES(doing),
            reading = VALUES(reading)
        """,
        (doing, reading),
    )
    row = get_site_now(cur)
    assert row is not None
    return row


def normalize_now_field(raw: Any, *, field: str) -> str:
    text = "" if raw is None else str(raw)
    text = _HTML_TAG_RE.sub("", text).strip()
    if len(text) > _MAX_LEN:
        raise ValueError(f"{field} 最多 {_MAX_LEN} 字")
    return text


def serialize_site_now(row: dict[str, Any] | None) -> dict[str, Any]:
    doing = (row.get("doing") or "").strip() if row else ""
    reading = (row.get("reading") or "").strip() if row else ""
    updated = row.get("updated_at") if row else None
    return {
        "doing": doing or None,
        "reading": reading or None,
        "updatedAt": updated.isoformat(sep=" ", timespec="seconds") if updated else None,
    }
