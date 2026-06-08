from __future__ import annotations

import json
from typing import Any

from flask import Blueprint, jsonify, request, send_from_directory

from app.config import config
from app.db import cursor
from app.markdown_util import render_markdown_to_html
from app.search import passes_scheme_c, score_post, split_terms
from app.project_serialize import row_to_project
from app.serialize import row_to_post

bp = Blueprint("api", __name__, url_prefix="/api")

# 前端 type 字符串 → DB type int
FRONT_TO_DB_TYPE = {"article": 0, "project_note": 1, "algorithm": 2}
FILMFEED_FOLDER_WHITELIST = "film/homeView/right_panel"

# wiki_project.status（与 import 脚本 STATUS_MAP 一致）
PROJECT_STATUS_ARCHIVED = 1
PROJECT_STATUS_HIDDEN = 2


def _fetch_all_posts(cur) -> list[dict]:
    cur.execute(
        """
        SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
               views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
        FROM post
        ORDER BY published_at IS NULL, published_at DESC, id DESC
        """
    )
    return cur.fetchall()


def _parse_keywords(row: dict) -> list[Any]:
    k = row.get("keywords")
    if k is None:
        return []
    if isinstance(k, str):
        try:
            k = json.loads(k)
        except json.JSONDecodeError:
            return []
    return list(k) if isinstance(k, list) else []


def _parse_extra(row: dict) -> dict:
    e = row.get("extra")
    if e is None:
        return {}
    if isinstance(e, str):
        try:
            e = json.loads(e)
        except json.JSONDecodeError:
            return {}
    return e if isinstance(e, dict) else {}


def _ok(data: Any, message: str = ""):
    return jsonify({"code": 0, "data": data, "message": message})


def _error(message: str, code: int = 1, status: int = 400):
    return jsonify({"code": code, "data": [], "message": message}), status


def _merge_related_posts(cur, public_id: str, related_posts_json_raw: Any) -> list[dict[str, Any]]:
    """手动 related_posts_json + 自动 project_note 合并，供详情页展示。"""
    manual_refs: list[dict[str, Any]] = []
    raw = related_posts_json_raw
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            raw = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and (item.get("slug") or "").strip():
                manual_refs.append(
                    {
                        "slug": str(item["slug"]).strip(),
                        "label": str(item["label"]).strip() if item.get("label") else None,
                        "pinned": bool(item.get("pinned")),
                    }
                )

    cur.execute(
        """
        SELECT slug, title, published_at
        FROM post
        WHERE type = %s
          AND JSON_UNQUOTE(JSON_EXTRACT(extra, '$.project_id')) = %s
        ORDER BY published_at IS NULL, published_at DESC, id DESC
        """,
        (FRONT_TO_DB_TYPE["project_note"], public_id),
    )
    auto_rows = cur.fetchall() or []

    seen: set[str] = set()
    merged: list[dict[str, Any]] = []

    for ref in manual_refs:
        slug = ref["slug"]
        if slug in seen:
            continue
        seen.add(slug)
        cur.execute(
            "SELECT title, published_at FROM post WHERE slug = %s LIMIT 1",
            (slug,),
        )
        prow = cur.fetchone()
        title = (prow.get("title") or "") if prow else ""
        merged.append(
            {
                "slug": slug,
                "title": title,
                "label": ref.get("label"),
                "pinned": ref["pinned"],
                "source": "manual",
                "published_at": str(prow.get("published_at") or "") if prow else "",
            }
        )

    for row in auto_rows:
        slug = row["slug"]
        if slug in seen:
            continue
        seen.add(slug)
        merged.append(
            {
                "slug": slug,
                "title": row.get("title") or "",
                "label": None,
                "pinned": False,
                "source": "auto",
                "published_at": str(row.get("published_at") or ""),
            }
        )

    manual_items = [x for x in merged if x["source"] == "manual"]
    auto_items = [x for x in merged if x["source"] == "auto"]
    manual_items.sort(key=lambda x: (0 if x.get("pinned") else 1,))
    auto_items.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return manual_items + auto_items


@bp.get("/health")
def health():
    return jsonify({"ok": True})


@bp.get("/posts")
def list_posts():
    type_param = request.args.get("type")
    project_id = request.args.get("project_id")
    category_id_param = request.args.get("category_id")
    category_id: int | None = None
    if category_id_param is not None and category_id_param.strip():
        try:
            category_id = int(category_id_param)
        except ValueError:
            return _error("invalid category_id")

    with cursor() as cur:
        rows = _fetch_all_posts(cur)

    out = []
    for row in rows:
        db_type = int(row["type"])
        extra = _parse_extra(row)
        if type_param:
            want = FRONT_TO_DB_TYPE.get(type_param)
            if want is None or db_type != want:
                continue
        if project_id:
            if db_type != 1 or extra.get("project_id") != project_id:
                continue
        if category_id is not None and int(row.get("category_id") or 0) != category_id:
            continue
        out.append(row_to_post(row, include_body=False))

    return jsonify({"posts": out})


@bp.get("/posts/latest-updated")
def latest_updated_post():
    with cursor() as cur:
        cur.execute(
            """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post
            ORDER BY COALESCE(updated_at, published_at, created_at) DESC, id DESC
            LIMIT 3
            """
        )
        rows = cur.fetchall()

    posts = [row_to_post(row, include_body=False) for row in rows]
    return jsonify({"posts": posts})


@bp.get("/posts/random-recommend")
def random_recommend_post():
    with cursor() as cur:
        cur.execute(
            """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post
            ORDER BY RAND()
            LIMIT 1
            """
        )
        row = cur.fetchone()

    if not row:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"post": row_to_post(row, include_body=False)})


@bp.get("/posts/<slug>")
def get_post(slug: str):
    want_html = request.args.get("html", "").lower() in ("1", "true", "yes")

    with cursor() as cur:
        cur.execute(
            """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post WHERE slug = %s
            """,
            (slug,),
        )
        row = cur.fetchone()

    if not row:
        return jsonify({"error": "not_found"}), 404

    data = row_to_post(row, include_body=True)
    if want_html:
        data["body_html"] = render_markdown_to_html(data.get("body") or "")
    return jsonify(data)


@bp.get("/search")
def search():
    q = request.args.get("q", "")
    terms = split_terms(q)
    if not terms:
        return jsonify({"query": q, "results": []})

    with cursor() as cur:
        rows = _fetch_all_posts(cur)

    scored: list[tuple[float, dict]] = []
    for row in rows:
        title = row.get("title") or ""
        summary = row.get("summary") or ""
        keywords = _parse_keywords(row)
        if not passes_scheme_c(terms, title, summary, keywords):
            continue
        sc = score_post(terms, title, summary, keywords, int(row.get("views") or 0))
        scored.append((sc, row))

    scored.sort(key=lambda x: (-x[0], -int(x[1].get("views") or 0), x[1].get("published_at") or ""))

    results = [row_to_post(r, include_body=False) for _, r in scored]
    return jsonify({"query": q, "results": results})


@bp.get("/posts/<slug>/related")
def related(slug: str):
    limit = request.args.get("limit", "5")
    try:
        lim = max(1, min(20, int(limit)))
    except ValueError:
        lim = 5

    with cursor() as cur:
        cur.execute(
            """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post WHERE slug = %s
            """,
            (slug,),
        )
        current = cur.fetchone()
        if not current:
            return jsonify({"error": "not_found"}), 404
        cur.execute(
            """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post WHERE slug <> %s
            """,
            (slug,),
        )
        others = cur.fetchall()

    cur_kw = set(str(x) for x in _parse_keywords(current))
    ranked: list[tuple[int, int, dict]] = []
    for row in others:
        okw = set(str(x) for x in _parse_keywords(row))
        inter = len(cur_kw & okw)
        ranked.append((inter, int(row.get("views") or 0), row))

    ranked.sort(key=lambda x: (-x[0], -x[1], x[2].get("published_at") or ""))
    top = [row_to_post(r, include_body=False) for _, _, r in ranked[:lim]]
    return jsonify({"posts": top})


@bp.get("/media/files/<path:filename>")
def media_file(filename: str):
    media_dir = config.CONTENT_ROOT / "media"
    from app.media_webp import maybe_webp_response

    webp = maybe_webp_response(media_dir, filename, request)
    if webp is not None:
        return webp
    return send_from_directory(str(media_dir), filename)


@bp.get("/media/list")
def media_list():
    try:
        page = max(1, int(request.args.get("page", "1")))
        size = max(1, min(100, int(request.args.get("size", "20"))))
    except ValueError:
        return _error("invalid page/size")

    media_type = (request.args.get("type") or "").strip().lower()
    tag = (request.args.get("tag") or "").strip()
    article_id = request.args.get("article_id")
    folder = (request.args.get("folder") or "").strip().strip("/")
    offset = (page - 1) * size

    where = []
    params: list[Any] = []
    if media_type:
        where.append("type = %s")
        params.append(media_type)
    if article_id:
        try:
            aid = int(article_id)
            where.append("article_id = %s")
            params.append(aid)
        except ValueError:
            return _error("invalid article_id")
    if tag:
        where.append("JSON_SEARCH(tags, 'one', %s) IS NOT NULL")
        params.append(tag)
    if folder:
        # 严格按导入目录过滤，例如 folder=film/homeView/right_panel
        where.append("url LIKE %s")
        params.append(f"/api/media/files/{folder}/%")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    with cursor() as cur:
        cur.execute(
            f"""
            SELECT id, url, type, title, article_id, tags, created_at
            FROM media
            {where_sql}
            ORDER BY created_at DESC, id DESC
            LIMIT %s OFFSET %s
            """,
            (*params, size, offset),
        )
        rows = cur.fetchall()

    out = []
    for row in rows:
        tags = row.get("tags")
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except json.JSONDecodeError:
                tags = []
        out.append(
            {
                "id": row["id"],
                "url": row["url"],
                "type": row["type"],
                "title": row.get("title"),
                "article_id": row.get("article_id"),
                "tags": tags if isinstance(tags, list) else [],
                "created_at": str(row.get("created_at") or ""),
            }
        )
    return _ok(out)


def _parse_tags_json(tags: Any) -> list[Any]:
    if tags is None:
        return []
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except json.JSONDecodeError:
            return []
    return list(tags) if isinstance(tags, list) else []


@bp.get("/music/tracks")
def music_tracks():
    try:
        page = max(1, int(request.args.get("page", "1")))
        size = max(1, min(100, int(request.args.get("size", "50"))))
    except ValueError:
        return _error("invalid page/size")

    tag = (request.args.get("tag") or "").strip()
    post_id = request.args.get("post_id")
    offset = (page - 1) * size

    where: list[str] = []
    params: list[Any] = []
    if post_id is not None and str(post_id).strip() != "":
        try:
            pid = int(post_id)
            where.append("post_id = %s")
            params.append(pid)
        except ValueError:
            return _error("invalid post_id")
    if tag:
        where.append("JSON_SEARCH(tags, 'one', %s) IS NOT NULL")
        params.append(tag)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    with cursor() as cur:
        cur.execute(
            f"""
            SELECT id, url, title, artist, duration_sec, post_id, tags, sort_order, created_at, updated_at
            FROM music_track
            {where_sql}
            ORDER BY sort_order ASC, id ASC
            LIMIT %s OFFSET %s
            """,
            (*params, size, offset),
        )
        rows = cur.fetchall()

    out = []
    for row in rows:
        out.append(
            {
                "id": row["id"],
                "url": row["url"],
                "title": row.get("title"),
                "artist": row.get("artist"),
                "duration_sec": row.get("duration_sec"),
                "post_id": row.get("post_id"),
                "tags": _parse_tags_json(row.get("tags")),
                "sort_order": int(row.get("sort_order") or 0),
                "created_at": str(row.get("created_at") or ""),
                "updated_at": str(row.get("updated_at") or ""),
            }
        )
    return _ok(out)


@bp.get("/media/list/filmfeed")
def media_list_filmfeed():
    """FilmFeed 专用白名单接口：仅允许 right_panel 目录。"""
    try:
        page = max(1, int(request.args.get("page", "1")))
        size = max(1, min(100, int(request.args.get("size", "50"))))
    except ValueError:
        return _error("invalid page/size")

    offset = (page - 1) * size
    with cursor() as cur:
        cur.execute(
            """
            SELECT id, url, type, title, article_id, tags, created_at
            FROM media
            WHERE url LIKE %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s OFFSET %s
            """,
            (f"/api/media/files/{FILMFEED_FOLDER_WHITELIST}/%", size, offset),
        )
        rows = cur.fetchall()

    out = []
    for row in rows:
        tags = row.get("tags")
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except json.JSONDecodeError:
                tags = []
        out.append(
            {
                "id": row["id"],
                "url": row["url"],
                "type": row["type"],
                "title": row.get("title"),
                "article_id": row.get("article_id"),
                "tags": tags if isinstance(tags, list) else [],
                "created_at": str(row.get("created_at") or ""),
            }
        )
    return _ok(out)


@bp.get("/projects")
def list_projects():
    """项目时间线列表：不含 hidden；可选排除 archived。"""
    include_archived = request.args.get("include_archived", "true").lower() in ("1", "true", "yes")
    where = ["status <> %s"]
    params: list[Any] = [PROJECT_STATUS_HIDDEN]
    if not include_archived:
        where.append("status <> %s")
        params.append(PROJECT_STATUS_ARCHIVED)
    where_sql = " AND ".join(where)
    with cursor() as cur:
        cur.execute(
            f"""
            SELECT id, public_id, slug, locale, title, summary, tags, status, featured, year,
                   start_date, end_date, github_url, demo_url, layout, related_posts_json
            FROM wiki_project
            WHERE {where_sql}
            ORDER BY start_date IS NULL, start_date DESC, id DESC
            """,
            params,
        )
        rows = cur.fetchall() or []
    projects = [row_to_project(dict(r)) for r in rows]
    return jsonify({"projects": projects})


@bp.get("/projects/<slug>")
def get_project(slug: str):
    """项目详情：hidden 视为不可访问；返回 related_posts（手动 + 自动合并）。"""
    with cursor() as cur:
        cur.execute(
            """
            SELECT id, public_id, slug, locale, title, summary, tags, status, featured, year,
                   start_date, end_date, github_url, demo_url, layout, related_posts_json
            FROM wiki_project
            WHERE slug = %s
            LIMIT 1
            """,
            (slug,),
        )
        row = cur.fetchone()
        if not row or int(row["status"]) == PROJECT_STATUS_HIDDEN:
            return jsonify({"error": "not_found"}), 404
        related = _merge_related_posts(cur, row["public_id"], row.get("related_posts_json"))

    data = row_to_project(dict(row))
    data.pop("related_posts_json", None)
    data["related_posts"] = related
    return jsonify(data)
