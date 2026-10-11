/**
 * 同步管线：dot-motion-builder 的 Frames JSON 导出 → moon-frames.json（v2）
 *
 * 映射（与 build-moon-project.mjs 的色槽约定一致）：
 *   frames[i].active  = 暗盘非亮部 cell
 *   frames[i].state2  = 亮部 cell（冰蓝）
 *   frames[i].state3  = flare 星芒 cell
 * 补全（编辑器不承载的规则层）：
 *   dark = active ∪ state2（亮部下也有暗盘底）
 *   rim  = 从 dark 几何推导（盘内且 4 邻有盘外 cell）
 *   glows = 按 MOON_PHASE_CYCLE 逐帧推导（相位表同引擎）
 *
 * 用法：node sync-from-export.mjs [export-frames.json]
 * 之后再跑 node build-component.mjs 重生成组件。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, process.argv[2] || 'export-frames.json')
const exported = JSON.parse(readFileSync(SRC, 'utf8'))

if (exported.kind !== 'dot-motion-frames') throw new Error('不是 dot-motion-frames 导出')

// ---- 与引擎一致的相位循环（帧顺序即循环顺序） --------------------------------
const PHASES = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92, 1, 0.88, 0.72, 0.56, 0.4, 0.24, 0.1]
if (exported.frames.length !== PHASES.length) {
  throw new Error(`帧数 ${exported.frames.length} ≠ 相位循环 ${PHASES.length}：请在工具里保持 14 帧`)
}

const ROWS = exported.grid.rows
const COLS = exported.grid.cols
const R = 5.6
const CX = (COLS - 1) / 2
const CY = (ROWS - 1) / 2

/** 盘缘 cell：盘内且 4 邻有盘外 cell（同 build-moon-project.mjs rimCells） */
function rimOf(darkCells) {
  const inDark = new Set(darkCells)
  const rim = []
  for (const idx of darkCells) {
    const col = idx % COLS
    const neighbors = [idx - COLS, idx + COLS, idx - 1, idx + 1]
    const edge = neighbors.some((n, k) => {
      if (n < 0 || n >= ROWS * COLS) return true
      if (k >= 2 && Math.abs((n % COLS) - col) !== 1) return true
      return !inDark.has(n)
    })
    if (edge) rim.push(idx)
  }
  return rim
}

/** glow 参数（引擎 drawMoonPhaseGlow） */
function glowSpec(phase) {
  const fullness = phase >= 0.96 ? 1 : Math.max(0.06, phase)
  const glowR = 1.9 + fullness * 2.4
  let offset = 0
  let litT = 1
  if (phase < 0.96 && phase >= 0.08) {
    const waxing = phase <= 0.5
    litT = waxing ? phase * 2 : (1 - phase) * 2
    offset = (waxing ? 1 : -1) * (0.35 + (1 - litT) * 0.45)
  }
  return { fullness, glowR, offset, litT, litStrength: 0.05 + litT * 0.16 }
}

const frames = exported.frames.map((f, i) => {
  const dark = [...new Set([...f.active, ...f.state2])].sort((a, b) => a - b)
  return {
    dark,
    rim: rimOf(dark),
    lit: [...f.state2].sort((a, b) => a - b),
    flare: [...f.state3].sort((a, b) => a - b)
  }
})

const out = {
  version: 2,
  kind: 'moonlit-trail-dot-frames',
  source: `sync-from-export.mjs ← dot-motion-builder Frames JSON（${exported.name}）`,
  grid: { rows: ROWS, cols: COLS, cellSize: 12, gap: 3, padding: 30 },
  fps: exported.fps,
  duration: exported.duration,
  loop: exported.loop,
  phases: PHASES,
  palette: {
    line: [32, 95, 125],
    dark: [18, 48, 68],
    lit: [210, 235, 248],
    glow: [55, 145, 185],
    flare: [70, 165, 205],
    violet: [88, 72, 128]
  },
  glows: PHASES.map(glowSpec),
  frames
}

const outPath = join(HERE, 'moon-frames.json')
writeFileSync(outPath, JSON.stringify(out))
console.log(`已同步 ${outPath}（${(JSON.stringify(out).length / 1024).toFixed(1)}KB）`)
frames.forEach((f, i) => {
  console.log(`帧 ${String(i + 1).padStart(2, '0')} · phase=${PHASES[i]} · dark ${f.dark.length} · rim ${f.rim.length} · lit ${f.lit.length} · flare ${f.flare.length}`)
})
