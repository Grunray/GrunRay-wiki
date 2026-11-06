"""对契约沙箱 API 跑用例，结果写入 .contract-sandbox/results/。

前置：setup_sandbox.py --reset → services.py start（profile 与 --phase 一致）。

  backend\\.venv\\Scripts\\python.exe tools/contract/run_cases.py --phase default
  backend\\.venv\\Scripts\\python.exe tools/contract/run_cases.py --base http://127.0.0.1:5010 --ids R01,R02,R11,R12 --label java
  backend\\.venv\\Scripts\\python.exe tools/contract/services.py restart-flask --profile autopublish
  backend\\.venv\\Scripts\\python.exe tools/contract/run_cases.py --phase autopublish

用例依赖 fixtures 的初始状态与本脚本内的执行顺序；重跑前先 setup_sandbox.py --reset。
"""
from __future__ import annotations

import argparse
import http.cookiejar
import io
import itertools
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

ISO_POST_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$")
ISO_SEC_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
NOW_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_xff_counter = itertools.count(10)
API_BASE = C.FLASK_BASE


def new_ip() -> str:
    return f"198.51.100.{next(_xff_counter)}"


# ---------------------------------------------------------------- HTTP client


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@dataclass
class Resp:
    status: int
    headers: dict[str, str]
    set_cookies: list[str]
    body: bytes

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")

    @property
    def ctype(self) -> str:
        return self.headers.get("content-type", "")

    def json(self) -> Any:
        return json.loads(self.body.decode("utf-8"))

    def json_or_none(self) -> Any:
        try:
            return self.json()
        except (ValueError, UnicodeDecodeError):
            return None


def _multipart(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    boundary = f"----contract{uuid.uuid4().hex}"
    buf = io.BytesIO()
    for k, v in fields.items():
        buf.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for k, (filename, data, ctype) in files.items():
        buf.write(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {ctype}\r\n\r\n".encode()
        )
        buf.write(data)
        buf.write(b"\r\n")
    buf.write(f"--{boundary}--\r\n".encode())
    return buf.getvalue(), f"multipart/form-data; boundary={boundary}"


class Client:
    def __init__(self, name: str, ip: str | None = None):
        self.name = name
        self.ip = ip or new_ip()
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}),
            urllib.request.HTTPCookieProcessor(self.jar),
            _NoRedirect(),
        )

    def _csrf_header(self) -> dict[str, str]:
        for cookie in self.jar:
            if cookie.name == "XSRF-TOKEN":
                return {"X-XSRF-TOKEN": cookie.value}
        return {}

    def request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, Any] | None = None,
        json_body: Any = None,
        fields: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes, str]] | None = None,
        headers: dict[str, str] | None = None,
        ip: str | None = None,
    ) -> Resp:
        if method not in ("GET", "HEAD", "OPTIONS") and not self._csrf_header():
            self.get("/api/health")
        url = API_BASE + path
        if query:
            url += "?" + urllib.parse.urlencode(query)
        data = None
        hdrs = {"Accept": "application/json", "X-Forwarded-For": ip or self.ip}
        hdrs.update(self._csrf_header())
        if json_body is not None:
            data = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
            hdrs["Content-Type"] = "application/json"
        elif files is not None or fields is not None:
            data, ctype = _multipart(fields or {}, files or {})
            hdrs["Content-Type"] = ctype
        hdrs.update(headers or {})
        req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
        try:
            with self.opener.open(req, timeout=30) as r:
                status, raw_headers, body = r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            status, raw_headers, body = e.code, e.headers, e.read()
        merged: dict[str, str] = {}
        for k in dict.fromkeys(raw_headers.keys()):
            merged[k.lower()] = ", ".join(raw_headers.get_all(k) or [])
        return Resp(
            status=status,
            headers=merged,
            set_cookies=raw_headers.get_all("Set-Cookie") or [],
            body=body,
        )

    def get(self, path: str, **kw) -> Resp:
        return self.request("GET", path, **kw)

    def post(self, path: str, **kw) -> Resp:
        return self.request("POST", path, **kw)


# ---------------------------------------------------------------- recording


def _redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("captchaId",):
                out[k] = "<redacted>"
            else:
                out[k] = _redact(v)
        return out
    if isinstance(obj, list):
        return [_redact(x) for x in obj]
    return obj


def _redact_location(loc: str) -> str:
    return re.sub(r"(state=)[^&]+", r"\1<redacted>", loc)


def _redact_cookie(c: str) -> str:
    return re.sub(r"^([^=]+)=[^;]*", r"\1=<redacted>", c)


KEEP_HEADERS = (
    "content-type",
    "content-length",
    "location",
    "cache-control",
    "vary",
    "etag",
    "last-modified",
    "accept-ranges",
    "content-range",
    "allow",
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
    "access-control-allow-headers",
)


@dataclass
class Case:
    cid: str
    route: str
    actor: str
    title: str
    resp: Resp | None = None
    request: dict[str, Any] = field(default_factory=dict)
    checks: list[tuple[str, bool]] = field(default_factory=list)
    error: str | None = None

    def check(self, desc: str, cond: Any) -> bool:
        ok = bool(cond)
        self.checks.append((desc, ok))
        return ok

    @property
    def passed(self) -> bool:
        return self.error is None and bool(self.checks) and all(ok for _, ok in self.checks)

    def to_json(self) -> dict[str, Any]:
        r = self.resp
        out: dict[str, Any] = {
            "id": self.cid,
            "route": self.route,
            "actor": self.actor,
            "title": self.title,
            "request": self.request,
            "passed": self.passed,
            "checks": [{"desc": d, "ok": ok} for d, ok in self.checks],
        }
        if self.error:
            out["error"] = self.error
        if r is not None:
            headers = {k: v for k, v in r.headers.items() if k in KEEP_HEADERS}
            if "location" in headers:
                headers["location"] = _redact_location(headers["location"])
            out["status"] = r.status
            out["headers"] = headers
            if r.set_cookies:
                out["set_cookie"] = [_redact_cookie(c) for c in r.set_cookies]
            parsed = r.json_or_none() if "json" in r.ctype else None
            if parsed is not None:
                text = json.dumps(_redact(parsed), ensure_ascii=False)
                out["body"] = _redact(parsed) if len(text) <= 2400 else text[:2400] + "…(截断)"
            elif r.ctype.startswith(("text/", "application/xml", "application/rss+xml")):
                out["body_text"] = r.text[:1200] + ("…(截断)" if len(r.text) > 1200 else "")
            else:
                out["body_bytes"] = len(r.body)
        return out


class Runner:
    def __init__(self, phase: str, only_ids: set[str] | None = None, label: str = ""):
        self.phase = phase
        self.only_ids = only_ids
        self.label = label
        self.cases: list[Case] = []

    def _stem(self) -> str:
        return f"{self.phase}-{self.label}" if self.label else self.phase

    def run(
        self,
        cid: str,
        route: str,
        actor: str,
        title: str,
        fn: Callable[[Case], None],
    ) -> Case | None:
        if self.only_ids is not None and cid not in self.only_ids:
            return None
        case = Case(cid, route, actor, title)
        try:
            fn(case)
        except Exception as e:  # noqa: BLE001
            case.error = f"{type(e).__name__}: {e}"
        self.cases.append(case)
        mark = "PASS" if case.passed else "FAIL"
        print(f"[{mark}] {cid:<6} {route:<52} {actor:<7} {title}", flush=True)
        if not case.passed:
            for d, ok in case.checks:
                if not ok:
                    print(f"         ✗ {d}", flush=True)
            if case.error:
                print(f"         ! {case.error}", flush=True)
            if case.resp is not None:
                print(f"         status={case.resp.status} body={case.resp.text[:300]!r}", flush=True)
        return case

    def save(self) -> None:
        C.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        data = [c.to_json() for c in self.cases]
        (C.RESULTS_DIR / f"cases-{self._stem()}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        lines = [
            f"# 契约用例结果 · phase={self.phase} base={API_BASE}"
            + (f" label={self.label}" if self.label else ""),
            "",
            f"通过 {sum(c.passed for c in self.cases)} / {len(self.cases)}",
            "",
            "| 用例 | 路由 | 身份 | 状态码 | 结果 | 说明 |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for c in self.cases:
            st = c.resp.status if c.resp is not None else "-"
            lines.append(
                f"| {c.cid} | `{c.route}` | {c.actor} | {st} | {'通过' if c.passed else '失败'} | {c.title} |"
            )
        (C.RESULTS_DIR / f"summary-{self._stem()}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- helpers


def env_ok(r: Resp) -> dict[str, Any]:
    body = r.json()
    assert isinstance(body, dict), "响应不是对象"
    return body


def captcha_answer(question: str) -> str:
    m = re.match(r"^(\d+) \+ (\d+) = \?$", question)
    assert m, f"无法解析验证码题目 {question!r}"
    return str(int(m.group(1)) + int(m.group(2)))


def fresh_captcha(client: Client, path: str) -> tuple[str, str]:
    r = client.get(path)
    data = r.json()["data"]
    return data["captchaId"], captcha_answer(data["question"])


def oauth_login(client: Client, code: str, provider: str = "github", return_to: str = "/messages") -> tuple[Resp, Resp]:
    start = client.get(f"/api/auth/{provider}", query={"return_to": return_to})
    loc = start.headers.get("location", "")
    state = urllib.parse.parse_qs(urllib.parse.urlsplit(loc).query).get("state", [""])[0]
    cb = client.get(f"/api/auth/{provider}/callback", query={"code": code, "state": state})
    return start, cb


def java_target() -> bool:
    return API_BASE.rstrip("/") != C.FLASK_BASE.rstrip("/")


def mail_files() -> list[Path]:
    return sorted(C.MAIL_DIR.glob("*.eml"))


def wait_mail_count(n: int, timeout: float = 4.0) -> int:
    end = time.time() + timeout
    while time.time() < end:
        if len(mail_files()) >= n:
            break
        time.sleep(0.1)
    return len(mail_files())


def flask_log_tail() -> str:
    chunks = []
    for name in ("flask.log", "java.log"):
        path = C.LOG_DIR / name
        if path.is_file():
            chunks.append(path.read_text(encoding="utf-8", errors="replace")[-20000:])
    return "\n".join(chunks)


def png_bytes() -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


def slugs(posts: list[dict[str, Any]]) -> list[str]:
    return [p["slug"] for p in posts]


ALL_POST_SLUGS = {
    "contract-article-basic",
    "contract-algo-two-sum",
    "contract-article-untagged",
    "contract-note-alpha",
    "contract-note-hidden",
}


# ---------------------------------------------------------------- phase: default


def phase_default(R: Runner) -> None:
    anon = Client("anon")
    owner = Client("owner")
    guest = Client("guest")

    # ---------- app 级
    def c(case: Case) -> None:
        r = case.resp = anon.get("/")
        b = r.json()
        case.check("200", r.status == 200)
        case.check("service 字段", b.get("service") == "GrunRay wiki API")
        case.check("content_root 暴露服务器绝对路径", "content_root" in b and ":" in b["content_root"] or b.get("content_root", "").startswith("/"))

    R.run("A01", "GET /", "anon", "根路径服务信息", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/rss.xml")
        t = r.text
        case.check("200", r.status == 200)
        case.check(
            "Content-Type application/rss+xml; charset=utf-8",
            r.ctype.replace(" ", "") == "application/rss+xml;charset=utf-8",
        )
        case.check("链接以 FRIENDS_SITE_URL/blog/ 开头", f"{C.SITE_URL}/blog/contract-article-basic" in t)
        case.check("排除隐藏项目笔记", "contract-note-hidden" not in t)
        case.check("排除 published_at 为空的文章", "contract-article-untagged" not in t)
        case.check("包含项目笔记（项目已发布）", "contract-note-alpha" in t)

    R.run("A02", "GET /rss.xml", "anon", "RSS 2.0", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/sitemap.xml")
        t = r.text
        case.check("200", r.status == 200)
        case.check(
            "Content-Type application/xml; charset=utf-8",
            r.ctype.replace(" ", "") == "application/xml;charset=utf-8",
        )
        case.check("静态页 /blog", f"<loc>{C.SITE_URL}/blog</loc>" in t)
        case.check("文章 URL", f"{C.SITE_URL}/blog/contract-article-basic" in t)
        case.check("项目 URL", f"{C.SITE_URL}/projects/contract-alpha" in t)
        case.check("不含隐藏项目", "contract-hidden<" not in t and "/projects/contract-hidden" not in t)

    R.run("A03", "GET /sitemap.xml", "anon", "站点地图", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/robots.txt")
        t = r.text
        case.check("200", r.status == 200)
        case.check("text/plain", r.ctype.startswith("text/plain"))
        case.check("Disallow: /api/", "Disallow: /api/" in t)
        case.check("Sitemap 行", f"Sitemap: {C.SITE_URL}/sitemap.xml" in t)

    R.run("A04", "GET /robots.txt", "anon", "robots.txt", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/does-not-exist")
        case.check("404", r.status == 404)
        if java_target():
            case.check("JSON 信封 404（允许的修正）", (r.json_or_none() or {}).get("message") == "not_found")
        else:
            case.check("Flask 默认 HTML 404（非 JSON 信封）", r.ctype.startswith("text/html"))

    R.run("G01", "GET /api/<未注册>", "anon", "未知路由返回 HTML 404", c)

    def c(case: Case) -> None:
        r = case.resp = anon.post("/api/health", json_body={})
        case.check("405", r.status == 405)
        case.check("Allow 含 GET", "GET" in r.headers.get("allow", ""))
        if java_target():
            case.check("JSON 信封 405（允许的修正）", (r.json_or_none() or {}).get("message") == "method_not_allowed")
        else:
            case.check("HTML 错误页", r.ctype.startswith("text/html"))

    R.run("G02", "POST /api/health", "anon", "方法不允许返回 HTML 405", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/static/anything.js")
        case.check("404（Flask 内置 static 路由，目录不存在）", r.status == 404)

    R.run("G03", "GET /static/<path:filename>", "anon", "Flask 内置 static 路由", c)

    def c(case: Case) -> None:
        r = case.resp = anon.request(
            "OPTIONS",
            "/api/messages",
            headers={
                "Origin": C.FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        case.check("2xx", 200 <= r.status < 300)
        case.check("ACAO 回显允许的 Origin", r.headers.get("access-control-allow-origin") == C.FRONTEND_ORIGIN)
        case.check("Allow-Credentials true", r.headers.get("access-control-allow-credentials") == "true")

    R.run("G04", "OPTIONS /api/messages", "anon", "CORS 预检（允许的 Origin）", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/health", headers={"Origin": "http://evil.example"})
        case.check("200", r.status == 200)
        case.check("不允许的 Origin 不回 ACAO", "access-control-allow-origin" not in r.headers)

    R.run("G05", "GET /api/health", "anon", "CORS 不允许的 Origin", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/rss.xml", headers={"Origin": C.FRONTEND_ORIGIN})
        case.check("非 /api/* 不带 CORS 头", "access-control-allow-origin" not in r.headers)

    R.run("G06", "GET /rss.xml", "anon", "CORS 仅作用于 /api/*", c)

    # ---------- read_api
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/health")
        case.check("200 {ok:true}", r.status == 200 and r.json() == {"ok": True})

    R.run("R01", "GET /api/health", "anon", "健康检查", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts")
        b = r.json()
        posts = b["posts"]
        case.check("200 且顶层为 {posts}", r.status == 200 and list(b.keys()) == ["posts"])
        case.check("返回全部 5 篇（含隐藏项目笔记）", set(slugs(posts)) == ALL_POST_SLUGS)
        case.check(
            "排序 published_at DESC，NULL 最后",
            slugs(posts)
            == [
                "contract-note-hidden",
                "contract-note-alpha",
                "contract-article-basic",
                "contract-algo-two-sum",
                "contract-article-untagged",
            ],
        )
        by = {p["slug"]: p for p in posts}
        basic = by["contract-article-basic"]
        case.check("id 取 legacy_id", basic["id"] == "contract-001")
        case.check("日期格式 YYYY-MM-DDTHH:MM:SS.000Z", ISO_POST_RE.match(basic["published_at"]))
        case.check("published_at 为空时为空串", by["contract-article-untagged"]["published_at"] == "")
        case.check("无 tags 的文章由 jieba 补关键词", len(by["contract-article-untagged"]["tags"]) > 0)
        case.check("列表不含 body", "body" not in basic)
        case.check("cover 字段", basic.get("cover", "").endswith("bg-contract.png"))
        algo = by["contract-algo-two-sum"]
        case.check(
            "算法字段透传",
            (algo["difficulty"], algo["oj"], algo["problem_id"], algo["series"]) == ("easy", "LeetCode", "1", "契约系列"),
        )
        case.check("pinned / pinned_order", algo["pinned"] is True and algo["pinned_order"] == 1)
        case.check("category_id 算法=3", algo["category_id"] == 3)
        note = by["contract-note-alpha"]
        case.check("项目笔记字段", (note["project_id"], note["role"], note["feature_key"]) == ("proj-contract-alpha", "前端", "search"))

    R.run("R02", "GET /api/posts", "anon", "文章列表全量", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"type": "algorithm"})
        case.check("仅算法", slugs(r.json()["posts"]) == ["contract-algo-two-sum"])

    R.run("R03", "GET /api/posts", "anon", "type=algorithm", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"type": "bogus"})
        case.check("未知 type 返回 200 空列表", r.status == 200 and r.json()["posts"] == [])

    R.run("R04", "GET /api/posts", "anon", "type 未知值", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"type": "project_note", "project_id": "proj-contract-alpha"})
        case.check("仅该项目笔记", slugs(r.json()["posts"]) == ["contract-note-alpha"])

    R.run("R05", "GET /api/posts", "anon", "type=project_note&project_id", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"project_id": "proj-contract-alpha"})
        case.check("单独 project_id 也只返回项目笔记", slugs(r.json()["posts"]) == ["contract-note-alpha"])

    R.run("R06", "GET /api/posts", "anon", "仅 project_id", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"category_id": "3"})
        case.check("category_id=3", slugs(r.json()["posts"]) == ["contract-algo-two-sum"])

    R.run("R07", "GET /api/posts", "anon", "category_id=3", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts", query={"category_id": "abc"})
        case.check("400 信封 data=[]", r.status == 400 and r.json() == {"code": 1, "data": [], "message": "invalid category_id"})

    R.run("R08", "GET /api/posts", "anon", "category_id 非整数", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/latest-updated")
        s = slugs(r.json()["posts"])
        case.check("最多 3 条", len(s) == 3)
        case.check(
            "按更新时间倒序，且不含隐藏项目笔记",
            s == ["contract-article-untagged", "contract-article-basic", "contract-note-alpha"],
        )

    R.run("R09", "GET /api/posts/latest-updated", "anon", "最近更新", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/random-recommend")
        b = r.json()
        case.check("200 {post}", r.status == 200 and list(b.keys()) == ["post"])
        case.check("随机取自公开文章（排除隐藏项目笔记）", b["post"]["slug"] in ALL_POST_SLUGS - {"contract-note-hidden"})

    R.run("R10", "GET /api/posts/random-recommend", "anon", "随机推荐", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-article-basic")
        b = r.json()
        case.check("200 裸对象", r.status == 200 and b["slug"] == "contract-article-basic")
        case.check("含 body 原文", "## 小节标题" in b.get("body", ""))
        case.check("未带 html 参数时无 body_html", "body_html" not in b)

    R.run("R11", "GET /api/posts/<slug>", "anon", "文章详情", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-article-basic", query={"html": "1"})
        h = r.json().get("body_html", "")
        case.check("h2", "<h2>小节标题</h2>" in h)
        case.check("表格", "<table>" in h)
        case.check("删除线", "<del>删除线</del>" in h)
        case.check("代码高亮 codehilite", 'class="codehilite"' in h)
        case.check("nl2br", "<br" in h)

    R.run("R12", "GET /api/posts/<slug>", "anon", "html=1 渲染", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-note-hidden")
        case.check("隐藏项目下的笔记详情仍 200（可见性由前端判断）", r.status == 200)

    R.run("R13", "GET /api/posts/<slug>", "anon", "隐藏项目笔记直取", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/nope")
        case.check("404 {error:not_found}", r.status == 404 and r.json() == {"error": "not_found"})

    R.run("R14", "GET /api/posts/<slug>", "anon", "不存在", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/search", query={"q": ""})
        case.check("空查询", r.status == 200 and r.json() == {"query": "", "results": []})

    R.run("R15", "GET /api/search", "anon", "q 为空", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/search", query={"q": "契约 哈希表"})
        b = r.json()
        case.check("多词 AND", slugs(b["results"]) == ["contract-algo-two-sum"])
        case.check("回显 query", b["query"] == "契约 哈希表")

    R.run("R16", "GET /api/search", "anon", "多词 AND", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/search", query={"q": "契约"})
        case.check("200", r.status == 200)
        case.check("命中多篇", r.status == 200 and len(r.json()["results"]) >= 4)

    R.run("R17", "GET /api/search", "anon", "单词（并列打分，排序键含 published_at）", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/search", query={"q": "契约"})
        s = slugs(r.json()["results"])
        case.check(
            "同分按 published_at 升序（旧的在前），低分在后",
            s == ["contract-algo-two-sum", "contract-article-basic", "contract-note-alpha", "contract-note-hidden", "contract-article-untagged"],
        )
        r2 = anon.get("/api/search", query={"q": "样本"})
        case.request["tie_with_null_published_at"] = {"status": r2.status, "ctype": r2.ctype}
        if java_target():
            slugs2 = slugs((r2.json_or_none() or {}).get("results") or [])
            case.check(
                "NULL 日期视为最早，返回 200（允许的修正）",
                r2.status == 200 and "contract-article-untagged" in slugs2,
            )
        else:
            case.check("同分且一方 published_at 为 NULL → datetime 与 '' 比较 TypeError → 500 HTML", r2.status == 500 and r2.ctype.startswith("text/html"))

    R.run("R17b", "GET /api/search", "anon", "并列排序与 NULL 日期", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-algo-two-sum/related")
        case.check("200", r.status == 200)
        if r.status == 200:
            s = slugs(r.json()["posts"])
            case.check("不含自身", "contract-algo-two-sum" not in s)
            case.check("默认最多 5", len(s) <= 5)

    R.run("R18", "GET /api/posts/<slug>/related", "anon", "相关文章", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-algo-two-sum/related", query={"limit": "0"})
        case.check("limit 下限钳为 1", r.status == 200 and len(r.json()["posts"]) == 1)

    R.run("R19", "GET /api/posts/<slug>/related", "anon", "limit=0", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/contract-algo-two-sum/related", query={"limit": "abc"})
        case.check("非法 limit 回退默认 5（这里共 4 篇）", r.status == 200 and len(r.json()["posts"]) == 4)

    R.run("R20", "GET /api/posts/<slug>/related", "anon", "limit 非整数", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/posts/nope/related")
        case.check("404", r.status == 404 and r.json() == {"error": "not_found"})

    R.run("R21", "GET /api/posts/<slug>/related", "anon", "slug 不存在", c)

    film_png = "/api/media/files/film/homeView/right_panel/film-01.png"
    etag_holder: dict[str, str] = {}

    def c(case: Case) -> None:
        r = case.resp = anon.get(film_png, headers={"Accept": "*/*"})
        case.check("200 image/png", r.status == 200 and r.ctype == "image/png")
        case.check("Vary 仅有 flask-cors 追加的 Origin（原图不带 Accept）", r.headers.get("vary") == "Origin")
        case.check(
            "无 Origin 请求时 flask-cors always_send 仍回 ACAO（排序后首个 origin）",
            r.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173",
        )
        case.check("有 ETag / Last-Modified", "etag" in r.headers and "last-modified" in r.headers)
        case.check("Cache-Control: no-cache（Flask 默认）", r.headers.get("cache-control") == "no-cache")
        etag_holder["etag"] = r.headers.get("etag", "")

    R.run("R22", "GET /api/media/files/<path:filename>", "anon", "原图（不接受 webp）", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get(film_png, headers={"Accept": "image/avif,image/webp,*/*"})
        case.check("200 image/webp", r.status == 200 and r.ctype == "image/webp")
        case.check("两条 Vary：Accept（webp）+ Origin（flask-cors）", r.headers.get("vary") == "Accept, Origin")
        case.check("Cache-Control public, max-age=86400", r.headers.get("cache-control") == "public, max-age=86400")
        case.check("WebP 魔数", r.body[:4] == b"RIFF" and r.body[8:12] == b"WEBP")

    R.run("R23", "GET /api/media/files/<path:filename>", "anon", "Accept 含 image/webp 转码", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/files/film/homeView/right_panel/film-03.gif", headers={"Accept": "image/webp,*/*"})
        case.check("gif 不转码", r.status == 200 and r.ctype == "image/gif" and "Accept" not in r.headers.get("vary", ""))

    R.run("R24", "GET /api/media/files/<path:filename>", "anon", "gif 不参与 webp 协商", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get(film_png, headers={"Accept": "*/*", "If-None-Match": etag_holder.get("etag", "")})
        case.check("304", r.status == 304)

    R.run("R25", "GET /api/media/files/<path:filename>", "anon", "If-None-Match 条件请求", c)

    mp3 = "/api/media/files/music/contract-track-a.mp3"

    def c(case: Case) -> None:
        r = case.resp = anon.get(mp3, headers={"Accept": "*/*", "Range": "bytes=0-99"})
        case.check("206", r.status == 206)
        case.check("Content-Range", r.headers.get("content-range") == "bytes 0-99/65536")
        case.check("长度 100", len(r.body) == 100)
        case.check("audio/mpeg", r.ctype == "audio/mpeg")

    R.run("R26", "GET /api/media/files/<path:filename>", "anon", "音频 Range", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get(mp3, headers={"Accept": "*/*", "Range": "bytes=70000-"})
        case.check("416", r.status == 416)

    R.run("R27", "GET /api/media/files/<path:filename>", "anon", "越界 Range", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get(mp3, headers={"Accept": "*/*"})
        case.check("200 且 Accept-Ranges: bytes", r.status == 200 and r.headers.get("accept-ranges") == "bytes")

    R.run("R28", "GET /api/media/files/<path:filename>", "anon", "音频整段", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/files/..%2F.env", headers={"Accept": "*/*"})
        case.check("目录穿越 404", r.status == 404)

    R.run("R29", "GET /api/media/files/<path:filename>", "anon", "路径穿越", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/files/nope.png", headers={"Accept": "image/webp"})
        case.check("404 HTML", r.status == 404 and r.ctype.startswith("text/html"))

    R.run("R30", "GET /api/media/files/<path:filename>", "anon", "文件不存在", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/files/demos/contract-demo/v1/index.html", headers={"Accept": "text/html"})
        case.check("200 text/html", r.status == 200 and r.ctype.startswith("text/html"))
        r2 = anon.get("/api/media/files/demos/contract-demo/v1/assets/app.js", headers={"Accept": "*/*"})
        case.check("demo 资源 js 的 MIME", r2.status == 200 and "javascript" in r2.ctype)
        case.request["assets_ctype"] = r2.ctype

    R.run("R31", "GET /api/media/files/<path:filename>", "anon", "项目 demo 静态页", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list")
        b = r.json()
        case.check("信封 code=0", b["code"] == 0 and b["message"] == "")
        case.check("默认 5 条", len(b["data"]) == 5)
        item = b["data"][0]
        case.check("字段", set(item) == {"id", "url", "type", "title", "article_id", "tags", "created_at"})
        case.check("created_at 为 str(datetime)", re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", item["created_at"]))

    R.run("R32", "GET /api/media/list", "anon", "媒体列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list", query={"page": 1, "size": 1, "folder": "film/homeView/center/avatar"})
        d = r.json()["data"]
        case.check("首页头像 folder 过滤", len(d) == 1 and d[0]["url"].endswith("/avatar-contract.png"))

    R.run("R33", "GET /api/media/list", "anon", "folder 过滤（HomeView 用法）", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list", query={"type": "gif", "tag": "contract"})
        d = r.json()["data"]
        case.check("type+tag", len(d) == 1 and d[0]["type"] == "gif" and "contract" in d[0]["tags"])

    R.run("R34", "GET /api/media/list", "anon", "type 与 tag", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list", query={"page": "x"})
        case.check("400 data=[]", r.status == 400 and r.json() == {"code": 1, "data": [], "message": "invalid page/size"})
        r2 = anon.get("/api/media/list", query={"article_id": "x"})
        case.check("article_id 非整数", r2.status == 400 and r2.json()["message"] == "invalid article_id")

    R.run("R35", "GET /api/media/list", "anon", "参数非法", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list/filmfeed", query={"page": 1, "size": 50})
        d = r.json()["data"]
        case.check("仅 right_panel 3 条", len(d) == 3 and all("/homeView/right_panel/" in x["url"] for x in d))

    R.run("R36", "GET /api/media/list/filmfeed", "anon", "FilmFeed 白名单", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/media/list/filmfeed", query={"size": "x"})
        case.check("400", r.status == 400 and r.json()["data"] == [])

    R.run("R37", "GET /api/media/list/filmfeed", "anon", "size 非法", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/music/tracks", query={"size": 50})
        d = r.json()["data"]
        case.check("2 条按 sort_order", [x["title"] for x in d] == ["contract-track-a", "contract-track-b"])
        case.check(
            "字段",
            set(d[0]) == {"id", "url", "title", "artist", "duration_sec", "post_id", "tags", "sort_order", "created_at", "updated_at"},
        )
        case.check("url 前缀", d[0]["url"] == "/api/media/files/music/contract-track-a.mp3")

    R.run("R38", "GET /api/music/tracks", "anon", "曲目列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/music/tracks", query={"post_id": "x"})
        case.check("400", r.status == 400 and r.json()["message"] == "invalid post_id")

    R.run("R39", "GET /api/music/tracks", "anon", "post_id 非法", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/projects", query={"include_archived": "true"})
        ps = r.json()["projects"]
        case.check("不含 hidden，按 start_date DESC", [p["slug"] for p in ps] == ["contract-alpha", "contract-archived"])
        alpha = ps[0]
        case.check("id=public_id", alpha["id"] == "proj-contract-alpha")
        case.check("status 字符串", alpha["status"] == "published" and ps[1]["status"] == "archived")
        case.check("日期 YYYY-MM-DD", alpha["start_date"] == "2026-03-01" and alpha["end_date"] == "2026-09-30")
        case.check("列表带原始 related_posts_json", isinstance(alpha.get("related_posts_json"), list))
        case.check("layout 原样", alpha["layout"][1]["type"] == "demo")

    R.run("R40", "GET /api/projects", "anon", "项目列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/projects", query={"include_archived": "0"})
        case.check("排除 archived", [p["slug"] for p in r.json()["projects"]] == ["contract-alpha"])

    R.run("R41", "GET /api/projects", "anon", "include_archived=0", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/projects/contract-alpha")
        b = r.json()
        rp = b.get("related_posts", [])
        case.check("200", r.status == 200)
        case.check("详情去掉 related_posts_json", "related_posts_json" not in b)
        case.check(
            "手动（置顶优先）→ 自动",
            [(x["slug"], x["source"]) for x in rp]
            == [
                ("contract-article-basic", "manual"),
                ("contract-algo-two-sum", "manual"),
                ("contract-note-alpha", "auto"),
            ],
        )
        case.check("published_at 为 str(datetime)", rp and rp[0]["published_at"] == "2026-10-01 08:00:00")
        case.check("label", rp and rp[0]["label"] == "背景文章" and rp[1]["label"] is None)

    R.run("R42", "GET /api/projects/<slug>", "anon", "项目详情", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/projects/contract-hidden")
        case.check("hidden 404", r.status == 404 and r.json() == {"error": "not_found"})
        case.check("不存在 404", anon.get("/api/projects/nope").status == 404)

    R.run("R43", "GET /api/projects/<slug>", "anon", "hidden / 不存在", c)

    # ---------- fragments_api（公开）
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/fragments")
        d = r.json()["data"]
        case.check("信封 + 分页结构", set(d) == {"items", "total", "page", "size"} and d["size"] == 50)
        case.check("仅 published，newest", [x["id"] for x in d["items"]] == ["frag-contract-daily", "frag-contract-rant"])
        first = d["items"][0]
        case.check("封面图字段", first.get("imageUrl", "").endswith("frag-contract-daily.png") and first.get("imageAlt") == "合成配图")
        case.check("createdAt isoformat", first["createdAt"] == "2026-10-02T21:30:00")
        case.check("无图时不带 imageUrl", "imageUrl" not in d["items"][1])

    R.run("F01", "GET /api/fragments", "anon", "碎念列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/fragments", query={"mood": "rant", "sort": "oldest", "size": "500"})
        d = r.json()["data"]
        case.check("mood 过滤", [x["id"] for x in d["items"]] == ["frag-contract-rant"])
        case.check("size 上限 50", d["size"] == 50)
        r2 = anon.get("/api/fragments", query={"mood": "unknown"})
        case.check("未知 mood 返回空列表", r2.status == 200 and r2.json()["data"]["items"] == [])

    R.run("F02", "GET /api/fragments", "anon", "mood / sort / size", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/fragments", query={"page": "x"})
        case.check("400 data=null", r.status == 400 and r.json() == {"code": 1, "data": None, "message": "invalid page/size"})

    R.run("F03", "GET /api/fragments", "anon", "分页参数非法", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/fragments/frag-contract-daily")
        d = r.json()["data"]
        case.check("bodyHtml", "<strong>逐条</strong>" in d["bodyHtml"])
        case.check("body 原文", "**逐条**" in d["body"])
        case.check("images + coverIndex", d["images"][0]["alt"] == "合成配图" and d["coverIndex"] == 0)

    R.run("F04", "GET /api/fragments/<public_id>", "anon", "碎念详情", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/fragments/frag-contract-draft")
        case.check("草稿 404 信封", r.status == 404 and r.json() == {"code": 1, "data": None, "message": "not_found"})

    R.run("F05", "GET /api/fragments/<public_id>", "anon", "草稿不可见", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/xiqi/pages/fragments")
        d = r.json()["data"]
        case.check("hero 配置", d["heroImageUrl"].endswith("hero-contract.png") and d["status"] == "published")
        case.check("updatedAt 有值", bool(d["updatedAt"]))
        r2 = anon.get("/api/xiqi/pages/FRAGMENTS")
        case.check("page 大小写不敏感", r2.json()["data"]["heroImageUrl"] == d["heroImageUrl"])

    R.run("F06", "GET /api/xiqi/pages/<page>", "anon", "页面 hero", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/xiqi/pages/about")
        d = r.json()["data"]
        case.check(
            "hidden 页面返回默认值且 status 伪装为 published",
            d == {"page": "about", "heroImageUrl": None, "heroImageAlt": "", "status": "published", "updatedAt": None},
        )
        r2 = anon.get("/api/xiqi/pages/whatever")
        case.check("任意 page 也 200", r2.status == 200 and r2.json()["data"]["page"] == "whatever")

    R.run("F07", "GET /api/xiqi/pages/<page>", "anon", "hidden / 未知页面", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/xiqi/about")
        d = r.json()["data"]
        case.check("公开字段", d["alias"] == "契约站长" and d["genderAge"].startswith("合成"))
        case.check("不下发 Raw 字段", "schoolRaw" not in d["education"] and "companyRaw" not in d["internship"])
        case.check("email 公开", d["email"] == "owner@contract.example.test")
        case.check("awards", d["awards"] == [{"id": "contract-award", "label": "合成竞赛 · 银牌", "tier": "silver"}])

    R.run("F08", "GET /api/xiqi/about", "anon", "关于页履历", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/recommendations")
        d = r.json()["data"]
        case.check("仅 published，newest", [x["id"] for x in d["items"]] == ["rec-contract-editor", "rec-contract-anime"])
        ed = d["items"][0]
        case.check("字段", ed["rating"] == 5 and ed["url"].startswith("https://") and ed["imageUrl"].endswith(".png"))
        case.check("无 summary 时从正文抽取", d["items"][1]["summary"] != "")

    R.run("F09", "GET /api/recommendations", "anon", "推荐列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/recommendations", query={"category": "bad"})
        case.check("category 非法", r.status == 400 and r.json()["message"] == "invalid category")
        r2 = anon.get("/api/recommendations", query={"rating": "9"})
        case.check("rating 越界", r2.status == 400 and r2.json()["message"] == "invalid rating")
        r3 = anon.get("/api/recommendations", query={"rating": "5", "category": "software"})
        case.check("rating+category 过滤", [x["id"] for x in r3.json()["data"]["items"]] == ["rec-contract-editor"])

    R.run("F10", "GET /api/recommendations", "anon", "过滤与非法参数", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/recommendations/rec-contract-editor")
        d = r.json()["data"]
        case.check("详情 bodyHtml", "<strong>合成</strong>" in d["bodyHtml"] and d["coverIndex"] == 0)
        r2 = anon.get("/api/recommendations/rec-contract-draft")
        case.check("草稿 404", r2.status == 404 and r2.json()["data"] is None)

    R.run("F11", "GET /api/recommendations/<public_id>", "anon", "推荐详情", c)

    # ---------- auth_api
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/auth/providers")
        case.check("均已配置", r.json() == {"code": 0, "data": {"github": True, "google": True}, "message": ""})

    R.run("U01", "GET /api/auth/providers", "anon", "OAuth 提供方", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/auth/me")
        case.check("未登录 data=null", r.status == 200 and r.json() == {"code": 0, "data": None, "message": ""})

    R.run("U02", "GET /api/auth/me", "anon", "未登录", c)

    def c(case: Case) -> None:
        cl = Client("oauth-start")
        r = case.resp = cl.get("/api/auth/github", query={"return_to": "/messages"})
        loc = r.headers.get("location", "")
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(loc).query)
        case.check("302 到 github.com/login/oauth/authorize", r.status == 302 and loc.startswith("https://github.com/login/oauth/authorize?"))
        case.check("client_id", q.get("client_id") == ["contract-github-client"])
        case.check("redirect_uri = OAUTH_PUBLIC_BASE/api/auth/github/callback", q.get("redirect_uri") == [f"{C.FLASK_BASE}/api/auth/github/callback"])
        case.check("scope", q.get("scope") == ["read:user user:email"])
        case.check("state 存在", bool(q.get("state")))
        ck = " ".join(r.set_cookies)
        case.check("Set-Cookie session; HttpOnly; SameSite=Lax; Path=/", "session=" in ck and "HttpOnly" in ck and "SameSite=Lax" in ck and "Path=/" in ck)
        case.check("会话 Cookie 无 Expires（浏览器会话级）", "Expires" not in ck)

    R.run("U03", "GET /api/auth/github", "anon", "GitHub 授权跳转", c)

    def c(case: Case) -> None:
        cl = Client("oauth-google")
        r = case.resp = cl.get("/api/auth/google", query={"return_to": "/fragments"})
        loc = r.headers.get("location", "")
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(loc).query)
        case.check("302 到 accounts.google.com", r.status == 302 and loc.startswith("https://accounts.google.com/o/oauth2/v2/auth?"))
        case.check("参数", q.get("response_type") == ["code"] and q.get("scope") == ["openid email profile"] and q.get("prompt") == ["select_account"])

    R.run("U04", "GET /api/auth/google", "anon", "Google 授权跳转", c)

    def finish(cl: Client, code: str | None, state_override: str | None = None, extra: dict[str, str] | None = None, return_to: str = "/messages", provider: str = "github") -> Resp:
        start = cl.get(f"/api/auth/{provider}", query={"return_to": return_to})
        loc = start.headers.get("location", "")
        state = urllib.parse.parse_qs(urllib.parse.urlsplit(loc).query).get("state", [""])[0]
        q: dict[str, str] = {"state": state_override if state_override is not None else state}
        if code is not None:
            q["code"] = code
        q.update(extra or {})
        return cl.get(f"/api/auth/{provider}/callback", query=q)

    def c(case: Case) -> None:
        r = case.resp = finish(Client("cb-bad-state"), "guest", state_override="forged")
        case.check("302 auth_error=invalid_state", r.status == 302 and r.headers["location"] == f"{C.FRONTEND_ORIGIN}/messages?auth_error=invalid_state")

    R.run("U05", "GET /api/auth/github/callback", "anon", "state 不匹配", c)

    def c(case: Case) -> None:
        cl = Client("cb-no-session")
        r = case.resp = cl.get("/api/auth/github/callback", query={"code": "guest", "state": "x"})
        case.check("无会话 → invalid_state，return_to 默认 /messages", r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=invalid_state")

    R.run("U06", "GET /api/auth/github/callback", "anon", "未经 start 直接回调", c)

    def c(case: Case) -> None:
        r = case.resp = finish(Client("cb-denied"), None, extra={"error": "access_denied"}, return_to="/fragments")
        case.check("透传 error", r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/fragments?auth_error=access_denied")

    R.run("U07", "GET /api/auth/github/callback", "anon", "用户拒绝授权", c)

    def c(case: Case) -> None:
        r = case.resp = finish(Client("cb-nocode"), None)
        case.check("missing_code", r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=missing_code")

    R.run("U08", "GET /api/auth/github/callback", "anon", "缺 code", c)

    def c(case: Case) -> None:
        r = case.resp = finish(Client("cb-failtoken"), "fail-token")
        case.check("token 失败 → github_failed", r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=github_failed")
        r2 = finish(Client("cb-failuser"), "fail-user")
        case.check("userinfo 500 → github_failed", r2.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=github_failed")
        r3 = finish(Client("cb-g-failtoken"), "fail-token", provider="google")
        case.check("google token 失败 → google_failed", r3.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=google_failed")

    R.run("U09", "GET /api/auth/github/callback", "anon", "提供方失败（模拟服务）", c)

    def c(case: Case) -> None:
        cases = {
            "//evil.example/x": "/messages",
            "https://evil.example/": "/messages",
            "/a b": "/messages",
            "/messages#top": "/messages",
            "/blog/x?y=1": "/blog/x?y=1",
        }
        results = {}
        for raw, expect in cases.items():
            r = finish(Client("rt"), "guest", return_to=raw)
            loc = r.headers.get("location", "")
            sep = "&" if "?" in expect else "?"
            results[raw] = loc
            case.check(f"return_to {raw!r} → {expect!r}", loc == f"{C.FRONTEND_ORIGIN}{expect}{sep}auth=success")
        case.request["locations"] = results
        case.resp = r

    R.run("U10", "GET /api/auth/github/callback", "guest", "return_to 白名单与回跳拼接", c)

    def c(case: Case) -> None:
        r = finish(Client("rt-err"), None, extra={"error": "<x>&y=1"})
        case.resp = r
        case.check("error 值 URL 编码后透传", r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth_error=%3Cx%3E%26y%3D1")

    R.run("U11", "GET /api/auth/github/callback", "anon", "error 参数透传编码", c)

    log_before = sum(1 for _ in (C.RUN_DIR / "oauth_requests.jsonl").open(encoding="utf-8")) if (C.RUN_DIR / "oauth_requests.jsonl").is_file() else 0

    def c(case: Case) -> None:
        _, cb = oauth_login(owner, "owner")
        case.resp = cb
        case.check("302 auth=success", cb.status == 302 and cb.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth=success")
        me = owner.get("/api/auth/me").json()["data"]
        case.request["me"] = me
        case.check("isSiteOwner", me["isSiteOwner"] is True)
        case.check(
            "会话用户字段",
            set(me) == {"guest_user_id", "provider", "id", "login", "name", "email", "avatar_url", "profile_url", "isSiteOwner"},
        )
        case.check("id 为字符串", me["id"] == "900001" and isinstance(me["guest_user_id"], int))
        lines = (C.RUN_DIR / "oauth_requests.jsonl").read_text(encoding="utf-8").splitlines()[log_before:]
        tok = [json.loads(x) for x in lines if "access_token" in x]
        case.check(
            "换 token 时带 redirect_uri（与 start 一致）",
            tok and tok[-1]["form"].get("redirect_uri") == f"{C.FLASK_BASE}/api/auth/github/callback",
        )

    R.run("U12", "GET /api/auth/github/callback", "owner", "站长登录成功", c)

    def c(case: Case) -> None:
        _, cb = oauth_login(guest, "guest")
        case.resp = cb
        me = guest.get("/api/auth/me").json()["data"]
        case.request["me"] = me
        case.check("非站长", me["isSiteOwner"] is False)
        case.check("无公开 email 时回退 /user/emails 主邮箱", me["email"] == "contract-guest@users.contract.example.test")

    R.run("U13", "GET /api/auth/github/callback", "guest", "访客登录成功", c)

    def c(case: Case) -> None:
        g = Client("gguest")
        _, cb = oauth_login(g, "gguest", provider="google")
        case.resp = cb
        me = g.get("/api/auth/me").json()["data"]
        case.request["me"] = me
        case.check("google 登录", cb.headers.get("location") == f"{C.FRONTEND_ORIGIN}/messages?auth=success")
        case.check("login 取 email，profile_url 为空", me["login"] == "gguest@contract.example.test" and me["profile_url"] is None)

    R.run("U14", "GET /api/auth/google/callback", "guest", "Google 登录成功", c)

    def c(case: Case) -> None:
        g = Client("logout")
        oauth_login(g, "guest2")
        r = case.resp = g.post("/api/auth/logout")
        case.check("data=true", r.json() == {"code": 0, "data": True, "message": ""})
        case.check("登出后 me=null", g.get("/api/auth/me").json()["data"] is None)
        case.check("GET logout 405", g.get("/api/auth/logout").status == 405)

    R.run("U15", "POST /api/auth/logout", "guest", "登出", c)

    # ---------- messages_api
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/messages/captcha")
        d = r.json()["data"]
        case.check("captchaId + question", set(d) == {"captchaId", "question"} and re.match(r"^\d+ \+ \d+ = \?$", d["question"]))

    R.run("M01", "GET /api/messages/captcha", "anon", "留言验证码", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/messages")
        d = r.json()["data"]
        case.check("仅 published 顶层", [x["id"] for x in d["items"]] == ["msg-contract-b", "msg-contract-a"] and d["total"] == 2)
        a = d["items"][1]
        case.check("回复嵌套", [x["id"] for x in a["replies"]] == ["msg-contract-a-reply"])
        case.check("字段", set(a) == {"id", "author", "avatarUrl", "provider", "profileUrl", "isOwner", "content", "createdAt", "replies"})
        case.check("createdAt 无时区无毫秒", ISO_SEC_RE.match(a["createdAt"]))
        case.check("size 默认 20", d["size"] == 20)

    R.run("M02", "GET /api/messages", "anon", "公开留言列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/messages", query={"page": "x"})
        case.check("400 data=null", r.status == 400 and r.json() == {"code": 1, "data": None, "message": "分页参数无效"})

    R.run("M03", "GET /api/messages", "anon", "分页参数非法", c)

    def c(case: Case) -> None:
        r = case.resp = anon.post("/api/messages", json_body={"content": "匿名留言"})
        case.check("401", r.status == 401 and r.json()["message"] == "请先登录后再留言")

    R.run("M04", "POST /api/messages", "anon", "未登录", c)

    def c(case: Case) -> None:
        r = case.resp = guest.post("/api/messages", json_body={"content": "缺验证码"})
        case.check("请完成验证码", r.status == 400 and r.json()["message"] == "请完成验证码")
        cid, ans = fresh_captcha(guest, "/api/messages/captcha")
        r2 = guest.post("/api/messages", json_body={"content": "答案错", "captchaId": cid, "captchaAnswer": str(int(ans) + 1)})
        case.check("答案错误", r2.json()["message"] == "验证码答案错误")
        r3 = guest.post("/api/messages", json_body={"content": "复用", "captchaId": cid, "captchaAnswer": ans})
        case.check("错一次后验证码已作废", r3.json()["message"] == "验证码已过期，请刷新后重试")
        cid2, ans2 = fresh_captcha(guest, "/api/messages/captcha")
        r4 = guest.post("/api/messages", json_body={"content": "id 不符", "captchaId": "wrong", "captchaAnswer": ans2})
        case.check("captchaId 不符", r4.json()["message"] == "验证码无效，请刷新后重试")

    R.run("M05", "POST /api/messages", "guest", "验证码失败分支", c)

    guest_msg: dict[str, str] = {}

    def c(case: Case) -> None:
        n0 = len(mail_files())
        cid, ans = fresh_captcha(guest, "/api/messages/captcha")
        ip = new_ip()
        r = case.resp = guest.post("/api/messages", json_body={"content": "契约访客的第一条留言", "captchaId": cid, "captchaAnswer": ans}, ip=ip)
        case.check("MESSAGE_AUTO_PUBLISH=false → data=null + 待审核提示", r.status == 200 and r.json() == {"code": 0, "data": None, "message": "留言已提交，等待审核"})
        case.check("站长通知邮件", wait_mail_count(n0 + 1) == n0 + 1)
        cid, ans = fresh_captcha(guest, "/api/messages/captcha")
        r2 = guest.post("/api/messages", json_body={"content": "同 IP 立刻再发", "captchaId": cid, "captchaAnswer": ans}, ip=ip)
        case.check("同 IP 60s 冷却 429", r2.status == 429 and r2.json()["message"] == "提交过于频繁，请稍后再试")
        guest_msg["ip"] = ip

    R.run("M06", "POST /api/messages", "guest", "提交成功（待审）+ IP 冷却", c)

    def c(case: Case) -> None:
        bad = {
            "a": "内容长度需在 2–500 字之间",
            "<script>alert(1)</script>正文": "内容包含不允许的 HTML 或脚本",
            "这里有契约违禁词": "内容含有不允许的词语，请修改后重试",
        }
        for content, msg in bad.items():
            cid, ans = fresh_captcha(guest, "/api/messages/captcha")
            r = guest.post("/api/messages", json_body={"content": content, "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
            case.resp = r
            case.check(f"{content[:12]!r} → {msg}", r.status == 400 and r.json()["message"] == msg)
        cid, ans = fresh_captcha(guest, "/api/messages/captcha")
        r = guest.post("/api/messages", json_body={"content": 123, "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        case.check("content 非字符串", r.status == 400 and r.json()["message"] == "请填写留言内容")

    R.run("M07", "POST /api/messages", "guest", "内容校验", c)

    def c(case: Case) -> None:
        r = case.resp = anon.post("/api/messages/msg-contract-b/reply", json_body={"content": "匿名回复"})
        case.check("401", r.status == 401 and r.json()["message"] == "请先登录后再回复")
        r2 = guest.post("/api/messages/nope/reply", json_body={"content": "回复不存在"}, ip=new_ip())
        case.check("父留言不存在 404", r2.status == 404 and r2.json()["message"] == "留言不存在")
        r3 = guest.post("/api/messages/msg-contract-pending/reply", json_body={"content": "回复待审"}, ip=new_ip())
        case.check("父留言未发布 400", r3.status == 400 and r3.json()["message"] == "仅可对已发布的留言回复")
        r4 = guest.post("/api/messages/msg-contract-a-reply/reply", json_body={"content": "回复回复"}, ip=new_ip())
        case.check("回复的回复不支持（视为不存在）", r4.status == 404)
        r5 = guest.post("/api/messages/msg-contract-b/reply", json_body={"content": None}, ip=new_ip())
        case.check("content 缺失", r5.status == 400 and r5.json()["message"] == "请填写回复内容")

    R.run("M08", "POST /api/messages/<public_id>/reply", "guest", "回复失败分支", c)

    def c(case: Case) -> None:
        n0 = len(mail_files())
        ip = new_ip()
        r = case.resp = guest.post("/api/messages/msg-contract-b/reply", json_body={"content": "访客回复站长"}, ip=ip)
        d = r.json()["data"]
        case.check("200 返回父留言 + 回复", r.status == 200 and d["id"] == "msg-contract-b" and d["replies"][-1]["content"] == "访客回复站长")
        case.check("message=回复成功", r.json()["message"] == "回复成功")
        case.check("回复不经审核直接公开（即使 AUTO_PUBLISH=false）", any(x["content"] == "访客回复站长" for m in anon.get("/api/messages").json()["data"]["items"] for x in m["replies"]))
        case.check("访客回复也发站长邮件", wait_mail_count(n0 + 1) == n0 + 1)
        r2 = guest.post("/api/messages/msg-contract-b/reply", json_body={"content": "立刻再回复"}, ip=ip)
        case.check("同 IP 10s 回复冷却（对所有人生效）429", r2.status == 429 and r2.json()["message"] == "回复过于频繁，请稍后再试")

    R.run("M09", "POST /api/messages/<public_id>/reply", "guest", "回复成功 + 冷却", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/messages/admin")
        case.check("匿名 401 请先登录", r.status == 401 and r.json() == {"code": 1, "data": None, "message": "请先登录"})
        r2 = guest.get("/api/messages/admin")
        case.check("访客 403", r2.status == 403 and r2.json()["message"] == "需要站长权限")

    R.run("M10", "GET /api/messages/admin", "guest", "权限", c)

    def c(case: Case) -> None:
        r = case.resp = owner.get("/api/messages/admin")
        d = r.json()["data"]
        ids = [x["id"] for x in d["items"]]
        case.check("默认 pending", "msg-contract-pending" in ids and all(x["status"] == 0 for x in d["items"]))
        case.check("含访客新留言（uuid）", any(UUID_RE.match(x) for x in ids))
        guest_msg["id"] = next(x for x in ids if UUID_RE.match(x))
        r2 = owner.get("/api/messages/admin", query={"status": "hidden"})
        case.check("status=hidden", [x["id"] for x in r2.json()["data"]["items"]] == ["msg-contract-hidden"])
        r3 = owner.get("/api/messages/admin", query={"status": "bogus"})
        case.check("未知 status 回退 pending", r3.json()["data"]["total"] == d["total"])

    R.run("M11", "GET /api/messages/admin", "owner", "审核列表", c)

    def c(case: Case) -> None:
        r = case.resp = owner.request("PATCH", "/api/messages/admin/msg-contract-pending", json_body={"action": "approve"})
        case.check("approve → 1", r.status == 200 and r.json()["data"]["status"] == 1 and r.json()["message"] == "操作成功")
        r2 = owner.request("PATCH", f"/api/messages/admin/{guest_msg['id']}", json_body={"action": "reject"})
        case.check("reject → 3", r2.json()["data"]["status"] == 3)
        r3 = owner.request("PATCH", f"/api/messages/admin/{guest_msg['id']}", json_body={"action": "approve"})
        case.check("rejected 不能 approve", r3.status == 400 and r3.json()["message"] == "当前状态无法通过审核")
        r4 = owner.request("PATCH", "/api/messages/admin/msg-contract-hidden", json_body={"action": "restore"})
        case.check("restore → 1", r4.json()["data"]["status"] == 1)
        r5 = owner.request("PATCH", "/api/messages/admin/msg-contract-hidden", json_body={"action": "hide"})
        case.check("hide → 2", r5.json()["data"]["status"] == 2)
        r6 = owner.request("PATCH", "/api/messages/admin/msg-contract-hidden", json_body={})
        case.check("缺 action", r6.status == 400 and r6.json()["message"] == "请指定审核动作 action")
        r7 = owner.request("PATCH", "/api/messages/admin/msg-contract-hidden", json_body={"action": "nuke"})
        case.check("未知动作", r7.status == 400 and r7.json()["message"] == "未知的审核动作")
        r8 = owner.request("PATCH", "/api/messages/admin/nope", json_body={"action": "approve"})
        case.check("不存在 → 400（非 404）", r8.status == 400 and r8.json()["message"] == "留言不存在")
        r9 = guest.request("PATCH", "/api/messages/admin/msg-contract-hidden", json_body={"action": "restore"})
        case.check("访客 403", r9.status == 403)

    R.run("M12", "PATCH /api/messages/admin/<public_id>", "owner", "审核状态机", c)

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/messages/admin/msg-contract-b/block")
        case.check("不能拉黑站长", r.status == 400 and r.json()["message"] == "无法拉黑站长")
        r2 = owner.post("/api/messages/admin/msg-contract-pending/block")
        case.check("无 guest_user_id 的留言", r2.status == 400 and r2.json()["message"] == "该留言未关联登录用户，无法拉黑")
        r3 = owner.post("/api/messages/admin/msg-contract-a/block")
        case.check("拉黑成功", r3.status == 200 and r3.json() == {"code": 0, "data": None, "message": "已拉黑该用户"})
        pub = [x["id"] for x in anon.get("/api/messages").json()["data"]["items"]]
        case.check("被拉黑用户已发布留言变 hidden", "msg-contract-a" not in pub)
        blocked = Client("blocked")
        oauth_login(blocked, "blocked")
        case.check("被拉黑用户仍可登录", blocked.get("/api/auth/me").json()["data"] is not None)
        cid, ans = fresh_captcha(blocked, "/api/messages/captcha")
        r4 = blocked.post("/api/messages", json_body={"content": "被拉黑后发言", "captchaId": cid, "captchaAnswer": ans})
        case.check("发言 403", r4.status == 403 and r4.json()["message"] == "您的账号已被限制留言")
        r5 = blocked.post("/api/messages/msg-contract-b/reply", json_body={"content": "被拉黑后回复"})
        case.check("回复 403", r5.status == 403)
        r6 = owner.post("/api/messages/admin/nope/block")
        case.check("不存在", r6.status == 400 and r6.json()["message"] == "留言不存在")

    R.run("M13", "POST /api/messages/admin/<public_id>/block", "owner", "拉黑", c)

    def c(case: Case) -> None:
        r = case.resp = owner.request("DELETE", "/api/messages/admin/msg-contract-hidden")
        case.check("删除", r.status == 200 and r.json() == {"code": 0, "data": None, "message": "留言已删除"})
        r2 = owner.request("DELETE", "/api/messages/admin/msg-contract-hidden")
        case.check("再删 400", r2.status == 400 and r2.json()["message"] == "留言不存在")
        r3 = owner.request("DELETE", "/api/messages/admin/msg-contract-a-reply")
        case.check("不能单删回复（视为不存在）", r3.status == 400)
        r4 = anon.request("DELETE", "/api/messages/admin/msg-contract-b")
        case.check("匿名 401", r4.status == 401)

    R.run("M14", "DELETE /api/messages/admin/<public_id>", "owner", "删除", c)

    def c(case: Case) -> None:
        n0 = len(mail_files())
        cid, ans = fresh_captcha(owner, "/api/messages/captcha")
        r = case.resp = owner.post("/api/messages", json_body={"content": "站长自己留言", "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        case.check("站长留言同样走待审", r.json()["message"] == "留言已提交，等待审核")
        time.sleep(1.0)
        case.check("站长留言不发邮件", len(mail_files()) == n0)
        items = owner.get("/api/messages/admin").json()["data"]["items"]
        case.check("is_owner 标记", any(x["isOwner"] and x["content"] == "站长自己留言" for x in items))

    R.run("M15", "POST /api/messages", "owner", "站长留言", c)

    def c(case: Case) -> None:
        g2 = Client("mailfail")
        oauth_login(g2, "guest2")
        n0 = len(mail_files())
        C.SMTP_FAIL_FLAG.write_text("1", encoding="utf-8")
        try:
            cid, ans = fresh_captcha(g2, "/api/messages/captcha")
            r = case.resp = g2.post("/api/messages", json_body={"content": "邮件失败时的留言", "captchaId": cid, "captchaAnswer": ans})
            case.check("SMTP 554 不影响接口：仍 200", r.status == 200 and r.json()["code"] == 0)
            end = time.time() + 4
            hit = False
            while time.time() < end and not hit:
                hit = "owner mail failed: SMTPDataError" in flask_log_tail()
                time.sleep(0.2)
            case.check("后台线程仅记 warning（owner mail failed: SMTPDataError）", hit)
            case.check("未落盘新邮件", len(mail_files()) == n0)
        finally:
            C.SMTP_FAIL_FLAG.unlink(missing_ok=True)

    R.run("M16", "POST /api/messages", "guest", "邮件发送失败", c)

    # ---------- friends_api
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/friends")
        d = r.json()["data"]
        case.check("sort_order DESC", [x["id"] for x in d["items"]] == ["friend-contract-a", "friend-contract-b"] and d["total"] == 2)
        a = d["items"][0]
        case.request["public_keys"] = sorted(a)
        case.check("公开字段（无 contactEmail/status/sortOrder）", {"id", "name", "url", "description"} <= set(a) and not {"contactEmail", "status", "sortOrder"} & set(a))
        case.check("tags 透传", a.get("tags") == ["blog"])
        case.check("无头像时省略 avatar/cover", "avatar" not in d["items"][1])

    R.run("FR01", "GET /api/friends", "anon", "友链列表", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/friends/special")
        items = r.json()["data"]["items"]
        case.check("过滤缺 id 的条目", len(items) == 2)
        case.check("icon 白名单", items[0].get("icon") == "travellings" and "icon" not in items[1])

    R.run("FR02", "GET /api/friends/special", "anon", "特殊链接", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/friends/site-profile")
        d = r.json()["data"]
        case.check(
            "站点资料（logo 为空时回退 FRONTEND_ORIGIN/favicon.jpg，而非 FRIENDS_SITE_URL）",
            d == {"title": "GrunRay 契约站", "url": C.SITE_URL, "logo": f"{C.FRONTEND_ORIGIN}/favicon.jpg", "description": "契约沙箱的合成站点描述"},
        )

    R.run("FR03", "GET /api/friends/site-profile", "anon", "本站资料", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/friends/captcha")
        case.check("验证码", set(r.json()["data"]) == {"captchaId", "question"})

    R.run("FR04", "GET /api/friends/captcha", "anon", "友链验证码", c)

    applicant = Client("applicant")
    new_friend: dict[str, str] = {}

    def apply(cl: Client, ip: str, **over: Any) -> Resp:
        cid, ans = fresh_captcha(cl, "/api/friends/captcha")
        body = {
            "siteName": "契约申请站",
            "siteUrl": "https://apply.contract.example.test/",
            "description": "合成的友链申请",
            "contactEmail": "apply@contract.example.test",
            "captchaId": cid,
            "captchaAnswer": ans,
        }
        body.update(over)
        return cl.post("/api/friends/applications", json_body=body, ip=ip)

    def c(case: Case) -> None:
        r = case.resp = applicant.post("/api/friends/applications", json_body={"siteName": "x"})
        case.check("缺验证码", r.status == 400 and r.json()["message"] == "请完成验证码")
        n0 = len(mail_files())
        ip = new_ip()
        r2 = apply(applicant, ip)
        b = r2.json()
        case.check("匿名可申请，待审", r2.status == 200 and b["message"] == "申请已提交，等待审核" and UUID_RE.match(b["data"]["publicId"]))
        new_friend["id"] = b["data"]["publicId"]
        case.check("邮件通知", wait_mail_count(n0 + 1) == n0 + 1)
        r3 = apply(applicant, ip)
        case.check("同 IP 120s 冷却 429", r3.status == 429 and r3.json()["message"] == "提交过于频繁，请稍后再试")
        case.resp = r2

    R.run("FR05", "POST /api/friends/applications", "anon", "申请成功 + 冷却", c)

    def c(case: Case) -> None:
        cases = [
            ({"siteUrl": "ftp://x.example"}, "站点地址须为 http:// 或 https://"),
            ({"siteUrl": "not a url"}, "站点地址格式不正确"),
            ({"contactEmail": ""}, "请填写联系邮箱"),
            ({"contactEmail": "bad@"}, "邮箱格式不正确"),
            ({"avatarUrl": "javascript:alert(1)"}, "头像地址格式不正确，请使用 http:// 或 https://"),
            ({"siteName": "<script>x</script>"}, "内容包含不允许的 HTML 或脚本"),
            ({"description": "x" * 201}, "简介不能超过 200 个字符"),
        ]
        for over, msg in cases:
            r = apply(applicant, new_ip(), **over)
            case.resp = r
            case.check(f"{list(over)[0]} → {msg}", r.status == 400 and r.json()["message"] == msg)

    R.run("FR06", "POST /api/friends/applications", "anon", "字段校验", c)

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/friends/admin")
        case.check("匿名 401", r.status == 401 and r.json()["message"] == "请先登录")
        case.check("访客 403", guest.get("/api/friends/admin").status == 403)
        r2 = owner.get("/api/friends/admin")
        d = r2.json()["data"]
        case.check("默认 pending", {x["id"] for x in d["items"]} == {"friend-contract-pending", "friend-contract-dup", new_friend["id"]})
        item = next(x for x in d["items"] if x["id"] == "friend-contract-pending")
        case.check("站长字段", {"status", "sortOrder", "contactEmail", "createdAt", "updatedAt"} <= set(item))
        r3 = owner.get("/api/friends/admin", query={"status": "all"})
        st = [x["status"] for x in r3.json()["data"]["items"]]
        case.check("status=all 按 status ASC", r3.json()["data"]["total"] == 5 and st == sorted(st))
        case.resp = r2

    R.run("FR07", "GET /api/friends/admin", "owner", "友链审核列表", c)

    def c(case: Case) -> None:
        pa = lambda pid, body, cl=owner: cl.request("PATCH", f"/api/friends/admin/{pid}", json_body=body)  # noqa: E731
        r = case.resp = pa("friend-contract-pending", {"action": "approve"})
        case.check("approve", r.status == 200 and r.json()["data"]["status"] == 1 and r.json()["message"] == "操作成功")
        r2 = pa("friend-contract-dup", {"action": "approve"})
        case.check("URL 规范化冲突", r2.status == 400 and r2.json()["message"] == "该站点 URL 已有已发布友链，无法通过审核")
        r3 = pa("friend-contract-dup", {"description": "改过的简介", "action": "approve"})
        desc = next(x for x in owner.get("/api/friends/admin").json()["data"]["items"] if x["id"] == "friend-contract-dup")["description"]
        case.check("字段更新 + 动作失败 → 整体回滚", r3.status == 400 and desc != "改过的简介")
        r4 = pa("friend-contract-b", {"sortOrder": 99})
        case.check("更新 sortOrder", r4.json()["data"]["sortOrder"] == 99)
        case.check("公开列表随之重排", anon.get("/api/friends").json()["data"]["items"][0]["id"] == "friend-contract-b")
        case.check("sortOrder 非法", pa("friend-contract-b", {"sortOrder": "x"}).json()["message"] == "排序值无效")
        case.check("空 body", pa("friend-contract-b", {}).json()["message"] == "请指定审核动作 action 或要更新的字段")
        case.check("不存在 → 400", pa("nope", {"action": "approve"}).json()["message"] == "友链不存在")
        case.check("published 不能 reject", pa("friend-contract-a", {"action": "reject"}).json()["message"] == "仅待审核申请可拒绝")
        case.check("访客 403", pa("friend-contract-a", {"action": "hide"}, guest).status == 403)
        r_meta = pa("friend-contract-b", {"avatarUrl": "https://contract.example.test/a.png", "contactEmail": "edit@contract.example.test"})
        meta = r_meta.json()["data"]
        case.check("头像与邮箱写入", r_meta.status == 200 and meta.get("avatar") == "https://contract.example.test/a.png" and meta.get("contactEmail") == "edit@contract.example.test")
        r_url = pa("friend-contract-b", {"url": "https://a.contract.example.test"})
        case.check("已发布改成重复 URL", r_url.status == 400 and r_url.json()["message"] == "该站点 URL 已有已发布友链")

    R.run("FR08", "PATCH /api/friends/admin/<public_id>", "owner", "审核与编辑", c)

    # ---------- site now
    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/site/now")
        case.check("无记录时全 null", r.json() == {"code": 0, "data": {"doing": None, "reading": None, "updatedAt": None}, "message": ""})

    R.run("X01", "GET /api/site/now", "anon", "此刻（初始）", c)

    def c(case: Case) -> None:
        r = case.resp = anon.request("PUT", "/api/site/now", json_body={"doing": "x"})
        case.check("匿名 401", r.status == 401)
        case.check("访客 403", guest.request("PUT", "/api/site/now", json_body={"doing": "x"}).status == 403)
        r2 = owner.request("PUT", "/api/site/now", json_body={"doing": "<b>写</b>契约", "reading": "合成书"})
        d = r2.json()["data"]
        case.check("去 HTML 标签", d["doing"] == "写契约" and d["reading"] == "合成书")
        case.check("updatedAt 'YYYY-MM-DD HH:MM:SS'", NOW_RE.match(d["updatedAt"] or ""))
        case.check("message", r2.json()["message"] == "已更新此刻状态")
        r3 = owner.request("PUT", "/api/site/now", json_body={"doing": "x" * 201})
        case.check("超 200 字", r3.status == 400 and r3.json()["message"] == "doing 最多 200 字")
        r4 = owner.request("PUT", "/api/site/now", json_body={"doing": "只改 doing"})
        case.check("整体覆盖：未传 reading 即清空", r4.json()["data"]["reading"] is None)
        case.check("GET 读到最新值", anon.get("/api/site/now").json()["data"]["doing"] == "只改 doing")
        case.resp = r2

    R.run("X02", "PUT /api/site/now", "owner", "写入此刻", c)

    # ---------- xiqi admin
    def c(case: Case) -> None:
        case.check("匿名 401", anon.get("/api/xiqi/admin/fragments").status == 401)
        case.check("访客 403", guest.get("/api/xiqi/admin/fragments").status == 403)
        r = case.resp = owner.get("/api/xiqi/admin/fragments")
        d = r.json()["data"]
        case.check("含草稿与 status", d["total"] == 3 and {x["status"] for x in d["items"]} == {"published", "draft"})
        r2 = owner.get("/api/xiqi/admin/fragments", query={"status": "draft"})
        case.check("status=draft", [x["id"] for x in r2.json()["data"]["items"]] == ["frag-contract-draft"])
        r3 = owner.get("/api/xiqi/admin/fragments", query={"status": "bad"})
        case.check("status 非法", r3.status == 400 and r3.json()["message"] == "status 必须是 ['draft', 'hidden', 'published']")
        r4 = owner.get("/api/xiqi/admin/fragments", query={"size": "500"})
        case.check("size 上限 100", r4.json()["data"]["size"] == 100)

    R.run("X03", "GET /api/xiqi/admin/fragments", "owner", "碎念管理列表", c)

    def c(case: Case) -> None:
        r = case.resp = owner.get("/api/xiqi/admin/fragments/frag-contract-draft")
        d = r.json()["data"]
        case.check("草稿可取，bodyHtml 为空串", d["status"] == "draft" and d["bodyHtml"] == "" and "草稿碎念" in d["body"])
        r2 = owner.get("/api/xiqi/admin/fragments/nope")
        case.check("不存在 404", r2.status == 404 and r2.json() == {"code": 1, "data": None, "message": "not_found"})

    R.run("X04", "GET /api/xiqi/admin/fragments/<public_id>", "owner", "碎念管理详情", c)

    def c(case: Case) -> None:
        r = case.resp = owner.get("/api/xiqi/admin/recommendations", query={"status": "all"})
        d = r.json()["data"]
        case.check("全部 3 条", d["total"] == 3)
        case.check("category 过滤", owner.get("/api/xiqi/admin/recommendations", query={"category": "opensource"}).json()["data"]["total"] == 1)
        case.check("匿名 401", anon.get("/api/xiqi/admin/recommendations").status == 401)

    R.run("X05", "GET /api/xiqi/admin/recommendations", "owner", "推荐管理列表", c)

    def c(case: Case) -> None:
        r = case.resp = owner.get("/api/xiqi/admin/recommendations/rec-contract-draft")
        d = r.json()["data"]
        case.check("草稿详情", d["status"] == "draft" and d["bodyHtml"] == "")
        case.check("不存在 404", owner.get("/api/xiqi/admin/recommendations/nope").status == 404)

    R.run("X06", "GET /api/xiqi/admin/recommendations/<public_id>", "owner", "推荐管理详情", c)

    png = png_bytes()

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/xiqi/media", query={"scope": "fragments"}, fields={"alt": "上传配图"}, files={"file": ("pic.PNG", png, "image/png")})
        d = r.json()["data"]
        case.check("返回 url + alt", re.match(r"^/api/media/files/xiqi/fragments/[0-9a-f]{32}\.png$", d["url"]) and d["alt"] == "上传配图")
        case.check("上传后可读", anon.get(d["url"], headers={"Accept": "*/*"}).status == 200)
        r2 = owner.post("/api/xiqi/media", fields={"scope": "pages/about"}, files={"file": ("h.jpg", png, "image/jpeg")})
        case.check("scope 走表单字段", r2.json()["data"]["url"].startswith("/api/media/files/xiqi/pages/about/"))
        case.check("scope 非法", owner.post("/api/xiqi/media", query={"scope": "bad"}, files={"file": ("a.png", png, "image/png")}).json()["message"] == "未知 media scope: 'bad'")
        case.check("页面 scope 非法", owner.post("/api/xiqi/media", query={"scope": "pages/bad"}, files={"file": ("a.png", png, "image/png")}).json()["message"] == "未知页面 scope: 'pages/bad'")
        case.check("缺 file", owner.post("/api/xiqi/media", query={"scope": "fragments"}, fields={"x": "1"}).json()["message"] == "缺少 file 字段")
        case.check("扩展名白名单", owner.post("/api/xiqi/media", query={"scope": "fragments"}, files={"file": ("a.txt", b"hi", "text/plain")}).json()["message"] == "不支持的文件类型: .txt")
        case.check("匿名 401", anon.post("/api/xiqi/media", query={"scope": "fragments"}, files={"file": ("a.png", png, "image/png")}).status == 401)

    R.run("X07", "POST /api/xiqi/media", "owner", "通用上传", c)

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/fragments/media", files={"file": ("a.webp", png, "image/webp")})
        case.check("等价 scope=fragments", r.json()["data"]["url"].startswith("/api/media/files/xiqi/fragments/"))

    R.run("X08", "POST /api/fragments/media", "owner", "旧碎念上传", c)

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/recommendations/media", files={"file": ("a.gif", png, "image/gif")})
        case.check("等价 scope=recommendations", r.json()["data"]["url"].startswith("/api/media/files/xiqi/recommendations/"))

    R.run("X09", "POST /api/recommendations/media", "owner", "推荐上传", c)

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/xiqi/hero-media", query={"page": "about"}, files={"file": ("h.png", png, "image/png")})
        d = r.json()["data"]
        case.check("带 page", d["page"] == "about" and d["url"].startswith("/api/media/files/xiqi/pages/about/"))
        r2 = anon.post("/api/xiqi/hero-media", query={"page": "bad"}, files={"file": ("h.png", png, "image/png")})
        case.check("page 非法先于鉴权：匿名得到 400", r2.status == 400)
        r3 = anon.post("/api/xiqi/hero-media", query={"page": "about"}, files={"file": ("h.png", png, "image/png")})
        case.check("page 合法时匿名 401", r3.status == 401)

    R.run("X10", "POST /api/xiqi/hero-media", "owner", "hero 上传", c)

    def c(case: Case) -> None:
        body = {"publicId": "frag-contract-file", "mood": "flash", "status": "published", "bodyMarkdown": "写到 import 的碎念", "images": [], "coverIndex": 0}
        r = case.resp = owner.post("/api/fragments/import-file", json_body=body)
        b = r.json()
        case.request["path"] = b["data"]["path"]
        case.check("path 相对 import/（分隔符随操作系统）", b["data"]["path"].replace("\\", "/") == "xiqi/fragments/frag-contract-file.md")
        case.check("importCommand + message", b["data"]["importCommand"] == "python scripts/xiqi_tools/import_xiqi.py fragments" and b["message"].startswith("已保存至 import"))
        case.check("文件写入沙箱 import", (C.SANDBOX_BACKEND / "import/xiqi/fragments/frag-contract-file.md").is_file())
        frag_file = (C.SANDBOX_BACKEND / "import/xiqi/fragments/frag-contract-file.md").read_text(encoding="utf-8")
        case.check("import 含 created_at / images / cover_index", "created_at:" in frag_file and "images: []" in frag_file and "cover_index: 0" in frag_file)
        case.check("未入库", anon.get("/api/fragments/frag-contract-file").status == 404)
        case.check("mood 非法", owner.post("/api/fragments/import-file", json_body={**body, "mood": "x"}).json()["message"] == "mood 必须是 ['daily', 'flash', 'rant', 'sketch']")
        case.check("正文为空", owner.post("/api/fragments/import-file", json_body={**body, "bodyMarkdown": " "}).json()["message"] == "正文不能为空")
        r500 = owner.post("/api/fragments/import-file", json_body={**body, "coverIndex": "x"})
        if java_target():
            case.check("coverIndex 非整数 → 400 JSON（Java 修正）", r500.status == 400 and "coverIndex" in (r500.json() or {}).get("message", ""))
        else:
            case.check("coverIndex 非整数 → 未捕获 500（HTML）", r500.status == 500 and r500.ctype.startswith("text/html"))
        r_tr = owner.post("/api/fragments/import-file", json_body={**body, "publicId": "../contract-traversal"})
        case.request["traversal_path"] = r_tr.json()["data"]["path"] if r_tr.status == 200 else r_tr.text[:200]
        outside = C.SANDBOX_BACKEND / "import/xiqi/contract-traversal.md"
        if java_target():
            case.check("publicId 穿越被拒，不写出目录", r_tr.status == 400 and not outside.is_file())
        else:
            case.check("publicId 未校验：../ 写到 fragments 目录之外", r_tr.status == 200 and outside.is_file())
        case.check("匿名 401", anon.post("/api/fragments/import-file", json_body=body).status == 401)

    R.run("X11", "POST /api/fragments/import-file", "owner", "碎念写 import", c)

    def c(case: Case) -> None:
        body = {"publicId": "frag-contract-db", "mood": "daily", "status": "published", "bodyMarkdown": "入库碎念 **加粗**", "images": [{"url": "/api/media/files/xiqi/fragments/frag-contract-daily.png", "alt": "图"}], "coverIndex": 5}
        r = case.resp = owner.post("/api/fragments/import-db", json_body=body)
        b = r.json()
        case.check("imported=true", r.status == 200 and b["data"]["imported"] is True and b["message"] == "已写入数据库")
        d = anon.get("/api/fragments/frag-contract-db").json()["data"]
        case.check("立即公开可见", "<strong>加粗</strong>" in d["bodyHtml"])
        case.check("coverIndex 越界被重置为 0", d["coverIndex"] == 0)
        case.check("正文写入沙箱 content", (C.SANDBOX_BACKEND / "content/xiqi/fragments/frag-contract-db.md").is_file())
        frag_db = (C.SANDBOX_BACKEND / "import/xiqi/fragments/frag-contract-db.md").read_text(encoding="utf-8")
        case.check("import 含配图与封面下标", "frag-contract-daily.png" in frag_db and "cover_index: 0" in frag_db)
        r2 = owner.post("/api/fragments/import-db", json_body={**body, "publicId": "bad id!"})
        case.request["bad_id_message"] = r2.json()["message"] if r2.json_or_none() else r2.text[:200]
        leftover = C.SANDBOX_BACKEND / "import/xiqi/fragments/bad id!.md"
        case.check("非法 publicId → 400", r2.status == 400)
        if java_target():
            case.check("非法 publicId 不留下 import 文件", not leftover.is_file())
        else:
            case.check("但 import 文件已残留（无补偿）", leftover.is_file())

    R.run("X12", "POST /api/fragments/import-db", "owner", "碎念直接入库", c)

    def c(case: Case) -> None:
        body = {"publicId": "rec-contract-file", "title": "写 import 的推荐", "category": "software", "status": "draft", "bodyMarkdown": "正文", "rating": 4, "images": [], "coverIndex": 0}
        r = case.resp = owner.post("/api/recommendations/import-file", json_body=body)
        case.check("path", r.status == 200 and r.json()["data"]["path"].replace("\\", "/") == "xiqi/recommendations/rec-contract-file.md")
        rec_file = (C.SANDBOX_BACKEND / "import/xiqi/recommendations/rec-contract-file.md").read_text(encoding="utf-8")
        case.check("import 含分类、评分、状态", "category: software" in rec_file and "rating: 4" in rec_file and "status: draft" in rec_file)
        case.check("rating 非整数", owner.post("/api/recommendations/import-file", json_body={**body, "rating": "x"}).json()["message"] == "rating 必须是 1–5 的整数")
        case.check("rating 越界", owner.post("/api/recommendations/import-file", json_body={**body, "rating": 9}).json()["message"] == "rating 必须是 1–5")
        case.check("title 为空", owner.post("/api/recommendations/import-file", json_body={**body, "title": ""}).json()["message"] == "title 不能为空")
        r_tr = owner.post("/api/recommendations/import-file", json_body={**body, "publicId": "../rec-traversal"})
        case.check("推荐 publicId 先校验，穿越被拒", r_tr.status == 400)

    R.run("X13", "POST /api/recommendations/import-file", "owner", "推荐写 import", c)

    def c(case: Case) -> None:
        body = {"publicId": "rec-contract-db", "title": "入库推荐", "category": "opensource", "status": "published", "bodyMarkdown": "开源**项目**", "rating": 4, "url": "https://contract.example.test/oss", "images": [], "coverIndex": 0}
        r = case.resp = owner.post("/api/recommendations/import-db", json_body=body)
        case.check("imported", r.status == 200 and r.json()["data"]["imported"] is True)
        case.check("公开可见", anon.get("/api/recommendations/rec-contract-db").status == 200)
        r2 = owner.post("/api/recommendations/import-db", json_body={**body, "url": "ftp://x"})
        case.request["bad_url_message"] = r2.json()["message"]
        case.check("url 非 http(s) → 400", r2.status == 400)
        rec_db = (C.SANDBOX_BACKEND / "import/xiqi/recommendations/rec-contract-db.md").read_text(encoding="utf-8")
        case.check("import 含 url", 'url: "https://contract.example.test/oss"' in rec_db)

    R.run("X14", "POST /api/recommendations/import-db", "owner", "推荐直接入库", c)

    def c(case: Case) -> None:
        r = case.resp = owner.post("/api/xiqi/pages/import-file", json_body={"page": "recommend", "heroImageUrl": "/api/media/files/xiqi/pages/recommend/x.png", "status": "published"})
        d = r.json()["data"]
        case.check("返回 page/path/importCommand", d["page"] == "recommend" and d["path"].replace("\\", "/") == "xiqi/pages/recommend.md")
        page_md = (C.SANDBOX_BACKEND / "import/xiqi/pages/recommend.md").read_text(encoding="utf-8")
        case.check("hero 写入 import", "hero_image_url: /api/media/files/xiqi/pages/recommend/x.png" in page_md)
        case.check("page 非法", owner.post("/api/xiqi/pages/import-file", json_body={"page": "x"}).json()["message"] == "page 必须是 ['about', 'fragments', 'recommend']")
        case.check("status 非法", owner.post("/api/xiqi/pages/import-file", json_body={"page": "about", "status": "draft"}).json()["message"] == "status 必须是 ['hidden', 'published']")

    R.run("X15", "POST /api/xiqi/pages/import-file", "owner", "页面配置写 import", c)

    def c(case: Case) -> None:
        payload = {
            "status": "published",
            "alias": "契约站长二",
            "genderAge": "合成 · 21 岁",
            "email": "owner2@contract.example.test",
            "intro": "合成简介",
            "awards": [{"id": "a1", "label": "合成奖", "tier": "gold"}],
            "education": {"schoolPublic": "某校", "schoolRaw": "全名", "degree": "本科", "major": "专业", "period": "2024—2028", "rankRaw": "前 5%"},
            "internship": {"companyPublic": "某司", "companyRaw": "全名", "role": "实习", "period": "2026", "summaryRaw": "详情"},
            "club": {"namePublic": "某社", "nameRaw": "全名", "role": "成员", "period": "2024", "summaryRaw": "详情"},
            "certificates": ["证书"],
        }
        r = case.resp = owner.post("/api/xiqi/about/import-file", json_body=payload)
        d = r.json()["data"]
        case.check("path", r.status == 200 and d["path"].replace("\\", "/") == "xiqi/about/resume.md")
        case.check("只写 import，不改公开接口", anon.get("/api/xiqi/about").json()["data"]["alias"] == "契约站长")
        about_md = (C.SANDBOX_BACKEND / "import/xiqi/about/resume.md").read_text(encoding="utf-8")
        case.check("履历字段写入 import", all(part in about_md for part in ("gender_age:", "owner2@contract.example.test", "合成简介", "school_public:", "certificates:")))
        r2 = owner.post("/api/xiqi/about/import-file", json_body={**payload, "alias": ""})
        case.check("缺 alias → 400", r2.status == 400 and "alias" in r2.json()["message"])
        case.check("匿名 401", anon.post("/api/xiqi/about/import-file", json_body=payload).status == 401)

    R.run("X16", "POST /api/xiqi/about/import-file", "owner", "关于页写 import", c)


# ---------------------------------------------------------------- phase: autopublish


def phase_autopublish(R: Runner) -> None:
    anon = Client("anon")
    owner = Client("owner")

    def c(case: Case) -> None:
        r = case.resp = anon.get("/api/auth/providers")
        case.check("google 未配置", r.json()["data"] == {"github": True, "google": False})

    R.run("B01", "GET /api/auth/providers", "anon", "仅 GitHub 配置", c)

    def c(case: Case) -> None:
        r = case.resp = Client("g").get("/api/auth/google", query={"return_to": "/fragments"})
        case.check("302 回前端 auth_error=google_not_configured", r.status == 302 and r.headers.get("location") == f"{C.FRONTEND_ORIGIN}/fragments?auth_error=google_not_configured")

    R.run("B02", "GET /api/auth/google", "anon", "提供方未配置", c)

    def c(case: Case) -> None:
        g = Client("guest2")
        oauth_login(g, "guest2")
        n0 = len(mail_files())
        cid, ans = fresh_captcha(g, "/api/messages/captcha")
        r = case.resp = g.post("/api/messages", json_body={"content": "自动发布的留言", "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        b = r.json()
        case.check("data 为留言对象", b["message"] == "留言发布成功" and b["data"]["content"] == "自动发布的留言" and b["data"]["replies"] == [])
        case.check("isOwner=false，id 为 uuid", b["data"]["isOwner"] is False and UUID_RE.match(b["data"]["id"]))
        case.check("公开列表可见", anon.get("/api/messages").json()["data"]["items"][0]["id"] == b["data"]["id"])
        case.check("邮件", wait_mail_count(n0 + 1) == n0 + 1)
        cid, ans = fresh_captcha(g, "/api/messages/captcha")
        r2 = g.post("/api/messages", json_body={"content": "第二条", "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        case.check("第二条 200", r2.status == 200)
        cid, ans = fresh_captcha(g, "/api/messages/captcha")
        r3 = g.post("/api/messages", json_body={"content": "第三条", "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        case.check("每小时上限（档位=2）429", r3.status == 429 and r3.json()["message"] == "已达到本小时留言上限，请稍后再试")

    R.run("B03", "POST /api/messages", "guest", "自动发布 + 每小时上限", c)

    def c(case: Case) -> None:
        oauth_login(owner, "owner")
        n0 = len(mail_files())
        cid, ans = fresh_captcha(owner, "/api/messages/captcha")
        r = case.resp = owner.post("/api/messages", json_body={"content": "站长自动发布", "captchaId": cid, "captchaAnswer": ans}, ip=new_ip())
        case.check("isOwner=true", r.json()["data"]["isOwner"] is True)
        time.sleep(1.0)
        case.check("不发邮件", len(mail_files()) == n0)

    R.run("B04", "POST /api/messages", "owner", "站长自动发布", c)

    def c(case: Case) -> None:
        cl = Client("apply-auto")
        ip = new_ip()

        def apply(url: str) -> Resp:
            cid, ans = fresh_captcha(cl, "/api/friends/captcha")
            return cl.post(
                "/api/friends/applications",
                json_body={"siteName": "自动发布站", "siteUrl": url, "description": "合成", "contactEmail": "a@contract.example.test", "captchaId": cid, "captchaAnswer": ans},
                ip=ip,
            )

        r = case.resp = apply("https://a.contract.example.test/")
        case.check("友链已发布（未查 URL 冲突）", r.status == 200 and r.json()["message"] == "友链已发布")
        items = anon.get("/api/friends").json()["data"]["items"]
        dup = [x for x in items if x["url"].rstrip("/") == "https://a.contract.example.test"]
        case.check("公开列表出现同 URL 的两条", len(dup) == 2)
        r2 = apply("https://auto2.contract.example.test/")
        case.check("冷却=0 时第二条 200", r2.status == 200)
        r3 = apply("https://auto3.contract.example.test/")
        case.check("每日上限（档位=2）429", r3.status == 429 and r3.json()["message"] == "今日申请次数已达上限，请明日再试")

    R.run("B05", "POST /api/friends/applications", "anon", "自动发布 + 每日上限", c)


def main() -> None:
    global API_BASE
    parser = argparse.ArgumentParser(description="跑接口契约用例")
    parser.add_argument("--phase", default="default", choices=["default", "autopublish"])
    parser.add_argument("--base", default="", help="API 根 URL，默认 Flask 沙箱 http://127.0.0.1:5001")
    parser.add_argument("--ids", default="", help="只跑这些用例号，逗号分隔")
    parser.add_argument("--label", default="", help="结果文件后缀，避免覆盖 Flask 全量结果")
    args = parser.parse_args()
    API_BASE = (args.base or C.FLASK_BASE).rstrip("/")
    only = {x.strip() for x in args.ids.split(",") if x.strip()} or None
    R = Runner(args.phase, only_ids=only, label=args.label)
    t0 = time.time()
    if args.phase == "default":
        phase_default(R)
    else:
        phase_autopublish(R)
    if only:
        missing = sorted(only - {c.cid for c in R.cases})
        if missing:
            raise SystemExit(f"未知用例号: {', '.join(missing)}")
    R.save()
    passed = sum(c.passed for c in R.cases)
    print(
        f"\nphase={args.phase} base={API_BASE} 通过 {passed}/{len(R.cases)}，"
        f"耗时 {time.time() - t0:.1f}s → {C.RESULTS_DIR}"
    )
    if passed != len(R.cases):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
