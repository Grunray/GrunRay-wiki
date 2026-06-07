import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { registerGsapPlugins } from './composables/gsap/registerGsap'
import { i18n } from './i18n'
import router from './router'

registerGsapPlugins()
import './styles/main.css'
import './styles/markdown-reading.css'
import './styles/footer-grunray.css'

const app = createApp(App)
const head = createHead()
app.use(createPinia())
app.use(head)
app.use(router)
app.use(i18n)
app.mount('#app')
