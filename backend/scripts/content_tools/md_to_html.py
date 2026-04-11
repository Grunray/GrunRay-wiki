"""
将 Markdown 文件转为 HTML 片段（与 API 中 render_markdown_to_html 一致）。

用法:

  python scripts/content_tools/md_to_html.py content/posts/foo.md
  python scripts/content_tools/md_to_html.py --stdin < content/posts/foo.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

from app.markdown_util import render_markdown_to_html  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="Markdown → HTML")
    p.add_argument("path", nargs="?", help="Markdown 文件路径")
    p.add_argument("--stdin", action="store_true", help="从标准输入读取")
    args = p.parse_args()

    if args.stdin:
        md = sys.stdin.read()
    elif args.path:
        path = Path(args.path)
        if not path.is_file():
            print("文件不存在:", path, file=sys.stderr)
            sys.exit(1)
        md = path.read_text(encoding="utf-8")
    else:
        p.print_help()
        sys.exit(1)

    print(render_markdown_to_html(md))


if __name__ == "__main__":
    main()
