<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'

const { t } = useI18n()
const route = useRoute()

useSeoMeta(() => ({
  title: `404 | ${SITE_NAME}`,
  description: t('common.notFound'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))
</script>

<template>
  <section class="wrap">
    <h1>404</h1>
    <p>{{ t('common.notFound') }}</p>
    <RouterLink to="/">{{ t('nav.home') }}</RouterLink>
  </section>
</template>

<style scoped>
.wrap {
  text-align: center;
  padding: 2rem 0;
}
</style>
