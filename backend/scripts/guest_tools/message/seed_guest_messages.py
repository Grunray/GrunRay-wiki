#!/usr/bin/env python3
"""导入示例留言（旧方式，内联 SAMPLES）。

推荐改用：
  python scripts/guest_tools/message/import_guest_messages.py
（数据源：import/guest/message/*.md）

在 backend 目录执行：python scripts/guest_tools/message/seed_guest_messages.py
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.config import config
from app.db import cursor
from app.message_status import STATUS_PUBLISHED

SAMPLES = [
    {
        "author": "路过的旅人",
        "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
        "provider": "github",
        "profile_url": "https://github.com",
        "content": "站点的配色很舒服，留言板先占个座～",
        "created_at": "2026-05-12 14:22:00",
        "reply": {
            "author": config.SITE_OWNER_NAME,
            "avatar_url": config.SITE_OWNER_AVATAR_URL,
            "content": "谢谢来访，欢迎随便聊。",
            "created_at": "2026-05-13 10:00:00",
        },
    },
    {
        "author": "NightOwl",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
        "provider": "github",
        "content": "算法文章写得很清楚，尤其是图论那篇。",
        "created_at": "2026-04-28 09:05:00",
    },
    {
        "author": "小森林",
        "avatar_url": None,
        "provider": "google",
        "profile_url": "https://innei.in",
        "content": "布局参考了 innei 的 message 页，之后会再细调动效与间距。",
        "created_at": "2026-03-15 20:41:00",
    },
]


def main() -> None:
    with cursor() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM guest_message WHERE parent_id IS NULL")
        if int((cur.fetchone() or {"c": 0})["c"]) > 0:
            print("guest_message 已有数据，跳过 seed")
            return

        for sample in SAMPLES:
            pid = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO guest_message (
                    public_id, parent_id, guest_user_id, author_name, avatar_url,
                    provider, profile_url, content, status, is_owner, created_at
                ) VALUES (%s, NULL, NULL, %s, %s, %s, %s, %s, %s, 0, %s)
                """,
                (
                    pid,
                    sample["author"],
                    sample.get("avatar_url"),
                    sample.get("provider"),
                    sample.get("profile_url"),
                    sample["content"],
                    STATUS_PUBLISHED,
                    sample["created_at"],
                ),
            )
            cur.execute("SELECT id FROM guest_message WHERE public_id = %s", (pid,))
            top = cur.fetchone()
            if not top:
                continue
            top_id = top["id"]
            reply = sample.get("reply")
            if reply:
                cur.execute(
                    """
                    INSERT INTO guest_message (
                        public_id, parent_id, guest_user_id, author_name, avatar_url,
                        provider, profile_url, content, status, is_owner, created_at
                    ) VALUES (%s, %s, NULL, %s, %s, NULL, NULL, %s, %s, 1, %s)
                    """,
                    (
                        str(uuid.uuid4()),
                        top_id,
                        reply["author"],
                        reply.get("avatar_url"),
                        reply["content"],
                        STATUS_PUBLISHED,
                        reply["created_at"],
                    ),
                )
    print(f"已写入 {len(SAMPLES)} 条示例留言")


if __name__ == "__main__":
    main()
