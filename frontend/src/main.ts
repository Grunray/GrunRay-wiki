import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n } from './i18n'
import router from './router'
import './styles/main.css'
import './styles/markdown-reading.css'
import './styles/footer-grunray.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// GSAP 插件全局注册一次（官方 gsap-skills 最佳实践）
gsap.registerPlugin(ScrollTrigger)

const app = createApp(App)
const head = createHead()
app.use(createPinia())
app.use(head)
app.use(router)
app.use(i18n)
app.mount('#app')
