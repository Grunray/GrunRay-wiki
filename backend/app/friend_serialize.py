from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.friend_status import STATUS_PUBLISHED


def _iso_dt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    return str(value)


def _parse_tags(raw: Any) -> list[str] | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else None
        except json.JSONDecodeError:
            return None
    return None


def row_to_friend(row: dict[str, Any]) -> dict[str, Any]:
    item: dict[str, Any] = {
        "id": row["public_id"],
        "name": row["name"],
        "url": row["url"],
        "description": row["description"],
    }
    if row.get("avatar_url"):
        item["avatar"] = row["avatar_url"]
    if row.get("cover_url"):
        item["cover"] = row["cover_url"]
    tags = _parse_tags(row.get("tags"))
    if tags:
        item["tags"] = tags
    return item


def row_to_admin_friend(row: dict[str, Any]) -> dict[str, Any]:
    item = row_to_friend(row)
    item["status"] = int(row.get("status", 0))
    if row.get("contact_email"):
        item["contactEmail"] = row["contact_email"]
    item["createdAt"] = _iso_dt(row.get("created_at"))
    item["updatedAt"] = _iso_dt(row.get("updated_at"))
    return item


def application_result(row: dict[str, Any]) -> dict[str, Any]:
    return {"publicId": row["public_id"]}
