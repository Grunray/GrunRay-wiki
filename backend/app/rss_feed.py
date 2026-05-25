"""RSS 2.0 Feed：与博客列表可见性一致（文章、算法、非 hidden 项目笔记）。"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from typing import Any
from xml.sax.saxutils import escape

from app.config import config
from app.serialize import TYPE_TO_FRONT

PROJECT_STATUS_HIDDEN = 2
DEFAULT_MAX_ITEMS = 50


def _parse_extra(row: dict) -> dict[str, Any]:
    raw = row.get("extra")
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _site_origin() -> str:
    return (config.FRIENDS_SITE_URL or config.FRONTEND_ORIGIN or "").rstrip("/")


def _post_link(slug: str) -> str:
    base = _site_origin()
    path = f"/blog/{slug}"
    return f"{base}{path}" if base else path


def _rss_pub_date(dt: Any) -> str:
    if dt is None:
        return ""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return ""
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return format_datetime(dt, usegmt=True)
    return ""


def _plain_description(summary: str) -> str:
    text = (summary or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return escape(text)


def fetch_posts_for_rss(cur, *, limit: int = DEFAULT_MAX_ITEMS) -> list[dict]:
    cur.execute(
        """
        SELECT id, slug, title, summary, type, published_at, updated_at, extra
        FROM post
        WHERE published_at IS NOT NULL
        ORDER BY published_at DESC, id DESC
        LIMIT %s
        """,
        (max(limit * 3, limit),),
    )
    rows = cur.fetchall() or []

    cur.execute(
        "SELECT public_id FROM wiki_project WHERE status = %s",
        (PROJECT_STATUS_HIDDEN,),
    )
    hidden_project_ids = {r["public_id"] for r in (cur.fetchall() or [])}

    out: list[dict] = []
    for row in rows:
        db_type = int(row["type"])
        if db_type == 1:
            extra = _parse_extra(row)
            project_id = str(extra.get("project_id") or "").strip()
            if project_id and project_id in hidden_project_ids:
                continue
        out.append(row)
        if len(out) >= limit:
            break
    return out


def build_rss_xml(rows: list[dict]) -> str:
    origin = _site_origin()
    feed_url = f"{origin}/rss.xml" if origin else "/rss.xml"
    home_url = origin or "/"
    channel_title = config.FRIENDS_SITE_TITLE or config.SITE_OWNER_NAME
    channel_desc = config.FRIENDS_SITE_DESCRIPTION
    logo_url = config.friends_site_logo_absolute()

    last_build = ""
    if rows:
        last_build = _rss_pub_date(rows[0].get("published_at"))

    items_xml: list[str] = []
    for row in rows:
        slug = row.get("slug") or ""
        if not slug:
            continue
        link = _post_link(slug)
        title = escape((row.get("title") or "").strip() or slug)
        summary = row.get("summary") or ""
        pub = _rss_pub_date(row.get("published_at"))
        db_type = int(row.get("type") or 0)
        category = TYPE_TO_FRONT.get(db_type, "article")

        desc = _plain_description(summary)
        item_parts = [
            "    <item>",
            f"      <title>{title}</title>",
            f"      <link>{escape(link)}</link>",
            f"      <guid isPermaLink=\"true\">{escape(link)}</guid>",
        ]
        if desc:
            item_parts.append(f"      <description>{desc}</description>")
        if pub:
            item_parts.append(f"      <pubDate>{pub}</pubDate>")
        item_parts.append(f"      <category>{escape(category)}</category>")
        item_parts.append("    </item>")
        items_xml.append("\n".join(item_parts))

    channel_bits = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        f"    <title>{escape(channel_title)}</title>",
        f"    <link>{escape(home_url)}</link>",
        f"    <description>{escape(channel_desc)}</description>",
        "    <language>zh-CN</language>",
        f'    <atom:link href="{escape(feed_url)}" rel="self" type="application/rss+xml" />',
    ]
    if logo_url:
        channel_bits.append(f"    <image><url>{escape(logo_url)}</url><title>{escape(channel_title)}</title><link>{escape(home_url)}</link></image>")
    if last_build:
        channel_bits.append(f"    <lastBuildDate>{last_build}</lastBuildDate>")
    channel_bits.extend(items_xml)
    channel_bits.extend(["  </channel>", "</rss>"])
    return "\n".join(channel_bits) + "\n"
