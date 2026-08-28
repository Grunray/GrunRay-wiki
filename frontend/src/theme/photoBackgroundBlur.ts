export const PHOTO_BG_BLUR_DEFAULT = 6
export const PHOTO_BG_BLUR_MIN = 0
export const PHOTO_BG_BLUR_MAX = 48
export const STORAGE_PHOTO_BG_BLUR = 'ui.photoBackgroundBlurPx'

export function clampPhotoBackgroundBlur(px: number): number {
  if (!Number.isFinite(px)) return PHOTO_BG_BLUR_DEFAULT
  return Math.min(PHOTO_BG_BLUR_MAX, Math.max(PHOTO_BG_BLUR_MIN, Math.round(px)))
}

export function readPhotoBackgroundBlur(): number {
  const raw = localStorage.getItem(STORAGE_PHOTO_BG_BLUR)
  if (raw == null || raw === '') return PHOTO_BG_BLUR_DEFAULT
  return clampPhotoBackgroundBlur(Number(raw))
}

export function loadingBlurFor(px: number): number {
  return Math.min(56, Math.round(px * 2.1 + 8))
}

export function scaleForBlur(px: number): number {
  if (px <= 0) return 1
  return 1 + Math.min(0.08, px * 0.0028)
}

/** 写入 CSS 变量，供 main.css 中 html[data-photo-bg] 使用 */
export function applyPhotoBackgroundBlur(px: number) {
  const blur = clampPhotoBackgroundBlur(px)
  const root = document.documentElement
  root.style.setProperty('--page-photo-bg-blur', `${blur}px`)
  root.style.setProperty('--page-photo-bg-blur-loading', `${loadingBlurFor(blur)}px`)
  root.style.setProperty('--page-photo-bg-scale', String(scaleForBlur(blur)))
}
