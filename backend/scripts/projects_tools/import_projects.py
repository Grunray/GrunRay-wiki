"""
将 `backend/import/projects` 下带 YAML front matter 的 Markdown 解析后写入 `wiki_project` 表。

约定与模板见：`import/projects/_template/project.template.md`

用法（在 backend 目录、已配置 .env、已执行 wiki_project 建表）:

  python scripts/projects_tools/import_projects.py

  python scripts/projects_tools/import_projects.py --dir import/projects

  python scripts/projects_tools/import_projects.py --slug demo-app

  python scripts/projects_tools/import_projects.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend))

try:
    from dotenv import load_dotenv  # noqa: E402

    load_dotenv(_backend / ".env", override=True)
except ImportError:
    pass

from app.db import connect  # noqa: E402
from app.project_md import parse_project_markdown, validate_project_meta  # noqa: E402

STATUS_MAP = {"published": 0, "archived": 1, "hidden": 2}


def iter_markdown_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for path in sorted(root.rglob("*.md")):
        if "_template" in path.parts:
            continue
        if path.name.startswith("_"):
            continue
        out.append(path)
    return out


def upsert_project(cur, row: dict) -> None:
    tags_json = json.dumps(row["tags"], ensure_ascii=False)
    layout_json = json.dumps(row["layout"], ensure_ascii=False)
    related = row.get("related_posts_json")
    related_json = json.dumps(related, ensure_ascii=False) if related is not None else None
    status = STATUS_MAP[row["status"]]

    cur.execute(
        """
        INSERT INTO wiki_project (
          public_id, slug, locale, title, summary, tags, status, featured, year,
          start_date, end_date, github_url, demo_url, layout, related_posts_json
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
          slug = VALUES(slug),
          locale = VALUES(locale),
          title = VALUES(title),
          summary = VALUES(summary),
          tags = VALUES(tags),
          status = VALUES(status),
          featured = VALUES(featured),
          year = VALUES(year),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          github_url = VALUES(github_url),
          demo_url = VALUES(demo_url),
          layout = VALUES(layout),
          related_posts_json = VALUES(related_posts_json)
        """,
        (
            row["public_id"],
            row["slug"],
            row["locale"],
            row["title"],
            row["summary"] or None,
            tags_json,
            status,
            1 if row["featured"] else 0,
            row["year"],
            row["start_date"],
            row["end_date"],
            row["github_url"],
            row["demo_url"],
            layout_json,
            related_json,
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import wiki_project from Markdown")
    parser.add_argument(
        "--dir",
        type=str,
        default=str(_backend / "import" / "projects"),
        help="项目 Markdown 根目录（默认 backend/import/projects）",
    )
    parser.add_argument("--slug", type=str, default="", help="仅导入指定 slug（文件名不含 .md 或与 front matter 一致）")
    parser.add_argument("--dry-run", action="store_true", help="只校验并打印，不写库")
    args = parser.parse_args()

    root = Path(args.dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"目录不存在: {root}")

    files = iter_markdown_files(root)
    if args.slug.strip():
        want = f"{args.slug.strip()}.md"
        files = [p for p in files if p.name == want or p.stem == args.slug.strip()]
        if not files:
            raise SystemExit(f"未找到 slug={args.slug!r} 对应的 Markdown")

    if not files:
        print("未找到可导入的 .md（已跳过 _template 与以下划线开头的文件）")
        return

    prepared: list[dict] = []
    for path in files:
        meta, body = parse_project_markdown(path)
        row = validate_project_meta(meta, body, path)
        prepared.append(row)
        print(f"OK parse: {path.relative_to(_backend)} -> {row['slug']}")

    if args.dry_run:
        print("--dry-run：未写入数据库")
        return

    conn = connect()
    try:
        cur = conn.cursor()
        for row in prepared:
            upsert_project(cur, row)
        conn.commit()
        print(f"已写入 {len(prepared)} 条 wiki_project")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
