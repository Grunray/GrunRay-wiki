from __future__ import annotations

import json
import uuid
from typing import Any

from app.friend_moderation import FriendModerationError, status_for_action
from app.friend_status import STATUS_PUBLISHED

_ROW_SELECT = """
    SELECT id, public_id, name, url, url_normalized, description,
           avatar_url, cover_url, tags, contact_email, status, sort_order,
           created_at, updated_at
    FROM friend_link
"""


def list_published(
    cur,
    *,
    sort: str = "newest",
    page: int = 1,
    size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    size = min(max(1, size), 50)
    offset = (page - 1) * size
    order = "DESC" if sort != "oldest" else "ASC"

    cur.execute(
        "SELECT COUNT(*) AS cnt FROM friend_link WHERE status = %s",
        (STATUS_PUBLISHED,),
    )
    total = int((cur.fetchone() or {"cnt": 0})["cnt"])

    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE status = %s
        ORDER BY sort_order DESC, created_at {order}, id {order}
        LIMIT %s OFFSET %s
        """,
        (STATUS_PUBLISHED, size, offset),
    )
    return cur.fetchall() or [], total


def list_admin(
    cur,
    *,
    status: int | None,
    sort: str = "newest",
    page: int = 1,
    size: int = 30,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    size = min(max(1, size), 50)
    offset = (page - 1) * size
    order = "DESC" if sort != "oldest" else "ASC"

    if status is None:
        cur.execute("SELECT COUNT(*) AS cnt FROM friend_link")
        total = int((cur.fetchone() or {"cnt": 0})["cnt"])
        cur.execute(
            f"""
            {_ROW_SELECT}
            ORDER BY status ASC, created_at {order}, id {order}
            LIMIT %s OFFSET %s
            """,
            (size, offset),
        )
        return cur.fetchall() or [], total

    cur.execute(
        "SELECT COUNT(*) AS cnt FROM friend_link WHERE status = %s",
        (status,),
    )
    total = int((cur.fetchone() or {"cnt": 0})["cnt"])

    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE status = %s
        ORDER BY created_at {order}, id {order}
        LIMIT %s OFFSET %s
        """,
        (status, size, offset),
    )
    return cur.fetchall() or [], total


def get_by_public_id(cur, public_id: str) -> dict[str, Any] | None:
    cur.execute(f"{_ROW_SELECT} WHERE public_id = %s", (public_id,))
    return cur.fetchone()


def count_published_by_url_normalized(
    cur,
    url_normalized: str,
    *,
    exclude_public_id: str | None = None,
) -> int:
    if exclude_public_id:
        cur.execute(
            """
            SELECT COUNT(*) AS cnt FROM friend_link
            WHERE status = %s AND url_normalized = %s AND public_id <> %s
            """,
            (STATUS_PUBLISHED, url_normalized, exclude_public_id),
        )
    else:
        cur.execute(
            """
            SELECT COUNT(*) AS cnt FROM friend_link
            WHERE status = %s AND url_normalized = %s
            """,
            (STATUS_PUBLISHED, url_normalized),
        )
    return int((cur.fetchone() or {"cnt": 0})["cnt"])


def insert_application(
    cur,
    *,
    name: str,
    url: str,
    url_normalized: str,
    description: str,
    avatar_url: str | None,
    cover_url: str | None,
    tags: list[str] | None,
    contact_email: str | None,
    status: int,
) -> dict[str, Any]:
    public_id = str(uuid.uuid4())
    tags_json = json.dumps(tags, ensure_ascii=False) if tags else None
    cur.execute(
        """
        INSERT INTO friend_link (
            public_id, name, url, url_normalized, description,
            avatar_url, cover_url, tags, contact_email, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            public_id,
            name,
            url,
            url_normalized,
            description,
            avatar_url,
            cover_url,
            tags_json,
            contact_email,
            status,
        ),
    )
    row = get_by_public_id(cur, public_id)
    if not row:
        raise RuntimeError("insert_application failed")
    return row


def apply_moderation_action(cur, public_id: str, action: str) -> dict[str, Any]:
    row = get_by_public_id(cur, public_id)
    if not row:
        raise FriendModerationError("友链不存在")
    current = int(row["status"])
    new_status = status_for_action(current, action)

    if new_status == STATUS_PUBLISHED:
        conflict = count_published_by_url_normalized(
            cur,
            row["url_normalized"],
            exclude_public_id=public_id,
        )
        if conflict > 0:
            raise FriendModerationError("该站点 URL 已有已发布友链，无法通过审核")

    cur.execute(
        "UPDATE friend_link SET status = %s WHERE public_id = %s",
        (new_status, public_id),
    )
    updated = get_by_public_id(cur, public_id)
    if not updated:
        raise RuntimeError("apply_moderation_action failed")
    return updated


def update_friend_fields(cur, public_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    row = get_by_public_id(cur, public_id)
    if not row:
        raise FriendModerationError("友链不存在")

    sets: list[str] = []
    params: list[Any] = []

    if "name" in fields:
        sets.append("name = %s")
        params.append(fields["name"])
    if "url" in fields:
        sets.append("url = %s")
        params.append(fields["url"])
    if "url_normalized" in fields:
        sets.append("url_normalized = %s")
        params.append(fields["url_normalized"])
    if "description" in fields:
        sets.append("description = %s")
        params.append(fields["description"])
    if "avatar_url" in fields:
        avatar = fields["avatar_url"]
        sets.append("avatar_url = %s")
        params.append(avatar)
        sets.append("cover_url = %s")
        params.append(avatar)
    if "contact_email" in fields:
        sets.append("contact_email = %s")
        params.append(fields["contact_email"])
    if "sort_order" in fields:
        sets.append("sort_order = %s")
        params.append(fields["sort_order"])

    if not sets:
        raise FriendModerationError("没有可更新的字段")

    if int(row.get("status") or 0) == STATUS_PUBLISHED and "url_normalized" in fields:
        conflict = count_published_by_url_normalized(
            cur,
            fields["url_normalized"],
            exclude_public_id=public_id,
        )
        if conflict > 0:
            raise FriendModerationError("该站点 URL 已有已发布友链")

    params.append(public_id)
    cur.execute(
        f"UPDATE friend_link SET {', '.join(sets)} WHERE public_id = %s",
        tuple(params),
    )
    updated = get_by_public_id(cur, public_id)
    if not updated:
        raise RuntimeError("update_friend_fields failed")
    return updated
