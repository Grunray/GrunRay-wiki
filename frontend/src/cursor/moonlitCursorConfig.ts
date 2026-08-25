/**
 * 星座月相光标 · 悬停调参入口。
 * link / project 分叉：共用虹月·恒月·霜月，轨道尺度对齐 DESIGN 的目录行 vs 可点击卡。
 */

export type ConstellationHoverKind = 'link' | 'project'

export interface ConstellationHoverBandTuning {
  orbitMul: number
  speedMul: number
  moonR: number
  moonGrow: number
  angleOff: number
}

export interface ConstellationHoverTuning {
  /** 内轨基准半径（px） */
  orbitBase: number
  /** 展开后额外半径 */
  orbitGrow: number
  /** 角速度系数 */
  omega: number
  rainbow: ConstellationHoverBandTuning
  eternal: ConstellationHoverBandTuning
  frost: ConstellationHoverBandTuning
}

/**
 * - link：目录行 / 文章链接 — 内收、虹月近读（对应 DESIGN 目录行克制 hover）
 * - project：项目卡 / 时间线卡 — 外张、霜月更清楚（对应可点击卡多一层几何）
 */
export const CONSTELLATION_HOVER_TUNING: Record<ConstellationHoverKind, ConstellationHoverTuning> = {
  link: {
    orbitBase: 12,
    orbitGrow: 5.5,
    omega: 0.00078,
    rainbow: { orbitMul: 1, speedMul: 3, moonR: 2.35, moonGrow: 0.28, angleOff: 0 },
    eternal: { orbitMul: 1.42, speedMul: 2, moonR: 2.6, moonGrow: 0.32, angleOff: Math.PI * 0.62 },
    frost: { orbitMul: 1.88, speedMul: 1, moonR: 2.9, moonGrow: 0.36, angleOff: Math.PI * 1.28 },
  },
  project: {
    orbitBase: 14.5,
    orbitGrow: 8,
    omega: 0.00082,
    rainbow: { orbitMul: 1, speedMul: 3, moonR: 2.5, moonGrow: 0.35, angleOff: 0 },
    eternal: { orbitMul: 1.56, speedMul: 2, moonR: 2.95, moonGrow: 0.42, angleOff: Math.PI * 0.55 },
    frost: { orbitMul: 2.22, speedMul: 1, moonR: 3.45, moonGrow: 0.5, angleOff: Math.PI * 1.22 },
  },
}
