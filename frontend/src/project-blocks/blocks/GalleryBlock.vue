<script setup lang="ts">
import type { ProjectLayoutBlock } from '@/types/content'

import GalleryImagePreview from '@/components/project/GalleryImagePreview.vue'

defineProps<{ block: ProjectLayoutBlock }>()
</script>

<template>
  <!-- 画廊是媒体，允许保留卡片厚度（DESIGN.md §6） -->
  <section class="block card">
    <h2 v-if="block.title" class="title">{{ block.title }}</h2>
    <div v-if="block.images?.length" class="grid">
      <GalleryImagePreview
        v-for="(src, i) in block.images"
        :key="`${src}-${i}`"
        :src="src"
        :alt="`${block.title ?? 'gallery'} ${i + 1}`"
      />
    </div>
  </section>
</template>

<style scoped>
.block {
  margin-bottom: 0;
  padding: 0.95rem 1rem;
}
.title {
  margin: 0 0 0.75rem;
  font-family: var(--font-serif);
  font-size: 1.18rem;
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  }
}
</style>
