<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ProjectCard from '@/components/project/ProjectCard.vue'
import { listProjectsPublic } from '@/services/contentRepository'

const { t } = useI18n()
const includeArchived = ref(true)
const tagFilter = ref('')

const allTags = computed(() => {
  const set = new Set<string>()
  for (const p of listProjectsPublic({ includeArchived: true })) {
    for (const t of p.tags) set.add(t)
  }
  return [...set].sort()
})

const visible = computed(() => {
  let list = listProjectsPublic({ includeArchived: includeArchived.value })
  if (tagFilter.value) list = list.filter((p) => p.tags.includes(tagFilter.value))
  return list
})
</script>

<template>
  <section>
    <h1 class="h">{{ t('projects.title') }}</h1>
    <div class="toolbar card">
      <label class="row">
        <input v-model="includeArchived" type="checkbox" />
        <span>{{ t('projects.includeArchived') }}</span>
      </label>
      <div class="row">
        <span class="lbl">{{ t('projects.filterTags') }}</span>
        <select v-model="tagFilter" class="select">
          <option value="">{{ t('projects.allTags') }}</option>
          <option v-for="tg in allTags" :key="tg" :value="tg">{{ tg }}</option>
        </select>
      </div>
    </div>
    <ProjectCard v-for="p in visible" :key="p.id" :project="p" />
    <p v-if="!visible.length" class="empty">没有匹配的项目。</p>
  </section>
</template>

<style scoped>
.h {
  margin: 0 0 1rem;
}
.toolbar {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.lbl {
  min-width: 6rem;
}
.select {
  flex: 1;
  max-width: 240px;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text);
}
.empty {
  color: var(--color-text-muted);
}
</style>
