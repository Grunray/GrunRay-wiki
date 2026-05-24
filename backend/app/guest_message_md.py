"""解析 `backend/import/guest/message` 下留言 Markdown（YAML front matter + 正文作 content）。"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from app.friend_validate import FriendValidationError, validate_http_url
from app.md_import import split_front_matter
from app.message_status import (
    STATUS_HIDDEN,
    STATUS_PENDING,
    STATUS_PUBLISHED,
    STATUS_REJECTED,
)

ALLOWED_STATUS = frozenset({"pending", "published", "hidden", "rejected"})
ALLOWED_PROVIDERS = frozenset({"github", "google"})

STATUS_MAP = {
    "pending": STATUS_PENDING,
    "published": STATUS_PUBLISHED,
    "hidden": STATUS_HIDDEN,
    "rejected": STATUS_REJECTED,
}

_PUBLIC_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")
_AUTHOR_MAX = 255
_URL_MAX = 1024
_DATETIME_FMT = "%Y-%m-%d %H:%M:%S"


def _optional_media_url(raw: Any, *, field: str, md_path: Path, max_len: int = _URL_MAX) -> str | None:
    if raw is None or str(raw).strip() == "":
        return None
    text = str(raw).strip()
    if text.startswith("/"):
        if len(text) > max_len:
            raise ValueError(f"{field} 过长: {md_path.name}")
        return text
    try:
        return validate_http_url(text, field=field, max_len=max_len, optional=False)
    except FriendValidationError as e:
        raise ValueError(str(e)) from e


def parse_guest_message_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def _parse_public_id(meta: dict[str, Any], md_path: Path, *, suffix: str = "") -> str:
    public_id = (meta.get("public_id") or meta.get("id") or "").strip()
    if not public_id:
        stem = md_path.stem
        public_id = f"msg-{stem}{suffix}"
    if not _PUBLIC_ID_RE.match(public_id):
        raise ValueError(
            f"public_id 仅允许 8–64 位字母数字、下划线、连字符: {public_id!r} "
            f"（{md_path.name}）"
        )
    return public_id


def _parse_created_at(raw: Any, md_path: Path, field: str) -> str | None:
    if raw is None or str(raw).strip() == "":
        return None
    text = str(raw).strip()
    for fmt in (_DATETIME_FMT, "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.strftime(_DATETIME_FMT)
        except ValueError:
            continue
    raise ValueError(f"{field} 时间格式无效，请用 YYYY-MM-DD HH:MM:SS: {md_path.name}")


def _parse_guest_user_ref(meta: dict[str, Any], md_path: Path) -> dict[str, str] | None:
    ref = meta.get("guest_user")
    if ref is None:
        prov = meta.get("guest_user_provider")
        puid = meta.get("guest_user_provider_id")
        if prov is not None or puid is not None:
            ref = {"provider": prov, "provider_user_id": puid}
    if ref is None:
        return None
    if not isinstance(ref, dict):
        raise ValueError(f"guest_user 必须是对象: {md_path.name}")
    provider = (ref.get("provider") or "").strip().lower()
    provider_user_id = str(ref.get("provider_user_id") or ref.get("id") or "").strip()
    if provider not in ALLOWED_PROVIDERS or not provider_user_id:
        raise ValueError(
            f"guest_user 须含 provider({sorted(ALLOWED_PROVIDERS)}) 与 provider_user_id: {md_path.name}"
        )
    return {"provider": provider, "provider_user_id": provider_user_id}


def _parse_reply(meta: dict[str, Any], md_path: Path, top_public_id: str) -> dict[str, Any] | None:
    reply = meta.get("reply")
    if reply is None:
        return None
    if not isinstance(reply, dict):
        raise ValueError(f"reply 必须是对象: {md_path.name}")

    public_id = (reply.get("public_id") or reply.get("id") or "").strip()
    if not public_id:
        public_id = f"{top_public_id}-reply"
    elif not _PUBLIC_ID_RE.match(public_id):
        raise ValueError(
            f"reply.public_id 仅允许 8–64 位字母数字、下划线、连字符: {public_id!r}"
        )

    author_name = (reply.get("author_name") or reply.get("author") or "").strip()
    if not author_name:
        raise ValueError(f"reply 缺少 author_name（或 author）: {md_path.name}")
    if len(author_name) > _AUTHOR_MAX:
        raise ValueError(f"reply.author_name 过长: {md_path.name}")

    content = (reply.get("content") or "").strip()
    if not content:
        raise ValueError(f"reply 缺少 content: {md_path.name}")

    is_owner = bool(reply.get("is_owner", True))

    provider_raw = reply.get("provider")
    provider: str | None = None
    if provider_raw is not None and str(provider_raw).strip():
        provider = str(provider_raw).strip().lower()
        if provider not in ALLOWED_PROVIDERS:
            raise ValueError(f"reply.provider 无效: {md_path.name}")

    avatar_url = _optional_media_url(
        reply.get("avatar_url") or reply.get("avatar"),
        field="回复头像",
        md_path=md_path,
    )
    profile_url = _optional_media_url(
        reply.get("profile_url"),
        field="回复主页",
        md_path=md_path,
    )

    status_raw = (reply.get("status") or "published").strip().lower()
    if status_raw not in ALLOWED_STATUS:
        raise ValueError(f"reply.status 无效: {md_path.name}")
    status = STATUS_MAP[status_raw]

    return {
        "public_id": public_id,
        "author_name": author_name,
        "content": content,
        "avatar_url": avatar_url,
        "provider": provider,
        "profile_url": profile_url,
        "status": status,
        "is_owner": is_owner,
        "guest_user": _parse_guest_user_ref(reply, md_path),
        "created_at": _parse_created_at(reply.get("created_at"), md_path, "reply.created_at"),
    }


def validate_guest_message_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    public_id = _parse_public_id(meta, md_path)

    author_name = (meta.get("author_name") or meta.get("author") or "").strip()
    if not author_name:
        raise ValueError(f"缺少 author_name（或 author）: {md_path.name}")
    if len(author_name) > _AUTHOR_MAX:
        raise ValueError(f"author_name 过长: {md_path.name}")

    content = (meta.get("content") or "").strip()
    if not content:
        content = body.strip()
    if not content:
        raise ValueError(f"缺少 content（front matter 或 --- 后正文）: {md_path.name}")

    status_raw = (meta.get("status") or "published").strip().lower()
    if status_raw not in ALLOWED_STATUS:
        raise ValueError(f"status 必须是 {sorted(ALLOWED_STATUS)} 之一: {md_path.name}")
    status = STATUS_MAP[status_raw]

    is_owner = bool(meta.get("is_owner", False))

    provider_raw = meta.get("provider")
    provider: str | None = None
    if provider_raw is not None and str(provider_raw).strip():
        provider = str(provider_raw).strip().lower()
        if provider not in ALLOWED_PROVIDERS:
            raise ValueError(f"provider 无效: {md_path.name}")

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

    reply = _parse_reply(meta, md_path, public_id)

    return {
        "public_id": public_id,
        "author_name": author_name,
        "content": content,
        "avatar_url": avatar_url,
        "provider": provider,
        "profile_url": profile_url,
        "status": status,
        "is_owner": is_owner,
        "guest_user": _parse_guest_user_ref(meta, md_path),
        "created_at": _parse_created_at(meta.get("created_at"), md_path, "created_at"),
        "reply": reply,
    }
