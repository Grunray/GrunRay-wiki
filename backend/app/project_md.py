"""解析 `backend/import/projects` 下项目 Markdown（YAML front matter + 可选正文）。"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

from app.md_import import split_front_matter

ALLOWED_STATUS = frozenset({"published", "archived", "hidden"})


def parse_project_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def _load_layout(meta: dict[str, Any], md_path: Path) -> list[dict[str, Any]]:
    if "layout" in meta and meta["layout"] is not None:
        layout = meta["layout"]
        if isinstance(layout, str):
            layout = json.loads(layout)
        if not isinstance(layout, list):
            raise ValueError("layout 必须是 YAML 数组或 JSON 字符串数组")
        out_layout: list[dict[str, Any]] = []
        for i, x in enumerate(layout):
            if not isinstance(x, dict):
                raise ValueError(f"layout[{i}] 必须是对象")
            out_layout.append(dict(x))
        return out_layout

    layout_file = meta.get("layout_file")
    if layout_file and str(layout_file).strip():
        p = (md_path.parent / str(layout_file).strip()).resolve()
        root = md_path.parent.resolve()
        if not str(p).startswith(str(root)) or not p.is_file():
            raise ValueError(f"layout_file 不存在或越界: {layout_file!r}")
        data = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("layout_file 必须是 JSON 数组")
        out_layout: list[dict[str, Any]] = []
        for i, x in enumerate(data):
            if not isinstance(x, dict):
                raise ValueError(f"layout_file[{i}] 必须是对象")
            out_layout.append(dict(x))
        return out_layout

    raise ValueError("必须提供 layout（YAML 数组）或 layout_file（相对路径 JSON）")


def _normalize_related(meta: dict[str, Any]) -> list[dict[str, Any]] | None:
    raw = meta.get("related_posts")
    if raw is None:
        return None
    if isinstance(raw, str):
        raw = json.loads(raw)
    if not isinstance(raw, list):
        raise ValueError("related_posts 必须是数组")
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("related_posts 每项必须是对象")
        slug = (item.get("slug") or "").strip()
        if not slug:
            raise ValueError("related_posts 每项必须有 slug")
        ref: dict[str, Any] = {"slug": slug}
        if item.get("label"):
            ref["label"] = str(item["label"]).strip()
        if item.get("pinned") is not None:
            ref["pinned"] = bool(item.get("pinned"))
        out.append(ref)
    return out


def validate_project_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    """校验并返回可写入 `wiki_project` 的扁平字段。"""
    _ = body  # 正文预留，当前版本不入库

    public_id = (meta.get("public_id") or meta.get("id") or "").strip()
    slug = (meta.get("slug") or "").strip()
    title = (meta.get("title") or "").strip()
    if not public_id:
        raise ValueError("缺少 public_id（或兼容字段 id）")
    if not slug:
        raise ValueError("缺少 slug")
    if not title:
        raise ValueError("缺少 title")
    if not re.match(r"^[a-zA-Z0-9_-]+$", slug):
        raise ValueError(f"slug 仅允许字母数字、下划线、连字符: {slug!r}")

    status = (meta.get("status") or "published").strip().lower()
    if status not in ALLOWED_STATUS:
        raise ValueError(f"status 必须是 {sorted(ALLOWED_STATUS)} 之一，当前: {status!r}")

    tags = meta.get("tags")
    if tags is None:
        tags = []
    elif isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        tags = [str(t).strip() for t in tags if str(t).strip()]
    else:
        raise ValueError("tags 必须是列表或逗号分隔字符串")

    summary = (meta.get("summary") or "").strip()
    locale = (meta.get("locale") or "zh").strip() or "zh"
    featured = bool(meta.get("featured", False))

    year = meta.get("year")
    if year is not None and year != "":
        try:
            year = int(year)
        except (TypeError, ValueError):
            raise ValueError("year 必须是整数") from None
    else:
        year = None

    def _date(key: str) -> str | None:
        v = meta.get(key)
        if v is None or str(v).strip() == "":
            return None
        s = str(v).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            raise ValueError(f"{key} 必须是 YYYY-MM-DD 格式: {s!r}")
        return s

    start_date = _date("start_date")
    end_date = _date("end_date")

    github_url = meta.get("github_url")
    github_url = str(github_url).strip() if github_url else None
    demo_url = meta.get("demo_url")
    demo_url = str(demo_url).strip() if demo_url else None

    layout = _load_layout(meta, md_path)
    related = _normalize_related(meta)

    return {
        "public_id": public_id,
        "slug": slug,
        "title": title,
        "summary": summary,
        "tags": tags,
        "status": status,
        "locale": locale,
        "featured": featured,
        "year": year,
        "start_date": start_date,
        "end_date": end_date,
        "github_url": github_url,
        "demo_url": demo_url,
        "layout": layout,
        "related_posts_json": related,
    }
