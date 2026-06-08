# GrunRay-wiki 优化档案

本目录记录对 GrunRay-wiki（Vue 3 + Vite 8 前端 / Flask + MySQL 后端 / nginx）做过的系统优化：
每一项的**根因、方案、前后对比、部署与验证**都单独成篇，便于回溯与复用。

> 技术栈：Vue 3.5（`<script setup>`）· Vite 8（Rolldown）· Pinia · vue-router 5 · vue-i18n ·
> GSAP 3.14 · @unhead/vue · Flask 3 · PyMySQL · nginx 1.20 · 部署在腾讯云 CentOS（systemd）。

---

## 汇总表

| # | 优化项 | 类型 | 关键指标 / 效果 | 文档 |
|---|--------|------|----------------|------|
| 1 | 移动端适配 | 前端 UX | 断点统一 768/480；375px / 320px **零横向溢出** | [01](./01-mobile-adaptation.md) |
| 2 | GSAP 动效体系 | 前端 UX | 路由转场 + 滚动进度条 + 回到顶部 + 图片蜗牛加载 + 背景 blur-up | [02](./02-gsap-animations.md) |
| 3 | 前端首屏性能 | 前端性能 | 路由懒加载：主包 **627KB→239KB**（gzip 216→90）；字体自托管去外链 | [03](./03-frontend-performance.md) |
| 4 | nginx：RSS / 缓存 / gzip | 运维 | 修复 `/rss.xml` 404；`/assets` `/fonts` 一年 immutable；HTML no-cache；gzip | [04](./04-nginx-rss-cache-gzip.md) |
| 5 | 服务器 / 仓库清理 | 运维 | 服务器 frontend 18M→5.5M；仓库 untrack 40M zip + 1875 个 node_modules 文件 | [05](./05-server-repo-cleanup.md) |
| 6 | SEO | SEO | sitemap（28 URL）+ robots + 静态兜底 OG meta；预渲染评估结论 | [06](./06-seo-sitemap-meta.md) |
| 7 | 图片 WebP 内容协商 | 后端性能 | 实测 446KB→226KB（**省 48%**）；Accept 协商 + 磁盘缓存，前端零改动 | [07](./07-image-webp.md) |
| 8 | 后端 gunicorn | 后端性能/安全 | Flask 单线程 dev server → gunicorn 3 worker；关 debug；绑 127.0.0.1（不再对外） | [09](./09-backend-gunicorn.md) |
| 9 | 后续建议 | 规划 | canonical 域名统一、CI/CD、HTTP/2 等 | [08](./08-future-recommendations.md) |

---

## 相关提交

| commit | 内容 |
|--------|------|
| `5c69c60` | perf：路由懒加载 + 字体自托管 |
| `787bfde` | chore：移除误提交的 40M zip 快照与 demos node_modules |
| `417283b` | feat(seo)：sitemap/robots + index.html 静态兜底 meta |
| `bcca4e9` | perf(media)：媒体图片 WebP 内容协商 |

> 早期的移动端适配与 GSAP 动效在更早的提交（含 `feat/gsap-animations-lite` 分支合并）。

---

## 部署速记

服务器无 git / node，部署 = 本地构建 → tar → scp → ssh 解压（旧 `dist` 备份为 `dist.bak.*` 回滚点）。
后端为 systemd `grunray-wiki.service`（gunicorn 3 worker，见 [09](./09-backend-gunicorn.md)），改动后 `systemctl restart`。nginx 配置改动先 `nginx -t` 再 reload。
完整命令见各篇「部署与验证」小节。
