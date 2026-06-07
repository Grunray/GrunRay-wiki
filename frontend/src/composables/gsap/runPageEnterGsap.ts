import {
  buildPageEnterTimeline,
  detectPageEnterPreset,
  killPageEnterAmbient,
  primePageEnterHidden,
  type PageEnterPreset,
} from './pageEnterPresets'
import { registerGsapPlugins, gsap } from './registerGsap'

const ctxMap = new WeakMap<HTMLElement, gsap.Context>()

export function killPageEnterGsap(root: HTMLElement | null | undefined) {
  if (!root) return
  killPageEnterAmbient()
  const ctx = ctxMap.get(root)
  ctx?.revert()
  ctxMap.delete(root)
}

export function runPageEnterGsap(root: HTMLElement, preset?: PageEnterPreset | null) {
  registerGsapPlugins()

  const kind = preset ?? detectPageEnterPreset(root)
  if (!kind) return null

  killPageEnterGsap(root)
  primePageEnterHidden(root, kind)

  const ctx = gsap.context(() => {
    buildPageEnterTimeline(root, kind)
  }, root)

  ctxMap.set(root, ctx)
  return ctx
}
