"""站长邮件：留言 / 友链申请写入成功后通知。发送失败不影响访客请求。"""

from __future__ import annotations

import logging
import smtplib
import threading
from email.message import EmailMessage

from app.config import config

log = logging.getLogger(__name__)

_TIMEOUT_SEC = 15


def mail_configured() -> bool:
    return bool(
        config.NOTIFY_EMAIL_ENABLED
        and config.SMTP_HOST
        and config.SMTP_USER
        and config.SMTP_PASSWORD
        and config.NOTIFY_EMAIL_TO
    )


def _one_line(text: str, limit: int = 120) -> str:
    flat = " ".join((text or "").replace("\r", " ").replace("\n", " ").split())
    if len(flat) <= limit:
        return flat
    return flat[: limit - 1] + "…"


def _excerpt(text: str, limit: int = 800) -> str:
    raw = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if len(raw) <= limit:
        return raw
    return raw[: limit - 1] + "…"


def _origin() -> str:
    return (config.FRONTEND_ORIGIN or "").rstrip("/")


def _send(subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = _one_line(subject)
    msg["From"] = config.NOTIFY_EMAIL_FROM or config.SMTP_USER
    msg["To"] = config.NOTIFY_EMAIL_TO
    msg.set_content(body)

    host = config.SMTP_HOST
    port = config.SMTP_PORT
    if config.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(host, port, timeout=_TIMEOUT_SEC) as smtp:
            smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
            smtp.send_message(msg)
        return

    with smtplib.SMTP(host, port, timeout=_TIMEOUT_SEC) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
        smtp.send_message(msg)


def schedule_owner_mail(subject: str, body: str) -> None:
    """后台发送。未配齐或发送失败只记日志，不抛给调用方。"""
    if not mail_configured():
        return

    def run() -> None:
        try:
            _send(subject, body)
        except Exception as exc:
            log.warning("owner mail failed: %s", type(exc).__name__)

    threading.Thread(target=run, name="owner-mail", daemon=True).start()


def notify_guest_message(*, author: str, content: str, kind: str, pending: bool) -> None:
    state = "待审核" if pending else "已公开"
    origin = _origin()
    link = f"{origin}/messages" if origin else "/messages"
    body = (
        f"有一条新{kind}（{state}）。\n\n"
        f"作者：{_one_line(author, 80) or '访客'}\n"
        f"内容：\n{_excerpt(content)}\n\n"
        f"打开留言板：{link}\n"
    )
    schedule_owner_mail(f"[GrunRay] 新{kind}", body)


def notify_friend_application(
    *,
    name: str,
    url: str,
    description: str,
    contact_email: str,
    pending: bool,
) -> None:
    state = "待审核" if pending else "已公开"
    origin = _origin()
    link = f"{origin}/friends/admin" if origin else "/friends/admin"
    body = (
        f"有一条新的友链申请（{state}）。\n\n"
        f"名称：{_one_line(name, 80)}\n"
        f"网址：{_one_line(url, 200)}\n"
        f"联系邮箱：{_one_line(contact_email, 120)}\n"
        f"简介：\n{_excerpt(description)}\n\n"
        f"打开审核页：{link}\n"
    )
    schedule_owner_mail("[GrunRay] 新友链申请", body)
