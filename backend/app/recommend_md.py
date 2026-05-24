"""解析 `backend/import/xiqi/recommendations` 下推荐条目 Markdown。"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from app.fragment_md import extract_summary
from app.guest_message_md import _optional_media_url
from app.md_import import split_front_matter

ALLOWED_CATEGORIES = frozenset({"software", "opensource", "anime"})
ALLOWED_STATUS = frozenset({"published", "hidden", "draft"})

_PUBLIC_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")
_DATETIME_FMT = "%Y-%m-%d %H:%M:%S"
_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def parse_recommend_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def _parse_created_at(raw: Any, md_path: Path) -> str:
    if raw is None or str(raw).strip() == "":
        return datetime.now().strftime(_DATETIME_FMT)
    text = str(raw).strip()
    for fmt in (_DATETIME_FMT, "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(text.replace("Z", ""), fmt)
            return dt.strftime(_DATETIME_FMT)
        except ValueError:
            continue
    raise ValueError(f"created_at 时间格式无效: {md_path.name}")


def _parse_images(raw: Any, md_path: Path) -> list[dict[str, str]]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError(f"images 必须是列表: {md_path.name}")
    out: list[dict[str, str]] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"images[{i}] 必须是对象: {md_path.name}")
        url = _optional_media_url(item.get("url"), field=f"images[{i}].url", md_path=md_path)
        if not url:
            continue
        alt = str(item.get("alt") or "").strip()
        out.append({"url": url, "alt": alt})
    return out


def _parse_rating(raw: Any, md_path: Path) -> int:
    try:
        rating = int(raw)
    except (TypeError, ValueError) as e:
        raise ValueError(f"rating 必须是 1–5 的整数: {md_path.name}") from e
    if rating < 1 or rating > 5:
        raise ValueError(f"rating 必须是 1–5: {md_path.name}")
    return rating


def _parse_url(raw: Any, md_path: Path) -> str | None:
    if raw is None or str(raw).strip() == "":
        return None
    url = str(raw).strip()
    if not _URL_RE.match(url):
        raise ValueError(f"url 必须是 http(s) 链接: {md_path.name}")
    return url


def validate_recommend_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    public_id = (meta.get("public_id") or meta.get("id") or "").strip()
    if not public_id:
        public_id = f"rec-{md_path.stem}"
    if not _PUBLIC_ID_RE.match(public_id):
        raise ValueError(
            f"public_id 仅允许 8–64 位字母数字、下划线、连字符: {public_id!r} "
            f"（{md_path.name}）"
        )

    category = (meta.get("category") or "").strip().lower()
    if category not in ALLOWED_CATEGORIES:
        raise ValueError(f"category 必须是 {sorted(ALLOWED_CATEGORIES)} 之一: {md_path.name}")

    status = (meta.get("status") or "published").strip().lower()
    if status not in ALLOWED_STATUS:
        raise ValueError(f"status 必须是 {sorted(ALLOWED_STATUS)} 之一: {md_path.name}")

    title = str(meta.get("title") or "").strip()
    if not title:
        raise ValueError(f"缺少 title: {md_path.name}")

    rating = _parse_rating(meta.get("rating"), md_path)
    url = _parse_url(meta.get("url"), md_path)
    images = _parse_images(meta.get("images"), md_path)
    try:
        cover_index = int(meta.get("cover_index", 0))
    except (TypeError, ValueError) as e:
        raise ValueError(f"cover_index 必须是整数: {md_path.name}") from e
    if images and (cover_index < 0 or cover_index >= len(images)):
        raise ValueError(f"cover_index 超出 images 范围: {md_path.name}")

    content = body.strip()
    if meta.get("content"):
        content = str(meta.get("content")).strip() or content
    if not content:
        raise ValueError(f"缺少正文（--- 下方或 content 字段）: {md_path.name}")

    summary = str(meta.get("summary") or "").strip() or extract_summary(content)

    return {
        "public_id": public_id,
        "category": category,
        "rating": rating,
        "title": title,
        "status": status,
        "url": url,
        "images": images,
        "cover_index": cover_index,
        "created_at": _parse_created_at(meta.get("created_at"), md_path),
        "summary": summary,
        "body": content,
        "md_url": f"xiqi/recommendations/{public_id}.md",
    }
