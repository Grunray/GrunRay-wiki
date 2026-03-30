"""DB 行 → 前端 Post JSON（与前端 types/content 对齐）。"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import config

# DB type: 0 article, 1 project, 2 algorithm
TYPE_TO_FRONT = {
    0: "article",
    1: "project_note",
    2: "algorithm",
}


def _read_markdown(md_url: str) -> str:
    path = (config.CONTENT_ROOT / md_url).resolve()
    root = config.CONTENT_ROOT.resolve()
    if not str(path).startswith(str(root)) or not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


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
    return val


def row_to_post(row: dict, *, include_body: bool = False) -> dict:
    keywords = _parse_json_field(row.get("keywords")) or []
    if not isinstance(keywords, list):
        keywords = []
    tags = [str(k) for k in keywords]

    extra = _parse_json_field(row.get("extra")) or {}
    if not isinstance(extra, dict):
        extra = {}

    db_type = int(row["type"])
    front_type = TYPE_TO_FRONT.get(db_type, "article")

    pid = str(row.get("legacy_id") or row["id"])

    def _dt_iso(dt: Any) -> str:
        if dt is None:
            return ""
        if hasattr(dt, "strftime"):
            return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        return str(dt)

    published_iso = _dt_iso(row.get("published_at"))
    updated_iso = _dt_iso(row.get("updated_at"))

    out: dict[str, Any] = {
        "id": pid,
        "slug": row["slug"],
        "locale": row.get("locale") or "zh",
        "title": row["title"],
        "summary": row.get("summary") or "",
        "published_at": published_iso,
        "updated_at": updated_iso,
        "tags": tags,
        "pinned": bool(row.get("pinned")),
        "pinned_order": int(row.get("pinned_order") or 9999),
        "type": front_type,
    }

    if row.get("cover"):
        out["cover"] = row["cover"]

    if front_type == "algorithm":
        out["difficulty"] = extra.get("difficulty")
        out["oj"] = extra.get("oj")
        out["problem_id"] = extra.get("problem_id")
        out["series"] = extra.get("series")
    elif front_type == "project_note":
        out["project_id"] = extra.get("project_id")
        out["role"] = extra.get("role")
        out["feature_key"] = extra.get("feature_key")

    if include_body:
        out["body"] = _read_markdown(row["md_url"])

    return out
