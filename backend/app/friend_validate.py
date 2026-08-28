from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from app.config import config
from app.message_validate import ValidationError, _load_sensitive_words, strip_html_and_validate

_NAME_MAX = 64
_URL_MAX = 512
_DESC_MAX = 200
_EMAIL_MAX = 128
_AVATAR_MAX = 512
_URL_RE = re.compile(r"^https?://", re.I)


@dataclass
class FriendValidationError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def normalize_friend_url(url: str) -> str:
    raw = url.strip()
    parsed = urlparse(raw)
    if not parsed.scheme or not parsed.netloc:
        raise FriendValidationError("站点地址格式不正确")
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise FriendValidationError("站点地址须为 http:// 或 https://")
    host = parsed.netloc.lower()
    path = (parsed.path or "").rstrip("/") or ""
    query = f"?{parsed.query}" if parsed.query else ""
    return f"{scheme}://{host}{path}{query}"


def _check_sensitive(text: str) -> None:
    if not config.FRIEND_SENSITIVE_WORDS_ENABLED:
        return
    lower = text.lower()
    for word in _load_sensitive_words():
        if word and word in lower:
            raise FriendValidationError("内容含有不允许的词语，请修改后重试")


def validate_http_url(raw: str | None, *, field: str, max_len: int, optional: bool = False) -> str | None:
    if raw is None or str(raw).strip() == "":
        if optional:
            return None
        raise FriendValidationError(f"请填写{field}")
    text = str(raw).strip()
    if len(text) > max_len:
        raise FriendValidationError(f"{field}过长")
    if not _URL_RE.match(text):
        raise FriendValidationError(f"{field}格式不正确，请使用 http:// 或 https://")
    return text


def validate_application(
    *,
    site_name: str | None,
    site_url: str | None,
    description: str | None,
    contact_email: str | None,
    avatar_url: str | None = None,
) -> dict[str, str | None]:
    if not site_name or not str(site_name).strip():
        raise FriendValidationError("请填写站点名称")
    try:
        name = strip_html_and_validate(str(site_name))
    except ValidationError as e:
        raise FriendValidationError(str(e)) from e
    if len(name) > _NAME_MAX:
        raise FriendValidationError(f"站点名称不能超过 {_NAME_MAX} 个字符")
    _check_sensitive(name)

    if not site_url or not str(site_url).strip():
        raise FriendValidationError("请填写站点地址")
    url_raw = str(site_url).strip()
    if len(url_raw) > _URL_MAX:
        raise FriendValidationError(f"站点地址过长")
    url_norm = normalize_friend_url(url_raw)

    if not description or not str(description).strip():
        raise FriendValidationError("请填写站点简介")
    try:
        desc = strip_html_and_validate(str(description))
    except ValidationError as e:
        raise FriendValidationError(str(e)) from e
    if len(desc) > _DESC_MAX:
        raise FriendValidationError(f"简介不能超过 {_DESC_MAX} 个字符")
    _check_sensitive(desc)

    if not contact_email or not str(contact_email).strip():
        raise FriendValidationError("请填写联系邮箱")
    email = str(contact_email).strip()
    if len(email) > _EMAIL_MAX:
        raise FriendValidationError("邮箱过长")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise FriendValidationError("邮箱格式不正确")

    avatar = validate_http_url(avatar_url, field="头像地址", max_len=_AVATAR_MAX, optional=True)

    return {
        "name": name,
        "url": url_raw,
        "url_normalized": url_norm,
        "description": desc,
        "contact_email": email,
        "avatar_url": avatar,
        "cover_url": avatar,
    }


def validate_admin_update(body: dict[str, Any]) -> dict[str, Any]:
    """站长 PATCH 部分字段更新；仅校验出现的键。"""
    updates: dict[str, Any] = {}

    if "name" in body:
        raw = body.get("name")
        if not raw or not str(raw).strip():
            raise FriendValidationError("请填写站点名称")
        try:
            name = strip_html_and_validate(str(raw))
        except ValidationError as e:
            raise FriendValidationError(str(e)) from e
        if len(name) > _NAME_MAX:
            raise FriendValidationError(f"站点名称不能超过 {_NAME_MAX} 个字符")
        _check_sensitive(name)
        updates["name"] = name

    if "url" in body:
        raw = body.get("url")
        if not raw or not str(raw).strip():
            raise FriendValidationError("请填写站点地址")
        url_raw = str(raw).strip()
        if len(url_raw) > _URL_MAX:
            raise FriendValidationError("站点地址过长")
        updates["url"] = url_raw
        updates["url_normalized"] = normalize_friend_url(url_raw)

    if "description" in body:
        raw = body.get("description")
        if not raw or not str(raw).strip():
            raise FriendValidationError("请填写站点简介")
        try:
            desc = strip_html_and_validate(str(raw))
        except ValidationError as e:
            raise FriendValidationError(str(e)) from e
        if len(desc) > _DESC_MAX:
            raise FriendValidationError(f"简介不能超过 {_DESC_MAX} 个字符")
        _check_sensitive(desc)
        updates["description"] = desc

    if "avatarUrl" in body:
        avatar = validate_http_url(
            body.get("avatarUrl"),
            field="头像地址",
            max_len=_AVATAR_MAX,
            optional=True,
        )
        updates["avatar_url"] = avatar

    if "contactEmail" in body:
        raw = body.get("contactEmail")
        if raw is None or str(raw).strip() == "":
            updates["contact_email"] = None
        else:
            email = str(raw).strip()
            if len(email) > _EMAIL_MAX:
                raise FriendValidationError("邮箱过长")
            if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
                raise FriendValidationError("邮箱格式不正确")
            updates["contact_email"] = email

    if "sortOrder" in body:
        try:
            updates["sort_order"] = int(body.get("sortOrder"))
        except (TypeError, ValueError) as e:
            raise FriendValidationError("排序值无效") from e

    return updates
