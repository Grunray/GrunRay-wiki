---
name: create-project-md
description: Writes or refactors GrunRay_wiki project import Markdown under backend/import/projects with layout-driven content and minimal body text. Use when the user asks to create or edit a project card, proj- slug, layout blocks, demo_url, or mentions backend/import/projects or project import YAML.
---

# create-project-md

## Scope

- **Output directory**: `backend/import/projects/`.
- **Filename**: `backend/import/projects/<slug>.md` (kebab-case `slug` aligned with filename is recommended).
- **Language**: Simplified Chinese unless the user asks otherwise.
- **Only touch files required for the task.**

## Canonical example

Open and mirror structure: `backend/import/projects/crsea.md`.

## Required structure

1. **YAML front matter only at the top** (`---` … `---`).
2. **Do not write long free-form body copy.** Project UI copy lives in `layout`.
3. After front matter, keep at most a **single** closing note line matching the repo convention, for example:  
   `正文区域当前版本**不会写入数据库**；项目展示内容以 \`layout\` 为准。`

## Front matter fields (align with crsea)

Include at least:

- `public_id` (e.g. `proj-…`), `slug`, `title`, `summary`, `tags`, `locale`
- `status`, `featured`, `year`, `start_date`, `end_date`
- `github_url`, `demo_url` — use `''` if unknown; **do not invent** URLs
- `layout`: array of blocks with `type` (e.g. `overview`, `demo`), `title`, `body` (multiline `|`); `demo` entries may include `demoUrl`
- `related_posts`: `[]` or explicit list when provided

Put narrative, highlights, and demo description inside `layout[].body` (and `demoUrl` when applicable).

## Rules

- **Never fabricate** URLs, dates, client names, or repo facts.
- If required fields are missing, **ask** or leave explicit empty placeholders the user can fill.

## After edits

Run linter/diagnostics on the paths you changed if the editor exposes them.

## More detail

See [reference.md](reference.md) for the merged prompt file path and cross-cutting rules.
