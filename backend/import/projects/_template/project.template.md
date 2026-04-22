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
# 1) 直接写 YAML 数组（与前端 ProjectLayoutBlock 一致）
layout:
  - type: overview
    title: 概览
    body: |
      多行正文
  - type: demo
    title: 在线演示
    demoUrl: /api/media/files/demos/your-demo/v1/index.html
    body: Demo 说明

# 2) 或使用外部 JSON：layout_file: layout.json（与本文件同目录）

# 可选：手动精选相关文章（API 会与 project_note 自动合并）
related_posts:
  - slug: some-post-slug
    label: 设计记录
    pinned: true
---

正文区域当前版本**不会写入数据库**，可写草稿或说明；内容请放在 `layout` 中。
