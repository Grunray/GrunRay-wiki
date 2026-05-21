#!/usr/bin/env python3
"""写入示例已发布友链。在 backend 目录执行：python scripts/seed_friend_links.py"""
from __future__ import annotations

import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.db import cursor
from app.friend_link_repo import insert_application
from app.friend_status import STATUS_PUBLISHED
from app.friend_validate import normalize_friend_url

SEEDS = [
    {
        "name": "lvyneko",
        "url": "https://lvyovo-wiki.tech/",
        "description": "happy coding",
        "tags": ["blog"],
    },
    {
        "name": "Eric-Terminal",
        "url": "https://blog.ericterminal.com/",
        "description": "记录折腾与思考的个人博客",
        "tags": ["blog"],
    },
    {
        "name": "七色的遥望之乡",
        "url": "https://blog.monika.monster/",
        "description": "Monika 的个人博客",
        "tags": ["blog"],
    },
    {
        "name": "晴猫的博客",
        "url": "https://blog.bbleae.cn/",
        "description": "嗨，靓仔，今天也要有个好心情哦！",
        "tags": ["blog"],
    },
    {
        "name": "拾雪的博客",
        "url": "https://www.snowywar.top/",
        "description": "记录胡言乱语与胡乱折腾，欢迎大家来玩",
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
                avatar_url=None,
                cover_url=None,
                tags=item.get("tags"),
                contact_email=None,
                status=STATUS_PUBLISHED,
            )
            print(f"已写入: {row['name']} ({row['public_id']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
