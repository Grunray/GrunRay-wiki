<!--
  自 designed/kapi-css-master/src/components/daySlide.vue 迁入，
  与 Pinia ui 主题联动；星星用 Unicode 替代 iconfont。
  主题切换扩散层：自 designed/hover 思路，起点为 .theme-daynight-embed 的视口几何中心（随按钮位置变化）。
-->
<template>
  <div ref="anchorRef" class="theme-daynight-embed">
    <div class="theme-daynight-inner">
      <div class="button">
        <div class="day">
          <div
            class="star"
            :class="active"
            role="switch"
            :aria-checked="ui.theme === 'dark'"
            :aria-label="t('ui.theme')"
            tabindex="0"
            @click="toggle($event)"
            @keydown.enter.prevent="toggle()"
            @keydown.space.prevent="toggle()"
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="day-background" :class="daytime">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="back-cloud" :class="backTime">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="white-background" :class="whiteTime">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="stars" :class="starsActie">
            <span v-for="i in 6" :key="i" class="star-glyph" aria-hidden="true">&#9733;</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="ripple.show" class="theme-toggle-ripple-root" aria-hidden="true">
      <div
        :key="ripple.key"
        class="theme-toggle-ripple-disk"
        :style="diskStyle"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useUiStore } from '@/stores/ui'
import { DARK_MODE_PAGE_BACKGROUND, LIGHT_MODE_PAGE_BACKGROUND } from '@/theme/pageBackgrounds'

const { t } = useI18n()
const ui = useUiStore()

/** 用于测量「切换控件」在视口中的位置（整块 112×44 容器，含缩放后的开关） */
const anchorRef = ref<HTMLElement | null>(null)

const ripple = reactive({
  show: false,
  key: 0,
  x: 0,
  y: 0,
  /** 切换完成后的主题，用于铺与页面一致的渐变/纯色（在 setTheme 之后写入） */
  surface: 'light' as 'light' | 'dark',
})

const diskStyle = computed(() => ({
  '--ripple-x': `${ripple.x}px`,
  '--ripple-y': `${ripple.y}px`,
  background:
    ripple.surface === 'light' ? LIGHT_MODE_PAGE_BACKGROUND : DARK_MODE_PAGE_BACKGROUND,
}))

let rippleClearTimer: ReturnType<typeof setTimeout> | null = null

function playRippleFromAnchor(ev?: MouseEvent) {
  if (ui.prefersReducedMotion) return
  const el = anchorRef.value
  if (!el) return

  if (ev instanceof MouseEvent) {
    ripple.x = ev.clientX
    ripple.y = ev.clientY
  } else {
    const r = el.getBoundingClientRect()
    ripple.x = r.left + r.width / 2
    ripple.y = r.top + r.height / 2
  }
  ripple.surface = ui.theme === 'dark' ? 'dark' : 'light'
  ripple.key += 1
  ripple.show = true

  if (rippleClearTimer) clearTimeout(rippleClearTimer)
  rippleClearTimer = setTimeout(() => {
    ripple.show = false
    rippleClearTimer = null
  }, 620)
}

const active = ref<'sun' | 'moon'>('sun')
const daytime = ref('day-background-daytime')
const starsActie = ref('stars-daytime')
const backTime = ref('back-cloud-daytime')
const whiteTime = ref('white-background-daytime')

function applyVisual(isDark: boolean) {
  if (isDark) {
    active.value = 'moon'
    daytime.value = 'day-background-night'
    starsActie.value = 'stars-night'
    backTime.value = 'back-cloud-night'
    whiteTime.value = 'white-background-night'
  } else {
    active.value = 'sun'
    daytime.value = 'day-background-daytime'
    starsActie.value = 'stars-daytime'
    backTime.value = 'back-cloud-daytime'
    whiteTime.value = 'white-background-daytime'
  }
}

watch(
  () => ui.theme,
  (theme) => applyVisual(theme === 'dark'),
  { immediate: true },
)

function toggle(ev?: MouseEvent) {
  const next = ui.theme === 'light' ? 'dark' : 'light'
  ui.setTheme(next)
  playRippleFromAnchor(ev)
}
</script>

<style scoped lang="less">
.theme-daynight-embed {
  position: relative;
  width: 112px;
  height: 44px;
  overflow: visible;
  flex-shrink: 0;
}
.theme-daynight-inner {
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(0.19);
  transform-origin: top left;
}
div.button {
  display: inline-block;
  position: relative;
  height: 235px;
  width: 590px;
  border-radius: 120px;
  box-sizing: border-box;
  .day::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    border-radius: 120px;
    box-shadow:
      inset 0px 10px 10px 6px rgba(0, 0, 0, 0.2),
      inset 0px 5px 5px 3px rgba(0, 0, 0, 0.2),
      inset 0px 5px 5px 5px rgba(0, 0, 0, 0.2),
      0px 5px 5px 3px rgba(255, 255, 255, 0.2),
      0px 5px 5px 3px rgba(255, 255, 255, 0.2);
    pointer-events: none;
    z-index: 13;
  }
  .day {
    position: absolute;
    display: inline-block;
    width: 100%;
    height: 100%;
    border-radius: 120px;
    z-index: 19;
    box-shadow:
      inset 0 2px 15px rgba(0, 0, 0, 0.2),
      inset 0 2px 2px rgba(0, 0, 0, 0.2),
      inset 0 -2px 2px rgba(0, 0, 0, 0.2);
    .star {
      display: inline-block;
      position: absolute;
      top: 10%;
      width: 33%;
      height: 80%;
      border-radius: 100px;
      transition-property: left, background-color;
      transition-duration: 1.5s;
      cursor: pointer;
      span {
        transition-property: opacity;
        transition-duration: 1.5s;
      }
      span {
        border-radius: 50%;
        position: absolute;
      }
      span:nth-child(1) {
        width: 35%;
        height: 35%;
        top: 43%;
        left: 10%;
        background-color: #949eb2;
        box-shadow: inset -5px -5px 10px 0px rgba(0, 0, 0, 0.5);
      }
      span:nth-child(2) {
        width: 22%;
        height: 22%;
        top: 17%;
        left: 40%;
        background-color: #949eb2;
        box-shadow: inset -1px -2px 5px 0px rgba(0, 0, 0, 0.5);
      }
      span:nth-child(3) {
        width: 23%;
        height: 23%;
        top: 53%;
        left: 60%;
        background-color: #949eb2;
        box-shadow: inset -1px -2px 5px 0px rgba(0, 0, 0, 0.5);
      }
    }
    .sun {
      left: 5%;
      background-color: #fec428;
      box-shadow:
        inset 0px 2px 5px 6px rgba(255, 255, 255, 0.3),
        inset -1px 5px 5px 3px rgba(255, 255, 255, 0.2),
        inset -5px -5px 10px 0px rgba(0, 0, 0, 0.5),
        8px 8px 10px 0px rgba(0, 0, 0, 0.5);
      z-index: 10;
      span {
        opacity: 0;
      }
    }
    .moon {
      left: 62%;
      background-color: #c3c9d1;
      box-shadow:
        inset 0px 2px 5px 6px rgba(255, 255, 255, 0.3),
        inset -1px 5px 5px 3px rgba(255, 255, 255, 0.2),
        inset -5px -5px 10px 0px rgba(0, 0, 0, 0.5),
        8px 8px 10px 0px rgba(0, 0, 0, 0.5);
      z-index: 10;
      span {
        opacity: 1;
      }
    }
    .day-background {
      position: absolute;
      display: inline-block;
      width: 100%;
      height: 100%;
      border-radius: 120px;
      z-index: 1;
      overflow: hidden;
      span {
        transition-property: all;
        transition-duration: 1.5s;
      }
      span:nth-child(1) {
        height: 100%;
        position: absolute;
        display: inline-block;
        width: 85%;
        border-radius: 100px;
        z-index: 2;
      }
      span:nth-child(2) {
        height: 100%;
        position: absolute;
        display: inline-block;
        width: 70%;
        border-radius: 100px;
        z-index: 3;
      }
      span:nth-child(3) {
        height: 100%;
        position: absolute;
        display: inline-block;
        width: 55%;
        border-radius: 60px;
        z-index: 4;
      }
    }
    .day-background-daytime {
      background-color: #2d6da2;
      span:nth-child(1) {
        left: 0%;
        background-color: #4c86bd;
        border-top-left-radius: 120px;
        border-bottom-left-radius: 120px;
      }
      span:nth-child(2) {
        left: 0%;
        background-color: #5992c2;
        border-top-left-radius: 120px;
        border-bottom-left-radius: 120px;
      }
      span:nth-child(3) {
        left: 0%;
        background-color: #689dca;
        border-top-right-radius: 120px;
        border-bottom-right-radius: 120px;
      }
    }
    .day-background-night {
      background-color: #1c1f2c;
      span:nth-child(1) {
        left: 15%;
        background-color: #2d333d;
        border-top-right-radius: 120px;
        border-bottom-right-radius: 120px;
      }
      span:nth-child(2) {
        left: 30%;
        background-color: #404350;
        border-top-right-radius: 120px;
        border-bottom-right-radius: 120px;
      }
      span:nth-child(3) {
        left: 45%;
        background-color: #50545e;
        border-top-left-radius: 120px;
        border-bottom-left-radius: 120px;
      }
    }

    .back-cloud {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 6;
      border-radius: 120px;
      overflow: hidden;
      span {
        position: absolute;
        display: inline-block;
        z-index: 6;
        border-radius: 120px;
        transition-property: background-color;
        transition-duration: 2.5s;
        box-shadow:
          inset 0px 2px 5px 2px rgba(255, 255, 255, 0.3),
          inset -1px 5px 5px 2px rgba(255, 255, 255, 0.2),
          inset -5px -5px 5px 2px rgba(0, 0, 0, 0.5),
          8px 8px 5px 0px rgba(0, 0, 0, 0.5);
      }
      span:nth-child(1) {
        width: 50%;
        height: 100%;
        top: -9%;
        right: -35%;
        transform: rotate(30deg);
      }
      span:nth-child(2) {
        width: 30%;
        height: 60%;
        top: 30%;
        right: -5%;
        transform: rotate(40deg);
      }
      span:nth-child(3) {
        width: 50%;
        height: 90%;
        top: 50%;
        right: -5%;
        transform: rotate(60deg);
      }
      span:nth-child(4) {
        width: 20%;
        height: 50%;
        top: 60%;
        right: 30%;
        transform: rotate(60deg);
      }
      span:nth-child(5) {
        width: 60%;
        height: 80%;
        top: 90%;
        right: 15%;
        transform: rotate(60deg);
      }
      span:nth-child(6) {
        width: 60%;
        height: 100%;
        top: 85%;
        left: -10%;
        transform: rotate(90deg);
      }
    }
    .back-cloud-daytime {
      span {
        background-color: #a3c5e0;
      }
    }
    .back-cloud-night {
      span {
        background-color: #6c8395;
      }
    }
    .white-background {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 7;
      border-radius: 120px;
      overflow: hidden;
      span {
        position: absolute;
        display: inline-block;
        border-radius: 120px;
        box-shadow:
          inset 0px 2px 3px 1px rgba(255, 255, 255, 0.3),
          inset -1px 5px 3px 1px rgba(255, 255, 255, 0.2),
          inset -5px -5px 3px 1px rgba(0, 0, 0, 0.5),
          8px 8px 3px 0px rgba(0, 0, 0, 0.5);
        transition-property: background-color;
        transition-duration: 2s;
      }
      span:nth-child(1) {
        width: 70%;
        height: 100%;
        top: 30%;
        right: -55%;
        transform: rotate(30deg);
      }
      span:nth-child(2) {
        width: 60%;
        height: 100%;
        top: 60%;
        right: -35%;
        transform: rotate(30deg);
      }
      span:nth-child(3) {
        width: 25%;
        height: 100%;
        top: 75%;
        right: 15%;
      }
      span:nth-child(4) {
        width: 15%;
        height: 100%;
        top: 80%;
        right: 35%;
        box-shadow:
          inset 0px 2px 3px 1px rgba(255, 255, 255, 0.3),
          inset -1px 5px 3px 1px rgba(255, 255, 255, 0.2),
          inset -5px -5px 3px 1px rgba(0, 0, 0, 0.5),
          5px 5px 3px 0px rgba(0, 0, 0, 0.5);
      }
      span:nth-child(5) {
        width: 30%;
        height: 100%;
        top: 78%;
        right: 42%;
      }
      span:nth-child(6) {
        width: 50%;
        height: 90%;
        top: 95%;
        right: 58%;
        transform: rotate(90deg);
      }
    }
    .white-background-daytime {
      span {
        background-color: #f1fafc;
      }
    }
    .white-background-night {
      span {
        background-color: #c6c6c6;
      }
    }
    .stars {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 120px;
      z-index: 8;
      transition-property: top, opacity;
      transition-duration: 1.5s;
      .star-glyph {
        color: #fff;
        position: absolute;
        line-height: 1;
        font-weight: normal;
        font-style: normal;
      }
      .star-glyph:nth-child(1) {
        font-size: 3rem;
        top: 20%;
        left: 3%;
      }
      .star-glyph:nth-child(2) {
        font-size: 1.5rem;
        top: 12%;
        left: 6%;
      }
      .star-glyph:nth-child(3) {
        font-size: 3rem;
        top: 35%;
        left: 9%;
      }
      .star-glyph:nth-child(4) {
        font-size: 3rem;
        top: 16%;
        left: 20%;
      }
      .star-glyph:nth-child(5) {
        font-size: 2.5rem;
        top: 56%;
        left: 25%;
      }
      .star-glyph:nth-child(6) {
        font-size: 4rem;
        top: 30%;
        left: 41%;
      }
    }
    .stars-daytime {
      top: 100%;
      opacity: 0;
    }
    .stars-night {
      top: 0%;
      opacity: 1;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-daynight-embed .star,
  .theme-daynight-embed .day-background span,
  .theme-daynight-embed .back-cloud span,
  .theme-daynight-embed .white-background span,
  .theme-daynight-embed .stars {
    transition-duration: 0.05s !important;
  }
}
</style>

<!--
  扩散层在 #app 之下（z-index:0），透过透明 #app 与留白区可见，卡片/正文始终在上层。
  光标拖尾等仍可用 z-index > 1 盖在最上。
-->
<style lang="css">
.theme-toggle-ripple-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.theme-toggle-ripple-disk {
  position: fixed;
  left: var(--ripple-x, 50%);
  top: var(--ripple-y, 50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  will-change: width, height, opacity, filter;
  /*
   * background 由内联提供：浅色=与 tokens 相同的整条渐变（非单色），避免结束时与页面渐变「跳色」。
   * 动画中短暂提亮 + 末尾 opacity→0：与底层同色时仍能看见扩散，且卸载时不闪一下。
   */
  animation: theme-toggle-ripple-pulse 0.55s ease-out forwards;
}

@keyframes theme-toggle-ripple-pulse {
  0% {
    width: 0;
    height: 0;
    opacity: 0;
    filter: brightness(1);
  }
  10% {
    opacity: 0.92;
    filter: brightness(1.14);
  }
  35% {
    opacity: 0.88;
    filter: brightness(1.08);
  }
  70% {
    opacity: 0.45;
    filter: brightness(1.02);
  }
  100% {
    width: 250vmax;
    height: 250vmax;
    opacity: 0;
    filter: brightness(1);
  }
}
</style>
