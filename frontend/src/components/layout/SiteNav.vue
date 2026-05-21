<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const links = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/projects', label: t('nav.projects') },
  { to: '/blog', label: t('nav.blog') },
  { to: '/messages', label: t('nav.messages') },
  { to: '/friends', label: t('nav.friends') },
])

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav class="nav" aria-label="Main">
    <RouterLink
      v-for="l in links"
      :key="l.to"
      :to="l.to"
      class="link"
      :class="{ active: isActive(l.to) }"
      :aria-current="isActive(l.to) ? 'page' : undefined"
    >
      {{ l.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
/*
 * 顶栏链接：对齐参考 blog.ericterminal.com（.nav-link）
 * 药丸底 + 半透明强调底/边 + 轻微上移
 */
.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.36rem 0.4rem;
}

.link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.92rem;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  padding: 0.62rem 0.95rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background-color: transparent;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.link:hover {
  color: var(--color-accent);
  text-decoration: none;
  background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 22%, transparent);
  transform: translateY(-1px);
}

.link.active {
  color: var(--color-accent);
  background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 22%, transparent);
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .link {
    padding: 0.52rem 0.72rem;
    font-size: 0.86rem;
  }

  .nav {
    gap: 0.22rem 0.28rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .link,
  .link:hover,
  .link.active {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease;
    transform: none;
  }
}
</style>
