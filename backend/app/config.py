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


class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "grunray_wiki")

    CONTENT_ROOT = _root_relative(os.getenv("CONTENT_ROOT", "content"))


config = Config()
