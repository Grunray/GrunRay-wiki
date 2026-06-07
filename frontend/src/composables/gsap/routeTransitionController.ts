import { ref } from 'vue'

import { disarmRoutePageEnter } from '@/composables/gsap/pageEnterOrchestrator'

export type RouteTransitionHandlers = {
  playClose: () => Promise<void>
  playOpen: (onReveal?: () => void) => Promise<void>
  forceReset: () => void
}

export type RouteTransitionPhase =
  | 'idle'
  | 'closing'
  | 'covered'
  | 'opening'
  /** 幕帘文案已完全消失，可播页面入场（幕帘面板可能仍在收起） */
  | 'revealed'

/** 转场幕帘中央文案 */
export const routeTransitionLabel = ref('///')

/** 当前转场阶段 */
export const routeTransitionPhase = ref<RouteTransitionPhase>('idle')

let handlers: RouteTransitionHandlers | null = null
let contentTarget: HTMLElement | null = null
let idleWaiters: Array<() => void> = []
let pageEnterGateWaiters: Array<() => void> = []

export function setRouteTransitionLabel(label: string) {
  routeTransitionLabel.value = label
}

function resolvePageEnterGateWaiters() {
  const waiters = pageEnterGateWaiters
  pageEnterGateWaiters = []
  waiters.forEach((resolve) => resolve())
}

function resolveIdleWaiters() {
  const waiters = idleWaiters
  idleWaiters = []
  waiters.forEach((resolve) => resolve())
}

export function setRouteTransitionPhase(phase: RouteTransitionPhase) {
  routeTransitionPhase.value = phase
  if (phase === 'revealed' || phase === 'idle') {
    resolvePageEnterGateWaiters()
  }
  if (phase === 'idle') {
    resolveIdleWaiters()
  }
}

export function isRouteTransitionBusy(): boolean {
  return routeTransitionPhase.value !== 'idle'
}

/** 页面入场：幕帘文案完全消失后即可开始（不必等幕帘 idle） */
export function waitForPageEnterGate(timeoutMs = 5000): Promise<void> {
  const phase = routeTransitionPhase.value
  if (phase === 'idle' || phase === 'revealed') return Promise.resolve()
  return Promise.race([
    new Promise<void>((resolve) => {
      pageEnterGateWaiters.push(resolve)
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs)
    }),
  ])
}

/** 幕帘完全收起 */
export function waitForRouteTransitionIdle(): Promise<void> {
  if (routeTransitionPhase.value === 'idle') return Promise.resolve()
  return new Promise((resolve) => {
    idleWaiters.push(resolve)
  })
}

export function registerRouteContentTarget(el: HTMLElement | null) {
  contentTarget = el
}

export function getRouteContentTarget(): HTMLElement | null {
  return contentTarget
}

export function registerRouteTransitionHandlers(next: RouteTransitionHandlers | null) {
  handlers = next
}

export async function routeTransitionClose(): Promise<void> {
  if (!handlers) return
  await handlers.playClose()
}

export async function routeTransitionOpen(onReveal?: () => void): Promise<void> {
  if (!handlers) return
  await handlers.playOpen(onReveal)
}

export function routeTransitionForceReset(): void {
  handlers?.forceReset()
  disarmRoutePageEnter()
  setRouteTransitionPhase('idle')
}
