"""解析 `backend/import/friend_link` 下友链 Markdown（YAML front matter + 可选备注正文）。"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.friend_validate import FriendValidationError, normalize_friend_url, validate_http_url
from app.friend_status import (
    STATUS_HIDDEN,
    STATUS_PENDING,
    STATUS_PUBLISHED,
    STATUS_REJECTED,
)
from app.md_import import split_front_matter

ALLOWED_STATUS = frozenset({"pending", "published", "hidden", "rejected"})

STATUS_MAP = {
    "pending": STATUS_PENDING,
    "published": STATUS_PUBLISHED,
    "hidden": STATUS_HIDDEN,
    "rejected": STATUS_REJECTED,
}

_NAME_MAX = 64
_DESC_MAX = 200
_EMAIL_MAX = 128
_PUBLIC_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")


def parse_friend_link_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def _normalize_tags(raw: Any) -> list[str] | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        tags = [t.strip() for t in raw.split(",") if t.strip()]
    elif isinstance(raw, list):
        tags = [str(t).strip() for t in raw if str(t).strip()]
    else:
        raise ValueError("tags 必须是列表或逗号分隔字符串")
    return tags or None


def validate_friend_link_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    """校验并返回可写入 `friend_link` 的扁平字段。"""
    _ = body  # 正文为站长备注，当前版本不入库

    public_id = (meta.get("public_id") or meta.get("id") or "").strip()
    if not public_id:
        public_id = f"friend-{md_path.stem}"
    if not _PUBLIC_ID_RE.match(public_id):
        raise ValueError(
            f"public_id 仅允许 8–64 位字母数字、下划线、连字符: {public_id!r} "
            f"（文件 {md_path.name}）"
        )

    name = (meta.get("name") or meta.get("title") or "").strip()
    if not name:
        raise ValueError(f"缺少 name（或 title）: {md_path.name}")
    if len(name) > _NAME_MAX:
        raise ValueError(f"name 不能超过 {_NAME_MAX} 个字符: {md_path.name}")

    url_raw = (meta.get("url") or "").strip()
    if not url_raw:
        raise ValueError(f"缺少 url: {md_path.name}")
    try:
        url_normalized = normalize_friend_url(url_raw)
    except FriendValidationError as e:
        raise ValueError(str(e)) from e

    description = (meta.get("description") or meta.get("summary") or "").strip()
    if not description:
        raise ValueError(f"缺少 description（或 summary）: {md_path.name}")
    if len(description) > _DESC_MAX:
        raise ValueError(f"description 不能超过 {_DESC_MAX} 个字符: {md_path.name}")

    status_raw = (meta.get("status") or "published").strip().lower()
    if status_raw not in ALLOWED_STATUS:
        raise ValueError(
            f"status 必须是 {sorted(ALLOWED_STATUS)} 之一，当前: {status_raw!r}"
        )
    status = STATUS_MAP[status_raw]

    try:
        sort_order = int(meta.get("sort_order", 0))
    except (TypeError, ValueError) as e:
        raise ValueError(f"sort_order 必须是整数: {md_path.name}") from e

    avatar_url = validate_http_url(
        meta.get("avatar_url") or meta.get("avatar"),
        field="头像地址",
        max_len=512,
        optional=True,
    )
    cover_url = validate_http_url(
        meta.get("cover_url") or meta.get("cover"),
        field="封面地址",
        max_len=512,
        optional=True,
    )

    contact_email: str | None = None
    email_raw = meta.get("contact_email") or meta.get("email")
    if email_raw is not None and str(email_raw).strip():
        contact_email = str(email_raw).strip()
        if len(contact_email) > _EMAIL_MAX:
            raise ValueError(f"contact_email 过长: {md_path.name}")
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", contact_email):
            raise ValueError(f"contact_email 格式不正确: {md_path.name}")

    tags = _normalize_tags(meta.get("tags"))

    return {
        "public_id": public_id,
        "name": name,
        "url": url_raw,
        "url_normalized": url_normalized,
        "description": description,
        "avatar_url": avatar_url,
        "cover_url": cover_url,
        "tags": tags,
        "contact_email": contact_email,
        "status": status,
        "sort_order": sort_order,
    }
