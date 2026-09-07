<script setup lang="ts" generic="T extends string">
defineProps<{
  options: Array<{ id: T; label: string }>
  groupLabel: string
  radiogroup?: boolean
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    class="ed-cats"
    data-cat-group
    :role="radiogroup ? 'radiogroup' : 'group'"
    :aria-label="groupLabel"
  >
    <span class="ed-cat-line" aria-hidden="true" />
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="ed-cat"
      :class="{ 'is-on': model === option.id }"
      :role="radiogroup ? 'radio' : undefined"
      :aria-checked="radiogroup ? model === option.id : undefined"
      @click="model = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>
