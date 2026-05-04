# create-blog-md — extended reference

Single source for the **merged** checklist (blog + project): `designed/article/skill-prompt-project-and-blog-import.md`.

## Repo map (blog)

| Item | Path |
|------|------|
| Import field doc | `designed/template.md` |
| Import script | `backend/scripts/import_markdown_posts.py` |
| Example (algorithm + sections) | `backend/import/markdown/string_hash_rolling_binary.md` |
| Example (article + series) | `backend/import/markdown/project_demo_architecture_vite_flask.md` |

## Cross-cutting (from merged prompt)

1. Only modify files needed for the request.
2. Respect user-provided `published_at` / `updated_at` exactly.
3. Slug: valid charset, unique, aligned with filename policy.
4. Post body + front matter are the import surface for blogs (per template).
