"""将碎念 / 页面配置序列化为 import Markdown。"""
from __future__ import annotations

from typing import Any


def _yaml_quote(value: str) -> str:
    if value == "":
        return "''"
    if any(c in value for c in '":\n#[]{}&*!|>%@`'):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def _yaml_scalar(value: str) -> str:
    text = str(value)
    if text.startswith("'") or ":" in text or text.startswith(" ") or text.endswith(" "):
        return _yaml_quote(text)
    return text


def render_fragment_markdown(
    *,
    public_id: str,
    mood: str,
    status: str,
    created_at: str,
    images: list[dict[str, str]],
    cover_index: int,
    body: str,
) -> str:
    lines = [
        "---",
        f"public_id: {_yaml_scalar(public_id)}",
        f"mood: {mood}",
        f"status: {status}",
        f"created_at: '{created_at}'",
    ]
    if images:
        lines.append("images:")
        for img in images:
            lines.append(f"  - url: {_yaml_scalar(img.get('url') or '')}")
            alt = img.get("alt") or ""
            lines.append(f"    alt: {_yaml_scalar(alt)}")
    else:
        lines.append("images: []")
    lines.append(f"cover_index: {cover_index}")
    lines.append("---")
    lines.append("")
    lines.append(body.rstrip())
    lines.append("")
    return "\n".join(lines)


def render_xiqi_page_markdown(
    *,
    page: str,
    hero_image_url: str | None,
    hero_image_alt: str,
    status: str,
    note: str = "",
) -> str:
    url_line = f"hero_image_url: {_yaml_scalar(hero_image_url or '')}"
    alt_line = f"hero_image_alt: {_yaml_scalar(hero_image_alt)}"
    lines = [
        "---",
        f"page: {page}",
        url_line,
        alt_line,
        f"status: {status}",
        "---",
        "",
    ]
    if note.strip():
        lines.append(note.strip())
        lines.append("")
    return "\n".join(lines)


def render_about_markdown(*, profile: dict[str, Any], status: str, note: str = "") -> str:
    """从 snake_case profile dict 生成 import Markdown。"""
    lines = [
        "---",
        f"status: {status}",
        f"alias: {_yaml_scalar(profile['alias'])}",
        f"gender_age: {_yaml_scalar(profile['gender_age'])}",
        f"email: {_yaml_scalar(profile['email'])}",
    ]
    intro = profile["intro"]
    if "\n" in intro:
        lines.append("intro: |")
        for line in intro.splitlines():
            lines.append(f"  {line}")
    else:
        lines.append(f"intro: {_yaml_scalar(intro)}")

    lines.append("awards:")
    for award in profile.get("awards") or []:
        lines.append(f"  - id: {_yaml_scalar(award['id'])}")
        lines.append(f"    label: {_yaml_scalar(award['label'])}")
        lines.append(f"    tier: {award['tier']}")

    for section_name in ("education", "internship", "club"):
        section = profile[section_name]
        lines.append(f"{section_name}:")
        for key, value in section.items():
            lines.append(f"  {key}: {_yaml_scalar(value)}")

    lines.append("certificates:")
    for cert in profile.get("certificates") or []:
        lines.append(f"  - {_yaml_scalar(cert)}")

    lines.append("---")
    lines.append("")
    if note.strip():
        lines.append(note.strip())
        lines.append("")
    return "\n".join(lines)


def render_recommend_markdown(
    *,
    public_id: str,
    category: str,
    rating: int,
    title: str,
    status: str,
    created_at: str,
    url: str | None,
    summary: str,
    images: list[dict[str, str]],
    cover_index: int,
    body: str,
) -> str:
    lines = [
        "---",
        f"public_id: {_yaml_scalar(public_id)}",
        f"category: {category}",
        f"rating: {rating}",
        f"title: {_yaml_scalar(title)}",
        f"status: {status}",
        f"created_at: '{created_at}'",
    ]
    if url:
        lines.append(f"url: {_yaml_scalar(url)}")
    if summary.strip():
        lines.append(f"summary: {_yaml_scalar(summary)}")
    if images:
        lines.append("images:")
        for img in images:
            lines.append(f"  - url: {_yaml_scalar(img.get('url') or '')}")
            alt = img.get("alt") or ""
            lines.append(f"    alt: {_yaml_scalar(alt)}")
    else:
        lines.append("images: []")
    lines.append(f"cover_index: {cover_index}")
    lines.append("---")
    lines.append("")
    lines.append(body.rstrip())
    lines.append("")
    return "\n".join(lines)
