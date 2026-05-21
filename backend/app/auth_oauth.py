"""GitHub / Google OAuth helpers for guest message sign-in."""

from __future__ import annotations

import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def new_oauth_state() -> str:
    return secrets.token_urlsafe(24)


def _http_post_form(url: str, data: dict[str, str], headers: dict[str, str] | None = None) -> dict[str, Any]:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("Accept", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw)


def _http_get_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("Accept", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw)


def github_authorize_url(*, client_id: str, redirect_uri: str, state: str) -> str:
    q = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
            "state": state,
        }
    )
    return f"https://github.com/login/oauth/authorize?{q}"


def github_exchange_user(*, client_id: str, client_secret: str, code: str, redirect_uri: str) -> dict[str, Any]:
    token_payload = _http_post_form(
        "https://github.com/login/oauth/access_token",
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        headers={"Accept": "application/json"},
    )
    access_token = token_payload.get("access_token")
    if not access_token:
        raise ValueError(token_payload.get("error_description") or "github_token_failed")

    profile = _http_get_json(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "GrunRay-wiki-message-auth",
        },
    )
    email = profile.get("email")
    if not email:
        try:
            emails = _http_get_json(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": "GrunRay-wiki-message-auth",
                },
            )
            if isinstance(emails, list):
                primary = next((e for e in emails if e.get("primary")), None)
                if primary:
                    email = primary.get("email")
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError, json.JSONDecodeError):
            pass

    login = profile.get("login") or "github-user"
    name = profile.get("name") or login
    return {
        "provider": "github",
        "id": str(profile.get("id") or login),
        "login": login,
        "name": name,
        "email": email,
        "avatar_url": profile.get("avatar_url"),
        "profile_url": profile.get("html_url") or f"https://github.com/{login}",
    }


def google_authorize_url(*, client_id: str, redirect_uri: str, state: str) -> str:
    q = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{q}"


def google_exchange_user(*, client_id: str, client_secret: str, code: str, redirect_uri: str) -> dict[str, Any]:
    token_payload = _http_post_form(
        "https://oauth2.googleapis.com/token",
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
    )
    access_token = token_payload.get("access_token")
    if not access_token:
        raise ValueError(token_payload.get("error_description") or "google_token_failed")

    profile = _http_get_json(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    user_id = profile.get("id") or profile.get("sub") or "google-user"
    email = profile.get("email")
    name = profile.get("name") or (email.split("@")[0] if email else "Google User")
    return {
        "provider": "google",
        "id": str(user_id),
        "login": email or name,
        "name": name,
        "email": email,
        "avatar_url": profile.get("picture"),
        "profile_url": profile.get("link"),
    }
