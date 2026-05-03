---
title: Vite + Flask 混合栈的 Demo 展示架构建议
slug: project-demo-architecture-vite-flask
type: article
tags:
- Vue3
- Vite
- Flask
- Demo
- 架构设计
summary: 面向“主站 + 多个项目演示”的场景，给出独立 Demo 子工程、静态托管和 iframe 加载的落地方案。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2026-04-17T10:00:00'
updated_at: '2026-04-17T10:00:00'
series: 项目
---

## 问题背景

本博客(GrunRay-wiki)的 Demo 展示页，如果添加项目，需要修改主站前端代码，重新发布，非常麻烦，所以这里提出一个架构建议。

核心问题其实就是：Demo 源码应该放前端还是后端？

- 放前端：新增或改 Demo 时，主前端要跟着重新发布
- 放后端：代码组织容易杂乱，后端目录语义被稀释

本质上是“展示站主工程”和“项目 Demo 工程”是否解耦的问题。

## 结论（推荐方案）

采用 **独立 demo 子工程 + 静态产物托管 + 主站 iframe 加载**。

也就是：

- 主站前端只负责项目列表、详情页和 demo 嵌入容器
- 每个 demo 作为独立小前端工程（可放同仓库 `demos/`）
- demo 构建后上传静态托管位置（后端静态目录或对象存储/CDN）
- 项目数据中只保存 `demo_url` 和少量元数据，不把 demo 源码塞入主站

## 适配我的技术栈（Vite + Flask）

当前栈：

- 前端 Vite 构建静态资源
- 后端 Flask 提供 API

建议目录：

- 前端 demo 源码：`frontend/src/demos/<demo-name>/`（或独立 `demos/<demo-name>/`）
- 编译输出：`content/demos/<demo-slug>/<version>/index.html`
- 后端职责：存储 demo 静态路径与元数据，提供接口给前端，前端通过 iframe 加载

## 为什么这个方案更优

- 主前端无需反复发布，降低耦合和发布风险
- demo 可以独立构建、部署、更新，临时数据也放在 demo 应用内
- demo 异常不会影响主站构建与上线
- iframe 沙箱更安全，优先使用 `src` 指向静态地址，不建议 `srcdoc`（降低 XSS 风险）

## 落地建议

### 1) 仓库组织（推荐 mono repo）

```text
frontend/                 # 主站
backend/                  # API
demos/
  project-a/
  project-b/
  shared-mocks/           # 可选：通用 mock 数据/工具
```

### 2) 静态托管位置

- 方案 A：`backend/**/demos/<project>/<version>/...`
- 方案 B：对象存储/CDN（更推荐）

### 3) 数据层只存必要字段

- `demo_url`
- `demo_version`（可选）
- `demo_title`（可选）

## 部署与打包流程（补充）

demo 源码放在 `demos/`，构建后发布到后端可托管静态目录（或 CDN），主站通过接口拿到地址后 iframe 加载。

### 关键点

- `npm run build:demos` 不会打进 `frontend/dist`
- 它会把 `demos/` 产物发布到 `backend/**/demos/...`（或配置的静态托管目标）
- 前端一般通过 `/api/**/files/...` 这类接口路径拿到文件访问地址

### 要不要在服务器上打包？

两种都可以，但更推荐“本地/CI 打包后上传产物”。

#### 推荐流程（更稳）

1. 本地或 CI 构建：
  - `cd frontend ; npm run build`（产出主站 `frontend/dist`）
  - `cd frontend ; npm run build:demos`（产出 demo 静态文件）
2. 上传到服务器：
  - `frontend/dist`
  - `backend`（至少包含 `backend/**/demos` 的静态产物目录）
3. 启动后端服务，前端通过 `/api/**/files/...` 访问 demo 资源。

这样服务器不需要 Node 构建环境，部署链路更简单、稳定。

#### 服务器打包也可行

前提是服务器具备 Node 环境，并上传了 `frontend + demos` 源码后再执行构建命令。  
可行，但通常不如“本地/CI 构建后上传产物”稳定。

### 实操结论

当前最实用做法就是：

- 本地先打包
- 将 demo 产物复制/同步到 `backend/**/demos`
- 再部署后端与主站产物

## 决策简表

- 需求：Demo 是否频繁修改？
  - 频繁修改：独立子工程，单独部署静态资源
  - 稳定少变：直接集成前端静态资源，主站统一发布

## 注意事项

- 如果 demo 需要复用主站 Vue3 组件，可选：
  - 抽共享组件库
  - 抽共享接口层
  - 或先做轻量集成，避免早期过度设计
- 后端可通过静态路由或对象存储托管 demo 文件
- 建议统一 CI/CD，分别发布主站与 demo 产物

## 总结

对于“后续会不断新增 Vue3 demo、且演示版本要快速迭代”的场景，推荐方案是：

**独立 demo 子工程 + 后端静态服务（或 CDN）+ iframe 加载**。

这样既不需要重构主前端，也能让 demo 更新流程更灵活、更安全、更可维护。