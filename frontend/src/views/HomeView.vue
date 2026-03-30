<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import ProjectCard from '@/components/project/ProjectCard.vue'
import { listFeaturedProjects } from '@/services/contentRepository'

const { t } = useI18n()
const featured = listFeaturedProjects()
</script>

<template>
  <section>
    <p class="tagline">{{ t('home.tagline') }}</p>
    <div class="quick">
      <RouterLink class="btn" to="/blog">{{ t('home.enterBlog') }}</RouterLink>
      <RouterLink class="btn secondary" to="/algorithms">{{ t('home.enterAlgorithms') }}</RouterLink>
    </div>
    <h1 class="h">{{ t('home.featured') }}</h1>
    <ProjectCard v-for="p in featured" :key="p.id" :project="p" />
    <p v-if="!featured.length" class="empty">暂无精选项目（可在内容数据中设置 featured）。</p>
  </section>
</template>

<style scoped>
.tagline {
  font-size: 1.1rem;
  margin: 0 0 1rem;
  color: var(--color-text);
}
.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}
.btn {
  display: inline-block;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  text-decoration: none;
}
.btn:hover {
  filter: brightness(1.05);
  text-decoration: none;
}
.btn.secondary {
  background: var(--color-bg-surface);
  color: var(--color-accent);
  border: 1px solid var(--color-border);
}
.h {
  font-size: 1.2rem;
  margin: 0 0 0.75rem;
}
.empty {
  color: var(--color-text-muted);
}
</style>
