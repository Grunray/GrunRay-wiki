/**
 * 由 moon-frames.json（双层帧数据）生成自包含 Web Component moonlit-trail-dot.js
 * 渲染分层与引擎 bakeTrailMoonSprite 一致：glow 径向渐变 → dark 暗盘 → rim 描边 → lit 亮部 → flare 星芒。
 * 用法：node build-component.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const frames = JSON.parse(readFileSync(join(HERE, 'moon-frames.json'), 'utf8'))

if (frames.version !== 2) throw new Error('需要 version 2 帧数据，先跑 build-moon-project.mjs')

const component = `/**
 * 月相点阵 · Moonlit Trail（dot-motion-builder 工程 · 双层渲染版）
 * 分层与 moonlitCursorEngine.ts bakeTrailMoonSprite 一致：
 *   glow 径向渐变 → dark 暗盘 0.94 → rim 盘缘 0.95 → lit 亮部 0.98 → flare 星芒（phase=1）
 * 用法：<script src="moonlit-trail-dot.js"></script> 然后 <dot-moon-phase></dot-moon-phase>
 * 可选 attribute：paused / speed="1.5"；方法 play() pause() seek(s)；get currentTime。
 */
(() => {
const data = ${JSON.stringify(frames)};
const requestedTag = document.currentScript?.dataset.dotMotionTag;
const tag = requestedTag && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(requestedTag) ? requestedTag : 'dot-moon-phase';
if (customElements.get(tag)) return;
const G = data.grid;
const pitch = G.cellSize + G.gap;
const R_PX = 5.6 * pitch; // 月盘半径（cell 单位 R=5.6 → px）
const CENTER = G.padding + 6 * pitch + G.cellSize / 2;
const WIDTH = G.padding * 2 + G.cols * G.cellSize + (G.cols - 1) * G.gap;
const rgba = (c, a) => 'rgba(' + c.join(',') + ',' + a + ')';
class DotMoonPhase extends HTMLElement {
  static get observedAttributes() { return ['paused', 'speed']; }
  constructor() {
    super();
    this.elapsed = 0; this.last = null; this.raf = 0;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:inline-block;width:48px;max-width:100%;line-height:0}canvas{display:block;width:100%;height:auto}</style><canvas></canvas>';
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.rate = 1;
    this.tick = (now) => {
      if (this.last !== null) this.elapsed += Math.max(0, now - this.last) / 1000 * this.rate;
      this.last = now; this.draw();
      if (this.running()) this.raf = requestAnimationFrame(this.tick);
      else this.last = null;
    };
    this.observer = new ResizeObserver(() => this.draw());
  }
  running() { return this.isConnected && !this.hasAttribute('paused') && (data.loop || this.elapsed < data.duration); }
  connectedCallback() { this.observer.observe(this); this.restart(); }
  disconnectedCallback() { cancelAnimationFrame(this.raf); this.last = null; this.observer.disconnect(); }
  attributeChangedCallback() {
    if (this.last !== null) this.elapsed += (performance.now() - this.last) / 1000 * this.rate;
    const value = Number(this.getAttribute('speed') ?? 1);
    this.rate = Number.isFinite(value) && value > 0 ? value : 1;
    this.restart();
  }
  restart() {
    cancelAnimationFrame(this.raf); this.last = null; this.draw();
    if (this.running()) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  play() { this.removeAttribute('paused'); this.restart(); }
  pause() { this.setAttribute('paused', ''); }
  seek(seconds) { this.elapsed = Math.max(0, Number(seconds) || 0); this.restart(); }
  get currentTime() { return this.elapsed; }

  drawGlow(ctx, spec, phaseValue) {
    const pal = data.palette;
    const vis = 1.85; // tuning.light.visibility
    const glowR = spec.glowR * R_PX;
    if (phaseValue >= 0.96) {
      const grd = ctx.createRadialGradient(CENTER, CENTER, R_PX * 0.2, CENTER, CENTER, glowR);
      grd.addColorStop(0, rgba(pal.lit, Math.min(1, 0.22 * vis * 1.35)));
      grd.addColorStop(0.35, rgba(pal.glow, Math.min(1, 0.12 * vis * 1.35)));
      grd.addColorStop(0.7, rgba(pal.violet, Math.min(1, 0.04 * vis * 1.35)));
      grd.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, WIDTH, WIDTH);
      return;
    }
    const ox = CENTER + spec.offset * R_PX;
    const grd = ctx.createRadialGradient(ox, CENTER, R_PX * 0.15, ox, CENTER, glowR);
    grd.addColorStop(0, rgba(pal.lit, Math.min(1, spec.litStrength * vis * 1.35)));
    grd.addColorStop(0.45, rgba(pal.glow, Math.min(1, spec.litStrength * 0.42 * vis * 1.35)));
    grd.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, WIDTH, WIDTH);
  }

  fillCells(ctx, cells, color, alpha, radiusMul = 1) {
    if (!cells.length) return;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    const r = (G.cellSize / 2) * radiusMul;
    for (const idx of cells) {
      const x = G.padding + (idx % G.cols) * pitch + G.cellSize / 2;
      const y = G.padding + Math.floor(idx / G.cols) * pitch + G.cellSize / 2;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const width = this.getBoundingClientRect().width || 48;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(width * dpr)); // 正方形画幅
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth; this.canvas.height = pixelHeight;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    const scale = pixelWidth / WIDTH;
    ctx.scale(scale, scale);
    const phase01 = data.loop ? (this.elapsed % data.duration) / data.duration : Math.min(1, this.elapsed / data.duration);
    const fi = Math.min(data.frames.length - 1, Math.floor(phase01 * data.frames.length));
    const frame = data.frames[fi];
    const phaseValue = data.phases[fi];
    const pal = data.palette;
    this.drawGlow(ctx, data.glows[fi], phaseValue);
    this.fillCells(ctx, frame.dark, pal.dark, 0.94);
    this.fillCells(ctx, frame.rim, pal.line, 0.6, 0.85); // 描边收敛：细于引擎齿轮感
    this.fillCells(ctx, frame.lit, pal.lit, 0.98);
    this.fillCells(ctx, frame.flare, pal.flare, 1, 1.15); // 星芒略放大
  }
}
customElements.define(tag, DotMoonPhase);
})();
`

const outPath = join(HERE, 'moonlit-trail-dot.js')
writeFileSync(outPath, component)
console.log(`已写出 ${outPath}（${(component.length / 1024).toFixed(1)}KB，帧数据 ${(JSON.stringify(frames).length / 1024).toFixed(1)}KB 内嵌）`)
