"""用 Flask 的 render_markdown_to_html 生成 body_html 快照，供 backend-java 比对。

每个源 `x.md` 在输出目录得到原样字节的 `x.md` 与 Python 渲染结果 `x.html`，
读法与 `app.serialize._read_markdown` 一致（UTF-8、通用换行）。只读源文件，不连数据库。

    python tools/contract/md_snapshots.py                      # 整站文章 + 沙箱夹具 → .contract-sandbox/md-snapshots
    python tools/contract/md_snapshots.py --src DIR --out DIR  # 指定目录
    python tools/contract/md_snapshots.py --in-place DIR       # 金样：DIR 里每个 .md 旁写 .html
"""
from __future__ import annotations

import argparse
import importlib.metadata as md_meta
import json
import shutil
import sys
from pathlib import Path

import common as C

sys.path.insert(0, str(C.REPO_BACKEND))

from app.markdown_util import render_markdown_to_html  # noqa: E402

DEFAULT_SRC = (C.REPO_BACKEND / "content" / "posts", C.SANDBOX_BACKEND / "content" / "posts")
DEFAULT_OUT = C.SANDBOX_ROOT / "md-snapshots"


def render_file(src: Path) -> str:
    return render_markdown_to_html(src.read_text(encoding="utf-8"))


def write_html(path: Path, html: str) -> None:
    path.write_bytes(html.encode("utf-8"))


def snapshot_dirs(sources: list[Path], out: Path) -> int:
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    count = 0
    for src_dir in sources:
        for src in sorted(src_dir.glob("*.md")):
            name = src.name
            if (out / name).exists():
                raise SystemExit(f"文件名重复：{name}（{src_dir}）")
            shutil.copyfile(src, out / name)
            write_html(out / f"{src.stem}.html", render_file(src))
            count += 1
    meta = {
        "sources": [str(p.relative_to(C.REPO_ROOT)).replace("\\", "/") for p in sources],
        "count": count,
        "markdown": md_meta.version("markdown"),
        "pygments": md_meta.version("pygments"),
    }
    (out / "index.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return count


def snapshot_in_place(directory: Path) -> int:
    count = 0
    for src in sorted(directory.glob("*.md")):
        write_html(src.with_suffix(".html"), render_file(src))
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="生成 Markdown → body_html 快照")
    parser.add_argument("--src", action="append", type=Path, help="源目录，可重复；默认整站文章 + 契约夹具")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--in-place", type=Path, help="在该目录的每个 .md 旁写同名 .html")
    args = parser.parse_args()

    if args.in_place:
        n = snapshot_in_place(args.in_place.resolve())
        print(f"已写 {n} 个 .html 到 {args.in_place}")
        return

    sources = [p.resolve() for p in (args.src or DEFAULT_SRC)]
    for p in sources:
        if not p.is_dir():
            raise SystemExit(f"源目录不存在：{p}")
    n = snapshot_dirs(sources, args.out.resolve())
    print(f"已写 {n} 组快照到 {args.out}")


if __name__ == "__main__":
    main()
