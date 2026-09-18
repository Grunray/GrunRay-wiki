"""把 xiqi import Markdown 写入 content 目录并 upsert 数据库。供 CLI 与站长 API 共用。"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.config import config
from app.fragment_md import parse_fragment_markdown, validate_fragment_meta
from app.fragment_repo import upsert_fragment
from app.recommend_md import parse_recommend_markdown, validate_recommend_meta
from app.recommend_repo import upsert_recommend


def apply_fragment_markdown(cur, md_path: Path) -> dict[str, Any]:
    meta, body = parse_fragment_markdown(md_path)
    row = validate_fragment_meta(meta, body, md_path)
    content_path = config.CONTENT_ROOT / row["md_url"]
    content_path.parent.mkdir(parents=True, exist_ok=True)
    content_path.write_text(row["body"] + "\n", encoding="utf-8")
    upsert_fragment(cur, row)
    return row


def apply_recommend_markdown(cur, md_path: Path) -> dict[str, Any]:
    meta, body = parse_recommend_markdown(md_path)
    row = validate_recommend_meta(meta, body, md_path)
    content_path = config.CONTENT_ROOT / row["md_url"]
    content_path.parent.mkdir(parents=True, exist_ok=True)
    content_path.write_text(row["body"] + "\n", encoding="utf-8")
    upsert_recommend(cur, row)
    return row
