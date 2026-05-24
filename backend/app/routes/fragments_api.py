from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.about_md import parse_about_markdown, validate_about_meta
from app.about_repo import get_about
from app.about_serialize import profile_to_api
from app.config import config
from app.db import cursor
from app.fragment_repo import get_by_public_id, list_published
from app.fragment_serialize import row_to_fragment, row_to_fragment_detail, row_to_xiqi_page
from app.markdown_util import render_markdown_to_html
from app.recommend_repo import get_by_public_id as get_recommend_by_public_id
from app.recommend_repo import list_published as list_recommendations_published
from app.recommend_serialize import row_to_recommend, row_to_recommend_detail
from app.xiqi_page_repo import get_page

bp = Blueprint("fragments_api", __name__, url_prefix="/api")


def _ok(data, message: str = ""):
    return jsonify({"code": 0, "data": data, "message": message})


def _error(message: str, code: int = 1, status: int = 400):
    return jsonify({"code": code, "data": None, "message": message}), status


def _read_body_md(md_url: str) -> str:
    path = config.CONTENT_ROOT / md_url
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


@bp.get("/fragments")
def list_fragments():
    mood = (request.args.get("mood") or "").strip().lower() or None
    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", "1")))
        size = max(1, min(50, int(request.args.get("size", "50"))))
    except ValueError:
        return _error("invalid page/size")

    with cursor() as cur:
        rows, total = list_published(cur, mood=mood, sort=sort, page=page, size=size)

    items = [row_to_fragment(dict(r)) for r in rows]
    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.get("/fragments/<public_id>")
def get_fragment(public_id: str):
    with cursor() as cur:
        row = get_by_public_id(cur, public_id)
        if not row or row.get("status") != "published":
            return _error("not_found", status=404)
        body = _read_body_md(row["md_url"])

    body_html = render_markdown_to_html(body)
    data = row_to_fragment_detail(dict(row), body, body_html)
    return _ok(data)


@bp.get("/xiqi/pages/<page>")
def get_xiqi_page_config(page: str):
    page = page.strip().lower()
    with cursor() as cur:
        row = get_page(cur, page)
    if not row or row.get("status") != "published":
        return _ok(row_to_xiqi_page({"page": page, "hero_image_url": None, "hero_image_alt": "", "status": "published"}))
    return _ok(row_to_xiqi_page(dict(row)))


@bp.get("/xiqi/about")
def get_xiqi_about():
    with cursor() as cur:
        row = get_about(cur)
    if not row or row.get("status") != "published":
        return _ok(None)

    md_path = config.CONTENT_ROOT / row["md_url"]
    if not md_path.is_file():
        return _ok(None)

    try:
        meta, body = parse_about_markdown(md_path)
        validated = validate_about_meta(meta, body, md_path)
    except ValueError:
        return _ok(None)

    data = profile_to_api(validated["profile"], updated_at=row.get("updated_at"))
    return _ok(data)


@bp.get("/recommendations")
def list_recommendations():
    category = (request.args.get("category") or "").strip().lower() or None
    if category and category not in ("software", "opensource", "anime"):
        return _error("invalid category")
    rating_raw = (request.args.get("rating") or "").strip()
    rating: int | None = None
    if rating_raw:
        try:
            rating = int(rating_raw)
            if rating < 1 or rating > 5:
                raise ValueError
        except ValueError:
            return _error("invalid rating")
    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", "1")))
        size = max(1, min(50, int(request.args.get("size", "50"))))
    except ValueError:
        return _error("invalid page/size")

    with cursor() as cur:
        rows, total = list_recommendations_published(
            cur, category=category, rating=rating, sort=sort, page=page, size=size
        )

    items = [row_to_recommend(dict(r)) for r in rows]
    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.get("/recommendations/<public_id>")
def get_recommendation(public_id: str):
    with cursor() as cur:
        row = get_recommend_by_public_id(cur, public_id)
        if not row or row.get("status") != "published":
            return _error("not_found", status=404)
        body = _read_body_md(row["md_url"])

    body_html = render_markdown_to_html(body)
    data = row_to_recommend_detail(dict(row), body, body_html)
    return _ok(data)
