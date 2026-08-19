<script setup lang="ts">
import type { ProjectLayoutBlock } from '@/types/content'

defineProps<{ block: ProjectLayoutBlock }>()
</script>

<template>
  <section class="block">
    <h2 v-if="block.title" class="title">{{ block.title }}</h2>
    <div v-if="block.body" class="prose">{{ block.body }}</div>
  </section>
</template>

<style scoped>
/* 文字块：平铺 + hairline 分段（编辑式目录感，不再是卡片墙） */
.block {
  margin-bottom: 0;
  padding: 1rem 0 1.1rem;
  border-top: 1px solid var(--color-border);
}
.title {
  margin: 0 0 0.5rem;
  font-family: var(--font-serif);
  font-size: 1.18rem;
  font-weight: 600;
  color: var(--color-text);
}
</style>
