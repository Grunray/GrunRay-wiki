# 项目（wiki_project）导入工具

## 建表

已有数据库增量执行：

```bash
cd backend
python scripts/run_sql.py --file wiki_project.sql
```

全新初始化可直接用 `sql/schema.sql`（已包含 `wiki_project`）。

## 编写 Markdown

模板见：`import/projects/_template/project.template.md`

将 `.md` 放在 `import/projects/` 下（不要放在 `_template` 目录内）。

## 导入

```bash
cd backend
python scripts/projects_tools/import_projects.py
```

常用参数：

- `--dir import/projects` 指定目录
- `--slug demo-app` 只导入一个
- `--dry-run` 校验不写库

## 相关 API

- `GET /api/projects?include_archived=true|false`
- `GET /api/projects/<slug>`
