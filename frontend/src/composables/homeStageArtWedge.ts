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

/** 派生几何常量（方案 D 扫扇 / 光束共用，单一来源勿在 CSS 重写数值） */
export const HOME_STAGE_ART_WEDGE_DERIVED = {
  /** 扇轴顶点（百分比，同 82.7428% 0%） */
  apexPctX: (HOME_STAGE_ART_WEDGE.ax / HOME_STAGE_ART_VB.w) * 100,
  apexPctY: (HOME_STAGE_ART_WEDGE.ay / HOME_STAGE_ART_VB.h) * 100,
  /** 射线长度的百分比换算（同原型 312.5% / 468.75%） */
  rayPctX: (RAY / HOME_STAGE_ART_VB.w) * 100,
  rayPctY: (RAY / HOME_STAGE_ART_VB.h) * 100,
  /** 半角（度）与光束扫角起止（方案 D：133°→157°） */
  halfDeg: HOME_STAGE_ART_WEDGE.angle / 2,
  beamFromDeg: 133,
  beamToDeg: 157,
} as const

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

/**
 * 扫扇进度 p∈[0,1] 的 clip-path（p=0 两射线重合零面积；p=1 与
 * homeStageArtWedgeClipPath() 逐字符一致，播放终态必须写回静态值）。
 */
export function wedgeClipPathAt(p: number): string {
  const { ax, ay, angle, heading } = HOME_STAGE_ART_WEDGE
  const half = (angle / 2) * Math.min(1, Math.max(0, p))
  const left = rayEnd(heading - half)
  const right = rayEnd(heading + half)
  return `polygon(${pct(ax, ay)}, ${pct(left[0], left[1])}, ${pct(right[0], right[1])})`
}
