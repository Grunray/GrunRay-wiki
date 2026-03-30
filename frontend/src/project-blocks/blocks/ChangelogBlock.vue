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
.block {
  margin-bottom: 1.75rem;
}
.title {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}
</style>
