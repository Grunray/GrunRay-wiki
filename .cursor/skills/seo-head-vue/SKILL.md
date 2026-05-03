---
name: seo-head-vue
description: Injects per-route SEO meta, Open Graph, Twitter cards, and JSON-LD for Vue 3/Vite static or SPA blogs. Use when index.html lacks description/OG/schema, when the user asks for useSeoMeta, head updates on route change, AEO/structured data, or blog/article SEO.
---

# Vue 静态站 SEO（Head + OG + Twitter + JSON-LD）

## 目标

- `index.html` 只保留 charset、viewport、favicon、字体等静态资源；**不写死**每页 `description` / OG / JSON-LD。
- 每个路由（尤其文章详情）在客户端或 SSR 时**动态写入** `<head>`，路由切换时**覆盖**上一页的 meta。
- 为搜索引擎与社交预览提供：**基础 meta**、**Open Graph**、**Twitter Card**、**JSON-LD**（便于 AEO / 富结果）。

## 依赖（默认方案）

在 Vue 3 + Vite 项目中使用 **Unhead**（`@unhead/vue` + `@unhead/addons` 可选）管理 head，与路由联动。

安装示例：

```bash
npm i @unhead/vue
```

在 `main.ts` 中 `createHead()` 并 `app.use(head)`；Vite 使用 `@vitejs/plugin-vue` 时按 [Unhead Vue 文档](https://unhead.unjs.io) 接入。

若项目已用 Nuxt，改用 `useSeoMeta` / `useHead` 由框架提供，本 skill 的 composable 命名可对齐 Nuxt 习惯但实现走 `@unhead/vue`。

## 何时读写 head

| 场景 | 做法 |
|------|------|
| 全局站点名、默认 description、og:image 兜底 | 根布局或 `App.vue` 一次 `useHead` |
| 列表页 / 关于页 | 各视图 `onMounted` + `watch` 路由 params/query |
| 文章详情 | 数据加载完成后设置 title/description/url/image，避免闪错标题 |

路由切换时：**先**用新路由的占位或 loading 标题，**数据到达后**再补全 OG 与 JSON-LD，避免长时间空白 meta。

## `useSeoMeta` composable（约定）

在 `src/composables/useSeoMeta.ts`（或项目统一 composables 目录）封装一层，内部调用 Unhead 的 `useHead` / `useSeoMeta`（若使用 `@unhead/vue` 提供的 SEO 辅助 API），入参建议统一为：

```ts
export type SeoInput = {
  title: string
  description: string
  /** 绝对 URL，用于 canonical / og:url */
  url: string
  /** 绝对 URL；缺省可用站点默认 OG 图 */
  image?: string
  /** 文章类页面传 ISO 8601 字符串 */
  publishedTime?: string
  modifiedTime?: string
  /** 默认 website；文章用 Article */
  type?: 'website' | 'article'
  locale?: string
  siteName?: string
  /** noindex 等 */
  robots?: string
}
```

职责：

1. **基础**：`<title>`、`meta name="description"`、`link rel="canonical"`、`meta name="robots"`（按需）。
2. **Open Graph**：`og:title`、`og:description`、`og:url`、`og:image`、`og:type`、`og:site_name`、`og:locale`；文章加 `article:published_time`、`article:modified_time`（若有）。
3. **Twitter**：`twitter:card`（常用 `summary_large_image`）、`twitter:title`、`twitter:description`、`twitter:image`。
4. **JSON-LD**：用 `script type="application/ld+json"` 注入；内容用 `JSON.stringify(schema)`，**禁止**未转义的用户 HTML。

与路由联动：在调用方用 `watch(() => route.fullPath, ...)` 或在 `router.afterEach` 里根据 `to.meta` / 异步拉取的文章数据调用 `useSeoMeta(payload)`。

## JSON-LD（AEO / 富结果）

按页面类型选择 `@graph` 或单对象，至少保证 URL 与主实体一致：

- **全站**：`WebSite`（`url`、`name`、可选 `potentialAction` SearchAction）。
- **文章**：`BlogPosting` 或 `Article`（`headline`、`description`、`image`、`datePublished`、`dateModified`、`author`、`mainEntityOfPage`）。
- **面包屑**：`BreadcrumbList`（`itemListElement` 与路由层级一致）。

图片与 URL **一律绝对路径**（含 `https://` 与域名），相对路径在 OG/JSON-LD 中常失效。

## 实现检查清单

- [ ] `og:image` / `twitter:image` 为 HTTPS 绝对 URL，尺寸建议 1200×630 左右。
- [ ] 每页 `og:url` 与 `canonical` 与真实可分享 URL 一致。
- [ ] 路由切换后旧页面的 article JSON-LD 被替换，不残留双份 script。
- [ ] 长 `description` 控制在合理长度（约 150–160 字内为摘要习惯）。
- [ ] 构建产物中抽查 `dist/index.html`：SPA 可能仍较简；若需爬虫无 JS 可读，评估 **SSG**（`vite-plugin-ssr` / Nuxt）或预渲染关键路由。

## 反模式

- 仅在 `index.html` 写死一套 meta，无法随文章变化。
- JSON-LD 手写字符串拼接用户正文 → XSS；必须结构化对象 + `JSON.stringify`。
- `og:image` 使用相对路径 `/cover.png`。

## 附加资源

- 字段与类型细节见 [reference.md](reference.md)。
