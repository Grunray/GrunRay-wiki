import {createRouter,createWebHashHistory,RouteRecordRaw} from 'vue-router';
import {App} from 'vue';
 
let routes:RouteRecordRaw[] = [
    
];

let router = createRouter({
    history:createWebHashHistory(),
    routes
});
// export default 只能有一个
// export default router;
// 具名导出可以有多个 导出的方法在 main.ts 中使用了
// Element 代表标签元素,可以省略不写
export const initRouter = (app:App<Element>)=>{
    app.use(router);
};