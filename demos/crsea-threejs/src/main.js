import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.config.globalProperties.$message = {
  success: (msg) => console.log('[demo]', msg),
  error: (msg) => console.warn('[demo]', msg),
}
app.mount('#app')
