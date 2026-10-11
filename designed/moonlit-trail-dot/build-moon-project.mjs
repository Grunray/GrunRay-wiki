/**
 * 月相点阵 · dot-motion-builder 项目生成脚本
 *
 * 把 frontend/src/cursor/moonlitCursorEngine.ts 的拖尾月相数学 1:1 移植到
 * dot-motion-builder 的序列帧工程（13×13 circle 点阵，14 帧，6 FPS 循环）：
 *
 *   MOON_PHASE_CYCLE = [0.08 … 1 … 0.1]（盈 → 满 → 亏，同引擎顺序）
 *   亮部 = { 距月心 ≤ R-0.15 } ∩ { 距 (offset,0) ≤ R }
 *   waxing: t = phase*2,      offset = +(1-t)*R*0.92   （亮在右）
 *   waning: t = (1-phase)*2,  offset = -(1-t)*R*0.92   （亮在左）
 *   phase ≥ 0.96 → 满月整盘亮
 *
 * 用法：node build-moon-project.mjs
 * 产物：moon-phase-project.json（注入 localStorage["dot-motion-builder.project.v9"]）
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

// ---- 与引擎一致的相位循环 ------------------------------------------------
const PHASES = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92, 1, 0.88, 0.72, 0.56, 0.4, 0.24, 0.1]

// ---- 点阵参数 ------------------------------------------------------------
const ROWS = 13
const COLS = 13
const CX = 6 // 月心列（cell 坐标，x = col - CX）
const CY = 6 // 月心行
const R = 5.6 // 月盘半径（cell 单位；13×13 网格四象限各留约 1 圈呼吸边距）

// ---- 浅色拖尾档色板（引擎 CONSTELLATION_COLORS.light） --------------------
const GLOW_BLUE = '#3791B9' // pal.glow rgba(55,145,185)
const DARK_HEX = '#123044' // pal.dark  rgba(18,48,68)
const LIT_HEX = '#D2EBF8' // pal.lit   rgba(210,235,248)
const FLARE_HEX = '#46A5CD' // pal.flare rgba(70,165,205)

/**
 * 单帧亮部 cell 索引（row-major：index = row * cols + col）
 * 与引擎 bakeTrailMoonSprite 亮部同一公式。
 */
function litCells(phase) {
  const full = phase >= 0.96
  let offset = 0
  if (!full) {
    const waxing = phase <= 0.5
    const t = waxing ? phase * 2 : (1 - phase) * 2
    offset = (waxing ? 1 : -1) * (1 - t) * R * 0.92
  }
  const litR = R - 0.15 // 引擎 clip 半径
  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col - CX
      const y = row - CY
      if (x * x + y * y > litR * litR) continue
      if (!full) {
        const dx = x - offset
        if (dx * dx + y * y > R * R) continue
      }
      cells.push(row * COLS + col)
    }
  }
  return cells
}

/** 整盘 cell（引擎 pal.dark 0.94 暗盘层）：dist ≤ R */
function discCells() {
  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col - CX
      const y = row - CY
      if (x * x + y * y <= R * R) cells.push(row * COLS + col)
    }
  }
  return cells
}

/** 盘缘 cell（引擎 pal.line 描边层）：盘内且 4 邻有盘外 cell */
function rimCells(disc) {
  const inDisc = new Set(disc)
  const rim = []
  for (const idx of disc) {
    const row = Math.floor(idx / COLS)
    const col = idx % COLS
    const neighbors = [idx - COLS, idx + COLS, idx - 1, idx + 1]
    const edge = neighbors.some((n, k) => {
      const nr = Math.floor(n / COLS)
      const nc = n % COLS
      if (n < 0 || n >= ROWS * COLS) return true
      if (k >= 2 && Math.abs(nc - col) !== 1) return true // 左右换行视为盘外
      void nr
      return !inDisc.has(n)
    })
    if (edge) rim.push(idx)
  }
  return rim
}

/** 满月 flare 闪光 cell（引擎 fl = R*2.8 十字 + 对角线 → 盘外 8 方向单 cell 近似） */
function flareCells() {
  const pts = [
    [6, 0], [-6, 0], [0, 6], [0, -6], // 十字臂端（贴网格外缘）
    [4, 4], [4, -4], [-4, 4], [-4, -4] // 对角（dist 5.66，盘外沿）
  ]
  const cells = []
  for (const [x, y] of pts) {
    const row = CY + y
    const col = CX + x
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) cells.push(row * COLS + col)
  }
  return cells
}

/** glow 参数（引擎 drawMoonPhaseGlow）：fullness 与光心偏移 */
function glowSpec(phase) {
  const fullness = phase >= 0.96 ? 1 : Math.max(0.06, phase)
  const glowR = 1.9 + fullness * 2.4 // × R
  let offset = 0
  let litT = 1
  if (phase < 0.96 && phase >= 0.08) {
    const waxing = phase <= 0.5
    litT = waxing ? phase * 2 : (1 - phase) * 2
    offset = (waxing ? 1 : -1) * (0.35 + (1 - litT) * 0.45) // × R
  }
  return { fullness, glowR, offset, litT, litStrength: 0.05 + litT * 0.16 }
}

/** 终端 ASCII 预览：██ 亮部 ▓▓ 暗盘边缘 ░░ 暗盘 ++ flare */
function asciiFrame(phase, disc, rim, flare) {
  const lit = new Set(litCells(phase))
  const rimSet = new Set(rim)
  const flareSet = new Set(phase >= 0.96 ? flare : [])
  const discSet = new Set(disc)
  const lines = []
  for (let row = 0; row < ROWS; row++) {
    let line = ''
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col
      if (lit.has(idx)) line += '██'
      else if (flareSet.has(idx)) line += '++'
      else if (rimSet.has(idx)) line += '▓▓'
      else if (discSet.has(idx)) line += '░░'
      else line += '··'
    }
    lines.push(line)
  }
  return lines.join('\n')
}

// ---- 预计算共享层 ----------------------------------------------------------
const DISC = discCells()
const RIM = rimCells(DISC)
const FLARE = flareCells()

// ---- 组装 dot-motion-builder Project（schema 对齐 src/lib/mock-project.ts） ----
// 多色映射（工具 cellStates 语义）：
//   state1 主色 primaryColor  = 暗盘 dark（整盘，含亮部底下）
//   state2     secondaryColor = 亮部 lit（冰蓝）
//   state3     tertiaryColor  = flare 星芒（仅 phase=1 帧）
// rim 描边不进编辑器（3 色槽有限），由组件端从 dark 几何自动推导。
const SEQ_ID = crypto.randomUUID()
const now = new Date().toISOString()

const FRAME_W = 220
const FRAME_GAP = 28
const PER_ROW = 7

const loaders = PHASES.map((phase, i) => {
  const lit = litCells(phase)
  const hasFlare = phase >= 1
  const cellStates = {}
  for (const idx of lit) cellStates[idx] = 2
  if (hasFlare) for (const idx of FLARE) cellStates[idx] = 3
  const activeCells = [...new Set(hasFlare ? [...DISC, ...FLARE] : DISC)].sort((a, b) => a - b)

  return {
    id: crypto.randomUUID(),
    name: `月相 ${String(i + 1).padStart(2, '0')} · ${phase}`,
    kind: 'sequence',
    sequenceId: SEQ_ID,
    sequenceIndex: i,
    visible: true,
    artboard: {
      x: 160 + (i % PER_ROW) * (FRAME_W + FRAME_GAP),
      y: 120 + Math.floor(i / PER_ROW) * (FRAME_W + FRAME_GAP),
      width: FRAME_W,
      height: FRAME_W
    },
    layout: {
      type: 'status-pill',
      width: 220,
      height: 56,
      paddingX: 18,
      paddingY: 14,
      gap: 12,
      align: 'left'
    },
    pattern: {
      grid: { rows: ROWS, cols: COLS, cellSize: 10, gap: 3 },
      activeCells,
      cellStates,
      snapshots: [],
      sourceType: 'drawn',
      presetId: 'custom'
    },
    animation: {
      presetId: 'wave',
      mode: 'wave',
      direction: 'right',
      originX: 7,
      originY: 7,
      fps: 6, // 序列帧默认 6 FPS，14 帧一轮 ≈ 2.33s
      loop: true,
      durationMs: 2400,
      staggerMs: 0,
      segment: 4,
      easing: 'linear',
      style: 'opacity-only',
      inactiveStyle: 'none',
      speed: 1,
      scaleIntensity: 0.5
    },
    style: {
      cellShape: 'circle',
      radius: 5,
      innerRadius: 0.48,
      primaryColor: DARK_HEX, // state1 暗盘
      primaryAlpha: 0.94,
      secondaryColor: LIT_HEX, // state2 亮部冰蓝
      tertiaryColor: FLARE_HEX, // state3 星芒
      backgroundColor: '#8a93a8', // 未激活灰蓝底：深色画布上暗盘/冰蓝都可分辨
      backgroundAlpha: 0.4,
      glow: 10,
      glowColor: GLOW_BLUE,
      glowAlpha: 0.55,
      shadow: true,
      backgroundStyle: 'none',
      containerRadius: 24
    },
    text: {
      content: `月相 ${String(i + 1).padStart(2, '0')}`,
      enabled: false,
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 0.04,
      color: 'rgba(255,255,255,0.92)'
    },
    effects: { shimmer: false }
  }
})

const project = {
  id: 'project-moonlit-trail-dot',
  name: '月相点阵 · Moonlit Trail',
  version: '0.17.0', // PROJECT_VERSION
  createdAt: now,
  updatedAt: now,
  canvas: { zoom: 1, panX: 0, panY: 0, background: 'dark-grid', previewMode: 'split' },
  loaders,
  assets: { patterns: [], templates: [] },
  settings: { autosave: true, theme: 'dark' }
}

const outPath = join(HERE, 'moon-phase-project.json')
writeFileSync(outPath, JSON.stringify(project))

// ---- 双层帧数据（组件与引擎移植的数据源） ----------------------------------
// 结构：dark 暗盘（pal.dark）/ rim 盘缘描边（pal.line）/ lit 亮部（pal.lit）/ flare 满月闪光
// glow 不烘焙 cell，由渲染端按 glowSpec 画径向渐变。
// （DISC / RIM / FLARE 已在 loaders 构造前预计算）

const framesData = {
  version: 2,
  kind: 'moonlit-trail-dot-frames',
  source: 'build-moon-project.mjs · 公式同 moonlitCursorEngine.ts bakeTrailMoonSprite',
  grid: { rows: ROWS, cols: COLS, cellSize: 12, gap: 3, padding: 30 },
  fps: 6,
  duration: PHASES.length / 6,
  loop: true,
  phases: PHASES,
  palette: {
    // 与引擎 CONSTELLATION_COLORS.light 一致
    line: [32, 95, 125],
    dark: [18, 48, 68],
    lit: [210, 235, 248],
    glow: [55, 145, 185],
    flare: [70, 165, 205],
    violet: [88, 72, 128]
  },
  glows: PHASES.map(glowSpec),
  frames: PHASES.map((phase) => ({
    dark: DISC,
    rim: RIM,
    lit: litCells(phase),
    flare: phase >= 0.96 && phase >= 1 ? FLARE : [] // 仅 phase=1（引擎 flare 峰）；phase 0.5 的满月无 flare
  }))
}

const framesPath = join(HERE, 'moon-frames.json')
writeFileSync(framesPath, JSON.stringify(framesData))

// ---- 终端报告 ------------------------------------------------------------
console.log(`已写出 ${outPath}`)
console.log(`已写出 ${framesPath}（${(JSON.stringify(framesData).length / 1024).toFixed(1)}KB）`)
console.log(`序列 ${SEQ_ID} · ${loaders.length} 帧 · 注入 key: dot-motion-builder.project.v9`)
console.log(`盘 ${DISC.length} cells · 缘 ${RIM.length} cells · flare ${FLARE.length} cells\n`)
PHASES.forEach((phase, i) => {
  console.log(`--- 帧 ${String(i + 1).padStart(2, '0')} · phase=${phase} · lit ${litCells(phase).length} ---`)
  console.log(asciiFrame(phase, DISC, RIM, FLARE))
})
