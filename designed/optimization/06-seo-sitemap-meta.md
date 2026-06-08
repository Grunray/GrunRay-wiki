# 06 · SEO：sitemap + robots + 静态兜底 meta

## 一、sitemap.xml（后端动态生成）

新增 `backend/app/sitemap_feed.py` + Flask 路由 `/sitemap.xml`，包含 **28 个 URL**：

- **静态页**（8）：`/`、`/blog`、`/projects`、`/fragments`、`/recommend`、`/friends`、`/about`、`/messages`，各带 `changefreq` / `priority`；
- **博客文章**：`post` 表 `published_at` 非空，`lastmod` 取 `updated_at`/`published_at`；
- **项目**：`wiki_project` 非 hidden（status≠2），`lastmod` 取 `start_date`。

可见性规则与博客列表 / RSS **完全一致**（复用 `_parse_extra` 排除隐藏项目笔记），不会泄露隐藏内容。

## 二、robots.txt（后端动态生成）

```
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://www.grunray.tech/sitemap.xml
```

## 三、nginx 代理

两者都是后端动态内容，nginx 精确匹配代理到 `:5000`（否则同样被 SPA 兜底成 HTML，参见 [04](./04-nginx-rss-cache-gzip.md)）：

```nginx
location = /sitemap.xml { proxy_pass http://127.0.0.1:5000/sitemap.xml; ... }
location = /robots.txt  { proxy_pass http://127.0.0.1:5000/robots.txt;  ... }
```

## 四、前端 meta：现状核查 + 静态兜底

### 现状（已很完善）
`src/composables/useSeoMeta.ts` 统一封装，**13 个 view 全部接入**，含：
`title` / `description`（截断）/ `canonical` / 完整 `og:*` / `twitter:card` / **JSON-LD 结构化数据**。
运行时由 `@unhead/vue` 注入。

### 缺口与补强
`index.html` 此前**无静态 meta** —— 不执行 JS 的社媒卡片爬虫（部分微信/Twitter/FB 抓取）抓不到任何 OG。
补站点级**静态兜底 meta**到 `index.html`：`description` / `canonical` / `og:*` / `twitter:*`。

- 不执行 JS 的爬虫 → 至少拿到站点默认 OG；
- 执行 JS 的客户端 → `useSeoMeta` 覆盖成**页面级精确**值。

### 关键验证：会不会重复？
@unhead 渲染时按 `name`/`property` 对现有 DOM 标签做 reconcile（更新而非新增）。预览实测：

```js
document.querySelectorAll('meta[property="og:title"]').length  // 1（不重复）
document.querySelector('meta[property="og:title"]').content    // "首页 | GrunRay"（被运行时覆盖）
```

所有 og/description/canonical 标签 **count 均为 1**，且 `og:title` 已是页面级值 → 静态兜底与运行时覆盖完美协作。

## 五、预渲染评估（结论：暂不做）

| 维度 | 评估 |
|---|---|
| 现有 SEO 覆盖 | sitemap + RSS + 运行时动态 meta + JSON-LD + 静态兜底 meta，已覆盖主流爬虫（Googlebot 执行 JS） |
| 预渲染收益 | 主要利好「不执行 JS 的爬虫」与首屏；但站点内容动态（博客/项目来自 MySQL） |
| 预渲染成本 | 构建时需拉数据，每次发文要重新构建部署；引入 SSG/puppeteer，与当前纯 SPA 架构差异大 |
| 结论 | **性价比不高，暂不做**。若未来要更激进 SEO，建议走 SSR（如 vite-ssg / Nuxt 迁移），属架构级改动 |
