import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import AboutView from '@/views/AboutView.vue'
import BlogView from '@/views/BlogView.vue'
import FragmentComposeView from '@/views/FragmentComposeView.vue'
import FragmentsView from '@/views/FragmentsView.vue'
import HomeView from '@/views/HomeView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PostDetailView from '@/views/PostDetailView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import ProjectNotesView from '@/views/ProjectNotesView.vue'
import FriendsApplyView from '@/views/FriendsApplyView.vue'
import FriendsView from '@/views/FriendsView.vue'
import MessagesView from '@/views/MessagesView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import RecommendView from '@/views/RecommendView.vue'
import { armRoutePageEnter, disarmRoutePageEnter, schedulePageEnter } from '@/composables/gsap/pageEnterOrchestrator'
import {
  routeTransitionClose,
  routeTransitionForceReset,
  routeTransitionOpen,
  setRouteTransitionLabel,
} from '@/composables/gsap/routeTransitionController'
import { ScrollTrigger, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'
import { syncPageCorruptForRoute } from '@/theme/pageCorruptState'
import { applyPagePhotoBackgroundToDocument } from '@/theme/pagePhotoBackgrounds'

registerGsapPlugins()

let isFirstShellNavigation = true
/** 仅当 beforeEach 成功播放 close 后，afterEach 才播放 open */
let pendingRouteOpen = false

const OPEN_TIMEOUT_MS = 2800

function shouldAnimateRoute(toPath: string, fromPath: string, fromName: unknown): boolean {
  if (isFirstShellNavigation) return false
  if (!fromName || toPath === fromPath) return false
  if (prefersReducedMotionMedia()) return false
  return true
}

async function waitForPaint(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

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
        {
          path: 'fragments',
          name: 'fragments',
          component: FragmentsView,
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'fragments/compose',
          name: 'fragments-compose',
          component: FragmentComposeView,
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'about',
          name: 'about',
          component: AboutView,
          meta: { appMainLayout: 'full-viewport' },
        },
        {
          path: 'recommend',
          name: 'recommend',
          component: RecommendView,
          meta: { appMainLayout: 'full-viewport' },
        },
        { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to, from) => {
  pendingRouteOpen = false

  if (isFirstShellNavigation) {
    isFirstShellNavigation = false
    return true
  }

  if (!shouldAnimateRoute(to.path, from.path, from.name)) {
    return true
  }

  const label = typeof to.name === 'string' ? to.name.replace(/-/g, ' ') : 'page'
  setRouteTransitionLabel(`/// ${label}`)
  armRoutePageEnter()

  try {
    await routeTransitionClose()
    pendingRouteOpen = true
  } catch {
    routeTransitionForceReset()
    disarmRoutePageEnter()
    pendingRouteOpen = false
  }
  return true
})

router.afterEach(async (to) => {
  applyPagePhotoBackgroundToDocument(to)
  syncPageCorruptForRoute(to.name)

  const hadCurtainOpen = pendingRouteOpen && !prefersReducedMotionMedia()
  if (hadCurtainOpen) {
    pendingRouteOpen = false
    await waitForPaint()
    try {
      await Promise.race([
        routeTransitionOpen(),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => reject(new Error('route-transition-open-timeout')), OPEN_TIMEOUT_MS)
        }),
      ])
    } catch {
      routeTransitionForceReset()
      disarmRoutePageEnter()
    }
  } else {
    pendingRouteOpen = false
    disarmRoutePageEnter()
    await waitForPaint()
    await schedulePageEnter()
  }

  await waitForPaint()
  ScrollTrigger.refresh()
})

export default router
