# 03 · 前端首屏性能：路由懒加载 + 字体自托管

## 一、路由懒加载（code-splitting）

### 根因
`router/index.ts` 原本把全部 14 个页面用静态 `import` 引入，Vite 会把它们全部打进首屏主包。
用户首次进站要下载全站所有页面的代码，对慢服务器尤其不友好。

### 方案
除全局布局 `AppShell`（首屏必需，保持静态）外，所有页面改成动态 `import` 懒加载：

```ts
// 之前：静态 import，全部进主包
import HomeView from '@/views/HomeView.vue'

// 之后：动态 import，进入路由时按需加载
{ path: '', name: 'home', component: () => import('@/views/HomeView.vue'),
  meta: { appMainLayout: 'full-viewport' } }
```

Vite 据此把每个页面拆成独立 chunk（`BlogView-xxx.js`、`MessagesView-xxx.js`…），
首屏只下「核心运行时 + 首页」，其余页面在跳转时才请求。

### 前后对比

| | 首屏主包 | gzip |
|---|---|---|
| 之前 | 627 KB | 216 KB |
| 之后 | **239 KB** | **90 KB** |

14 个页面拆为按需 chunk；`meta.appMainLayout` 等路由元信息原样保留。

---

## 二、字体自托管

### 根因
`index.html` 通过 Google Fonts 外链（`fonts.googleapis.com` / `fonts.gstatic.com`）加载字体：
- 国内访问 gstatic 不稳定、经常慢；
- 外链 CSS 阻塞首屏渲染；
- 多一次第三方 DNS + TLS。

### 方案
把字体下载到本地自托管：

1. 用带 Chrome UA 的请求拿 Google Fonts 的 CSS（含 `unicode-range` 分片）；
2. 下载其中 10 个 `woff2` 到 `public/fonts/`；
3. 生成本地 `public/fonts/fonts.css`，URL 全部改成 `/fonts/*.woff2`，保留 `unicode-range` 分片与 `font-display: swap`；
4. `index.html` 去掉 Google 的 `preconnect` + `stylesheet` + `noscript`，替换为：

```html
<link rel="stylesheet" href="/fonts/fonts.css" />
```

- `font-display: swap`：字体未就绪时先用系统字体排版，不挡首屏；
- `unicode-range`：浏览器只在页面真正用到某字符区段时才下载对应分片。

### 部署与验证
随前端 `dist` 一同部署。线上验证：

```bash
curl -sI https://grunray.tech/fonts/fonts.css          # 200
curl -s  https://grunray.tech/?n=$RANDOM | grep gstatic # 无输出 = 已无外链
```

> 配合 [04](./04-nginx-rss-cache-gzip.md) 的 `/fonts/` 一年 immutable 缓存，字体只下载一次。
