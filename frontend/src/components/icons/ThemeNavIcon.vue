<template>
  <!-- 浅色态显示太阳、深色态显示月亮，表示当前主题 -->
  <svg
    v-if="!dark"
    class="theme-nav-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
  <svg
    v-else
    class="theme-nav-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ dark: boolean }>()
</script>

<style scoped>
.theme-nav-icon {
  display: block;
  width: 0.94rem;
  height: 0.94rem;
  flex-shrink: 0;
  color: inherit;
}
</style>
