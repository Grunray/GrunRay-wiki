from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass

from flask import Request

from app.config import config

_ip_last_post: dict[str, float] = {}
_ip_last_owner_reply: dict[str, float] = {}
_user_posts: dict[int, list[float]] = defaultdict(list)


@dataclass
class RateLimitError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def client_ip(req: Request) -> str:
    forwarded = (req.headers.get("X-Forwarded-For") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    return req.remote_addr or "unknown"


def check_ip_cooldown(req: Request) -> None:
    ip = client_ip(req)
    now = time.monotonic()
    last = _ip_last_post.get(ip)
    if last is not None and (now - last) < config.MESSAGE_IP_COOLDOWN_SEC:
        raise RateLimitError("提交过于频繁，请稍后再试")


def record_ip_post(req: Request) -> None:
    _ip_last_post[client_ip(req)] = time.monotonic()


def check_user_hourly_limit(guest_user_id: int) -> None:
    now = time.time()
    window_start = now - 3600
    history = _user_posts[guest_user_id]
    history[:] = [t for t in history if t >= window_start]
    if len(history) >= config.MESSAGE_RATE_LIMIT_PER_USER:
        raise RateLimitError("已达到本小时留言上限，请稍后再试")


def record_user_post(guest_user_id: int) -> None:
    _user_posts[guest_user_id].append(time.time())


def check_owner_reply_cooldown(req: Request) -> None:
    ip = client_ip(req)
    now = time.monotonic()
    last = _ip_last_owner_reply.get(ip)
    if last is not None and (now - last) < config.MESSAGE_OWNER_REPLY_COOLDOWN_SEC:
        raise RateLimitError("回复过于频繁，请稍后再试")


def record_owner_reply(req: Request) -> None:
    _ip_last_owner_reply[client_ip(req)] = time.monotonic()
