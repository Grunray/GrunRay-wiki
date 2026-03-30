<script setup lang="ts">
import type { ProjectLayoutBlock } from '@/types/content'

defineProps<{ block: ProjectLayoutBlock }>()
</script>

<template>
  <section class="block">
    <h2 v-if="block.title" class="title">{{ block.title }}</h2>
    <p v-if="block.body" class="prose">{{ block.body }}</p>
    <p v-if="block.demoUrl" class="actions">
      <a :href="block.demoUrl" target="_blank" rel="noreferrer noopener">打开 Demo</a>
    </p>
  </section>
</template>

<style scoped>
.block {
  margin-bottom: 1.75rem;
}
.title {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}
.actions {
  margin: 0.75rem 0 0;
}
</style>
