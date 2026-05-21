import os
from pathlib import Path

from dotenv import load_dotenv

_here = Path(__file__).resolve().parent
_backend_root = _here.parent
# override=True：避免系统环境里空变量覆盖 .env 中的 MYSQL_PASSWORD
load_dotenv(_backend_root / ".env", override=True)


def _root_relative(path: str) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    return (_backend_root / path).resolve()


def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def _env_id_set(name: str) -> set[str]:
    raw = os.getenv(name, "").strip()
    if not raw:
        return set()
    return {x.strip() for x in raw.split(",") if x.strip()}


def normalize_profile_url(url: str | None) -> str:
    """用于比对的主页 URL：小写、去尾斜杠。"""
    from urllib.parse import urlparse

    if not url or not str(url).strip():
        return ""
    raw = str(url).strip().rstrip("/")
    try:
        p = urlparse(raw if "://" in raw else f"https://{raw}")
        host = (p.netloc or p.path.split("/")[0]).lower()
        path = (p.path or "").rstrip("/").lower()
        if not host:
            return raw.lower()
        return f"https://{host}{path}" if path else f"https://{host}"
    except Exception:
        return raw.lower()


def _env_profile_url_set(name: str, default: str = "") -> set[str]:
    raw = os.getenv(name, default).strip()
    if not raw:
        return set()
    return {normalize_profile_url(x) for x in raw.split(",") if x.strip()}


class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "grunray_wiki")

    CONTENT_ROOT = _root_relative(os.getenv("CONTENT_ROOT", "content"))

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me-in-production")
    OAUTH_PUBLIC_BASE = os.getenv("OAUTH_PUBLIC_BASE", "http://localhost:5173")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if o.strip()
    ]

    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "").strip()
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    MESSAGE_MIN_LENGTH = _env_int("MESSAGE_MIN_LENGTH", 2)
    MESSAGE_MAX_LENGTH = _env_int("MESSAGE_MAX_LENGTH", 500)
    MESSAGE_IP_COOLDOWN_SEC = _env_int("MESSAGE_IP_COOLDOWN_SEC", 60)
    MESSAGE_RATE_LIMIT_PER_USER = _env_int("MESSAGE_RATE_LIMIT_PER_USER", 10)
    MESSAGE_CAPTCHA_TTL_SEC = _env_int("MESSAGE_CAPTCHA_TTL_SEC", 300)
    MESSAGE_AUTO_PUBLISH = _env_bool("MESSAGE_AUTO_PUBLISH", True)
    MESSAGE_OWNER_REPLY_COOLDOWN_SEC = _env_int("MESSAGE_OWNER_REPLY_COOLDOWN_SEC", 10)
    MESSAGE_ADMIN_PAGE_SIZE = _env_int("MESSAGE_ADMIN_PAGE_SIZE", 30)
    MESSAGE_SENSITIVE_WORDS_PATH = _root_relative(
        os.getenv("MESSAGE_SENSITIVE_WORDS_PATH", "data/sensitive_words.txt")
    )
    MESSAGE_OWNER_GITHUB_IDS = _env_id_set("MESSAGE_OWNER_GITHUB_IDS")
    MESSAGE_OWNER_GOOGLE_IDS = _env_id_set("MESSAGE_OWNER_GOOGLE_IDS")
    # 站长主页（GitHub/Google 等），与 OAuth 返回的 profile_url 比对
    MESSAGE_OWNER_PROFILE_URLS = _env_profile_url_set(
        "MESSAGE_OWNER_PROFILE_URLS",
        default="https://github.com/Grunray",
    )
    SITE_OWNER_NAME = os.getenv("SITE_OWNER_NAME", "GrunRay").strip() or "GrunRay"
    SITE_OWNER_AVATAR_URL = os.getenv("SITE_OWNER_AVATAR_URL", "/favicon.jpg").strip()

    FRIEND_IP_COOLDOWN_SEC = _env_int("FRIEND_IP_COOLDOWN_SEC", 120)
    FRIEND_APPLICATION_MAX_PER_IP_PER_DAY = _env_int(
        "FRIEND_APPLICATION_MAX_PER_IP_PER_DAY", 5
    )
    FRIEND_CAPTCHA_TTL_SEC = _env_int("FRIEND_CAPTCHA_TTL_SEC", 300)
    FRIEND_AUTO_PUBLISH = _env_bool("FRIEND_AUTO_PUBLISH", False)
    FRIEND_ADMIN_PAGE_SIZE = _env_int("FRIEND_ADMIN_PAGE_SIZE", 30)
    FRIEND_SENSITIVE_WORDS_ENABLED = _env_bool("FRIEND_SENSITIVE_WORDS_ENABLED", True)
    FRIEND_SPECIAL_LINKS_PATH = _root_relative(
        os.getenv("FRIEND_SPECIAL_LINKS_PATH", "data/friend_special_links.json")
    )

    FRIENDS_SITE_TITLE = os.getenv("FRIENDS_SITE_TITLE", "").strip() or SITE_OWNER_NAME
    FRIENDS_SITE_URL = os.getenv("FRIENDS_SITE_URL", "").strip() or FRONTEND_ORIGIN.rstrip("/")
    FRIENDS_SITE_LOGO_URL = os.getenv("FRIENDS_SITE_LOGO_URL", "").strip()
    FRIENDS_SITE_DESCRIPTION = os.getenv(
        "FRIENDS_SITE_DESCRIPTION",
        "个人成果与笔记：项目、开发记录与算法心得。",
    ).strip()

    def friends_site_logo_absolute(self) -> str:
        logo = self.FRIENDS_SITE_LOGO_URL
        if not logo:
            base = self.FRONTEND_ORIGIN.rstrip("/")
            return f"{base}/favicon.jpg"
        if logo.startswith("http://") or logo.startswith("https://"):
            return logo
        base = self.FRONTEND_ORIGIN.rstrip("/")
        path = logo if logo.startswith("/") else f"/{logo}"
        return f"{base}{path}"

    def github_enabled(self) -> bool:
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)

    def google_enabled(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)


config = Config()
