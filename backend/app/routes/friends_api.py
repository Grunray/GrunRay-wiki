from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from app.config import config
from app.db import cursor
from app.friend_captcha import FriendCaptchaError, create_friend_captcha, verify_friend_captcha
from app.friend_link_repo import (
    apply_moderation_action,
    insert_application,
    list_admin,
    list_published,
    update_friend_fields,
)
from app.friend_moderation import FriendModerationError
from app.friend_rate_limit import FriendRateLimitError, check_application_rate_limit, record_application
from app.friend_serialize import application_result, row_to_admin_friend, row_to_friend
from app.friend_special import load_special_links
from app.friend_status import STATUS_PENDING, STATUS_PUBLISHED
from app.friend_validate import FriendValidationError, validate_application, validate_admin_update
from app.site_owner import is_site_owner

bp = Blueprint("friends_api", __name__, url_prefix="/api/friends")

_SESSION_USER_KEY = "message_user"


def _ok(data, message: str = ""):
    return jsonify({"code": 0, "data": data, "message": message})


def _error(message: str, code: int = 1, status: int = 400):
    return jsonify({"code": code, "data": None, "message": message}), status


def _require_site_owner():
    user = session.get(_SESSION_USER_KEY)
    if not user or not user.get("guest_user_id"):
        return None, _error("请先登录", status=401)
    if not is_site_owner(user):
        return None, _error("需要站长权限", status=403)
    return user, None


@bp.get("/captcha")
def get_captcha():
    return _ok(create_friend_captcha())


@bp.get("")
def list_friends():
    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", 1)))
        size = min(max(1, int(request.args.get("size", 50))), 50)
    except ValueError:
        return _error("分页参数无效")

    try:
        with cursor() as cur:
            rows, total = list_published(cur, sort=sort, page=page, size=size)
            items = [row_to_friend(r) for r in rows]
    except Exception:
        return _error("友链列表加载失败", status=500)

    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.get("/special")
def list_special_links():
    return _ok({"items": load_special_links()})


@bp.get("/site-profile")
def site_profile():
    return _ok(
        {
            "title": config.FRIENDS_SITE_TITLE,
            "url": config.FRIENDS_SITE_URL,
            "logo": config.friends_site_logo_absolute(),
            "description": config.FRIENDS_SITE_DESCRIPTION,
        }
    )


@bp.post("/applications")
def create_application():
    body = request.get_json(silent=True) or {}

    try:
        verify_friend_captcha(
            body.get("captchaId"),
            body.get("captchaAnswer"),
        )
    except FriendCaptchaError as e:
        return _error(str(e))

    try:
        check_application_rate_limit(request)
    except FriendRateLimitError as e:
        return _error(str(e), status=429)

    try:
        fields = validate_application(
            site_name=body.get("siteName"),
            site_url=body.get("siteUrl"),
            description=body.get("description"),
            contact_email=body.get("contactEmail"),
            avatar_url=body.get("avatarUrl"),
        )
    except FriendValidationError as e:
        return _error(str(e))

    status = STATUS_PUBLISHED if config.FRIEND_AUTO_PUBLISH else STATUS_PENDING

    try:
        with cursor() as cur:
            row = insert_application(
                cur,
                name=fields["name"],
                url=fields["url"],
                url_normalized=fields["url_normalized"],
                description=fields["description"],
                avatar_url=fields.get("avatar_url"),
                cover_url=fields.get("cover_url"),
                tags=None,
                contact_email=fields["contact_email"],
                status=status,
            )
    except Exception:
        return _error("申请保存失败", status=500)

    record_application(request)

    if status != STATUS_PUBLISHED:
        return _ok(application_result(row), message="申请已提交，等待审核")

    return _ok(application_result(row), message="友链已发布")


@bp.get("/admin")
def list_friends_admin():
    _, err = _require_site_owner()
    if err:
        return err

    status_raw = (request.args.get("status") or "pending").strip().lower()
    status_map = {
        "pending": STATUS_PENDING,
        "published": STATUS_PUBLISHED,
        "hidden": 2,
        "rejected": 3,
    }
    status: int | None
    if status_raw == "all":
        status = None
    else:
        status = status_map.get(status_raw, STATUS_PENDING)

    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", 1)))
        size = min(
            max(1, int(request.args.get("size", config.FRIEND_ADMIN_PAGE_SIZE))),
            50,
        )
    except ValueError:
        return _error("分页参数无效")

    try:
        with cursor() as cur:
            rows, total = list_admin(cur, status=status, sort=sort, page=page, size=size)
            items = [row_to_admin_friend(r) for r in rows]
    except Exception:
        return _error("审核列表加载失败", status=500)

    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.patch("/admin/<public_id>")
def moderate_friend(public_id: str):
    _, err = _require_site_owner()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    action = body.get("action")
    pid = public_id.strip()

    update_keys = ("name", "url", "description", "avatarUrl", "contactEmail", "sortOrder")
    has_update = any(k in body for k in update_keys)

    try:
        with cursor() as cur:
            row = None
            if has_update:
                fields = validate_admin_update(body)
                row = update_friend_fields(cur, pid, fields)
            if action and isinstance(action, str):
                row = apply_moderation_action(cur, pid, action)
            if row is None:
                return _error("请指定审核动作 action 或要更新的字段")
    except FriendValidationError as e:
        return _error(str(e))
    except FriendModerationError as e:
        return _error(str(e))
    except Exception:
        return _error("操作失败", status=500)

    return _ok(row_to_admin_friend(row), message="操作成功")
