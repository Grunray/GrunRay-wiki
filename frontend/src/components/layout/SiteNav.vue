<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import CommunityNavIcon from '../icons/CommunityNavIcon.vue'
import CreateNavIcon from '../icons/CreateNavIcon.vue'
import HomeNavIcon from '../icons/HomeNavIcon.vue'
import XiqiNavIcon from '../icons/XiqiNavIcon.vue'
import SiteNavGroup, { type SiteNavDropdownItem } from './SiteNavGroup.vue'

const props = withDefaults(
  defineProps<{
    /** drawer：手机侧栏纵向目录 */
    variant?: 'bar' | 'drawer'
  }>(),
  { variant: 'bar' },
)

const emit = defineEmits<{
  navigate: []
}>()

const { t } = useI18n()
const route = useRoute()

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

function mapItems(
  entries: { to: string; labelKey: string; descKey: string; kickerKey: string }[],
): SiteNavDropdownItem[] {
  return entries.map((entry) => ({
    to: entry.to,
    label: t(entry.labelKey),
    desc: t(entry.descKey),
    kicker: t(entry.kickerKey),
  }))
}

const createGroup = computed(() => ({
  label: t('nav.groupCreate'),
  icon: CreateNavIcon,
  menuId: 'shell-nav-menu-create',
  items: mapItems([
    { to: '/projects', labelKey: 'nav.projects', descKey: 'nav.projectsDesc', kickerKey: 'nav.dropKickerProjects' },
    { to: '/blog', labelKey: 'nav.blog', descKey: 'nav.blogDesc', kickerKey: 'nav.dropKickerBlog' },
  ]),
}))

const communityGroup = computed(() => ({
  label: t('nav.groupCommunity'),
  icon: CommunityNavIcon,
  menuId: 'shell-nav-menu-community',
  items: mapItems([
    { to: '/messages', labelKey: 'nav.messages', descKey: 'nav.messagesDesc', kickerKey: 'nav.dropKickerMessages' },
    { to: '/friends', labelKey: 'nav.friends', descKey: 'nav.friendsDesc', kickerKey: 'nav.dropKickerFriends' },
  ]),
}))

const xiqiGroup = computed(() => ({
  label: t('nav.groupXiqi'),
  icon: XiqiNavIcon,
  menuId: 'shell-nav-menu-xiqi',
  items: mapItems([
    { to: '/fragments', labelKey: 'nav.fragments', descKey: 'nav.fragmentsDesc', kickerKey: 'nav.dropKickerFragments' },
    { to: '/about', labelKey: 'nav.about', descKey: 'nav.aboutDesc', kickerKey: 'nav.dropKickerAbout' },
    { to: '/recommend', labelKey: 'nav.recommend', descKey: 'nav.recommendDesc', kickerKey: 'nav.dropKickerRecommend' },
  ]),
}))

function onNavigate() {
  emit('navigate')
}
</script>

<template>
  <nav
    class="nav nav--shell"
    :class="{ 'nav--drawer': props.variant === 'drawer' }"
    :aria-label="props.variant === 'drawer' ? t('nav.mobileMenuRegion') : 'Main'"
  >
    <div class="nav-shell-capsule">
      <RouterLink
        to="/"
        class="link nav-shell-pill"
        :class="{ active: isActive('/') }"
        :aria-current="isActive('/') ? 'page' : undefined"
        @click="onNavigate"
      >
        <span class="link-icon" aria-hidden="true">
          <HomeNavIcon />
        </span>
        <span class="link-label">{{ t('nav.home') }}</span>
        <span class="grow-line" aria-hidden="true" />
      </RouterLink>

      <span class="nav-shell-capsule__divider" aria-hidden="true" />

      <div class="nav-shell-capsule__groups">
        <SiteNavGroup
          :label="createGroup.label"
          :icon="createGroup.icon"
          :items="createGroup.items"
          :menu-id="createGroup.menuId"
          :drawer="props.variant === 'drawer'"
          @navigate="onNavigate"
        />
        <SiteNavGroup
          :label="communityGroup.label"
          :icon="communityGroup.icon"
          :items="communityGroup.items"
          :menu-id="communityGroup.menuId"
          :drawer="props.variant === 'drawer'"
          @navigate="onNavigate"
        />
        <SiteNavGroup
          :label="xiqiGroup.label"
          :icon="xiqiGroup.icon"
          :items="xiqiGroup.items"
          :menu-id="xiqiGroup.menuId"
          :drawer="props.variant === 'drawer'"
          @navigate="onNavigate"
        />
      </div>
    </div>
  </nav>
</template>

<style scoped>
/*
 * 主导航 · Editorial 方案 D（上下发丝）
 */
.nav {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
}

.nav-shell-capsule {
  display: inline-flex;
  align-items: center;
  gap: 0.08rem;
  padding: 0.18rem 0.36rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  box-shadow:
    0 -1px 0 var(--color-border),
    0 1px 0 var(--color-border);
  flex-wrap: nowrap;
  max-width: 100%;
}

.nav-shell-capsule__divider {
  width: 1px;
  height: 1.22rem;
  background: var(--color-border);
  flex-shrink: 0;
  margin: 0 0.04rem;
}

.nav-shell-capsule__groups {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.04rem;
  min-width: 0;
}

.link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  padding: 0.42rem 0.62rem;
  border-radius: 0;
  border: 1px solid transparent;
  background-color: transparent;
  box-shadow: none;
  transition: color 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.link-icon {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  opacity: 0.55;
}

.link:hover .link-icon,
.link.active .link-icon {
  opacity: 0.9;
}

.link :deep(.shell-nav-icon),
.nav-shell-capsule__groups :deep(.shell-nav-icon) {
  width: 0.88rem;
  height: 0.88rem;
}

.link:hover {
  color: var(--color-text);
  text-decoration: none;
}

.link.active {
  color: var(--color-accent);
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}

.grow-line {
  position: absolute;
  left: 0.28rem;
  right: 0.28rem;
  bottom: 0.12rem;
  height: 1px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: 50% 50%;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.link:hover .grow-line,
.link.active .grow-line {
  transform: scaleX(1);
}

.nav-shell-capsule__groups :deep(.group-trigger) {
  padding: 0.42rem 0.62rem;
  font-size: 0.8rem;
  gap: 0.38rem;
}

@media (max-width: 768px) {
  .nav-shell-capsule {
    padding: 0.14rem 0.28rem;
    gap: 0.06rem;
    flex-wrap: wrap;
  }

  .nav-shell-capsule__groups {
    flex-wrap: wrap;
  }

  .link {
    padding: 0.44rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.28rem;
  }

  .nav-shell-capsule__groups :deep(.group-trigger) {
    padding: 0.44rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.28rem;
  }

  .link :deep(.shell-nav-icon),
  .nav-shell-capsule__groups :deep(.shell-nav-icon) {
    width: 0.84rem;
    height: 0.84rem;
  }
}

/* 手机侧栏：纵向手风琴，不用顶栏胶囊横排 */
.nav--drawer {
  width: 100%;
}

.nav--drawer .nav-shell-capsule {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 0.2rem;
  padding: 0.2rem 0;
  box-shadow: none;
}

.nav--drawer .nav-shell-capsule__divider {
  width: 100%;
  height: 1px;
  margin: 0.35rem 0;
}

.nav--drawer .nav-shell-capsule__groups {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 0.12rem;
}

.nav--drawer .link {
  width: 100%;
  justify-content: flex-start;
  min-height: 44px;
  padding: 0.72rem 0.35rem;
  font-size: 0.95rem;
}

.nav--drawer .link :deep(.shell-nav-icon) {
  width: 1rem;
  height: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .link,
  .grow-line {
    transition: none;
  }
}
</style>
