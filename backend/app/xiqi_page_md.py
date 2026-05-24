"""解析 `backend/import/xiqi/pages` 下页面配置 Markdown。"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.guest_message_md import _optional_media_url
from app.md_import import split_front_matter
from app.xiqi_paths import ALLOWED_XIQI_PAGES

ALLOWED_STATUS = frozenset({"published", "hidden"})


def parse_xiqi_page_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def validate_xiqi_page_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    _ = body

    page = (meta.get("page") or md_path.stem).strip().lower()
    if page not in ALLOWED_XIQI_PAGES:
        raise ValueError(
            f"page 必须是 {sorted(ALLOWED_XIQI_PAGES)} 之一，当前 {page!r} ({md_path.name})"
        )

    status = (meta.get("status") or "published").strip().lower()
    if status not in ALLOWED_STATUS:
        raise ValueError(f"status 必须是 {sorted(ALLOWED_STATUS)} 之一: {md_path.name}")

    hero_image_url = _optional_media_url(
        meta.get("hero_image_url") or meta.get("hero_image"),
        field="hero_image_url",
        md_path=md_path,
    )
    hero_image_alt = str(meta.get("hero_image_alt") or meta.get("hero_alt") or "").strip()

    return {
        "page": page,
        "hero_image_url": hero_image_url,
        "hero_image_alt": hero_image_alt,
        "status": status,
    }
