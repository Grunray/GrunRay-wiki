/** Motion Policy（DESIGN §9）：用户偏好 AUTO/REDUCED/FULL；运行时档 full/reduced/minimal。 */

export type MotionPreference = 'auto' | 'reduced' | 'full'
export type MotionLevel = 'full' | 'reduced' | 'minimal'

export const STORAGE_MOTION_PREFERENCE = 'ui.motionPreference'

export function parseMotionPreference(raw: string | null | undefined): MotionPreference {
  if (raw === 'reduced' || raw === 'full') return raw
  return 'auto'
}

export function readMotionPreference(): MotionPreference {
  if (typeof localStorage === 'undefined') return 'auto'
  try {
    return parseMotionPreference(localStorage.getItem(STORAGE_MOTION_PREFERENCE))
  } catch {
    return 'auto'
  }
}

export function persistMotionPreference(preference: MotionPreference): void {
  try {
    localStorage.setItem(STORAGE_MOTION_PREFERENCE, preference)
  } catch {
    /* ignore */
  }
}

export function readSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 解析顺序见 DESIGN §9。壳层不在这里改档，只关持续 rAF 工具。 */
export function resolveMotionLevel(args: {
  systemReduce: boolean
  preference: MotionPreference
}): MotionLevel {
  if (args.systemReduce) return 'minimal'
  if (args.preference === 'reduced') return 'reduced'
  return 'full'
}

export function applyMotionLevelToDocument(level: MotionLevel): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.motion = level
}

export function readDocumentMotionLevel(): MotionLevel {
  if (typeof document === 'undefined') return 'full'
  const v = document.documentElement.dataset.motion
  if (v === 'reduced' || v === 'minimal') return v
  return 'full'
}

export function isMotionCut(): boolean {
  return readDocumentMotionLevel() !== 'full'
}

export function isMotionFull(): boolean {
  return readDocumentMotionLevel() === 'full'
}

export function isMotionMinimal(): boolean {
  return readDocumentMotionLevel() === 'minimal'
}

/** 首屏 CSS 能认到档位；store 初始化会再写一次。 */
export function bootstrapMotionPolicy(): void {
  applyMotionLevelToDocument(
    resolveMotionLevel({
      systemReduce: readSystemReducedMotion(),
      preference: readMotionPreference(),
    }),
  )
}
