<script setup lang="ts">
import type { ProjectLayoutBlock } from '@/types/content'

defineProps<{ block: ProjectLayoutBlock }>()
</script>

<template>
  <section class="block">
    <h2 v-if="block.title" class="title">{{ block.title }}</h2>
    <div v-if="block.images?.length" class="grid">
      <figure v-for="(src, i) in block.images" :key="i" class="fig">
        <img :src="src" :alt="`${block.title ?? 'gallery'} ${i + 1}`" loading="lazy" />
      </figure>
    </div>
  </section>
</template>

<style scoped>
.block {
  margin-bottom: 1.75rem;
}
.title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}
.fig {
  margin: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
img {
  display: block;
  width: 100%;
  height: auto;
}
</style>
