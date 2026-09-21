---
public_id: proj-deepseek-dify-diabetes
slug: deepseek-dify-diabetes-prevention-assistant
title: DeepSeek + Dify：糖尿病预治智能助手
summary: 2026 年 7 月实训全栈：Vue 3 对接 Dify Workflow / Chatflow 与 DeepSeek，覆盖风险预测、方案打卡、资讯与双端 AI 助手。
tags:
  - DeepSeek
  - Dify
  - Vue3
  - 智能体
  - 健康
locale: zh
status: archived
featured: false
year: 2026
start_date: '2026-07-01'
end_date: '2026-07-31'
github_url: https://github.com/Grunray/training-deepseek-dify-agent-diabetes-prevention-assistant
demo_url: ''
layout:
  - type: overview
    title: 概览
    body: |
      实训题目：DeepSeek + Dify 智能体开发——糖尿病预治智能助手（全栈）。README 时间范围为 2026.07；源码约 2026-09-21 推到 GitHub（私有仓）。

      面向移动端用户，把大模型对话和 Dify 工作流嵌进「评估 — 干预 — 跟进 — 咨询」闭环：游客可看医师团队、科普与病型介绍并在线咨询；登录后做信息采集与风险预测、定制饮食运动方案、打卡与 AI 分析、读个性化资讯，并用 AI 助手；管理端另有自然语言查改业务数据的智能管理助手。

      这是课程向练习，不是上线医疗产品：风险预测与方案输出依赖提示词与知识库，不能替代执业医师意见。
  - type: markdown
    title: 技术栈与仓库结构
    body: |
      | 层级 | 技术 |
      |------|------|
      | 前端 | Vue 3、Vite、Vue Router、Pinia |
      | AI | DeepSeek、Dify（Workflow / Agent Chat） |
      | 数据 | SQLite + 本地 Express `/execute` 服务 |
      | 其它 | SweetAlert2、Chart.js、Swiper、html-to-image |

      ```text
      code/frontend/          Vue3 SPA（主前端）
      code/frontend-legacy/   旧版静态 HTML 归档
      code/db/                表结构说明
      workflow/               Dify 工作流 / 智能体 DSL
      参考/ · result/ · 报告/  课程材料、过程记录、FAQ 与截图
      ```

      本地：`cd code/frontend && cp .env.example .env`，填 Dify 根地址与各应用 API Key 后 `npm install && npm run dev`。将 `workflow/` DSL 导入 Dify，按其中 README 挂工具、绑知识库。真实密钥不要进仓库。
  - type: markdown
    title: 功能与实训收获
    body: |
      ## 功能切片

      - **首页**：轮播、今日概览、医师咨询入口、科普与类型介绍、搜索
      - **风险**：采集信息 → 风险预测与复测提醒
      - **方案与打卡**：生活方案、打卡记录、打卡 AI 分析
      - **资讯**：个性化标签、详情与收藏
      - **AI**：用户助手对话 / 快捷提问；管理端自然语言维护数据
      - **个人中心**：档案、健康指标趋势、主题与周报导出

      ## 实训里学到的点

      1. **前端薄、能力在工作流。** 预测、方案、资讯、打卡分析、管理查询各对应 Dify 应用，换模型或改 prompt 不必整包重发前端。
      2. **DeepSeek 当推理后端，Dify 当编排。** 知识库、工具、多步 Workflow 用平台拼，业务 Token 按应用拆开。
      3. **SQLite + 受控 execute。** 适合实训规模；管理助手落到结构化维护时要严格鉴权。
      4. **legacy 静态页留着对照。** 从多页 HTML 迁到 Vue SPA 时，旧目录方便对比交互与文案。
related_posts: []
---

正文区域当前版本**不会写入数据库**；项目展示内容以 `layout` 为准。
