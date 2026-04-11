"""
从文本或 Markdown 文件抽取关键词（jieba TF-IDF），输出 JSON 数组或每行一词。

用法（backend 目录、已 pip install -r requirements.txt）:

  python scripts/content_tools/extract_keywords.py content/posts/foo.md
  python scripts/content_tools/extract_keywords.py --text "Vue3 与 Flask 后端联调"
  type content\posts\foo.md | python scripts/content_tools/extract_keywords.py --stdin

  # 条数
  python scripts/content_tools/extract_keywords.py --top-k 15 path/to/file.md
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_backend / ".env", override=True)

from app.keywords_extract import extract_keywords  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="从文本/Markdown 抽取关键词")
    p.add_argument("path", nargs="?", help="Markdown/文本文件路径")
    p.add_argument("--text", "-t", help="直接传入一段文字")
    p.add_argument("--stdin", action="store_true", help="从标准输入读取全文")
    p.add_argument("--top-k", type=int, default=10, dest="top_k", help="关键词条数，默认 10")
    p.add_argument("--lines", action="store_true", help="每行一词（默认输出 JSON 数组）")
    args = p.parse_args()

    if args.text:
        raw = args.text
    elif args.stdin:
        raw = sys.stdin.read()
    elif args.path:
        path = Path(args.path)
        if not path.is_file():
            print("文件不存在:", path, file=sys.stderr)
            sys.exit(1)
        raw = path.read_text(encoding="utf-8")
    else:
        p.print_help()
        sys.exit(1)

    words = extract_keywords(raw, top_k=args.top_k)
    if args.lines:
        print("\n".join(words))
    else:
        print(json.dumps(words, ensure_ascii=False))


if __name__ == "__main__":
    main()
