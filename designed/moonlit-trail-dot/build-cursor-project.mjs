// 由 cursor-frames.json 生成 dot-motion-builder 工程（schema 对齐 build-moon-project.mjs）
// 三个独立单帧 loader：columbina 28×28 / damselette 16×16 / kuuhenki 16×16
// 用法：node build-cursor-project.mjs
// 产物：cursor-project.json（注入 localStorage["dot-motion-builder.project.v9"]）
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import crypto from 'node:crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
const frames = JSON.parse(readFileSync(join(HERE, 'cursor-frames.json'), 'utf8'))

const now = new Date().toISOString()
const FRAME_W = 260
const FRAME_GAP = 36

const loaders = Object.entries(frames.sprites).map(([name, sp], i) => {
  const { cols, rows } = sp.grid
  const cellStates = {}
  for (const idx of sp.layers.state2) cellStates[idx] = 2
  for (const idx of sp.layers.state3) cellStates[idx] = 3
  const activeCells = [...sp.layers.state1, ...sp.layers.state2, ...sp.layers.state3].sort((a, b) => a - b)

  return {
    id: crypto.randomUUID(),
    name: `光标 ${name}`,
    kind: 'custom',
    sequenceId: crypto.randomUUID(),
    sequenceIndex: 0,
    visible: true,
    artboard: {
      x: 160 + i * (FRAME_W + FRAME_GAP),
      y: 140,
      width: FRAME_W,
      height: FRAME_W,
    },
    layout: {
      type: 'status-pill',
      width: 220,
      height: 56,
      paddingX: 18,
      paddingY: 14,
      gap: 12,
      align: 'left',
    },
    pattern: {
      grid: { rows, cols, cellSize: 10, gap: 3 },
      activeCells,
      cellStates,
      snapshots: [],
      sourceType: 'drawn',
      presetId: 'custom',
    },
    animation: {
      presetId: 'wave',
      mode: 'wave',
      direction: 'right',
      originX: Math.ceil(cols / 2),
      originY: Math.ceil(rows / 2),
      fps: 6,
      loop: true,
      durationMs: 1200,
      staggerMs: 0,
      segment: 4,
      easing: 'linear',
      style: 'opacity-only',
      inactiveStyle: 'none',
      speed: 1,
      scaleIntensity: 0.5,
    },
    style: {
      cellShape: 'circle',
      radius: 5,
      innerRadius: 0.48,
      primaryColor: sp.palette.primary, // state1 主墨
      primaryAlpha: 0.95,
      secondaryColor: sp.palette.secondary, // state2 暗墨
      tertiaryColor: sp.palette.tertiary, // state3 冰蓝高光
      backgroundColor: '#8a93a8',
      backgroundAlpha: 0.35,
      glow: 8,
      glowColor: '#3791B9',
      glowAlpha: 0.4,
      shadow: true,
      backgroundStyle: 'none',
      containerRadius: 24,
    },
    text: {
      content: name,
      enabled: false,
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 0.04,
      color: 'rgba(255,255,255,0.92)',
    },
    effects: { shimmer: false },
  }
})

const project = {
  id: 'project-moonlit-cursor-dot',
  name: '光标点阵 · Moonlit Cursor',
  version: '0.17.0',
  createdAt: now,
  updatedAt: now,
  canvas: { zoom: 1, panX: 0, panY: 0, background: 'dark-grid', previewMode: 'split' },
  loaders,
  assets: { patterns: [], templates: [] },
  settings: { autosave: true, theme: 'dark' },
}

const outPath = join(HERE, 'cursor-project.json')
writeFileSync(outPath, JSON.stringify(project))
console.log(`已写出 ${outPath}（${(JSON.stringify(project).length / 1024).toFixed(1)}KB · ${loaders.length} loaders）`)
for (const [name, sp] of Object.entries(frames.sprites)) {
  console.log(`  ${name}: ${sp.grid.cols}×${sp.grid.rows} · s1 ${sp.layers.state1.length} s2 ${sp.layers.state2.length} s3 ${sp.layers.state3.length}`)
}
