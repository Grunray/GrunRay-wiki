<script setup lang="ts">
import { useId } from 'vue'

import flowerVineUrl from '@/assets/hover/flower-vine.png'

import { FLOWER_VINE_PATHS } from './flowerVinePaths'

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const shapeId = `fv-shape-${uid}`
const growId = `fv-grow-${uid}`
</script>

<template>
  <svg class="card-corner-vine" viewBox="0 0 326 327" aria-hidden="true">
    <defs>
      <mask :id="shapeId" maskUnits="userSpaceOnUse" style="mask-type: alpha">
        <image :href="flowerVineUrl" x="0" y="0" width="326" height="327" />
      </mask>
      <mask :id="growId" maskUnits="userSpaceOnUse">
        <rect width="326" height="327" fill="#000" />
        <path
          v-for="(p, i) in FLOWER_VINE_PATHS"
          :key="i"
          class="grow"
          :class="p.main ? 'grow-main' : 'grow-br'"
          pathLength="100"
          :style="{ '--grow-delay': `${p.delay}s` }"
          :d="p.d"
        />
      </mask>
    </defs>
    <g :mask="`url(#${growId})`">
      <g :mask="`url(#${shapeId})`">
        <rect class="flower-fill" width="326" height="327" />
      </g>
    </g>
  </svg>
</template>
