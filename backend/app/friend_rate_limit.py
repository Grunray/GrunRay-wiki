from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass

from flask import Request

from app.config import config
from app.message_rate_limit import client_ip

_ip_last_apply: dict[str, float] = {}
_ip_daily_count: dict[str, list[float]] = defaultdict(list)


@dataclass
class FriendRateLimitError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def check_application_rate_limit(req: Request) -> None:
    ip = client_ip(req)
    now_mono = time.monotonic()
    last = _ip_last_apply.get(ip)
    if last is not None and (now_mono - last) < config.FRIEND_IP_COOLDOWN_SEC:
        raise FriendRateLimitError("提交过于频繁，请稍后再试")

    now = time.time()
    day_start = now - 86400
    history = _ip_daily_count[ip]
    history[:] = [t for t in history if t >= day_start]
    if len(history) >= config.FRIEND_APPLICATION_MAX_PER_IP_PER_DAY:
        raise FriendRateLimitError("今日申请次数已达上限，请明日再试")


def record_application(req: Request) -> None:
    ip = client_ip(req)
    _ip_last_apply[ip] = time.monotonic()
    _ip_daily_count[ip].append(time.time())
