<script setup lang="ts">
import EdKicker from '@/components/editorial/EdKicker.vue'

defineProps<{
  kickerEn: string
  kickerZh: string
}>()
</script>

<template>
  <header class="ed-ledger-head">
    <EdKicker :en="kickerEn" :zh="kickerZh" />
    <span class="ed-ledger-tools"><slot /></span>
  </header>
</template>
