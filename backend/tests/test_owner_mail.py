import pytest
from email.message import EmailMessage

from app.config import config
from app.owner_mail import (
    mail_configured,
    notify_friend_application,
    notify_guest_message,
    schedule_owner_mail,
)


class _FakeSMTP:
    instances: list["_FakeSMTP"] = []

    def __init__(self, host, port, timeout=None):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.logged_in = None
        self.sent: list[EmailMessage] = []
        _FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def login(self, user, password):
        self.logged_in = (user, password)

    def send_message(self, msg):
        self.sent.append(msg)

    def ehlo(self):
        return None

    def starttls(self):
        return None


@pytest.fixture(autouse=True)
def _inline_thread(monkeypatch):
    class _ImmediateThread:
        def __init__(self, target=None, name=None, daemon=None):
            self._target = target

        def start(self):
            if self._target:
                self._target()

    monkeypatch.setattr("app.owner_mail.threading.Thread", _ImmediateThread)


def _enable(monkeypatch, *, ssl=True):
    monkeypatch.setattr(config, "NOTIFY_EMAIL_ENABLED", True)
    monkeypatch.setattr(config, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(config, "SMTP_PORT", 465 if ssl else 587)
    monkeypatch.setattr(config, "SMTP_USE_SSL", ssl)
    monkeypatch.setattr(config, "SMTP_USER", "bot@example.com")
    monkeypatch.setattr(config, "SMTP_PASSWORD", "auth-code")
    monkeypatch.setattr(config, "NOTIFY_EMAIL_TO", "owner@example.com")
    monkeypatch.setattr(config, "NOTIFY_EMAIL_FROM", "bot@example.com")
    monkeypatch.setattr(config, "FRONTEND_ORIGIN", "https://www.grunray.tech")


def test_mail_off_when_incomplete(monkeypatch):
    monkeypatch.setattr(config, "NOTIFY_EMAIL_ENABLED", True)
    monkeypatch.setattr(config, "SMTP_HOST", "")
    monkeypatch.setattr(config, "SMTP_PASSWORD", "x")
    assert mail_configured() is False


def test_schedule_skips_when_disabled(monkeypatch):
    monkeypatch.setattr(config, "NOTIFY_EMAIL_ENABLED", False)
    called = {"n": 0}

    def boom(*args, **kwargs):
        called["n"] += 1
        raise AssertionError("should not connect")

    monkeypatch.setattr("app.owner_mail.smtplib.SMTP_SSL", boom)
    schedule_owner_mail("hi", "body")
    assert called["n"] == 0


def test_notify_message_sends_once(monkeypatch):
    _enable(monkeypatch)
    _FakeSMTP.instances.clear()
    monkeypatch.setattr("app.owner_mail.smtplib.SMTP_SSL", _FakeSMTP)

    notify_guest_message(
        author="访客\nBcc: evil@x",
        content="你好，这是一条留言",
        kind="留言",
        pending=True,
    )

    assert len(_FakeSMTP.instances) == 1
    smtp = _FakeSMTP.instances[0]
    assert smtp.host == "smtp.example.com"
    assert smtp.logged_in == ("bot@example.com", "auth-code")
    assert len(smtp.sent) == 1
    msg = smtp.sent[0]
    assert "Bcc" not in msg["Subject"]
    assert "新留言" in msg["Subject"]
    assert msg["To"] == "owner@example.com"
    body = msg.get_content()
    assert "待审核" in body
    assert "https://www.grunray.tech/messages" in body
    assert "你好，这是一条留言" in body


def test_notify_friend_uses_starttls(monkeypatch):
    _enable(monkeypatch, ssl=False)
    _FakeSMTP.instances.clear()

    def refuse_ssl(*args, **kwargs):
        raise AssertionError("ssl path should not run")

    monkeypatch.setattr("app.owner_mail.smtplib.SMTP_SSL", refuse_ssl)
    monkeypatch.setattr("app.owner_mail.smtplib.SMTP", _FakeSMTP)

    notify_friend_application(
        name="示例站",
        url="https://example.com",
        description="一句简介",
        contact_email="a@example.com",
        pending=True,
    )

    assert len(_FakeSMTP.instances) == 1
    body = _FakeSMTP.instances[0].sent[0].get_content()
    assert "https://www.grunray.tech/friends/admin" in body
    assert "a@example.com" in body


def test_send_failure_does_not_raise(monkeypatch):
    _enable(monkeypatch)

    class Broken(_FakeSMTP):
        def login(self, user, password):
            raise OSError("nope")

    monkeypatch.setattr("app.owner_mail.smtplib.SMTP_SSL", Broken)
    notify_guest_message(author="甲", content="内容够长", kind="回复", pending=False)
