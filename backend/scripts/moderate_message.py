#!/usr/bin/env python3
"""留言审核 CLI。在 backend 目录执行：

  python scripts/moderate_message.py approve <public_id>
  python scripts/moderate_message.py reject <public_id>
  python scripts/moderate_message.py hide <public_id>
  python scripts/moderate_message.py restore <public_id>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.db import cursor
from app.guest_message_repo import apply_moderation_action
from app.message_moderation import ModerationError
from app.message_serialize import row_to_admin_message


def main() -> int:
    parser = argparse.ArgumentParser(description="留言审核")
    parser.add_argument(
        "action",
        choices=("approve", "reject", "hide", "restore"),
        help="审核动作",
    )
    parser.add_argument("public_id", help="留言 public_id (UUID)")
    args = parser.parse_args()

    try:
        with cursor() as cur:
            row = apply_moderation_action(cur, args.public_id.strip(), args.action)
    except ModerationError as e:
        print(f"失败: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1

    item = row_to_admin_message(row)
    print(f"成功: action={args.action} id={item['id']} status={item['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
