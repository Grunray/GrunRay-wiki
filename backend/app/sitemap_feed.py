"""sitemap.xml + robots.txt：供搜索引擎 / AI 爬虫发现站点页面。

可见性与博客列表 / RSS 一致：post 需 published_at 非空、排除隐藏项目笔记；
项目排除 hidden（status=2）。origin 取 config 的站点域名。
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from xml.sax.saxutils import escape

from app.config import config
from app.rss_feed import _parse_extra

PROJECT_STATUS_HIDDEN = 2
DEFAULT_MAX_URLS = 1000

# 静态页面：(路径, changefreq, priority)
STATIC_PAGES: list[tuple[str, str, str]] = [
    ("/", "daily", "1.0"),
    ("/blog", "daily", "0.9"),
    ("/projects", "weekly", "0.9"),
    ("/fragments", "daily", "0.7"),
    ("/recommend", "weekly", "0.6"),
    ("/friends", "weekly", "0.5"),
    ("/about", "monthly", "0.6"),
    ("/messages", "weekly", "0.4"),
]


def _site_origin() -> str:
    return (config.FRIENDS_SITE_URL or config.FRONTEND_ORIGIN or "").rstrip("/")


def _w3c_date(value: Any) -> str:
    """转 W3C Date（YYYY-MM-DD）；失败返回空串。"""
    if value is None:
        return ""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return ""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return ""


def fetch_sitemap_rows(cur, *, limit: int = DEFAULT_MAX_URLS) -> dict[str, Any]:
    cur.execute(
        """
        SELECT slug, type, published_at, updated_at, extra
        FROM post
        WHERE published_at IS NOT NULL
        ORDER BY published_at DESC, id DESC
        LIMIT %s
        """,
        (limit,),
    )
    posts = cur.fetchall() or []

    cur.execute(
        "SELECT public_id FROM wiki_project WHERE status = %s",
        (PROJECT_STATUS_HIDDEN,),
    )
    hidden_ids = {r["public_id"] for r in (cur.fetchall() or [])}

    cur.execute(
        "SELECT slug, start_date FROM wiki_project WHERE status != %s ORDER BY start_date IS NULL, start_date DESC",
        (PROJECT_STATUS_HIDDEN,),
    )
    projects = cur.fetchall() or []

    return {"posts": posts, "projects": projects, "hidden_ids": hidden_ids}


def _url_block(loc: str, lastmod: str, freq: str, prio: str) -> str:
    parts = ["  <url>", f"    <loc>{loc}</loc>"]
    if lastmod:
        parts.append(f"    <lastmod>{lastmod}</lastmod>")
    parts.append(f"    <changefreq>{freq}</changefreq>")
    parts.append(f"    <priority>{prio}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


def build_sitemap_xml(data: dict) -> str:
    origin = _site_origin()

    def loc(path: str) -> str:
        return escape(f"{origin}{path}" if origin else path)

    urls: list[str] = []

    for path, freq, prio in STATIC_PAGES:
        urls.append(_url_block(loc(path), "", freq, prio))

    hidden_ids = data.get("hidden_ids") or set()
    for row in data.get("posts") or []:
        slug = (row.get("slug") or "").strip()
        if not slug:
            continue
        if int(row.get("type") or 0) == 1:
            extra = _parse_extra(row)
            pid = str(extra.get("project_id") or "").strip()
            if pid and pid in hidden_ids:
                continue
        lastmod = _w3c_date(row.get("updated_at") or row.get("published_at"))
        urls.append(_url_block(loc(f"/blog/{slug}"), lastmod, "weekly", "0.8"))

    for row in data.get("projects") or []:
        slug = (row.get("slug") or "").strip()
        if not slug:
            continue
        lastmod = _w3c_date(row.get("start_date"))
        urls.append(_url_block(loc(f"/projects/{slug}"), lastmod, "monthly", "0.7"))

    head = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    return "\n".join(head + urls + ["</urlset>"]) + "\n"


def build_robots_txt() -> str:
    origin = _site_origin()
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
    ]
    if origin:
        lines.append(f"Sitemap: {origin}/sitemap.xml")
    return "\n".join(lines) + "\n"
