---
# 必填：对外稳定 ID（与 project_note 的 project_id 一致）；也可用 id 作为别名键
public_id: proj-your-id

# 必填：URL 段，仅字母数字、下划线、连字符
slug: your-slug

# 必填：标题（时间线与详情共用）
title: 你的项目标题

# 可选
summary: 一句话摘要
locale: zh
status: published
# status: published | archived | hidden

featured: false
year: 2025

# 时间线排序（建议 published 必填 YYYY-MM-DD）
start_date: '2025-01-01'
end_date: null

github_url: https://github.com/you/repo
demo_url: /api/media/files/demos/your-demo/v1/index.html

# 布局二选一：
# 1) 直接写 YAML 数组（与前端 `ProjectLayoutBlock` / `project-blocks/registry.ts` 一致）
# 2) 或使用外部 JSON：layout_file: layout.json（与本文件同目录）
#
# 支持的 type（仅此五种；未知 type 会走前端 Fallback 块）：
#   overview   — 标题 + body（纯文本展示）
#   markdown   — 标题 + body（body 为 Markdown：`marked` 解析 + `DOMPurify` 消毒后渲染）
#   changelog  — 同上，语义为更新记录
#   demo       — 标题 + body + iframe；见下方 demoUrl / meta
#   gallery    — 标题 + images（URL 列表，一般为 /api/media/files/...）
#
layout:
  - type: overview
    title: 概览
    body: |
      多行正文
  - type: markdown
    title: 技术说明
    body: |
      支持 **粗体**、列表、表格、`代码` 与围栏代码块等常见 Markdown。
  - type: changelog
    title: 更新记录
    body: |
      - 2025-01-01 首版
  - type: demo
    title: 在线演示
    demoUrl: /api/media/files/demos/your-demo/v1/index.html
    body: Demo 说明（可选）
    # 可选：内嵌 srcdoc（与 demoUrl 二选一优先 embed）；需放在 meta 里供前端读取
    # meta:
    #   demo_embed_html: "<!DOCTYPE html><html>...</html>"
  - type: gallery
    title: 界面截图
    images:
      - /api/media/files/film/projects/your-project/screen1.png
      - /api/media/files/film/projects/your-project/screen2.png

# 若块较多，可改为同目录 JSON 数组，并删除本文件中的 layout 键：
# layout_file: layout.json

# 可选：手动精选相关文章（API 会与 project_note 自动合并）
related_posts:
  - slug: some-post-slug
    label: 设计记录
    pinned: true
---

正文区域当前版本**不会写入数据库**，可写草稿或说明；内容请放在 `layout` 中。
