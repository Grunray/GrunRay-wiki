// 工具手修后的 Frames JSON → 合并回 cursor-frames.json → 重生成 <dot-sprite> 组件
// 用法：node sync-cursor-from-export.mjs <导出的.frames.json> <sprite名 columbina|damselette|kuuhenki>
//   例：node sync-cursor-from-export.mjs "光标 columbina.frames.json" columbina && node build-cursor-component.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const [exportFile, spriteName] = process.argv.slice(2)
if (!exportFile || !spriteName) {
  console.error('用法：node sync-cursor-from-export.mjs <frames.json> <sprite名>')
  process.exit(1)
}

const exported = JSON.parse(readFileSync(join(HERE, exportFile), 'utf8'))
if (exported.kind !== 'dot-motion-frames') {
  console.error(`不是 Frames JSON 导出（kind=${exported.kind}）`)
  process.exit(1)
}
if (exported.frames.length !== 1) {
  console.error(`光标精灵应为单帧，实际 ${exported.frames.length} 帧`)
  process.exit(1)
}

const framesPath = join(HERE, 'cursor-frames.json')
const data = JSON.parse(readFileSync(framesPath, 'utf8'))
const sp = data.sprites[spriteName]
if (!sp) {
  console.error(`cursor-frames.json 中无 sprite「${spriteName}」（现有：${Object.keys(data.sprites).join(', ')}）`)
  process.exit(1)
}
if (exported.grid.cols !== sp.grid.cols || exported.grid.rows !== sp.grid.rows) {
  console.error(`网格不匹配：导出 ${exported.grid.cols}×${exported.grid.rows} vs 现有 ${sp.grid.cols}×${sp.grid.rows}`)
  process.exit(1)
}

const f = exported.frames[0]
sp.layers = {
  state1: [...f.active].sort((a, b) => a - b),
  state2: [...f.state2].sort((a, b) => a - b),
  state3: [...f.state3].sort((a, b) => a - b),
}
if (exported.palette?.primary) sp.palette.primary = exported.palette.primary
if (exported.palette?.secondary) sp.palette.secondary = exported.palette.secondary
if (exported.palette?.tertiary) sp.palette.tertiary = exported.palette.tertiary

writeFileSync(framesPath, JSON.stringify(data, null, 2))
console.log(`✓ ${spriteName} 已合并：s1 ${sp.layers.state1.length} s2 ${sp.layers.state2.length} s3 ${sp.layers.state3.length}`)
console.log('接着跑：node build-cursor-component.mjs')
