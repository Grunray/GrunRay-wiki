from __future__ import annotations

import uuid
from typing import Any

from app.message_moderation import ModerationError, status_for_action
from app.message_status import STATUS_PENDING, STATUS_PUBLISHED

_ROW_SELECT = """
    SELECT id, public_id, parent_id, guest_user_id, author_name, avatar_url,
           provider, profile_url, content, status, is_owner, created_at, updated_at
    FROM guest_message
"""


def list_published(
    cur,
    *,
    sort: str = "newest",
    page: int = 1,
    size: int = 20,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    size = min(max(1, size), 50)
    offset = (page - 1) * size
    order = "DESC" if sort != "oldest" else "ASC"

    cur.execute(
        """
        SELECT COUNT(*) AS cnt FROM guest_message
        WHERE status = %s AND parent_id IS NULL
        """,
        (STATUS_PUBLISHED,),
    )
    total_row = cur.fetchone() or {"cnt": 0}
    total = int(total_row["cnt"])

    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE status = %s AND parent_id IS NULL
        ORDER BY created_at {order}, id {order}
        LIMIT %s OFFSET %s
        """,
        (STATUS_PUBLISHED, size, offset),
    )
    tops = cur.fetchall() or []
    if not tops:
        return [], total

    ids = [r["id"] for r in tops]
    placeholders = ",".join(["%s"] * len(ids))
    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE parent_id IN ({placeholders}) AND is_owner = 1 AND status = %s
        """,
        (*ids, STATUS_PUBLISHED),
    )
    replies = cur.fetchall() or []
    reply_by_parent = {int(r["parent_id"]): r for r in replies}

    out: list[dict[str, Any]] = []
    for row in tops:
        out.append({"row": row, "reply": reply_by_parent.get(int(row["id"]))})
    return out, total


def list_admin(
    cur,
    *,
    status: int = STATUS_PENDING,
    sort: str = "newest",
    page: int = 1,
    size: int = 30,
) -> tuple[list[dict[str, Any]], int]:
    page = max(1, page)
    size = min(max(1, size), 50)
    offset = (page - 1) * size
    order = "DESC" if sort != "oldest" else "ASC"

    cur.execute(
        """
        SELECT COUNT(*) AS cnt FROM guest_message
        WHERE status = %s AND parent_id IS NULL
        """,
        (status,),
    )
    total_row = cur.fetchone() or {"cnt": 0}
    total = int(total_row["cnt"])

    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE status = %s AND parent_id IS NULL
        ORDER BY created_at {order}, id {order}
        LIMIT %s OFFSET %s
        """,
        (status, size, offset),
    )
    return cur.fetchall() or [], total


def get_top_by_public_id(cur, public_id: str) -> dict[str, Any] | None:
    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE public_id = %s AND parent_id IS NULL
        """,
        (public_id,),
    )
    return cur.fetchone()


def get_by_public_id(cur, public_id: str) -> dict[str, Any] | None:
    cur.execute(
        f"{_ROW_SELECT} WHERE public_id = %s",
        (public_id,),
    )
    return cur.fetchone()


def get_owner_reply(cur, parent_id: int) -> dict[str, Any] | None:
    cur.execute(
        f"""
        {_ROW_SELECT}
        WHERE parent_id = %s AND is_owner = 1
        LIMIT 1
        """,
        (parent_id,),
    )
    return cur.fetchone()


def insert_message(
    cur,
    *,
    guest_user_id: int,
    author_name: str,
    avatar_url: str | None,
    provider: str,
    profile_url: str | None,
    content: str,
    status: int,
    is_owner: bool = False,
) -> dict[str, Any]:
    public_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO guest_message (
            public_id, parent_id, guest_user_id, author_name, avatar_url,
            provider, profile_url, content, status, is_owner
        ) VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            public_id,
            guest_user_id,
            author_name,
            avatar_url,
            provider,
            profile_url,
            content,
            status,
            1 if is_owner else 0,
        ),
    )
    row = get_by_public_id(cur, public_id)
    if not row:
        raise RuntimeError("insert_message failed")
    return row


def insert_owner_reply(
    cur,
    *,
    parent_row: dict[str, Any],
    content: str,
    guest_user_id: int | None,
    author_name: str,
    avatar_url: str | None,
    provider: str | None,
    profile_url: str | None,
) -> dict[str, Any]:
    public_id = str(uuid.uuid4())
    parent_id = int(parent_row["id"])
    cur.execute(
        """
        INSERT INTO guest_message (
            public_id, parent_id, guest_user_id, author_name, avatar_url,
            provider, profile_url, content, status, is_owner
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """,
        (
            public_id,
            parent_id,
            guest_user_id,
            author_name,
            avatar_url,
            provider,
            profile_url,
            content,
            STATUS_PUBLISHED,
        ),
    )
    row = get_by_public_id(cur, public_id)
    if not row:
        raise RuntimeError("insert_owner_reply failed")
    return row


def apply_moderation_action(cur, public_id: str, action: str) -> dict[str, Any]:
    row = get_top_by_public_id(cur, public_id)
    if not row:
        raise ModerationError("留言不存在")
    current = int(row["status"])
    new_status = status_for_action(current, action)
    cur.execute(
        "UPDATE guest_message SET status = %s WHERE public_id = %s",
        (new_status, public_id),
    )
    updated = get_top_by_public_id(cur, public_id)
    if not updated:
        raise RuntimeError("apply_moderation_action failed")
    return updated
