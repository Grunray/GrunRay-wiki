"""解析 `backend/import/guest/user` 下访客用户 Markdown（YAML front matter）。"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.friend_validate import FriendValidationError, validate_http_url
from app.md_import import split_front_matter

ALLOWED_PROVIDERS = frozenset({"github", "google"})
_PROVIDER_USER_ID_MAX = 128
_NAME_MAX = 255
_EMAIL_MAX = 255
_URL_MAX = 1024


def _optional_media_url(raw: Any, *, field: str, md_path: Path) -> str | None:
    if raw is None or str(raw).strip() == "":
        return None
    text = str(raw).strip()
    if text.startswith("/"):
        if len(text) > _URL_MAX:
            raise ValueError(f"{field} 过长: {md_path.name}")
        return text
    try:
        return validate_http_url(text, field=field, max_len=_URL_MAX, optional=False)
    except FriendValidationError as e:
        raise ValueError(str(e)) from e


def parse_guest_user_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def validate_guest_user_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    _ = body

    provider = (meta.get("provider") or "").strip().lower()
    if provider not in ALLOWED_PROVIDERS:
        raise ValueError(
            f"provider 必须是 {sorted(ALLOWED_PROVIDERS)} 之一: {md_path.name}"
        )

    provider_user_id = str(meta.get("provider_user_id") or meta.get("id") or "").strip()
    if not provider_user_id:
        raise ValueError(f"缺少 provider_user_id（或 id）: {md_path.name}")
    if len(provider_user_id) > _PROVIDER_USER_ID_MAX:
        raise ValueError(f"provider_user_id 过长: {md_path.name}")

    login_raw = meta.get("login")
    login = str(login_raw).strip() if login_raw is not None and str(login_raw).strip() else None

    name = (meta.get("name") or login or "").strip()
    if not name:
        raise ValueError(f"缺少 name: {md_path.name}")
    if len(name) > _NAME_MAX:
        raise ValueError(f"name 过长: {md_path.name}")

    email: str | None = None
    email_raw = meta.get("email")
    if email_raw is not None and str(email_raw).strip():
        email = str(email_raw).strip()
        if len(email) > _EMAIL_MAX:
            raise ValueError(f"email 过长: {md_path.name}")

    avatar_url = _optional_media_url(
        meta.get("avatar_url") or meta.get("avatar"),
        field="头像地址",
        md_path=md_path,
    )
    profile_url = _optional_media_url(
        meta.get("profile_url"),
        field="主页地址",
        md_path=md_path,
    )

    return {
        "provider": provider,
        "provider_user_id": provider_user_id,
        "login": login,
        "name": name,
        "email": email,
        "avatar_url": avatar_url,
        "profile_url": profile_url,
    }
