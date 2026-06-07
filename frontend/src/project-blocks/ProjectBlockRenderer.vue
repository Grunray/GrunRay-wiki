<script setup lang="ts">
import { computed } from 'vue'

import { resolveProjectBlock } from './registry'
import type { ProjectLayoutBlock } from '@/types/content'

const props = defineProps<{ block: ProjectLayoutBlock }>()

const Resolved = computed(() => resolveProjectBlock(props.block.type))
</script>

<template>
  <div class="project-block">
    <component :is="Resolved" :block="block" />
  </div>
</template>
