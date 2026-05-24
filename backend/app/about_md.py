"""解析 `backend/import/xiqi/about/resume.md` 关于页履历 Markdown。"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.md_import import split_front_matter

ALLOWED_STATUS = frozenset({"published", "hidden"})
ALLOWED_TIERS = frozenset({"gold", "silver", "bronze"})

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_XIQI_PRIVATE_TAG_RE = re.compile(r"<xiqi-private\s+label=", re.IGNORECASE)
_XIQI_PRIVATE_CLOSE_RE = re.compile(r"</xiqi-private>", re.IGNORECASE)
_XIQI_PRIVATE_DIV_RE = re.compile(r"data-xiqi-private", re.IGNORECASE)


def parse_about_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def _require_str(value: Any, field: str, md_path: Path) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"缺少必填字段 {field}: {md_path.name}")
    return text


def _optional_str(value: Any) -> str:
    return str(value or "").strip()


def _validate_private_html(text: str, field: str, md_path: Path) -> None:
    if "xiqi-private" not in text and "data-xiqi-private" not in text:
        return
    has_tag = bool(_XIQI_PRIVATE_TAG_RE.search(text))
    has_div = bool(_XIQI_PRIVATE_DIV_RE.search(text))
    if not has_tag and not has_div:
        raise ValueError(f"{field} 含 xiqi-private 相关文本但格式无效: {md_path.name}")
    if has_tag and not _XIQI_PRIVATE_CLOSE_RE.search(text):
        raise ValueError(f"{field} 的 <xiqi-private> 标签未闭合: {md_path.name}")
    if has_div and "</div>" not in text.lower():
        raise ValueError(f"{field} 的 data-xiqi-private div 未闭合: {md_path.name}")


def _parse_awards(raw: Any, md_path: Path) -> list[dict[str, str]]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError(f"awards 必须是列表: {md_path.name}")
    out: list[dict[str, str]] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"awards[{i}] 必须是对象: {md_path.name}")
        award_id = _require_str(item.get("id"), f"awards[{i}].id", md_path)
        label = _require_str(item.get("label"), f"awards[{i}].label", md_path)
        tier = _optional_str(item.get("tier")).lower()
        if tier not in ALLOWED_TIERS:
            raise ValueError(
                f"awards[{i}].tier 必须是 {sorted(ALLOWED_TIERS)} 之一: {md_path.name}"
            )
        out.append({"id": award_id, "label": label, "tier": tier})
    return out


def _parse_section(raw: Any, fields: list[str], md_path: Path, section: str) -> dict[str, str]:
    if not isinstance(raw, dict):
        raise ValueError(f"{section} 必须是对象: {md_path.name}")
    out: dict[str, str] = {}
    for field in fields:
        key = field
        value = _require_str(raw.get(key), f"{section}.{key}", md_path)
        _validate_private_html(value, f"{section}.{key}", md_path)
        out[key] = value
    return out


def _parse_certificates(raw: Any, md_path: Path) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError(f"certificates 必须是列表: {md_path.name}")
    out: list[str] = []
    for i, item in enumerate(raw):
        text = _require_str(item, f"certificates[{i}]", md_path)
        out.append(text)
    return out


def validate_about_meta(meta: dict[str, Any], body: str, md_path: Path) -> dict[str, Any]:
    status = (meta.get("status") or "published").strip().lower()
    if status not in ALLOWED_STATUS:
        raise ValueError(f"status 必须是 {sorted(ALLOWED_STATUS)} 之一: {md_path.name}")

    alias = _require_str(meta.get("alias"), "alias", md_path)
    gender_age = _require_str(meta.get("gender_age"), "gender_age", md_path)
    email = _require_str(meta.get("email"), "email", md_path)
    if not _EMAIL_RE.match(email):
        raise ValueError(f"email 格式无效: {md_path.name}")

    intro = _require_str(meta.get("intro"), "intro", md_path)
    _validate_private_html(intro, "intro", md_path)

    awards = _parse_awards(meta.get("awards"), md_path)
    education = _parse_section(
        meta.get("education"),
        ["school_public", "school_raw", "degree", "major", "period", "rank_raw"],
        md_path,
        "education",
    )
    internship = _parse_section(
        meta.get("internship"),
        ["company_public", "company_raw", "role", "period", "summary_raw"],
        md_path,
        "internship",
    )
    club = _parse_section(
        meta.get("club"),
        ["name_public", "name_raw", "role", "period", "summary_raw"],
        md_path,
        "club",
    )
    certificates = _parse_certificates(meta.get("certificates"), md_path)

    profile = {
        "alias": alias,
        "gender_age": gender_age,
        "email": email,
        "intro": intro,
        "awards": awards,
        "education": education,
        "internship": internship,
        "club": club,
        "certificates": certificates,
    }

    return {
        "status": status,
        "md_url": "xiqi/about/resume.md",
        "profile": profile,
        "note": body.strip(),
    }
