import {
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

import columbinaUrl from '@/assets/cursor/Columbina.svg?url'
import damseletteUrl from '@/assets/cursor/Damselette.svg?url'
import kuuhenkiUrl from '@/assets/cursor/Kuuhenki.svg?url'
import primogemUrl from '@/assets/cursor/Primogem.svg?url'
import sleepUrl from '@/assets/cursor/sleep.svg?url'
import wishUrl from '@/assets/cursor/wish.svg?url'
import {
  CONSTELLATION_CONFIG,
  MoonlitCursorEngine,
  cursorThemeFromSite,
} from '@/cursor/moonlitCursorEngine'
import { useUiStore } from '@/stores/ui'

/**
 * 单一 Canvas + 单 rAF。指针坐标只存在引擎实例上，不写入 Vue 响应式。
 */
export function useMoonlitCursor(
  canvasRef: Ref<HTMLCanvasElement | null>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const ui = useUiStore()
  let engine: MoonlitCursorEngine | null = null

  function stop() {
    engine?.stop()
    engine = null
    document.documentElement.classList.remove('moonlit-cursor-on', 'moonlit-cursor-input')
  }

  function start() {
    const canvas = canvasRef.value
    if (!canvas || !toValue(enabled)) {
      stop()
      return
    }
    if (!window.matchMedia('(pointer: fine)').matches) {
      stop()
      return
    }
    if (engine) {
      engine.setThemeGetter(() => cursorThemeFromSite(ui.theme))
      return
    }
    engine = new MoonlitCursorEngine(
      canvas,
      () => CONSTELLATION_CONFIG,
      () => cursorThemeFromSite(ui.theme),
      {
        columbinaUrl,
        damseletteUrl,
        wishUrl,
        primogemUrl,
        sleepUrl,
        kuuhenkiUrl,
      },
    )
    engine.start()
    document.documentElement.classList.add('moonlit-cursor-on')
  }

  watch(
    [canvasRef, () => toValue(enabled), () => ui.theme],
    () => {
      if (!toValue(enabled) || !canvasRef.value) {
        stop()
        return
      }
      start()
    },
    { flush: 'post', immediate: true },
  )

  onUnmounted(stop)

  return { stop }
}
