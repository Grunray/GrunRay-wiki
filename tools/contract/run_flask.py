"""在 127.0.0.1:5001 启动沙箱 Flask，并把 OAuth 外呼改写到本机 mock_oauth。

用法（一般由 services.py 调用）:

  backend\\.venv\\Scripts\\python.exe tools/contract/run_flask.py --profile default
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

_OAUTH_REWRITE = (
    ("https://github.com/", f"{C.MOCK_OAUTH_BASE}/github/"),
    ("https://api.github.com/", f"{C.MOCK_OAUTH_BASE}/github-api/"),
    ("https://oauth2.googleapis.com/", f"{C.MOCK_OAUTH_BASE}/google-oauth2/"),
    ("https://www.googleapis.com/", f"{C.MOCK_OAUTH_BASE}/googleapis/"),
)


def _rewrite(url: str) -> str:
    for prefix, target in _OAUTH_REWRITE:
        if url.startswith(prefix):
            return target + url[len(prefix):]
    raise RuntimeError(f"契约沙箱拒绝外呼未知地址: {url}")


def _coerce(current: object, raw: str) -> object:
    if isinstance(current, bool):
        return raw.strip().lower() in ("1", "true", "yes", "on")
    if isinstance(current, int):
        return int(raw)
    return raw


def main() -> None:
    parser = argparse.ArgumentParser(description="启动契约沙箱 Flask")
    parser.add_argument("--profile", default="default", choices=sorted(C.PROFILES))
    args = parser.parse_args()

    os.environ["NO_PROXY"] = "127.0.0.1,localhost"
    os.environ.pop("HTTP_PROXY", None)
    os.environ.pop("HTTPS_PROXY", None)
    os.chdir(C.SANDBOX_BACKEND)
    sys.path.insert(0, str(C.SANDBOX_BACKEND))

    from app import auth_oauth, create_app
    from app.config import config

    if config.MYSQL_DATABASE != C.CONTRACT_DB or config.MYSQL_HOST not in C.LOOPBACK_HOSTS:
        raise SystemExit(f"拒绝启动：MYSQL={config.MYSQL_HOST}/{config.MYSQL_DATABASE}")
    C.assert_inside_sandbox(Path(auth_oauth.__file__))
    C.assert_inside_sandbox(config.CONTENT_ROOT)

    for key, raw in C.PROFILES[args.profile].items():
        setattr(config, key, _coerce(getattr(config, key), raw))
    if config.NOTIFY_EMAIL_ENABLED and config.SMTP_HOST not in C.LOOPBACK_HOSTS:
        raise SystemExit(f"拒绝启动：SMTP_HOST={config.SMTP_HOST}")

    orig_post = auth_oauth._http_post_form
    orig_get = auth_oauth._http_get_json
    auth_oauth._http_post_form = lambda url, data, headers=None: orig_post(_rewrite(url), data, headers=headers)
    auth_oauth._http_get_json = lambda url, headers=None: orig_get(_rewrite(url), headers=headers)

    app = create_app()
    print(
        f"[run_flask] profile={args.profile} db={config.MYSQL_DATABASE} "
        f"content_root={config.CONTENT_ROOT} listen={C.FLASK_BASE}",
        flush=True,
    )
    app.run(host=C.HOST, port=C.FLASK_PORT, debug=False, use_reloader=False, threaded=True)


if __name__ == "__main__":
    main()
