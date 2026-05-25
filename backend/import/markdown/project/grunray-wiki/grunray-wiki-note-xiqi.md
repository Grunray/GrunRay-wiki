---
title: 栖息：碎念、关于与推荐
slug: grunray-wiki-note-xiqi
type: project_note
tags:
  - Vue
  - 碎念
  - 栖息
summary: XiqiSplitLayout 分栏、碎念/关于/推荐三页 API 与 import 管线、分栏页脚联动说明。
locale: zh
series: 项目与工程
pinned: false
pinned_order: 7
published_at: '2026-05-25T18:00:00'
updated_at: '2026-05-25T18:00:00'
project_id: proj-grunray-wiki
---

## 界面布局

主导航「栖息」含碎念、关于、推荐；三页共享「Hero + 分栏」视觉语言，碎念与推荐使用同一分栏壳。

### 碎念 `/fragments` — `frontend/src/views/FragmentsView.vue`

```
┌─────────────────────────────────────────────┐
│ XiqiPageHero（页面 Hero 图，来自 xiqi/pages） │
├──────────────────┬──────────────────────────┤
│ 主栏（列表）      │ 详情轨道（选中一条碎念）   │
│ mood 筛选 chips  │ bodyHtml + 配图           │
│ TransitionGroup  │ 关闭时主栏 scroll 归位    │
└──────────────────┴──────────────────────────┘
```

- 外壳：`XiqiSplitLayout.vue`，`v-model:selectedKey` 绑定 `public_id`。
- 列表项：`XiqiCard.vue` + `FragmentMoodBadge.vue`（rant / sketch / flash / daily）。
- 详情正文：`class="fragment-detail-body ... markdown-reading"`。

### 关于 `/about` — `frontend/src/views/AboutView.vue`

- 单栏页面（不用 `XiqiSplitLayout`）：Hero + 履历卡片（头像、别名、邮箱、简介）+ 奖项/经历区块。
- 隐私字段：`AboutPrivateText.vue` 解析 `<xiqi-private>` 或服务端脱敏字段。
- 数据优先 `fetchAboutProfile()`，失败时回退 `content/data/aboutResume.ts` 静态结构。

### 推荐 `/recommend` — `frontend/src/views/RecommendView.vue`

- 同样使用 `XiqiSplitLayout`：左侧推荐卡片列表（软件/动漫等 category），右侧详情 Markdown。
- 筛选：分类、评分、排序（newest/oldest）。

### 站长撰写 `/fragments/compose` — `frontend/src/views/FragmentComposeView.vue`

- 需 OAuth 站长；表单写 import 源 + 上传媒体，保存后需手动跑 `import_xiqi.py`（不自动写 DB）。

## 数据与 API

### 碎念 `fragmentsApi.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/fragments?mood=&sort=&page=&size=` | 列表 |
| GET | `/api/fragments/:public_id` | 详情，含 `body`、`bodyHtml`、images |

### 页面 Hero `fetchXiqiPage` / `GET /api/xiqi/pages/:page`

- `page` 取值：`fragments`、`about`、`recommend`。
- 返回 `heroImageUrl` 等，图片文件在 `content/media/xiqi/pages/{page}/`。

### 关于 `aboutApi.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/xiqi/about` | 履历 JSON（camelCase）；无数据时 `data: null` |

正文源：`backend/import/xiqi/about/resume.md` → `content/xiqi/about/resume.md`。

### 推荐 `recommendApi.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/recommendations?category=&rating=&sort=` | 列表 |
| GET | `/api/recommendations/:public_id` | 详情 + bodyHtml |

### 内容与导入

| 类型 | import 源 | 脚本 |
|------|-----------|------|
| 碎念 | `import/xiqi/fragments/*.md` | `python scripts/xiqi_tools/import_xiqi.py fragments` |
| Hero | `import/xiqi/pages/{page}.md` | `import_xiqi.py pages` |
| 关于 | `import/xiqi/about/resume.md` | `import_xiqi.py about` |
| 推荐 | `import/xiqi/recommendations/*.md` | `import_xiqi.py recommendations` |

站长写接口：`xiqi_admin_api`（写 import 文件 + `POST /api/xiqi/media?scope=...`）。详见 `backend/scripts/xiqi_tools/README.md`。

## 关键文件

| 职责 | 路径 |
|------|------|
| 分栏布局 | `frontend/src/components/xiqi/XiqiSplitLayout.vue` |
| 分栏页脚锁 | `frontend/src/composables/useXiqiSplitFooter.ts` |
| 碎念列表页 | `frontend/src/views/FragmentsView.vue` |
| 推荐列表页 | `frontend/src/views/RecommendView.vue` |
| 关于页 | `frontend/src/views/AboutView.vue` |
| 站长撰写 | `frontend/src/views/FragmentComposeView.vue` |
| Hero 组件 | `frontend/src/components/xiqi/XiqiPageHero.vue` |
| 碎念 API | `frontend/src/services/fragmentsApi.ts` |
| 推荐 API | `frontend/src/services/recommendApi.ts` |
| 关于 API | `frontend/src/services/aboutApi.ts` |
| 站长 API | `frontend/src/services/fragmentsAdminApi.ts` |
| 栖息 API 路由 | `backend/app/routes/fragments_api.py` |
| 栖息样式 | `frontend/src/styles/page-xiqi.css`、`page-enter-xiqi.css` |
| 路径常量 | `backend/app/xiqi_paths.py` |

## 实现要点

1. **分栏动画**：`SPLIT_LAYOUT_MS = 580`；打开时 `layoutSplit` + `detailRailOpen`；关闭详情时 `detailLeaving` 保持轨道宽度直至 leave 结束，并 `restoreWindowScrollFromPanel` 归位主栏滚动（见 `XiqiSplitLayout.vue`）。
2. **列表 FLIP**：碎念/推荐 mood 或排序变化时用 `TransitionGroup` 播放列表重排动画（与 2026-05-25 提交一致）。
3. **页脚联动**：分栏打开调用 `setXiqiSplitFooterLock(true)`，详见 `grunray-wiki-note-shell`。
4. **路由 meta**：`/fragments`、`/about`、`/recommend` 均为 `appMainLayout: 'full-viewport'`。
5. **Markdown 样式**：详情 HTML 容器统一 `markdown-reading`，与全站阅读样式一致（`grunray-wiki-note-theme`）。
