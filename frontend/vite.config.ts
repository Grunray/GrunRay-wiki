import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 子路径部署；本地 dev 仍走根路径
  base: process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/GrunRay-wiki/' : '/'),
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@xiqi_img': path.resolve(__dirname, '../designed/xiqi_img'),
    },
  },
})
