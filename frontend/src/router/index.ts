import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import BlogView from '@/views/BlogView.vue'
import HomeView from '@/views/HomeView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PostDetailView from '@/views/PostDetailView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import ProjectNotesView from '@/views/ProjectNotesView.vue'
import FriendsApplyView from '@/views/FriendsApplyView.vue'
import FriendsView from '@/views/FriendsView.vue'
import MessagesView from '@/views/MessagesView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import { applyPagePhotoBackgroundToDocument } from '@/theme/pagePhotoBackgrounds'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', name: 'home', component: HomeView, meta: { appMainLayout: 'full-viewport' } },
        { path: 'projects', name: 'projects', component: ProjectsView },
        { path: 'projects/:slug', name: 'project-detail', component: ProjectDetailView },
        { path: 'projects/:slug/notes', name: 'project-notes', component: ProjectNotesView },
        { path: 'blog', name: 'blog', component: BlogView },
        { path: 'blog/:slug', name: 'post-detail', component: PostDetailView },
        { path: 'messages', name: 'messages', component: MessagesView },
        { path: 'friends', name: 'friends', component: FriendsView },
        { path: 'friends/apply', name: 'friends-apply', component: FriendsApplyView },
        { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  applyPagePhotoBackgroundToDocument(to)
})

export default router
