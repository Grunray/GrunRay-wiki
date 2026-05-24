---
name: create-blog-md
description: Writes or refactors GrunRay_wiki import-ready blog Markdown under backend/import/markdown with correct YAML front matter, headings, and code fences. Use when the user asks to create or edit a blog post, algorithm writeup, engineering note, or any .md meant for content_tools/import_markdown_posts.py, or mentions backend/import/markdown, post slug, or article import.
---

# create-blog-md

## Scope

- **Output directory**: `backend/import/markdown/` (or a subpath the user names, e.g. `backend/import/markdown/project/`).
- **Language**: Simplified Chinese for prose unless the user asks otherwise.
- **Only touch files required for the task.**

## Before writing

1. If the user names a **reference file**, open it and match structure (e.g. `backend/import/markdown/string_hash_rolling_binary.md`, `backend/import/markdown/project_demo_architecture_vite_flask.md`).
2. Read field rules in `designed/template.md` and behavior expectations in `backend/scripts/content_tools/import_markdown_posts.py` when unsure about required YAML.
3. Confirm **slug** uniqueness and allowed characters (letters, digits, `_`, `-`).

## YAML front matter (required shape)

- First line: `---`, then YAML, then closing `---`.
- Typical keys: `title`, `slug`, `type` (`article` | `algorithm` | `project_note` per template/script), `tags`, `summary`, `locale`, `pinned`, `pinned_order`, `published_at`, `updated_at`.
- If `summary` may contain `...`, **quote** the value in YAML.
- For **algorithm** posts: optional `difficulty`, `oj`, `problem_id`, `series`, etc.
- For **engineering / Vue notes** still stored under markdown: set `series: 项目与工程` unless the user specifies another series.
- **Dates**: If the user gives exact `published_at` / `updated_at`, copy **verbatim**.

## Body structure

- Blank line after front matter, then **`##` / `###`** sections (no wall of unstructured text).
- Code only inside **fenced** blocks with a language tag where applicable (` ```cpp `, ` ```js `, ` ```text `).

### Algorithm / template posts

When the user wants **“主体模板 + 应用”**:

1. Put **core template** first (e.g. prefix function + KMP + Z-function as separate blocks if that is the agreed layout).
2. Each **application / extra function**: add a **short Chinese paragraph** explaining purpose, then the code block.
3. **Never remove or rewrite the user’s existing code comments**; preserve comment semantics.

### Engineering / Vue / architecture notes

- Prefer **generic** wording (avoid tying to one product page name, tab label, or client unless the user insists).
- For deploy paths, use **generic** patterns such as `backend/**/demos` and `/api/**/files/` instead of machine-specific absolute paths.

### Splitting one source into many posts

If the user asks for **one article per major struct/block**: separate files, separate `slug`, each with template + applications + any user-mandated timestamps.

### Immutable user sentences

If the user marks a sentence as **must not change**: keep it **character-for-character**; only add Markdown structure around it.

## Tone

Use neutral technical prose. Avoid phrases like “你的模板” / “你给出的”.

## After edits

Run linter/diagnostics on the paths you changed if the editor exposes them.

## More detail

See [reference.md](reference.md) for the full combined prompt checklist and repo mapping.
