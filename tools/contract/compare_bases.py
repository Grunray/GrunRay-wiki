"""对同一组 GET 请求，把 Flask 与 Java 的 JSON 规范化后比对。

  backend\\.venv\\Scripts\\python.exe tools/contract/compare_bases.py
  backend\\.venv\\Scripts\\python.exe tools/contract/compare_bases.py --a http://127.0.0.1:5001 --b http://127.0.0.1:5010
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

# 阶段 1 已迁路由。html=1 的 body_html 单独做子串检查，其余字段精确比对。
PATHS: list[tuple[str, dict[str, str]]] = [
    ("/api/health", {}),
    ("/api/posts", {}),
    ("/api/posts", {"type": "algorithm"}),
    ("/api/posts", {"type": "bogus"}),
    ("/api/posts", {"type": "project_note", "project_id": "proj-contract-alpha"}),
    ("/api/posts", {"project_id": "proj-contract-alpha"}),
    ("/api/posts", {"category_id": "3"}),
    ("/api/posts", {"category_id": "abc"}),
    ("/api/posts/latest-updated", {}),
    ("/api/posts/contract-article-basic", {}),
    ("/api/posts/contract-article-basic", {"html": "1"}),
    ("/api/posts/contract-note-hidden", {}),
    ("/api/posts/nope", {}),
]

HTML_MARKERS = ("<h2>小节标题</h2>", "<table>", "<del>删除线</del>", 'class="codehilite"', "<br")


def _get(base: str, path: str, query: dict[str, str]) -> tuple[int, Any, str]:
    url = base.rstrip("/") + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            status = r.status
            ctype = r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        body = e.read()
        status = e.code
        ctype = e.headers.get("content-type", "")
    text = body.decode("utf-8", errors="replace")
    parsed: Any = None
    if "json" in ctype or text[:1] in "{[":
        try:
            parsed = json.loads(text)
        except ValueError:
            parsed = None
    return status, parsed, text


def _canon(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _canon(value[k]) for k in sorted(value)}
    if isinstance(value, list):
        return [_canon(v) for v in value]
    return value


def _without_html(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _without_html(v) for k, v in value.items() if k != "body_html"}
    if isinstance(value, list):
        return [_without_html(v) for v in value]
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description="比对两个 API 基址的 JSON")
    parser.add_argument("--a", default=C.FLASK_BASE, help="左侧，默认 Flask 5001")
    parser.add_argument("--b", default=C.JAVA_BASE, help="右侧，默认 Java 5010")
    args = parser.parse_args()
    failures: list[str] = []
    C.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    for path, query in PATHS:
        sa, ja, ta = _get(args.a, path, query)
        sb, jb, tb = _get(args.b, path, query)
        label = path + (("?" + urllib.parse.urlencode(query)) if query else "")
        same_status = sa == sb
        html = query.get("html") in {"1", "true", "yes"}
        left = _canon(_without_html(ja) if html else ja)
        right = _canon(_without_html(jb) if html else jb)
        same_json = left == right
        markers_ok = True
        if html and isinstance(jb, dict):
            h = str(jb.get("body_html") or "")
            markers_ok = all(m in h for m in HTML_MARKERS)
        ok = same_status and same_json and markers_ok
        rows.append({"path": label, "status_a": sa, "status_b": sb, "ok": ok})
        if not ok:
            detail = []
            if not same_status:
                detail.append(f"status {sa} vs {sb}")
            if not same_json:
                detail.append("json 不一致")
            if not markers_ok:
                detail.append("body_html 缺标记")
            failures.append(f"{label}: {', '.join(detail)}")
            if ja is None or jb is None:
                failures.append(f"  a[:200]={ta[:200]!r}\n  b[:200]={tb[:200]!r}")
        print(f"[{'PASS' if ok else 'FAIL'}] {label}  {sa}/{sb}", flush=True)
    out = C.RESULTS_DIR / "compare-flask-java.json"
    out.write_text(json.dumps({"a": args.a, "b": args.b, "rows": rows, "failures": failures}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n通过 {sum(1 for r in rows if r['ok'])}/{len(rows)} → {out}")
    if failures:
        print("\n".join(failures))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
