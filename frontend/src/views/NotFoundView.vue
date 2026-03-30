<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()
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
