"""契约沙箱共用路径、端口与模拟账号。

所有脚本只读写 `.contract-sandbox/`（已 gitignore）与 MySQL 库 `grunray_wiki_contract`。
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = Path(__file__).resolve().parent
FIXTURES_DIR = TOOLS_DIR / "fixtures"

SANDBOX_ROOT = REPO_ROOT / ".contract-sandbox"
SANDBOX_BACKEND = SANDBOX_ROOT / "backend"
RESULTS_DIR = SANDBOX_ROOT / "results"
MAIL_DIR = SANDBOX_ROOT / "mail"
LOG_DIR = SANDBOX_ROOT / "logs"
RUN_DIR = SANDBOX_ROOT / "run"
SMTP_FAIL_FLAG = RUN_DIR / "smtp_fail.flag"

REPO_BACKEND = REPO_ROOT / "backend"
BACKEND_PYTHON_CANDIDATES = (
    REPO_BACKEND / ".venv" / "Scripts" / "python.exe",
    REPO_BACKEND / "venv" / "Scripts" / "python.exe",
    REPO_BACKEND / ".venv" / "bin" / "python",
    REPO_BACKEND / "venv" / "bin" / "python",
)

CONTRACT_DB = "grunray_wiki_contract"
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})

HOST = "127.0.0.1"
FLASK_PORT = 5001
MOCK_OAUTH_PORT = 5002
# 2525 落在 Windows Hyper-V 保留段（netsh ... show excludedportrange），无法 bind。
SMTP_PORT = 1025
# 避开 Flask 生产 5000、沙箱 5001、模拟 OAuth 5002。
JAVA_PORT = 5010

FLASK_BASE = f"http://{HOST}:{FLASK_PORT}"
JAVA_BASE = f"http://{HOST}:{JAVA_PORT}"
MOCK_OAUTH_BASE = f"http://{HOST}:{MOCK_OAUTH_PORT}"
JAVA_DIR = REPO_ROOT / "backend-java"
FRONTEND_ORIGIN = "http://localhost:5173"
SITE_URL = "https://contract.example.test"

# mock_oauth 按授权 code 返回的身份；code 同时是 access_token 后缀。
MOCK_USERS: dict[str, dict[str, str]] = {
    "owner": {
        "provider": "github",
        "id": "900001",
        "login": "contract-owner",
        "name": "契约站长",
        "email": "owner@contract.example.test",
        "html_url": "https://github.com/contract-owner",
    },
    "guest": {
        "provider": "github",
        "id": "900002",
        "login": "contract-guest",
        "name": "契约访客",
        "email": "",
        "html_url": "https://github.com/contract-guest",
    },
    "guest2": {
        "provider": "github",
        "id": "900004",
        "login": "contract-guest2",
        "name": "契约访客二",
        "email": "guest2@contract.example.test",
        "html_url": "https://github.com/contract-guest2",
    },
    "blocked": {
        "provider": "github",
        "id": "910001",
        "login": "fixture-blocked",
        "name": "样本访客甲",
        "email": "",
        "html_url": "https://github.com/fixture-blocked",
    },
    "gguest": {
        "provider": "google",
        "id": "g-900003",
        "name": "契约谷歌访客",
        "email": "gguest@contract.example.test",
        "picture": "https://contract.example.test/avatar/g.png",
        "link": "",
    },
}
OWNER_GITHUB_ID = MOCK_USERS["owner"]["id"]
OWNER_PROFILE_URL = MOCK_USERS["owner"]["html_url"]

# 重启 Flask 时可叠加的配置档（写到 config 实例属性上，不改 .env）。
PROFILES: dict[str, dict[str, str]] = {
    "default": {},
    "autopublish": {
        "MESSAGE_AUTO_PUBLISH": "true",
        "FRIEND_AUTO_PUBLISH": "true",
        "MESSAGE_RATE_LIMIT_PER_USER": "2",
        "FRIEND_IP_COOLDOWN_SEC": "0",
        "FRIEND_APPLICATION_MAX_PER_IP_PER_DAY": "2",
        "GOOGLE_CLIENT_ID": "",
    },
}


def backend_python() -> Path:
    for p in BACKEND_PYTHON_CANDIDATES:
        if p.is_file():
            return p
    raise SystemExit("找不到 backend 虚拟环境的 python（backend/.venv 或 backend/venv）")


def assert_inside_sandbox(path: Path) -> Path:
    resolved = path.resolve()
    root = SANDBOX_ROOT.resolve()
    if resolved != root and root not in resolved.parents:
        raise SystemExit(f"拒绝操作沙箱外路径: {resolved}")
    return resolved
