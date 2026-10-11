// 由 cursor-frames.json 生成自包含 Web Component <dot-sprite>
// 用法：node build-cursor-component.mjs
// 组件： <dot-sprite name="columbina|damselette|kuuhenki" px="56"></dot-sprite>
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'cursor-frames.json'), 'utf8'))

const component = `// <dot-sprite> — 月相光标点阵精灵（自包含，由 build-cursor-component.mjs 生成）
// 数据：cursor-frames.json（${data.sampler} 采样 · t0=${data.t0} · 三色分层）
// 用法：<dot-sprite name="columbina" px="56"></dot-sprite>  name ∈ columbina|damselette|kuuhenki
const DOT_SPRITES = ${JSON.stringify(data.sprites)}

class DotSprite extends HTMLElement {
  static get observedAttributes() { return ['name', 'px'] }
  connectedCallback() { this.render() }
  attributeChangedCallback() { this.render() }
  render() {
    const name = this.getAttribute('name') || 'columbina'
    const sp = DOT_SPRITES[name]
    if (!sp) return
    const px = Number(this.getAttribute('px')) || sp.displayPx
    const { cols, rows } = sp.grid
    const cellPx = px / Math.max(cols, rows)
    const w = Math.round(cols * cellPx)
    const h = Math.round(rows * cellPx)
    let cv = this.querySelector('canvas')
    if (!cv) {
      cv = document.createElement('canvas')
      this.innerHTML = ''
      this.appendChild(cv)
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = w * dpr
    cv.height = h * dpr
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    const hex2rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
    const pal = {
      1: hex2rgb(sp.palette.primary),
      2: hex2rgb(sp.palette.secondary),
      3: hex2rgb(sp.palette.tertiary),
    }
    const paint = (indices, state, alpha) => {
      const [r, g, b] = pal[state]
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
      for (const idx of indices) {
        const row = Math.floor(idx / cols)
        const col = idx % cols
        ctx.beginPath()
        ctx.arc((col + 0.5) * cellPx, (row + 0.5) * cellPx, cellPx * 0.44, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    paint(sp.layers.state2, 2, 0.8)   // 暗墨底层
    paint(sp.layers.state1, 1, 0.95)  // 主墨
    paint(sp.layers.state3, 3, 0.95)  // 冰蓝高光
  }
}
if (!customElements.get('dot-sprite')) customElements.define('dot-sprite', DotSprite)
`

const out = join(here, 'dot-cursor-sprites.js')
writeFileSync(out, component)
console.log(`built ${out} (${(component.length / 1024).toFixed(1)}KB)`)
