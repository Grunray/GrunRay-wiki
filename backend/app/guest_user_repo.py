from __future__ import annotations

from typing import Any


def upsert_from_oauth(cur, profile: dict[str, Any]) -> dict[str, Any]:
    provider = profile["provider"]
    provider_user_id = str(profile["id"])
    login = profile.get("login")
    name = profile.get("name") or login or "User"
    email = profile.get("email")
    avatar_url = profile.get("avatar_url")
    profile_url = profile.get("profile_url")

    cur.execute(
        """
        INSERT INTO guest_user (
            provider, provider_user_id, login, name, email, avatar_url, profile_url
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            login = VALUES(login),
            name = VALUES(name),
            email = VALUES(email),
            avatar_url = VALUES(avatar_url),
            profile_url = VALUES(profile_url),
            updated_at = CURRENT_TIMESTAMP
        """,
        (provider, provider_user_id, login, name, email, avatar_url, profile_url),
    )
    cur.execute(
        """
        SELECT id, provider, provider_user_id, login, name, email, avatar_url, profile_url
        FROM guest_user
        WHERE provider = %s AND provider_user_id = %s
        """,
        (provider, provider_user_id),
    )
    row = cur.fetchone()
    if not row:
        raise RuntimeError("guest_user upsert failed")
    return row


def session_user_from_oauth(profile: dict[str, Any], db_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "guest_user_id": int(db_row["id"]),
        "provider": profile["provider"],
        "id": str(profile["id"]),
        "login": profile.get("login") or profile.get("name"),
        "name": profile.get("name") or profile.get("login") or "User",
        "email": profile.get("email"),
        "avatar_url": profile.get("avatar_url"),
        "profile_url": profile.get("profile_url"),
    }
