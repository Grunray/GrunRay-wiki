from __future__ import annotations

import re
from urllib.parse import urlencode

from flask import Blueprint, jsonify, redirect, request, session

from app.auth_oauth import (
    github_authorize_url,
    github_exchange_user,
    google_authorize_url,
    google_exchange_user,
    new_oauth_state,
)
from app.config import config
from app.db import cursor
from app.guest_user_repo import session_user_from_oauth, upsert_from_oauth
from app.site_owner import is_site_owner

bp = Blueprint("auth_api", __name__, url_prefix="/api/auth")

_SESSION_USER_KEY = "message_user"
_STATE_KEY = "oauth_state"
_RETURN_TO_KEY = "oauth_return_to"

_SAFE_RETURN_RE = re.compile(r"^/[a-zA-Z0-9/_\-?=&%.]*$")


def _ok(data, message: str = ""):
    return jsonify({"code": 0, "data": data, "message": message})


def _safe_return_to(raw: str | None) -> str:
    if not raw:
        return "/messages"
    path = raw.strip()
    if not path.startswith("/") or path.startswith("//"):
        return "/messages"
    if not _SAFE_RETURN_RE.match(path):
        return "/messages"
    return path


def _frontend_redirect(path: str, *, extra: dict[str, str] | None = None) -> str:
    base = config.FRONTEND_ORIGIN.rstrip("/")
    q = extra or {}
    if q:
        sep = "&" if "?" in path else "?"
        return f"{base}{path}{sep}{urlencode(q)}"
    return f"{base}{path}"


def _callback_url(provider: str) -> str:
    return f"{config.OAUTH_PUBLIC_BASE.rstrip('/')}/api/auth/{provider}/callback"


@bp.get("/providers")
def providers():
    return _ok(
        {
            "github": config.github_enabled(),
            "google": config.google_enabled(),
        }
    )


@bp.get("/me")
def me():
    user = session.get(_SESSION_USER_KEY)
    if not user:
        return _ok(None)
    payload = dict(user)
    payload["isSiteOwner"] = is_site_owner(user)
    return _ok(payload)


@bp.post("/logout")
def logout():
    session.pop(_SESSION_USER_KEY, None)
    return _ok(True)


def _start_oauth(provider: str):
    return_to = _safe_return_to(request.args.get("return_to"))
    session[_RETURN_TO_KEY] = return_to
    state = new_oauth_state()
    session[_STATE_KEY] = state

    if provider == "github":
        if not config.github_enabled():
            return redirect(_frontend_redirect(return_to, extra={"auth_error": "github_not_configured"}))
        url = github_authorize_url(
            client_id=config.GITHUB_CLIENT_ID,
            redirect_uri=_callback_url("github"),
            state=state,
        )
        return redirect(url)

    if provider == "google":
        if not config.google_enabled():
            return redirect(_frontend_redirect(return_to, extra={"auth_error": "google_not_configured"}))
        url = google_authorize_url(
            client_id=config.GOOGLE_CLIENT_ID,
            redirect_uri=_callback_url("google"),
            state=state,
        )
        return redirect(url)

    return jsonify({"code": 1, "message": "unknown_provider"}), 404


@bp.get("/github")
def github_start():
    return _start_oauth("github")


@bp.get("/google")
def google_start():
    return _start_oauth("google")


def _finish_oauth(provider: str):
    return_to = session.pop(_RETURN_TO_KEY, "/messages")
    expected_state = session.pop(_STATE_KEY, None)
    state = request.args.get("state")
    if not expected_state or state != expected_state:
        return redirect(_frontend_redirect(return_to, extra={"auth_error": "invalid_state"}))

    if request.args.get("error"):
        return redirect(
            _frontend_redirect(return_to, extra={"auth_error": request.args.get("error", "denied")})
        )

    code = request.args.get("code")
    if not code:
        return redirect(_frontend_redirect(return_to, extra={"auth_error": "missing_code"}))

    try:
        if provider == "github":
            user = github_exchange_user(
                client_id=config.GITHUB_CLIENT_ID,
                client_secret=config.GITHUB_CLIENT_SECRET,
                code=code,
                redirect_uri=_callback_url("github"),
            )
        else:
            user = google_exchange_user(
                client_id=config.GOOGLE_CLIENT_ID,
                client_secret=config.GOOGLE_CLIENT_SECRET,
                code=code,
                redirect_uri=_callback_url("google"),
            )
    except Exception:
        return redirect(_frontend_redirect(return_to, extra={"auth_error": f"{provider}_failed"}))

    try:
        with cursor() as cur:
            db_row = upsert_from_oauth(cur, user)
        session[_SESSION_USER_KEY] = session_user_from_oauth(user, db_row)
    except Exception:
        return redirect(_frontend_redirect(return_to, extra={"auth_error": f"{provider}_failed"}))

    return redirect(_frontend_redirect(return_to, extra={"auth": "success"}))


@bp.get("/github/callback")
def github_callback():
    return _finish_oauth("github")


@bp.get("/google/callback")
def google_callback():
    return _finish_oauth("google")
