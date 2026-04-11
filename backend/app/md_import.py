"""从带 YAML front matter 的 Markdown 文件解析文章元数据与正文（与 designed/template.md 对齐）。"""
from __future__ import annotations

import re
from typing import Any

import yaml

# 允许的 post.type（与 DB map_type 一致）
ALLOWED_TYPES = frozenset({"article", "project_note", "algorithm"})


def split_front_matter(raw: str) -> tuple[dict[str, Any], str]:
    """
    解析 `---\\nYAML\\n---\\n正文`。
    正文不含 front matter，写入 content/posts/*.md 供 API 直接返回。
    """
    text = raw.strip()
    if not text.startswith("---"):
        raise ValueError("文件必须以 --- 开头的 YAML front matter")

    lines = text.splitlines()
    if lines[0].strip() != "---":
        raise ValueError("第一行应为 ---")

    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise ValueError("未找到结束的 ---，请检查 front matter")

    fm_block = "\n".join(lines[1:end])
    body = "\n".join(lines[end + 1 :])
    # 去掉正文前多余空行，保留用户意图的一个换行
    body = body.lstrip("\n")

    try:
        meta = yaml.safe_load(fm_block)
    except yaml.YAMLError as e:
        raise ValueError(f"YAML 解析失败: {e}") from e

    if not isinstance(meta, dict):
        raise ValueError("front matter 必须是 YAML 映射（键值对）")

    return meta, body


def parse_markdown_file(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8-sig")
    return split_front_matter(raw)


def validate_and_normalize(meta: dict[str, Any], body: str) -> dict[str, Any]:
    """校验必填项，返回供入库的扁平字段（含 type 字符串、tags 列表等）。"""
    title = (meta.get("title") or "").strip()
    slug = (meta.get("slug") or "").strip()
    if not title:
        raise ValueError("缺少 title")
    if not slug:
        raise ValueError("缺少 slug")
    if not re.match(r"^[a-zA-Z0-9_-]+$", slug):
        raise ValueError(f"slug 仅允许字母数字、下划线、连字符: {slug!r}")

    ptype = (meta.get("type") or "").strip()
    if ptype not in ALLOWED_TYPES:
        raise ValueError(f"type 必须是 {sorted(ALLOWED_TYPES)} 之一，当前: {ptype!r}")

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
    pinned = bool(meta.get("pinned", False))
    try:
        pinned_order = int(meta.get("pinned_order", 9999))
    except (TypeError, ValueError):
        pinned_order = 9999

    cover = meta.get("cover")
    cover = str(cover).strip() if cover else None

    extra: dict[str, Any] = {}
    if ptype == "algorithm":
        for k in ("difficulty", "oj", "problem_id", "series"):
            v = meta.get(k)
            if v is not None and str(v).strip():
                extra[k] = str(v).strip()
    elif ptype == "project_note":
        pid = meta.get("project_id")
        if not pid or not str(pid).strip():
            raise ValueError("type=project_note 时必须提供 project_id")
        extra["project_id"] = str(pid).strip()
        for k in ("role", "feature_key"):
            v = meta.get(k)
            if v is not None and str(v).strip():
                extra[k] = str(v).strip()

    out = {
        "title": title,
        "slug": slug,
        "type": ptype,
        "tags": tags,
        "summary": summary,
        "locale": locale,
        "pinned": pinned,
        "pinned_order": pinned_order,
        "cover": cover,
        "extra": extra,
        "legacy_id": (
            str(meta.get("id")).strip()
            if meta.get("id") is not None and str(meta.get("id")).strip()
            else f"md-{slug}"
        ),
        "published_at": meta.get("published_at"),
        "updated_at": meta.get("updated_at"),
    }
    return out
