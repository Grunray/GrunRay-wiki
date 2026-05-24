"""站长：碎念 / 栖息页面 import 写入与媒体上传。"""
from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request, session

from app.about_md import validate_about_meta
from app.about_serialize import api_to_profile
from app.recommend_md import validate_recommend_meta
from app.site_owner import is_site_owner
from app.xiqi_md_write import (
    render_about_markdown,
    render_fragment_markdown,
    render_recommend_markdown,
    render_xiqi_page_markdown,
)
from app.xiqi_paths import (
    ABOUT_RESUME_FILENAME,
    ALLOWED_XIQI_PAGES,
    IMPORT_XIQI_ABOUT,
    IMPORT_XIQI_FRAGMENTS,
    IMPORT_XIQI_PAGES,
    IMPORT_XIQI_RECOMMENDATIONS,
    media_dir_for_scope,
    media_url_for_scope,
)

bp = Blueprint("xiqi_admin_api", __name__, url_prefix="/api")

_SESSION_USER_KEY = "message_user"
_IMPORT_FRAGMENTS_HINT = "python scripts/xiqi_tools/import_xiqi.py fragments"
_IMPORT_PAGES_HINT = "python scripts/xiqi_tools/import_xiqi.py pages"
_IMPORT_ABOUT_HINT = "python scripts/xiqi_tools/import_xiqi.py about"
_IMPORT_RECOMMENDATIONS_HINT = "python scripts/xiqi_tools/import_xiqi.py recommendations"

_ALLOWED_EXT = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})
_ALLOWED_MOODS = frozenset({"rant", "sketch", "flash", "daily"})
_ALLOWED_CATEGORIES = frozenset({"software", "opensource", "anime"})
_ALLOWED_FRAGMENT_STATUS = frozenset({"published", "hidden", "draft"})
_ALLOWED_RECOMMEND_STATUS = frozenset({"published", "hidden", "draft"})
_ALLOWED_PAGE_STATUS = frozenset({"published", "hidden"})
_ALLOWED_ABOUT_STATUS = frozenset({"published", "hidden"})


def _ok(data, message: str = ""):
    return jsonify({"code": 0, "data": data, "message": message})


def _error(message: str, code: int = 1, status: int = 400):
    return jsonify({"code": code, "data": None, "message": message}), status


def _require_user():
    user = session.get(_SESSION_USER_KEY)
    if not user or not user.get("guest_user_id"):
        return None
    return user


def _require_site_owner():
    user = _require_user()
    if not user:
        return None, _error("请先登录", status=401)
    if not is_site_owner(user):
        return None, _error("需要站长权限", status=403)
    return user, None


def _save_upload(scope: str) -> tuple[dict | None, tuple | None]:
    _, err = _require_site_owner()
    if err:
        return None, err

    scope = (scope or "").strip().strip("/")
    try:
        dest_dir = media_dir_for_scope(scope)
    except ValueError as e:
        return None, _error(str(e))

    file = request.files.get("file")
    if not file or not file.filename:
        return None, _error("缺少 file 字段")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_EXT:
        return None, _error(f"不支持的文件类型: {suffix}")

    dest_dir.mkdir(parents=True, exist_ok=True)
    save_name = f"{uuid.uuid4().hex}{suffix}"
    dst = dest_dir / save_name
    file.save(dst)

    url = media_url_for_scope(scope, save_name)
    alt = (request.form.get("alt") or "").strip()
    return {"url": url, "alt": alt}, None


@bp.post("/xiqi/media")
def upload_xiqi_media():
    scope = request.args.get("scope") or request.form.get("scope") or ""
    data, err = _save_upload(scope)
    if err:
        return err
    return _ok(data)


@bp.post("/fragments/media")
def upload_fragment_media_legacy():
    """兼容计划路径；等价于 scope=fragments。"""
    data, err = _save_upload("fragments")
    if err:
        return err
    return _ok(data)


@bp.post("/fragments/import-file")
def save_fragment_import_file():
    _, err = _require_site_owner()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    public_id = (payload.get("publicId") or payload.get("public_id") or "").strip()
    if not public_id:
        public_id = f"frag-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"
    mood = (payload.get("mood") or "daily").strip().lower()
    status = (payload.get("status") or "draft").strip().lower()
    created_at = (payload.get("createdAt") or payload.get("created_at") or "").strip()
    if not created_at:
        created_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    body = (payload.get("bodyMarkdown") or payload.get("body") or "").strip()
    images_raw = payload.get("images") or []
    cover_index = int(payload.get("coverIndex") if payload.get("coverIndex") is not None else payload.get("cover_index", 0))

    if mood not in _ALLOWED_MOODS:
        return _error(f"mood 必须是 {sorted(_ALLOWED_MOODS)}")
    if status not in _ALLOWED_FRAGMENT_STATUS:
        return _error(f"status 必须是 {sorted(_ALLOWED_FRAGMENT_STATUS)}")
    if not body:
        return _error("正文不能为空")

    images: list[dict[str, str]] = []
    if isinstance(images_raw, list):
        for item in images_raw:
            if isinstance(item, dict) and item.get("url"):
                images.append({"url": str(item["url"]), "alt": str(item.get("alt") or "")})

    if images and (cover_index < 0 or cover_index >= len(images)):
        cover_index = 0

    md_text = render_fragment_markdown(
        public_id=public_id,
        mood=mood,
        status=status,
        created_at=created_at,
        images=images,
        cover_index=cover_index,
        body=body,
    )

    IMPORT_XIQI_FRAGMENTS.mkdir(parents=True, exist_ok=True)
    md_path = IMPORT_XIQI_FRAGMENTS / f"{public_id}.md"
    md_path.write_text(md_text, encoding="utf-8")

    return _ok(
        {
            "publicId": public_id,
            "path": str(md_path.relative_to(md_path.parents[2])),
            "importCommand": _IMPORT_FRAGMENTS_HINT,
        },
        message=f"已保存至 import，请运行 {_IMPORT_FRAGMENTS_HINT}",
    )


@bp.post("/xiqi/pages/import-file")
def save_xiqi_page_import_file():
    _, err = _require_site_owner()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    page = (payload.get("page") or "").strip().lower()
    if page not in ALLOWED_XIQI_PAGES:
        return _error(f"page 必须是 {sorted(ALLOWED_XIQI_PAGES)}")

    status = (payload.get("status") or "published").strip().lower()
    if status not in _ALLOWED_PAGE_STATUS:
        return _error(f"status 必须是 {sorted(_ALLOWED_PAGE_STATUS)}")

    hero_image_url = (payload.get("heroImageUrl") or payload.get("hero_image_url") or "").strip() or None
    hero_image_alt = (payload.get("heroImageAlt") or payload.get("hero_image_alt") or "").strip()

    md_text = render_xiqi_page_markdown(
        page=page,
        hero_image_url=hero_image_url,
        hero_image_alt=hero_image_alt,
        status=status,
    )

    IMPORT_XIQI_PAGES.mkdir(parents=True, exist_ok=True)
    md_path = IMPORT_XIQI_PAGES / f"{page}.md"
    md_path.write_text(md_text, encoding="utf-8")

    return _ok(
        {
            "page": page,
            "path": str(md_path.relative_to(md_path.parents[2])),
            "importCommand": _IMPORT_PAGES_HINT,
        },
        message=f"已保存至 import，请运行 {_IMPORT_PAGES_HINT}",
    )


@bp.post("/xiqi/about/import-file")
def save_about_import_file():
    _, err = _require_site_owner()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    status = (payload.get("status") or "published").strip().lower()
    if status not in _ALLOWED_ABOUT_STATUS:
        return _error(f"status 必须是 {sorted(_ALLOWED_ABOUT_STATUS)}")

    note = (payload.get("note") or "").strip()
    profile = api_to_profile(payload)

    try:
        meta = {
            "status": status,
            "alias": profile["alias"],
            "gender_age": profile["gender_age"],
            "email": profile["email"],
            "intro": profile["intro"],
            "awards": profile["awards"],
            "education": profile["education"],
            "internship": profile["internship"],
            "club": profile["club"],
            "certificates": profile["certificates"],
        }
        validated = validate_about_meta(meta, note, Path(ABOUT_RESUME_FILENAME))
    except ValueError as e:
        return _error(str(e))

    md_text = render_about_markdown(
        profile=validated["profile"],
        status=validated["status"],
        note=note,
    )

    IMPORT_XIQI_ABOUT.mkdir(parents=True, exist_ok=True)
    md_path = IMPORT_XIQI_ABOUT / ABOUT_RESUME_FILENAME
    md_path.write_text(md_text, encoding="utf-8")

    return _ok(
        {
            "path": str(md_path.relative_to(md_path.parents[2])),
            "importCommand": _IMPORT_ABOUT_HINT,
        },
        message=f"已保存至 import，请运行 {_IMPORT_ABOUT_HINT}",
    )


@bp.post("/recommendations/media")
def upload_recommendation_media():
    """上传推荐配图；等价于 scope=recommendations。"""
    data, err = _save_upload("recommendations")
    if err:
        return err
    return _ok(data)


@bp.post("/recommendations/import-file")
def save_recommendation_import_file():
    _, err = _require_site_owner()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    public_id = (payload.get("publicId") or payload.get("public_id") or "").strip()
    if not public_id:
        public_id = f"rec-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"
    category = (payload.get("category") or "software").strip().lower()
    status = (payload.get("status") or "draft").strip().lower()
    title = (payload.get("title") or "").strip()
    created_at = (payload.get("createdAt") or payload.get("created_at") or "").strip()
    if not created_at:
        created_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    body = (payload.get("bodyMarkdown") or payload.get("body") or "").strip()
    summary = (payload.get("summary") or "").strip()
    url = (payload.get("url") or "").strip() or None
    try:
        rating = int(payload.get("rating") if payload.get("rating") is not None else 5)
    except (TypeError, ValueError):
        return _error("rating 必须是 1–5 的整数")
    images_raw = payload.get("images") or []
    cover_index = int(
        payload.get("coverIndex") if payload.get("coverIndex") is not None else payload.get("cover_index", 0)
    )

    if category not in _ALLOWED_CATEGORIES:
        return _error(f"category 必须是 {sorted(_ALLOWED_CATEGORIES)}")
    if status not in _ALLOWED_RECOMMEND_STATUS:
        return _error(f"status 必须是 {sorted(_ALLOWED_RECOMMEND_STATUS)}")
    if not title:
        return _error("title 不能为空")
    if not body:
        return _error("正文不能为空")
    if rating < 1 or rating > 5:
        return _error("rating 必须是 1–5")

    images: list[dict[str, str]] = []
    if isinstance(images_raw, list):
        for item in images_raw:
            if isinstance(item, dict) and item.get("url"):
                images.append({"url": str(item["url"]), "alt": str(item.get("alt") or "")})

    if images and (cover_index < 0 or cover_index >= len(images)):
        cover_index = 0

    try:
        meta = {
            "public_id": public_id,
            "category": category,
            "rating": rating,
            "title": title,
            "status": status,
            "created_at": created_at,
            "url": url,
            "summary": summary,
            "images": images,
            "cover_index": cover_index,
        }
        validated = validate_recommend_meta(meta, body, Path(f"{public_id}.md"))
    except ValueError as e:
        return _error(str(e))

    md_text = render_recommend_markdown(
        public_id=validated["public_id"],
        category=validated["category"],
        rating=validated["rating"],
        title=validated["title"],
        status=validated["status"],
        created_at=created_at,
        url=validated.get("url"),
        summary=validated["summary"],
        images=validated["images"],
        cover_index=validated["cover_index"],
        body=validated["body"],
    )

    IMPORT_XIQI_RECOMMENDATIONS.mkdir(parents=True, exist_ok=True)
    md_path = IMPORT_XIQI_RECOMMENDATIONS / f"{validated['public_id']}.md"
    md_path.write_text(md_text, encoding="utf-8")

    return _ok(
        {
            "publicId": validated["public_id"],
            "path": str(md_path.relative_to(md_path.parents[2])),
            "importCommand": _IMPORT_RECOMMENDATIONS_HINT,
        },
        message=f"已保存至 import，请运行 {_IMPORT_RECOMMENDATIONS_HINT}",
    )


@bp.post("/xiqi/hero-media")
def upload_hero_media_legacy():
    """上传 hero 图并返回 URL；scope=pages/{page}。"""
    page = (request.args.get("page") or request.form.get("page") or "").strip().lower()
    if page not in ALLOWED_XIQI_PAGES:
        return _error(f"page 必须是 {sorted(ALLOWED_XIQI_PAGES)}")
    data, err = _save_upload(f"pages/{page}")
    if err:
        return err
    return _ok({**data, "page": page})
