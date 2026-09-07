<script setup lang="ts" generic="TFilter extends string, TSort extends string">
import EdCatGroup from '@/components/editorial/EdCatGroup.vue'

defineProps<{
  filterAria: string
  sortAria: string
  filterOptions: Array<{ id: TFilter; label: string }>
  sortOptions: Array<{ id: TSort; label: string }>
}>()

const filter = defineModel<TFilter>('filter', { required: true })
const sort = defineModel<TSort>('sort', { required: true })
</script>

<template>
  <div class="ed-switch">
    <EdCatGroup v-model="filter" :options="filterOptions" :group-label="filterAria" />
    <div class="ed-switch-end">
      <EdCatGroup v-model="sort" radiogroup :options="sortOptions" :group-label="sortAria" />
    </div>
  </div>
</template>
