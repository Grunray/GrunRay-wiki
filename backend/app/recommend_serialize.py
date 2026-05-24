"""推荐条目 API 序列化。"""
from __future__ import annotations

import json
from typing import Any


def _parse_images(raw: Any) -> list[dict[str, str]]:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if isinstance(item, dict) and item.get("url"):
            out.append({"url": str(item["url"]), "alt": str(item.get("alt") or "")})
    return out


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _cover_from_row(row: dict[str, Any]) -> tuple[str | None, str | None]:
    images = _parse_images(row.get("images"))
    if not images:
        return None, None
    idx = int(row.get("cover_index") or 0)
    idx = max(0, min(idx, len(images) - 1))
    item = images[idx]
    return item.get("url"), item.get("alt") or None


def row_to_recommend(row: dict[str, Any], *, body: str | None = None) -> dict[str, Any]:
    image_url, image_alt = _cover_from_row(row)
    item: dict[str, Any] = {
        "id": row["public_id"],
        "category": row["category"],
        "title": row["title"],
        "rating": int(row["rating"]),
        "summary": row.get("summary") or "",
        "createdAt": _iso_dt(row.get("created_at")),
    }
    if row.get("url"):
        item["url"] = row["url"]
    if image_url:
        item["imageUrl"] = image_url
    if image_alt:
        item["imageAlt"] = image_alt
    if body is not None:
        item["body"] = body
    return item


def row_to_recommend_detail(row: dict[str, Any], body: str, body_html: str) -> dict[str, Any]:
    item = row_to_recommend(row, body=body)
    item["bodyHtml"] = body_html
    images = _parse_images(row.get("images"))
    if images:
        item["images"] = images
        item["coverIndex"] = int(row.get("cover_index") or 0)
    return item
