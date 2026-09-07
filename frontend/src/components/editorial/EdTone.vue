<script setup lang="ts">
defineProps<{
  tone: string
}>()
</script>

<template>
  <span class="ed-tone" :class="`ed-tone--${tone}`"><slot /></span>
</template>
