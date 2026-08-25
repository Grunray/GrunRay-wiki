<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import AboutNavIcon from '../icons/AboutNavIcon.vue'
import BlogNavIcon from '../icons/BlogNavIcon.vue'
import CommunityNavIcon from '../icons/CommunityNavIcon.vue'
import CreateNavIcon from '../icons/CreateNavIcon.vue'
import FragmentsNavIcon from '../icons/FragmentsNavIcon.vue'
import FriendsNavIcon from '../icons/FriendsNavIcon.vue'
import HomeNavIcon from '../icons/HomeNavIcon.vue'
import MessagesNavIcon from '../icons/MessagesNavIcon.vue'
import ProjectsNavIcon from '../icons/ProjectsNavIcon.vue'
import RecommendNavIcon from '../icons/RecommendNavIcon.vue'
import XiqiNavIcon from '../icons/XiqiNavIcon.vue'
import SiteNavGroup, { type SiteNavDropdownItem } from './SiteNavGroup.vue'

const { t } = useI18n()
const route = useRoute()

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

function mapItems(
  entries: { to: string; labelKey: string; descKey: string; icon: SiteNavDropdownItem['icon'] }[],
): SiteNavDropdownItem[] {
  return entries.map((entry) => ({
    to: entry.to,
    label: t(entry.labelKey),
    desc: t(entry.descKey),
    icon: entry.icon,
  }))
}

const createGroup = computed(() => ({
  label: t('nav.groupCreate'),
  icon: CreateNavIcon,
  menuId: 'shell-nav-menu-create',
  items: mapItems([
    { to: '/projects', labelKey: 'nav.projects', descKey: 'nav.projectsDesc', icon: ProjectsNavIcon },
    { to: '/blog', labelKey: 'nav.blog', descKey: 'nav.blogDesc', icon: BlogNavIcon },
  ]),
}))

const communityGroup = computed(() => ({
  label: t('nav.groupCommunity'),
  icon: CommunityNavIcon,
  menuId: 'shell-nav-menu-community',
  items: mapItems([
    { to: '/messages', labelKey: 'nav.messages', descKey: 'nav.messagesDesc', icon: MessagesNavIcon },
    { to: '/friends', labelKey: 'nav.friends', descKey: 'nav.friendsDesc', icon: FriendsNavIcon },
  ]),
}))

const xiqiGroup = computed(() => ({
  label: t('nav.groupXiqi'),
  icon: XiqiNavIcon,
  menuId: 'shell-nav-menu-xiqi',
  items: mapItems([
    { to: '/fragments', labelKey: 'nav.fragments', descKey: 'nav.fragmentsDesc', icon: FragmentsNavIcon },
    { to: '/about', labelKey: 'nav.about', descKey: 'nav.aboutDesc', icon: AboutNavIcon },
    { to: '/recommend', labelKey: 'nav.recommend', descKey: 'nav.recommendDesc', icon: RecommendNavIcon },
  ]),
}))
</script>

<template>
  <nav class="nav nav--shell" aria-label="Main">
    <div class="nav-shell-capsule">
      <RouterLink
        to="/"
        class="link nav-shell-pill"
        :class="{ active: isActive('/') }"
        :aria-current="isActive('/') ? 'page' : undefined"
      >
        <span class="link-icon" aria-hidden="true">
          <HomeNavIcon />
        </span>
        <span class="link-label">{{ t('nav.home') }}</span>
        <span class="leaf-glow" aria-hidden="true" />
        <span class="grow-line" aria-hidden="true" />
      </RouterLink>

      <span class="nav-shell-capsule__divider" aria-hidden="true" />

      <div class="nav-shell-capsule__groups">
        <SiteNavGroup
          :label="createGroup.label"
          :icon="createGroup.icon"
          :items="createGroup.items"
          :menu-id="createGroup.menuId"
        />
        <SiteNavGroup
          :label="communityGroup.label"
          :icon="communityGroup.icon"
          :items="communityGroup.items"
          :menu-id="communityGroup.menuId"
        />
        <SiteNavGroup
          :label="xiqiGroup.label"
          :icon="xiqiGroup.icon"
          :items="xiqiGroup.items"
          :menu-id="xiqiGroup.menuId"
        />
      </div>
    </div>
  </nav>
</template>

<style scoped>
/*
 * 主导航 · 方案 G + A 紧凑分段胶囊
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
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-surface) 90%, var(--color-bg-base));
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
  border-radius: 999px;
  border: 1px solid transparent;
  background-color: transparent;
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.35s ease,
    background-color 0.35s ease,
    border-color 0.35s ease,
    box-shadow 0.45s ease;
}

.link-icon {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.link :deep(.shell-nav-icon),
.nav-shell-capsule__groups :deep(.shell-nav-icon) {
  width: 0.88rem;
  height: 0.88rem;
}

/* hover 只提升文字色；着色交给下方生长线（accent 唯一交互点，DESIGN.md §7） */
.link:hover {
  color: var(--color-text);
  text-decoration: none;
}

.link.active {
  color: #6fad87;
  background-color: rgb(204 229 213 / 42%);
  border-color: rgb(180 210 192 / 55%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 75%),
    0 3px 10px rgb(170 205 185 / 12%);
  animation: shell-nav-breath-capsule 4s ease-in-out infinite;
}

:global([data-theme='dark']) .link.active {
  color: color-mix(in srgb, var(--color-accent) 88%, #b8e6c8);
  background-color: color-mix(in srgb, var(--color-accent) 14%, rgb(30 44 46 / 55%));
  border-color: color-mix(in srgb, var(--color-accent) 28%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 3px 10px rgb(0 0 0 / 14%);
}

.leaf-glow {
  position: absolute;
  width: 8px;
  height: 8px;
  right: 10px;
  top: 8px;
  border-radius: 100%;
  background: rgb(172 222 186 / 45%);
  filter: blur(3px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}

.link.active .leaf-glow {
  opacity: 1;
}

.grow-line {
  position: absolute;
  bottom: 4px;
  left: 50%;
  width: 0;
  height: 2px;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-accent) 70%, transparent),
    transparent
  );
  transition: width 0.5s ease, left 0.5s ease;
  pointer-events: none;
}

.link:hover .grow-line {
  width: 70%;
  left: 15%;
}

.link.active .grow-line {
  width: 0;
}

.nav-shell-capsule__groups :deep(.group-trigger) {
  padding: 0.42rem 0.62rem;
  font-size: 0.8rem;
  gap: 0.38rem;
}

@keyframes shell-nav-breath-capsule {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.012);
  }
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

@media (prefers-reduced-motion: reduce) {
  .link,
  .link:hover,
  .link.active {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    transform: none;
    animation: none;
  }

  .link:hover .link-icon {
    transform: none;
  }
}
</style>
