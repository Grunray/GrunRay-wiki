# 02 · GSAP 动效体系

参考 GSAP 官方 skill 库的 Vue 最佳实践，给站点加入一套不喧宾夺主、贴合液态玻璃风格的动效。

## GSAP × Vue 工程约定
- 插件在 `main.ts` **统一注册一次**（`gsap.registerPlugin(ScrollTrigger)`）；
- 组件内 `onMounted` 创建、`onUnmounted` 用 `ctx.revert()` 清理（`gsap.context(cb, scope)` 限定作用域）；
- 布局变化后 `ScrollTrigger.refresh()`；
- 尊重 `prefers-reduced-motion`（用户关动效时降级）。

## 1. 路由跳转转场
`AppShell` 用 `<RouterView v-slot>` + `<Transition :css="false" mode="out-in">`，在 `@enter` / `@leave`
钩子里用 GSAP 控制进出场。

**踩坑修复（layout shift）**：转场时主区宽度原本直接绑定 `route.meta` 的布局类型，
路由一变宽度立即跳变 → 内容「先移动/缩放，再播放转场」。
解法：引入 `displayedLayout` ref，**只在 `onRouteEnter` 时**更新布局，而非直接读 `route.meta`，
让宽度变化发生在转场之内，消除突跳。

## 2. 滚动进度条 `ScrollProgress.vue`
顶部液态玻璃绿渐变细线，`scaleX` 随滚动 0→1，`gsap.quickTo` 平滑跟随。

**踩坑修复**：进度实时计算 `scrollY / (scrollHeight − innerHeight − footerRevealSpace)`：
- 减去底部 footer 揭开预留区 `--footer-reveal-space`，使「滚到内容底」即 100%（否则到底还不满）；
- 每帧用当前页面高度计算，规避异步内容（博客正文）加载后总高变化、`ScrollTrigger` 不刷新导致**提前满**。

## 3. 回到顶部浮钮 `BackToTop.vue`
固定左下角玻璃按钮，`ScrollTrigger` 在滚动 > 320px 时以 `back.out` 弹入，点击平滑滚回顶部。

## 4. 图片加载动画 `AppImage.vue`（蜗牛爬行）
慢服务器下图片加载慢，给大图统一加载态。封装 `AppImage`：

- 加载中显示**蜗牛**（复用站内 `SnailNavIcon`）沿轨道**从左爬到右** + 轻微上下起伏
  （`gsap.fromTo(snail, {x:-w}, {x: lane.width, duration:3.8, ease:'none', repeat:-1})`）；
- `minLoaderMs` 保证动画至少完整播一轮，不会一闪而过；
- `currentSrc` + `onError` 切到 `fallbackSrc`（一次）；`ratio` 撑住容器高度防跳动。
- 应用范围：FilmFeed + 画廊大图（首页头像 / 友链 logo 等小图不挂，避免视觉疲劳）。

## 5. 沉浸式背景图 blur-up + 光晕呼吸
导航切换的全屏照片背景同样需要加载态，但**不用蜗牛**（避免与图片加载动画重复、视觉疲劳），改用
「**模糊渐显 + 光晕呼吸**」：

```css
html[data-photo-bg-loading='true'] body::before {   /* 背景图层 */
  filter: blur(26px) brightness(0.72);
  transform: scale(1.08);                            /* 加载中模糊放大 */
}
/* body::after 放一层 radial-gradient 光晕，@keyframes 呼吸；加载完清除 data 属性，blur 过渡到清晰 */
```

`theme/pagePhotoBackgrounds.ts` 的 `preloadPhotoBg(url)` 用 `new Image()` 预载，`onload` 清除
`data-photo-bg-loading` → 触发 blur-up 过渡。尊重 `prefers-reduced-motion`。

## 6. 碎念 hero 图：改为后端 API 优先
栖息·碎念 hero 此前本地图优先，构建后中文文件名被百分号编码、在静态服务器失效（dev 正常、线上 404）。
按「图片从后端 API 获取」原则改造 `XiqiPageHero`：
`resolvedMedia = mediaSrc || apiHeroUrl(后端) || localFallback`，`AppImage` 以 `eager` + 较长 `minLoaderMs` 承载首图。
