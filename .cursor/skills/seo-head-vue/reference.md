# SEO Head 参考

## Unhead + Vue 3 最小接入思路

1. `npm i @unhead/vue`
2. `main.ts`：`import { createHead } from '@unhead/vue/client'`（纯 CSR）或按文档选 client/ssr 入口。
3. `const head = createHead()` → `app.use(head)`。

具体 import 路径以当前 `@unhead/vue` 版本文档为准（unjs 生态偶有调整）。

## `useSeoMeta` 实现要点（伪代码）

```ts
import { useHead } from '@unhead/vue'
import { computed } from 'vue'

export function useSeoMeta(input: () => SeoInput | undefined) {
  useHead(computed(() => {
    const s = input()
    if (!s) return {}
    const image = s.image ?? defaultOgImage
    const graph = buildJsonLd(s) // 返回对象或 @graph
    return {
      title: s.title,
      meta: [
        { name: 'description', content: s.description },
        { property: 'og:title', content: s.title },
        { property: 'og:description', content: s.description },
        { property: 'og:url', content: s.url },
        { property: 'og:image', content: image },
        { property: 'og:type', content: s.type === 'article' ? 'article' : 'website' },
        { property: 'og:site_name', content: s.siteName ?? 'Site' },
        { property: 'og:locale', content: s.locale ?? 'zh_CN' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: s.title },
        { name: 'twitter:description', content: s.description },
        { name: 'twitter:image', content: image },
        ...(s.robots ? [{ name: 'robots', content: s.robots }] : []),
      ],
      link: [{ rel: 'canonical', href: s.url }],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(graph),
          key: 'ld-json-main',
        },
      ],
    }
  }))
}
```

`key: 'ld-json-main'` 便于同一插槽覆盖更新（按 Unhead 版本用 `tagPriority` 或 `key` 字段，以文档为准）。

## Article 补充 meta

当 `type === 'article'` 时增加：

- `property: 'article:published_time'`
- `property: 'article:modified_time'`

## 站点级常量

建议 `src/config/site.ts`：`siteOrigin`、`defaultOgImage`、`siteName`， composable 内拼绝对 URL。
