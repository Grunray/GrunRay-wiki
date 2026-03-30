<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import PostCard from '@/components/blog/PostCard.vue'
import { listPostsForBlog } from '@/services/contentRepository'
import type { Post } from '@/types/content'

const { t } = useI18n()
const posts = ref<Post[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  error.value = null
  try {
    posts.value = await listPostsForBlog()
  } catch {
    error.value = '加载失败，请确认后端已启动并已导入数据。'
  }
})
</script>

<template>
  <section>
    <h1 class="h">{{ t('blog.title') }}</h1>
    <p class="sub">{{ t('blog.subtitle') }}</p>
    <p v-if="error" class="empty">{{ error }}</p>
    <template v-else>
      <PostCard v-for="p in posts" :key="p.id" :post="p" />
      <p v-if="!posts.length" class="empty">暂无文章。</p>
    </template>
  </section>
</template>

<style scoped>
.h {
  margin: 0 0 0.35rem;
}
.sub {
  margin: 0 0 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}
.empty {
  color: var(--color-text-muted);
}
</style>
