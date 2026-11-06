"""把 docs/API_CONTRACT.md 的路由索引与三方证据逐行核对。

1. Flask：results/url_map.json（先跑 dump_routes.py）——方法 + 路径一一对应，Flask 位置行号一致。
2. 实测：results/cases-*.json（先跑 run_cases.py 两个 phase）——标「本地实测通过」的路由必须有
   通过的用例，且索引里列出的用例号都存在、都通过、确实打在这条路由上。
3. Vue：扫描 frontend/src 的 .ts/.vue/.css/.json 与 frontend/index.html 中的 `/api/...`、
   `/rss.xml` 等字面量，逐条匹配到 Flask 规则；列出匹配不到的前端路径和没有前端调用的路由。
4. Vite 代理：frontend/vite.config.ts 的 proxy 前缀未覆盖的 Flask 路由。

  backend\\.venv\\Scripts\\python.exe tools/contract/crosscheck.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402

DOC = C.REPO_ROOT / "docs" / "API_CONTRACT.md"
FRONTEND = C.REPO_ROOT / "frontend"
INDEX_START = "<!-- route-index:start -->"
INDEX_END = "<!-- route-index:end -->"
STATUSES = ("本地实测通过", "代码已确认", "待实测")
INDEX_COLUMNS = ("用途", "权限", "状态", "用例", "Flask", "Vue 调用")

ROW_RE = re.compile(r"^\|\s*(\d+)\s*\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`\s*\|(.*)\|\s*$")
CASE_ID_RE = re.compile(r"\b([A-Z]{1,2}\d{2}[a-z]?)\b")
FLASK_LOC_RE = re.compile(r"`?([\w./]+\.py):(\d+)`?")
LITERAL_START_RE = re.compile(r"""(?<=['"`(])/(?:api/|rss\.xml|sitemap\.xml|robots\.txt)""")


def load_index() -> list[dict]:
    text = DOC.read_text(encoding="utf-8")
    if INDEX_START not in text or INDEX_END not in text:
        raise SystemExit(f"{DOC} 缺少 {INDEX_START} / {INDEX_END} 标记")
    block = text.split(INDEX_START, 1)[1].split(INDEX_END, 1)[0]
    rows = []
    for line in block.splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        cells = [c.strip() for c in m.group(4).split("|")]
        if len(cells) != len(INDEX_COLUMNS):
            raise SystemExit(f"索引行列数不对（应为 # 方法 路径 + {INDEX_COLUMNS}）: {line}")
        col = dict(zip(INDEX_COLUMNS, cells))
        status = next((s for s in STATUSES if s in col["状态"]), None)
        flask = FLASK_LOC_RE.search(col["Flask"])
        cases = sorted(set(CASE_ID_RE.findall(col["用例"])))
        rows.append(
            {
                "no": int(m.group(1)),
                "method": m.group(2),
                "rule": m.group(3),
                "status": status,
                "flask": (flask.group(1), int(flask.group(2))) if flask else None,
                "cases": cases,
            }
        )
    return rows


def rule_regex(rule: str) -> re.Pattern[str]:
    out = []
    for part in re.split(r"(<[^>]+>)", rule):
        if part.startswith("<path:"):
            out.append(r".+")
        elif part.startswith("<"):
            out.append(r"[^/]+")
        else:
            out.append(re.escape(part))
    return re.compile("^" + "".join(out) + "$")


def normalize_literal(raw: str) -> str:
    """`/a/${x}/b` → `/a/X/b`；不跟在 `/` 后的插值（`${suffix}`、`?${qs}`）视为查询串，截掉。"""
    path = raw
    while "${" in path:
        head, tail = path.split("${", 1)
        depth, i = 1, 0
        while i < len(tail) and depth:
            depth += {"{": 1, "}": -1}.get(tail[i], 0)
            i += 1
        rest = tail[i:]
        if not head.endswith("/"):
            path = head
            break
        path = head + "X" + rest
    return path.split("?", 1)[0]


def read_literal(line: str, start: int) -> str:
    """从 start 读到引号 / 空白 / 右括号为止；`${…}` 里的内容整体跳过。"""
    out, i, depth = [], start, 0
    while i < len(line):
        ch = line[i]
        if depth == 0 and line.startswith("${", i):
            depth, i = 1, i + 2
            out.append("${")
            continue
        if depth:
            depth += {"{": 1, "}": -1}.get(ch, 0)
        elif ch in "'\"` )":
            break
        out.append(ch)
        i += 1
    return "".join(out)


def scan_frontend() -> list[dict]:
    files = [FRONTEND / "index.html", FRONTEND / "vite.config.ts"]
    for ext in ("*.ts", "*.vue", "*.css", "*.json"):
        files += [p for p in (FRONTEND / "src").rglob(ext) if not p.name.endswith(".d.ts")]
    hits = []
    for p in sorted(set(files)):
        if not p.is_file():
            continue
        for no, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            for m in LITERAL_START_RE.finditer(line):
                raw = read_literal(line, m.start())
                hits.append(
                    {
                        "file": p.relative_to(C.REPO_ROOT).as_posix(),
                        "line": no,
                        "raw": raw,
                        "path": normalize_literal(raw),
                    }
                )
    return hits


def vite_proxy_prefixes() -> list[str]:
    text = (FRONTEND / "vite.config.ts").read_text(encoding="utf-8")
    block = text.split("proxy:", 1)[1] if "proxy:" in text else ""
    return re.findall(r"""^\s*['"](/[^'"]*)['"]\s*:\s*\{""", block, flags=re.M)


def main() -> int:
    url_map_path = C.RESULTS_DIR / "url_map.json"
    if not url_map_path.is_file():
        raise SystemExit("缺少 results/url_map.json，先跑 tools/contract/dump_routes.py")
    url_map = json.loads(url_map_path.read_text(encoding="utf-8"))
    flask_pairs = {}
    for r in url_map:
        for m in r["methods"]:
            flask_pairs[(m, r["rule"])] = r

    cases: dict[str, dict] = {}
    for phase in ("default", "autopublish"):
        p = C.RESULTS_DIR / f"cases-{phase}.json"
        if not p.is_file():
            raise SystemExit(f"缺少 {p.name}，先跑 run_cases.py --phase {phase}")
        for c in json.loads(p.read_text(encoding="utf-8")):
            cases[c["id"]] = c
    by_route: dict[str, list[dict]] = {}
    for c in cases.values():
        by_route.setdefault(c["route"], []).append(c)

    index = load_index()
    problems: list[str] = []

    doc_pairs = {(r["method"], r["rule"]): r for r in index}
    if len(doc_pairs) != len(index):
        problems.append("索引里有重复的 方法+路径")
    nos = [r["no"] for r in index]
    if nos != list(range(1, len(index) + 1)):
        problems.append(f"索引序号不连续: {nos}")
    for key in sorted(set(flask_pairs) - set(doc_pairs)):
        problems.append(f"Flask 有、索引缺: {key[0]} {key[1]}")
    for key in sorted(set(doc_pairs) - set(flask_pairs)):
        problems.append(f"索引有、Flask 无: {key[0]} {key[1]}")

    for key, row in sorted(doc_pairs.items(), key=lambda kv: kv[1]["no"]):
        fr = flask_pairs.get(key)
        route_key = f"{key[0]} {key[1]}"
        if row["status"] is None:
            problems.append(f"#{row['no']} {route_key} 缺状态标记")
        if fr:
            src = fr["source"]
            if src.startswith("backend/"):
                file, line = src.rsplit(":", 1)
                if not row["flask"]:
                    problems.append(f"#{row['no']} {route_key} 缺 Flask 位置")
                elif not file.endswith(row["flask"][0]) or int(line) != row["flask"][1]:
                    problems.append(f"#{row['no']} {route_key} Flask 位置 {row['flask']} ≠ url_map {src}")
        route_cases = by_route.get(route_key, [])
        if row["status"] == "本地实测通过":
            if not route_cases:
                problems.append(f"#{row['no']} {route_key} 标了本地实测通过但没有用例")
            failed = [c["id"] for c in route_cases if not c["passed"]]
            if failed:
                problems.append(f"#{row['no']} {route_key} 有未通过用例 {failed}")
        for cid in row["cases"]:
            c = cases.get(cid)
            if not c:
                problems.append(f"#{row['no']} {route_key} 引用了不存在的用例 {cid}")
            elif c["route"] != route_key:
                problems.append(f"#{row['no']} {route_key} 引用的 {cid} 实际打在 {c['route']}")
            elif not c["passed"]:
                problems.append(f"#{row['no']} {route_key} 引用的 {cid} 未通过")
        missing = sorted({c["id"] for c in route_cases} - set(row["cases"]))
        if missing:
            problems.append(f"#{row['no']} {route_key} 用例列漏了 {missing}")

    regexes = {key: rule_regex(key[1]) for key in flask_pairs}
    hits = scan_frontend()
    vue_unmatched = []
    called_rules: dict[str, list[str]] = {}
    for h in hits:
        rules = sorted({rule for (_, rule), rx in regexes.items() if rx.match(h["path"])})
        if not rules and "/X" in h["path"]:
            # 前端模板段（如 /api/auth/${provider}）对上 Flask 的字面路径，候选可能不止一条
            front_rx = re.compile("^" + re.escape(h["path"]).replace("X", "[^/]+") + "$")
            rules = sorted({rule for (_, rule) in flask_pairs if front_rx.match(re.sub(r"<[^>]+>", "X", rule))})
            h["template_match"] = True
        h["rules"] = rules
        if not rules:
            vue_unmatched.append(h)
        for rule in rules:
            called_rules.setdefault(rule, []).append(f"{h['file']}:{h['line']}")
    for h in vue_unmatched:
        problems.append(f"前端路径匹配不到 Flask 规则: {h['raw']} @ {h['file']}:{h['line']}")
    no_caller = sorted({rule for (_, rule) in flask_pairs if rule not in called_rules})

    prefixes = vite_proxy_prefixes()
    not_proxied = sorted(
        {rule for (_, rule) in flask_pairs if not any(rule == p or rule.startswith(p.rstrip("/") + "/") for p in prefixes)}
    )

    report = {
        "doc_rows": len(index),
        "flask_pairs": len(flask_pairs),
        "cases": len(cases),
        "cases_passed": sum(1 for c in cases.values() if c["passed"]),
        "frontend_literals": len(hits),
        "frontend_unmatched": vue_unmatched,
        "frontend_template_matches": [h for h in hits if h.get("template_match")],
        "rules_without_frontend_literal": no_caller,
        "vite_proxy_prefixes": prefixes,
        "rules_not_proxied_by_vite": not_proxied,
        "frontend_calls": {k: sorted(set(v)) for k, v in sorted(called_rules.items())},
        "problems": problems,
    }
    out = C.RESULTS_DIR / "crosscheck.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"索引 {len(index)} 行 / Flask {len(flask_pairs)} 条 / 用例 {report['cases_passed']}/{len(cases)} 通过")
    print(f"前端字面量 {len(hits)} 处，匹配不到 {len(vue_unmatched)} 处")
    for h in report["frontend_template_matches"]:
        print(f"  模板匹配 {h['raw']} @ {h['file']}:{h['line']} → {', '.join(h['rules'])}")
    print(f"无前端字面量的路由 {len(no_caller)} 条: {', '.join(no_caller)}")
    print(f"Vite 代理前缀 {prefixes}，未覆盖: {', '.join(not_proxied)}")
    if problems:
        print(f"\n不一致 {len(problems)} 处：")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("\n索引与 Flask 路由表、实测结果、前端请求逐项一致。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
