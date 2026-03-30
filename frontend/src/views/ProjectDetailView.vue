<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import ProjectBlockRenderer from '@/project-blocks/ProjectBlockRenderer.vue'
import { canAccessProjectPublic, getProjectBySlug } from '@/services/contentRepository'

const route = useRoute()
const { t } = useI18n()

const project = computed(() => getProjectBySlug(route.params.slug as string))
const ok = computed(() => {
  const p = project.value
  return p && canAccessProjectPublic(p)
})
</script>

<template>
  <div v-if="ok && project">
    <p class="back">
      <RouterLink to="/projects">← {{ t('common.back') }}</RouterLink>
    </p>
    <header class="head">
      <h1 class="title">{{ project.title }}</h1>
      <span v-if="project.status === 'archived'" class="badge">{{ t('projects.archived') }}</span>
    </header>
    <p class="summary">{{ project.summary }}</p>
    <div class="tags">
      <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
    <p class="notes-link">
      <RouterLink :to="`/projects/${project.slug}/notes`">{{ t('projects.notes') }}</RouterLink>
    </p>
    <div class="blocks">
      <ProjectBlockRenderer v-for="(block, i) in project.layout" :key="i" :block="block" />
    </div>
  </div>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
.back {
  margin: 0 0 1rem;
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.title {
  margin: 0;
  font-size: 1.5rem;
}
.summary {
  color: var(--color-text-muted);
}
.tags {
  margin: 0.75rem 0;
}
.notes-link {
  margin: 0 0 1.5rem;
}
.blocks {
  margin-top: 0.5rem;
}
.empty {
  color: var(--color-text-muted);
}
</style>
