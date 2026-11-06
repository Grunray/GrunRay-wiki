"""导出沙箱 Flask 的 app.url_map（方法、路径、endpoint、视图函数源码位置）到 results/url_map.json。

  backend\\.venv\\Scripts\\python.exe tools/contract/dump_routes.py
"""
from __future__ import annotations

import inspect
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common as C  # noqa: E402


def main() -> None:
    os.chdir(C.SANDBOX_BACKEND)
    sys.path.insert(0, str(C.SANDBOX_BACKEND))
    from app import create_app
    from app.config import config

    if config.MYSQL_DATABASE != C.CONTRACT_DB:
        raise SystemExit("拒绝：沙箱 config 未指向契约库")
    app = create_app()
    rows = []
    for rule in app.url_map.iter_rules():
        view = app.view_functions[rule.endpoint]
        src = Path(inspect.getsourcefile(view)).resolve()
        _, line = inspect.getsourcelines(view)
        try:
            rel = "backend/" + src.relative_to(C.SANDBOX_BACKEND.resolve()).as_posix()
        except ValueError:
            rel = f"<flask 内置> {src.name}"
        methods = sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS"))
        rows.append(
            {
                "methods": methods,
                "rule": rule.rule,
                "endpoint": rule.endpoint,
                "source": f"{rel}:{line}",
            }
        )
    rows.sort(key=lambda r: (r["rule"], r["methods"]))
    C.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = C.RESULTS_DIR / "url_map.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    pairs = sum(len(r["methods"]) for r in rows)
    print(f"rules={len(rows)} method+path={pairs} -> {out}")
    for r in rows:
        print(f"{','.join(r['methods']):<14} {r['rule']:<48} {r['endpoint']:<44} {r['source']}")


if __name__ == "__main__":
    main()
