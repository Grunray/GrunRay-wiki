---
public_id: proj-openclaw
slug: openclaw
title: OpenClaw 技能与本地桥接
summary: 给 OpenClaw（龙虾）用的一组能力：CAD 图纸定位、本地文件 RAG、语音转写（本地/云端）、Excel 排产表单归一。笔记按主题拆开，本页作父级入口。
tags:
  - OpenClaw
  - Skill
  - RAG
  - ASR
  - CAD
locale: zh
status: published
featured: false
year: 2026
start_date: '2026-05-08'
end_date: null
github_url: https://github.com/Grunray/huo15-skills
demo_url: ''
layout:
  - type: overview
    title: 概览
    body: |
      OpenClaw 能编排工具，但「本机 CAD」「内网文件库」「会议录音」「客户排产表」仍要各自有桥。本项目是这些能力的父级卡片：详情页笔记列表对应四篇工程笔记，仓库与日期以各笔记为准。

      合集仓库以 skills 为主入口；CAD 与文件 RAG 另有独立仓。正文不写甲方公司名；仓库路径若带历史前缀，仅作链接，不当作品牌表述。
  - type: markdown
    title: 子能力一览
    body: |
      | 笔记 | 做什么 | 主要仓库 |
      |------|--------|----------|
      | CAD 图纸桥 | 开图、按文字模糊找图元、缩放到视野 | [CAD-SDK-for-OpenClaw](https://github.com/Grunray/CAD-SDK-for-OpenClaw) |
      | 本地文件 RAG | 文件名定位 + 内容检索 + 对比；LightRAG 只做擅长部分 | （私有，暂不列出） |
      | ASR 本地 / 云端 | Whisper 不上云；百炼 Paraformer 走公网 URL | skills 内 `…-asr` / `…-asr-bailian` |
      | Excel 排产表单 | 归类三类模板、填充、新旧差异标注 | skills 内 `…-plan-form` |

      时间线大约 **2026-05 → 2026-06**：skills 合集 5 月初建仓，CAD / ASR / 表单在 5 月底至 6 月初落地，文件 RAG 在 6 月 9 日成仓。
  - type: changelog
    title: 更新记录
    body: |
      - 2026-05-08 skills 合集仓库建立
      - 2026-05-24～30 CAD SDK 主线能力
      - 2026-05～06 ASR 本地与云端 skill 定稿
      - 2026-06-01 排产表单 skill
      - 2026-06-09 本地文件 RAG 服务 + skill
related_posts:
  - slug: openclaw-cad-sdk
    label: CAD 图纸桥
    pinned: true
  - slug: openclaw-file-rag
    label: 本地文件 RAG
    pinned: true
  - slug: openclaw-asr-local-cloud
    label: ASR 本地与云端
    pinned: true
  - slug: openclaw-excel-plan-form
    label: Excel 排产表单
    pinned: true
---

正文区域当前版本**不会写入数据库**；项目展示内容以 `layout` 为准。
