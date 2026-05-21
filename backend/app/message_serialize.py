from __future__ import annotations

from datetime import datetime
from typing import Any

from app.site_owner import message_row_is_owner


def _iso_dt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    return str(value)


def _row_reply_to_dict(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "author": row["author_name"],
        "avatarUrl": row.get("avatar_url"),
        "provider": row.get("provider"),
        "isOwner": message_row_is_owner(row),
        "content": row["content"],
        "createdAt": _iso_dt(row.get("created_at")),
    }


def row_to_message(row: dict[str, Any], reply_row: dict[str, Any] | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {
        "id": row["public_id"],
        "author": row["author_name"],
        "avatarUrl": row.get("avatar_url"),
        "provider": row.get("provider"),
        "profileUrl": row.get("profile_url"),
        "isOwner": message_row_is_owner(row),
        "content": row["content"],
        "createdAt": _iso_dt(row.get("created_at")),
    }
    reply = _row_reply_to_dict(reply_row)
    if reply:
        item["reply"] = reply
    return item


def row_to_admin_message(row: dict[str, Any]) -> dict[str, Any]:
    item = row_to_message(row)
    item["status"] = int(row.get("status", 0))
    return item
