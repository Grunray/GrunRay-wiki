from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from app.config import config
from app.db import cursor
from app.guest_message_repo import (
    apply_moderation_action,
    block_author_of_message,
    delete_message_tree,
    get_owner_reply,
    get_top_by_public_id,
    insert_message,
    insert_owner_reply,
    list_admin,
    list_published,
)
from app.guest_user_repo import is_guest_user_blocked
from app.message_captcha import CaptchaError, create_math_captcha, verify_captcha
from app.message_moderation import ModerationError
from app.message_rate_limit import (
    RateLimitError,
    check_ip_cooldown,
    check_owner_reply_cooldown,
    check_user_hourly_limit,
    record_ip_post,
    record_owner_reply,
    record_user_post,
)
from app.message_serialize import row_to_admin_message, row_to_message
from app.message_status import STATUS_PENDING, STATUS_PUBLISHED
from app.message_validate import ValidationError, validate_content
from app.site_owner import is_site_owner

bp = Blueprint("messages_api", __name__, url_prefix="/api/messages")

_SESSION_USER_KEY = "message_user"


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


@bp.get("/captcha")
def get_captcha():
    return _ok(create_math_captcha())


@bp.get("/admin")
def list_messages_admin():
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
    status = status_map.get(status_raw, STATUS_PENDING)

    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", 1)))
        size = min(
            max(1, int(request.args.get("size", config.MESSAGE_ADMIN_PAGE_SIZE))),
            50,
        )
    except ValueError:
        return _error("分页参数无效")

    try:
        with cursor() as cur:
            rows, total = list_admin(cur, status=status, sort=sort, page=page, size=size)
            items = [row_to_admin_message(r) for r in rows]
    except Exception:
        return _error("审核列表加载失败", status=500)

    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.patch("/admin/<public_id>")
def moderate_message(public_id: str):
    _, err = _require_site_owner()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    action = body.get("action")
    if not action or not isinstance(action, str):
        return _error("请指定审核动作 action")

    try:
        with cursor() as cur:
            row = apply_moderation_action(cur, public_id, action)
    except ModerationError as e:
        return _error(str(e))
    except Exception:
        return _error("审核操作失败", status=500)

    return _ok(row_to_admin_message(row), message="操作成功")


@bp.delete("/admin/<public_id>")
def delete_message_admin(public_id: str):
    _, err = _require_site_owner()
    if err:
        return err

    try:
        with cursor() as cur:
            delete_message_tree(cur, public_id)
    except ModerationError as e:
        return _error(str(e))
    except Exception:
        return _error("删除留言失败", status=500)

    return _ok(None, message="留言已删除")


@bp.post("/admin/<public_id>/block")
def block_message_author(public_id: str):
    _, err = _require_site_owner()
    if err:
        return err

    try:
        with cursor() as cur:
            block_author_of_message(cur, public_id)
    except ModerationError as e:
        return _error(str(e))
    except Exception:
        return _error("拉黑失败", status=500)

    return _ok(None, message="已拉黑该用户")


@bp.get("")
def list_messages():
    sort = (request.args.get("sort") or "newest").strip().lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    try:
        page = max(1, int(request.args.get("page", 1)))
        size = min(max(1, int(request.args.get("size", 20))), 50)
    except ValueError:
        return _error("分页参数无效")

    try:
        with cursor() as cur:
            rows, total = list_published(cur, sort=sort, page=page, size=size)
            items = [row_to_message(p["row"], p.get("reply")) for p in rows]
    except Exception:
        return _error("留言列表加载失败", status=500)

    return _ok({"items": items, "total": total, "page": page, "size": size})


@bp.post("")
def create_message():
    user = _require_user()
    if not user:
        return _error("请先登录后再留言", status=401)

    body = request.get_json(silent=True) or {}
    content_raw = body.get("content")
    captcha_id = body.get("captchaId")
    captcha_answer = body.get("captchaAnswer")

    try:
        verify_captcha(
            str(captcha_id) if captcha_id is not None else None,
            str(captcha_answer) if captcha_answer is not None else None,
        )
    except CaptchaError as e:
        return _error(str(e))

    try:
        check_ip_cooldown(request)
    except RateLimitError as e:
        return _error(str(e), status=429)

    if not isinstance(content_raw, str):
        return _error("请填写留言内容")

    try:
        content = validate_content(content_raw)
    except ValidationError as e:
        return _error(str(e))

    guest_user_id = int(user["guest_user_id"])
    try:
        check_user_hourly_limit(guest_user_id)
    except RateLimitError as e:
        return _error(str(e), status=429)

    status = STATUS_PUBLISHED if config.MESSAGE_AUTO_PUBLISH else STATUS_PENDING

    try:
        with cursor() as cur:
            if is_guest_user_blocked(cur, guest_user_id):
                return _error("您的账号已被限制留言", status=403)
            row = insert_message(
                cur,
                guest_user_id=guest_user_id,
                author_name=user.get("name") or "User",
                avatar_url=user.get("avatar_url"),
                provider=user.get("provider"),
                profile_url=user.get("profile_url"),
                content=content,
                status=status,
                is_owner=is_site_owner(user),
            )
    except Exception:
        return _error("留言保存失败", status=500)

    record_ip_post(request)
    record_user_post(guest_user_id)

    if status != STATUS_PUBLISHED:
        return _ok(None, message="留言已提交，等待审核")

    return _ok(row_to_message(row), message="留言发布成功")


@bp.post("/<public_id>/reply")
def create_owner_reply(public_id: str):
    user, err = _require_site_owner()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    content_raw = body.get("content")
    if not isinstance(content_raw, str):
        return _error("请填写回复内容")

    try:
        check_owner_reply_cooldown(request)
    except RateLimitError as e:
        return _error(str(e), status=429)

    try:
        content = validate_content(content_raw)
    except ValidationError as e:
        return _error(str(e))

    try:
        with cursor() as cur:
            parent = get_top_by_public_id(cur, public_id)
            if not parent:
                return _error("留言不存在", status=404)
            if int(parent["status"]) != STATUS_PUBLISHED:
                return _error("仅可对已发布的留言回复")
            existing = get_owner_reply(cur, int(parent["id"]))
            if existing:
                return _error("该留言已有站长回复", status=409)
            reply_row = insert_owner_reply(
                cur,
                parent_row=parent,
                content=content,
                guest_user_id=int(user["guest_user_id"]) if user.get("guest_user_id") else None,
                author_name=config.SITE_OWNER_NAME,
                avatar_url=config.SITE_OWNER_AVATAR_URL,
                provider=user.get("provider"),
                profile_url=user.get("profile_url"),
            )
    except Exception:
        return _error("回复保存失败", status=500)

    record_owner_reply(request)
    return _ok(row_to_message(parent, reply_row), message="回复成功")
