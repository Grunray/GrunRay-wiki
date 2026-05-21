from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import config


def load_special_links() -> list[dict[str, Any]]:
    path: Path = config.FRIEND_SPECIAL_LINKS_PATH
    if not path.is_file():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return []
    items: list[dict[str, Any]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        item = {
            "id": str(entry.get("id", "")),
            "title": str(entry.get("title", "")),
            "description": str(entry.get("description", "")),
            "url": str(entry.get("url", "")),
        }
        icon = entry.get("icon")
        if icon in ("acg-trip", "travellings"):
            item["icon"] = icon
        if item["id"] and item["title"] and item["url"]:
            items.append(item)
    return items
