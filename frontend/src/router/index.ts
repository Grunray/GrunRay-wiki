import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import AlgorithmsView from '@/views/AlgorithmsView.vue'
import BlogView from '@/views/BlogView.vue'
import HomeView from '@/views/HomeView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PostDetailView from '@/views/PostDetailView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import ProjectNotesView from '@/views/ProjectNotesView.vue'
import ProjectsView from '@/views/ProjectsView.vue'

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
        { path: 'algorithms', name: 'algorithms', component: AlgorithmsView },
        { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
