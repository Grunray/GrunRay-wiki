/** 首页关照片背景线稿扇形：几何对齐 designed/home-hero-wedge 预设 */
export const HOME_STAGE_ART_VB = { w: 1536, h: 1024 } as const

export const HOME_STAGE_ART_WEDGE = {
  ax: 1270.93,
  ay: 0,
  angle: 39,
  heading: -45,
} as const

export const HOME_STAGE_ART_WEDGE_COLOR = {
  light: '#38697a',
  dark: '#abde6b',
  abstract: '#f4f1e8',
} as const

const RAY = 4800

function rayEnd(degFromDown: number): [number, number] {
  const r = (degFromDown * Math.PI) / 180
  return [
    HOME_STAGE_ART_WEDGE.ax + Math.sin(r) * RAY,
    HOME_STAGE_ART_WEDGE.ay + Math.cos(r) * RAY,
  ]
}

function pct(x: number, y: number): string {
  return `${((x / HOME_STAGE_ART_VB.w) * 100).toFixed(3)}% ${((y / HOME_STAGE_ART_VB.h) * 100).toFixed(3)}%`
}

export function homeStageArtWedgeClipPath(): string {
  const { ax, ay, angle, heading } = HOME_STAGE_ART_WEDGE
  const half = angle / 2
  const left = rayEnd(heading - half)
  const right = rayEnd(heading + half)
  return `polygon(${pct(ax, ay)}, ${pct(left[0], left[1])}, ${pct(right[0], right[1])})`
}
