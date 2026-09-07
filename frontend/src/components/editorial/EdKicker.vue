<script setup lang="ts">
defineProps<{
  en: string
  zh: string
}>()
</script>

<template>
  <p class="ed-kicker">
    <span class="ed-en">{{ en }}</span>
    <span class="ed-mid" aria-hidden="true">·</span>
    <span class="ed-zh">{{ zh }}</span>
  </p>
</template>
