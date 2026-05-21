from __future__ import annotations

import random
import secrets
import time
from dataclasses import dataclass

from flask import session

from app.config import config

_SESSION_KEY = "message_captcha"


@dataclass
class CaptchaError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def create_math_captcha() -> dict[str, str]:
    a = random.randint(1, 20)
    b = random.randint(1, 20)
    captcha_id = secrets.token_urlsafe(16)
    session[_SESSION_KEY] = {
        "id": captcha_id,
        "answer": str(a + b),
        "expires_at": time.time() + config.MESSAGE_CAPTCHA_TTL_SEC,
    }
    return {
        "captchaId": captcha_id,
        "question": f"{a} + {b} = ?",
    }


def verify_captcha(captcha_id: str | None, captcha_answer: str | None) -> None:
    if not captcha_id or captcha_answer is None or str(captcha_answer).strip() == "":
        raise CaptchaError("请完成验证码")
    stored = session.pop(_SESSION_KEY, None)
    if not stored:
        raise CaptchaError("验证码已过期，请刷新后重试")
    if time.time() > float(stored.get("expires_at", 0)):
        raise CaptchaError("验证码已过期，请刷新后重试")
    if stored.get("id") != captcha_id:
        raise CaptchaError("验证码无效，请刷新后重试")
    if str(captcha_answer).strip() != str(stored.get("answer", "")):
        raise CaptchaError("验证码答案错误")
