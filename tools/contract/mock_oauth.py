"""本机模拟 GitHub / Google OAuth 的 token 与 userinfo 接口（127.0.0.1:5002）。

授权 code 即身份键（见 common.MOCK_USERS）；特殊 code：
- fail-token：token 接口返回 error，无 access_token；
- fail-user：token 正常，userinfo 返回 500。
每次请求追加到 .contract-sandbox/run/oauth_requests.jsonl（client_secret 脱敏）。
"""
from __future__ import annotations

import json
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

REQUEST_LOG = C.RUN_DIR / "oauth_requests.jsonl"
FAIL_TOKEN = "fail-token"
FAIL_USER = "fail-user"


def _user_for_token(auth_header: str, provider: str) -> tuple[str, dict[str, str] | None]:
    token = auth_header.removeprefix("Bearer ").strip()
    code = token.removeprefix("tok-")
    user = C.MOCK_USERS.get(code)
    if user and user["provider"] != provider:
        user = None
    return code, user


class Handler(BaseHTTPRequestHandler):
    server_version = "ContractMockOAuth/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("[mock_oauth] " + (fmt % args) + "\n")
        sys.stdout.flush()

    def _record(self, form: dict[str, str] | None) -> None:
        safe = dict(form or {})
        if "client_secret" in safe:
            safe["client_secret"] = "<redacted>"
        entry = {
            "method": self.command,
            "path": self.path,
            "form": safe,
            "has_authorization": bool(self.headers.get("Authorization")),
        }
        with REQUEST_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def _json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _form(self) -> dict[str, str]:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8")
        return {k: v[0] for k, v in urllib.parse.parse_qs(raw).items()}

    def _token(self, provider: str) -> None:
        form = self._form()
        self._record(form)
        code = form.get("code", "")
        known = C.MOCK_USERS.get(code)
        if code == FAIL_TOKEN or (code != FAIL_USER and (not known or known["provider"] != provider)):
            self._json(200, {"error": "bad_verification_code", "error_description": "mock token failure"})
            return
        self._json(200, {"access_token": f"tok-{code}", "token_type": "bearer"})

    def do_POST(self) -> None:  # noqa: N802
        path = urllib.parse.urlsplit(self.path).path
        if path == "/github/login/oauth/access_token":
            self._token("github")
        elif path == "/google-oauth2/token":
            self._token("google")
        else:
            self._record(None)
            self._json(404, {"error": "not_found"})

    def do_GET(self) -> None:  # noqa: N802
        self._record(None)
        path = urllib.parse.urlsplit(self.path).path
        auth = self.headers.get("Authorization", "")
        if path == "/github-api/user":
            code, user = _user_for_token(auth, "github")
            if code == FAIL_USER or not user:
                self._json(500, {"message": "mock user failure"})
                return
            self._json(
                200,
                {
                    "id": int(user["id"]),
                    "login": user["login"],
                    "name": user["name"],
                    "email": user["email"] or None,
                    "avatar_url": f"https://contract.example.test/avatar/{user['id']}.png",
                    "html_url": user["html_url"],
                },
            )
        elif path == "/github-api/user/emails":
            code, user = _user_for_token(auth, "github")
            if not user:
                self._json(401, {"message": "bad token"})
                return
            self._json(200, [{"email": f"{user['login']}@users.contract.example.test", "primary": True}])
        elif path == "/googleapis/oauth2/v2/userinfo":
            code, user = _user_for_token(auth, "google")
            if code == FAIL_USER or not user:
                self._json(500, {"error": "mock user failure"})
                return
            self._json(
                200,
                {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "picture": user["picture"],
                    "link": user["link"] or None,
                },
            )
        else:
            self._json(404, {"error": "not_found"})


def main() -> None:
    C.RUN_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((C.HOST, C.MOCK_OAUTH_PORT), Handler)
    print(f"[mock_oauth] listen http://{C.HOST}:{C.MOCK_OAUTH_PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
