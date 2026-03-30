from __future__ import annotations

import json
from typing import Any

from flask import Blueprint, jsonify, request

from app.db import cursor
from app.search import passes_scheme_c, score_post, split_terms
from app.serialize import row_to_post

bp = Blueprint("api", __name__, url_prefix="/api")

# 前端 type 字符串 → DB type int
FRONT_TO_DB_TYPE = {"article": 0, "project_note": 1, "algorithm": 2}


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


@bp.get("/health")
def health():
    return jsonify({"ok": True})


@bp.get("/posts")
def list_posts():
    type_param = request.args.get("type")
    project_id = request.args.get("project_id")

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
        out.append(row_to_post(row, include_body=False))

    return jsonify({"posts": out})


@bp.get("/posts/<slug>")
def get_post(slug: str):
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

    return jsonify(row_to_post(row, include_body=True))


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
