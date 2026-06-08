import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import { syncPageCorruptForRoute } from '@/theme/pageCorruptState'
import { applyPagePhotoBackgroundToDocument } from '@/theme/pagePhotoBackgrounds'

/**
 * 各页面用动态 import 懒加载：首屏只下核心包 + 首页 chunk，其余页面进入时按需加载，
 * 大幅减小首屏体积（对慢服务器尤其有效）。AppShell 是全局布局，首屏必需，保持静态。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { appMainLayout: 'full-viewport' } },
        { path: 'projects', name: 'projects', component: () => import('@/views/ProjectsView.vue') },
        { path: 'projects/:slug', name: 'project-detail', component: () => import('@/views/ProjectDetailView.vue') },
        { path: 'projects/:slug/notes', name: 'project-notes', component: () => import('@/views/ProjectNotesView.vue') },
        { path: 'blog', name: 'blog', component: () => import('@/views/BlogView.vue') },
        { path: 'blog/:slug', name: 'post-detail', component: () => import('@/views/PostDetailView.vue') },
        { path: 'messages', name: 'messages', component: () => import('@/views/MessagesView.vue') },
        { path: 'friends', name: 'friends', component: () => import('@/views/FriendsView.vue') },
        { path: 'friends/apply', name: 'friends-apply', component: () => import('@/views/FriendsApplyView.vue') },
        {
          path: 'fragments',
          name: 'fragments',
          component: () => import('@/views/FragmentsView.vue'),
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'fragments/compose',
          name: 'fragments-compose',
          component: () => import('@/views/FragmentComposeView.vue'),
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue'),
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'recommend',
          name: 'recommend',
          component: () => import('@/views/RecommendView.vue'),
          meta: { appMainLayout: 'full-viewport' },
        },
        { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  applyPagePhotoBackgroundToDocument(to)
  syncPageCorruptForRoute(to.name)
})

export default router
