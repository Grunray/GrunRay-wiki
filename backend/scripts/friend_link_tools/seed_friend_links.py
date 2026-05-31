#!/usr/bin/env python3
"""写入示例已发布友链（旧方式，内联 SEEDS）。

推荐改用：python scripts/friend_link_tools/import_friend_links.py
（数据源：import/friend_link/*.md）

在 backend 目录执行：python scripts/friend_link_tools/seed_friend_links.py
"""
from __future__ import annotations

import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.db import cursor
from app.friend_link_repo import insert_application
from app.friend_status import STATUS_PUBLISHED
from app.friend_validate import normalize_friend_url

SEEDS = [
    {
        "name": "Apos Blog",
        "url": "https://apos-dt.github.io/AposBlog/index.html#/",
        "description": "Building at the Edge of Manufacturing.",
        "avatar_url": "https://apos-dt.github.io/AposBlog/avatar.jpg",
        "tags": ["blog"],
    },
]


def main() -> int:
    with cursor() as cur:
        for item in SEEDS:
            norm = normalize_friend_url(item["url"])
            cur.execute(
                "SELECT id FROM friend_link WHERE url_normalized = %s AND status = %s LIMIT 1",
                (norm, STATUS_PUBLISHED),
            )
            if cur.fetchone():
                print(f"跳过（已存在）: {item['name']}")
                continue
            row = insert_application(
                cur,
                name=item["name"],
                url=item["url"],
                url_normalized=norm,
                description=item["description"],
                avatar_url=item.get("avatar_url"),
                cover_url=None,
                tags=item.get("tags"),
                contact_email=None,
                status=STATUS_PUBLISHED,
            )
            print(f"已写入: {row['name']} ({row['public_id']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
