"""DB 行 → 前端 Project JSON（与 frontend/src/types/content.ts 对齐）。"""
from __future__ import annotations

import json
from typing import Any

STATUS_TO_FRONT = {0: "published", 1: "archived", 2: "hidden"}


def _parse_json_field(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return None
    return None


def _date_iso(d: Any) -> str | None:
    if d is None:
        return None
    if hasattr(d, "isoformat"):
        return d.isoformat()
    s = str(d).strip()
    return s or None


def row_to_project(row: dict[str, Any]) -> dict[str, Any]:
    tags_raw = _parse_json_field(row.get("tags")) or []
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []

    layout = _parse_json_field(row.get("layout")) or []
    if not isinstance(layout, list):
        layout = []

    st = int(row.get("status") or 0)
    status = STATUS_TO_FRONT.get(st, "published")

    related_raw = _parse_json_field(row.get("related_posts_json"))
    related_posts: list[dict[str, Any]] | None = None
    if isinstance(related_raw, list) and related_raw:
        related_posts = [dict(x) for x in related_raw if isinstance(x, dict)]

    out: dict[str, Any] = {
        "id": row["public_id"],
        "slug": row["slug"],
        "locale": row.get("locale") or "zh",
        "title": row["title"],
        "summary": row.get("summary") or "",
        "tags": tags,
        "status": status,
        "layout": layout,
    }

    if row.get("featured") is not None:
        out["featured"] = bool(row["featured"])
    if row.get("year") is not None:
        out["year"] = int(row["year"])
    sd = _date_iso(row.get("start_date"))
    if sd:
        out["start_date"] = sd
    ed = _date_iso(row.get("end_date"))
    if ed:
        out["end_date"] = ed
    if row.get("github_url"):
        out["github_url"] = row["github_url"]
    if row.get("demo_url"):
        out["demo_url"] = row["demo_url"]
    if related_posts is not None:
        out["related_posts_json"] = related_posts

    return out
