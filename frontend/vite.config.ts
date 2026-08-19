import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Rolldown(Vite 8 内置打包器)的 CSS minifier 会把同值的
    // `backdrop-filter` 与 `-webkit-backdrop-filter` 误判为重复声明并删掉标准属性，
    // 只保留 -webkit- 前缀版（见 .card 液态玻璃卡片）。Firefox 等不认 -webkit- 别名的
    // 浏览器因此丢失毛玻璃模糊，卡片退化成纯半透明（"透明玻璃"）。dev 不压缩 CSS 故正常。
    // 改用 esbuild 压缩 CSS：它逐属性保留 vendor 前缀，不做跨前缀去重。
    cssMinify: 'esbuild',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/rss.xml': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    /* 上游 bug（vitejs/vite#22303）：懒加载路由（项目详情→MarkdownBlock）里的
     * dep 在导航中途触发 re-optimize，已 serve 模块里硬编码的旧 ?v= hash 立即
     * 504 → 动态 import 失败 → 点击卡片路由中止「没反应」。include 预声明在
     * rolldown-vite 8 的按需打包下不生效；marked/dompurify 均为纯 ESM 且无
     * 运行时依赖，直接 exclude 出优化管线，从根上避开 hash 竞态。 */
    exclude: ['marked', 'dompurify'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
