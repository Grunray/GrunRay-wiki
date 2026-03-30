import { createApp } from 'vue';
// import './style.css'
import '@/assets/style/rebase.css';
import '@/assets/style/normalize.css';
import '@/assets/font/iconfont.css';
import '@/assets/font/iconfont.js';
import App from '@/components/backSlideTime.vue';
// import App from '@/App.vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { initRouter } from "@/router";
import { initStore } from '@/store';


const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 初始化路由
// ==> app.use(router)
// 挂载app之前,先启用路由
initRouter(app);
initStore(app);
app.mount('#app');