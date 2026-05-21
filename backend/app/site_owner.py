from __future__ import annotations

from typing import Any

from app.config import config, normalize_profile_url


def is_owner_profile_url(profile_url: str | None) -> bool:
    norm = normalize_profile_url(profile_url)
    if not norm:
        return False
    return norm in config.MESSAGE_OWNER_PROFILE_URLS


def is_site_owner(user: dict[str, Any] | None) -> bool:
    """当前登录用户是否为站长（OAuth ID 或 profile_url）。"""
    if not user:
        return False
    if is_owner_profile_url(user.get("profile_url")):
        return True
    provider = user.get("provider")
    uid = str(user.get("id") or "")
    if provider == "github" and uid in config.MESSAGE_OWNER_GITHUB_IDS:
        return True
    if provider == "google" and uid in config.MESSAGE_OWNER_GOOGLE_IDS:
        return True
    return False


def message_row_is_owner(row: dict[str, Any]) -> bool:
    """列表展示：库内 is_owner 标记，或 profile_url 匹配站长主页。"""
    if bool(row.get("is_owner")):
        return True
    return is_owner_profile_url(row.get("profile_url"))
