/**
 * Moonlit Editorial Cursor · 原型 Canvas 引擎（单 rAF 循环）
 */

const SCHEMES = {
  d: {
    label: '星座月相',
    mode: 'constellation',
    maxTrailNodes: 9,
    nodeSpacing: 27,
    nodeFadeMs: 2600,
    trailRetractMs: 180,
    trailRetractPull: 0.16,
    trailTailRetractSpeed: 0.085,
    trailSmooth: 0.52,
    pathSampleMin: 3,
    pathSampleMax: 56,
    moonRadiusBase: 3.2,
    trailMoonOpacity: 0.4,
    trailAlpha: 0.88,
    spriteMaxPx: 48,
    /** 点击热点（0–1）：Damselette 尖端对齐 mx/my */
    spriteHotX: 0.08,
    spriteHotY: 0.08,
    /** Columbina 线稿相对热点的偏移（避免与 Damselette 重叠） */
    spriteOffsetX: 14,
    spriteOffsetY: 12,
    anchorMaxPx: 20,
    anchorHotX: 0.06,
    anchorHotY: 0.06,
    pointerAnchor: true,
    moonSpawnMs: 520,
    /** 点击祈愿：指针淡出 → wish → 原石散落 */
    clickWishMs: 1680,
    clickPointerFadeMs: 300,
    clickWishFadeInMs: 200,
    clickWishFadeOutMs: 420,
    wishMaxPx: 56,
    /** wish 热点与静憩态 sleep 一致：整体落在点击处右下方 */
    wishHotX: 0.08,
    wishHotY: 0.08,
    wishOffsetX: 0,
    wishOffsetY: 0,
    clickPrimogemCount: 6,
    clickPrimogemOrbitR: 42,
    clickPrimogemMaxPx: 14,
    clickOrbitDotCount: 3,
    clickOrbitDotR: 2.2,
    /** 静憩态：指针停驻超过此时长（ms）后切换为 sleep + Kuuhenki */
    restAfterMs: 2000,
    restSleepMaxPx: 54,
    restKuuMaxPx: 20,
    /** sleep 热点与 Columbina 一致，整体落在点击处右下方 */
    restSleepHotX: 0.08,
    restSleepHotY: 0.08,
    /** 摇篮悬挂支点（精灵内 0–1，月弯左上） */
    restHangPivotX: 0.24,
    restHangPivotY: 0.22,
    /** Kuuhenki 推触点（精灵内 0–1，月弯右下尖端） */
    restContactX: 0.8,
    restContactY: 0.91,
    restKuuGapPx: 2,
    restKuuOffsetX: 0,
    restKuuOffsetY: 9,
    restRockHz: 0.72,
    restRockAmpRad: 0.075,
    restKuuPushPx: 2,
    restKuuLeanRad: 0.09,
    restGlowRadiusMul: 1.12,
    restGlowOuterMul: 1.48,
    restGalaxyParticleCount: 54,
    restGalaxyFallMul: 1,
  },
}

/** 御月鸽座：命之座为月相序列（非星点） */
const MOON_PHASE_CYCLE = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92, 1, 0.88, 0.72, 0.56, 0.4, 0.24, 0.1]

const CONSTELLATION_COLORS = {
  light: {
    line: 'rgba(32, 95, 125, ',
    dark: 'rgba(18, 48, 68, ',
    lit: 'rgba(210, 235, 248, ',
    glow: 'rgba(55, 145, 185, ',
    flare: 'rgba(70, 165, 205, ',
    violet: 'rgba(88, 72, 128, ',
  },
  dark: {
    line: 'rgba(0, 228, 255, ',
    dark: 'rgba(4, 22, 42, ',
    lit: 'rgba(235, 252, 255, ',
    glow: 'rgba(0, 235, 255, ',
    flare: 'rgba(180, 250, 255, ',
    violet: 'rgba(140, 110, 255, ',
  },
}

/** 方案 D 悬停三月：虹月（内）· 恒月（中）· 霜月（外） */
const CONSTELLATION_HOVER_MOONS = {
  rainbow: {
    label: '虹月',
    lit: 'rgba(255, 78, 92, ',
    line: 'rgba(255, 120, 128, ',
    glow: 'rgba(235, 45, 58, ',
    orbit: 'rgba(255, 95, 105, ',
    gradDim: 'rgba(55, 8, 18, ',
    gradMid: 'rgba(255, 55, 72, ',
    gradBright: 'rgba(255, 175, 182, ',
    gradPeak: 'rgba(255, 220, 224, ',
  },
  eternal: {
    label: '恒月',
    lit: 'rgba(255, 218, 95, ',
    line: 'rgba(255, 238, 155, ',
    glow: 'rgba(255, 185, 45, ',
    orbit: 'rgba(255, 200, 70, ',
    gradDim: 'rgba(95, 58, 5, ',
    gradMid: 'rgba(255, 168, 28, ',
    gradBright: 'rgba(255, 228, 120, ',
    gradPeak: 'rgba(255, 248, 210, ',
  },
  frost: {
    label: '霜月',
    lit: 'rgba(198, 228, 255, ',
    line: 'rgba(165, 210, 255, ',
    glow: 'rgba(110, 185, 255, ',
    orbit: 'rgba(140, 200, 255, ',
    gradDim: 'rgba(18, 48, 95, ',
    gradMid: 'rgba(85, 165, 255, ',
    gradBright: 'rgba(175, 218, 255, ',
    gradPeak: 'rgba(235, 248, 255, ',
  },
}

/**
 * 悬停调参：link（目录行/链接，内收）vs project（项目卡，外张）。
 * 与生产 `frontend/src/cursor/moonlitCursorConfig.ts` 对齐。
 */
const CONSTELLATION_HOVER_TUNING = {
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

const HOVER_ORBIT_SPRITE_CACHE = new Map()
const HOVER_MOON_SPRITE_CACHE = new Map()
const TRAIL_MOON_SPRITE_CACHE = new Map()
const REST_GLOW_SPRITE_CACHE = new Map()
const REST_GALAXY_SPRITE_CACHE = new Map()
const WISH_ORBIT_SPRITE_CACHE = new Map()

function moonPalCacheKey(moonPal) {
  return moonPal.label || moonPal.orbit
}

function bakeHoverOrbitSprite(moonPal, refRadius = 42) {
  const key = `${moonPalCacheKey(moonPal)}_${refRadius}`
  if (HOVER_ORBIT_SPRITE_CACHE.has(key)) return HOVER_ORBIT_SPRITE_CACHE.get(key)

  const pad = 22
  const size = refRadius * 2 + pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = size / 2
  const cy = size / 2
  const dim = moonPal.gradDim || moonPal.orbit
  const mid = moonPal.gradMid || moonPal.glow
  const bright = moonPal.gradBright || moonPal.lit
  const peak = moonPal.gradPeak || bright

  ctx.translate(cx, cy)
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.62

  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient(0, 0, 0)
    g.addColorStop(0, dim + '0.34)')
    g.addColorStop(0.12, mid + '0.9)')
    g.addColorStop(0.28, bright + '0.98)')
    g.addColorStop(0.42, peak + '1)')
    g.addColorStop(0.55, bright + '0.98)')
    g.addColorStop(0.68, mid + '0.8)')
    g.addColorStop(0.82, dim + '0.43)')
    g.addColorStop(1, dim + '0.34)')
    ctx.lineWidth = 2.85
    ctx.strokeStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, refRadius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = 0.95
    const g2 = ctx.createConicGradient(Math.PI * 0.35, 0, 0)
    g2.addColorStop(0, dim + '0.23)')
    g2.addColorStop(0.22, moonPal.orbit + '0.96)')
    g2.addColorStop(0.48, bright + '0.98)')
    g2.addColorStop(0.72, peak + '0.97)')
    g2.addColorStop(1, dim + '0.23)')
    ctx.lineWidth = 1.05
    ctx.strokeStyle = g2
    ctx.beginPath()
    ctx.arc(0, 0, refRadius, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.strokeStyle = moonPal.orbit + '0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, refRadius, 0, Math.PI * 2)
    ctx.stroke()
  }

  const entry = { canvas, size, refRadius, cx, cy }
  HOVER_ORBIT_SPRITE_CACHE.set(key, entry)
  return entry
}

function bakeHoverMoonSprite(moonPal, refR = 3.6) {
  const key = `${moonPalCacheKey(moonPal)}_${refR}`
  if (HOVER_MOON_SPRITE_CACHE.has(key)) return HOVER_MOON_SPRITE_CACHE.get(key)

  const pad = refR * 5.2
  const size = Math.ceil(refR * 2 + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = size / 2
  const cy = size / 2
  ctx.translate(cx, cy)

  const outerR = refR * 4.5
  const outer = ctx.createRadialGradient(0, 0, refR * 0.4, 0, 0, outerR)
  outer.addColorStop(0, moonPal.glow + '0.32)')
  outer.addColorStop(0.35, moonPal.glow + '0.14)')
  outer.addColorStop(1, moonPal.glow + '0)')
  ctx.fillStyle = outer
  ctx.beginPath()
  ctx.arc(0, 0, outerR, 0, Math.PI * 2)
  ctx.fill()

  const midR = refR * 2.4
  const mid = ctx.createRadialGradient(0, 0, refR * 0.2, 0, 0, midR)
  mid.addColorStop(0, moonPal.lit + '0.55)')
  mid.addColorStop(0.5, moonPal.glow + '0.2)')
  mid.addColorStop(1, moonPal.glow + '0)')
  ctx.fillStyle = mid
  ctx.beginPath()
  ctx.arc(0, 0, midR, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, 0, refR, 0, Math.PI * 2)
  ctx.fillStyle = moonPal.lit + '1)'
  ctx.fill()
  ctx.strokeStyle = moonPal.line + '0.95)'
  ctx.lineWidth = 0.9
  ctx.stroke()

  const entry = { canvas, size, refR, cx, cy }
  HOVER_MOON_SPRITE_CACHE.set(key, entry)
  return entry
}

function bakeTrailMoonSprite(phase, pal, tuning, refR = 10) {
  const key = `${pal.line}_${phase.toFixed(3)}_${refR}`
  if (TRAIL_MOON_SPRITE_CACHE.has(key)) return TRAIL_MOON_SPRITE_CACHE.get(key)

  const pad = refR * 5.5
  const size = Math.ceil(refR * 2 + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = size / 2
  const cy = size / 2
  const engine = { breathe: 0.5 }
  ctx.translate(cx, cy)

  MoonlitCursorEngine.prototype.drawMoonPhaseGlow.call(engine, ctx, refR, phase, pal, 1, tuning)

  ctx.beginPath()
  ctx.arc(0, 0, refR + 0.6, 0, Math.PI * 2)
  ctx.strokeStyle = pal.line + '0.35)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, 0, refR, 0, Math.PI * 2)
  ctx.fillStyle = pal.dark + '0.94)'
  ctx.fill()
  ctx.strokeStyle = pal.line + '0.95)'
  ctx.lineWidth = 1.05 * tuning.lineMul
  ctx.stroke()

  if (phase > 0.04 && phase < 0.96) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, refR - 0.15, 0, Math.PI * 2)
    ctx.clip()
    const waxing = phase <= 0.5
    const t = waxing ? phase * 2 : (1 - phase) * 2
    const offset = (waxing ? 1 : -1) * (1 - t) * refR * 0.92
    ctx.beginPath()
    ctx.arc(offset, 0, refR, 0, Math.PI * 2)
    ctx.fillStyle = pal.lit + '0.98)'
    ctx.fill()
    ctx.restore()
  } else if (phase >= 0.96) {
    ctx.beginPath()
    ctx.arc(0, 0, refR, 0, Math.PI * 2)
    ctx.fillStyle = pal.lit + '1)'
    ctx.fill()
  }

  const entry = { canvas, size, refR, cx, cy }
  TRAIL_MOON_SPRITE_CACHE.set(key, entry)
  return entry
}

function makeOffscreenCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w))
  canvas.height = Math.max(1, Math.ceil(h))
  const ctx = canvas.getContext('2d')
  return ctx ? { canvas, ctx } : null
}

/** 静憩月光晕：按主题+尺寸预烘焙，绘制时只 drawImage + 呼吸透明度 */
function bakeRestGlowSprite(pal, theme, sleepW, sleepH, cfg) {
  const key = `${theme}_${Math.round(sleepW)}_${Math.round(sleepH)}_${cfg.restGlowRadiusMul ?? 1.12}_${cfg.restGlowOuterMul ?? 1.48}`
  if (REST_GLOW_SPRITE_CACHE.has(key)) return REST_GLOW_SPRITE_CACHE.get(key)

  const innerR = sleepW * 0.52
  const midR = sleepW * (cfg.restGlowRadiusMul ?? 1.12)
  const outerR = sleepW * (cfg.restGlowOuterMul ?? 1.48)
  const padX = Math.ceil(Math.max(outerR, sleepW * 0.42) + 10)
  const padUp = Math.ceil(sleepH * 1.22)
  const padDown = Math.ceil(Math.max(outerR, sleepH * 0.42) + 10)
  const off = makeOffscreenCanvas(padX * 2, padUp + padDown)
  if (!off) return null

  const { canvas, ctx } = off
  const moonCx = padX
  const moonCy = padUp
  const topY = moonCy - sleepH * 0.95
  const fallBottom = moonCy + sleepH * 0.22
  const fallSpan = fallBottom - topY
  const breathe = 0.5

  const beamGrad = ctx.createLinearGradient(moonCx, topY - sleepH * 0.15, moonCx, moonCy + sleepH * 0.35)
  beamGrad.addColorStop(0, pal.lit + `${0.08 + breathe * 0.05})`)
  beamGrad.addColorStop(0.22, pal.glow + `${0.18 + breathe * 0.08})`)
  beamGrad.addColorStop(0.55, pal.lit + `${0.1 + breathe * 0.04})`)
  beamGrad.addColorStop(1, pal.glow + '0)')
  ctx.globalAlpha = 0.8
  ctx.fillStyle = beamGrad
  ctx.beginPath()
  ctx.ellipse(moonCx, moonCy - sleepH * 0.08, midR * 0.92, sleepH * 0.95, 0, 0, Math.PI * 2)
  ctx.fill()

  const outerGrad = ctx.createRadialGradient(moonCx, moonCy, innerR * 0.35, moonCx, moonCy, outerR)
  outerGrad.addColorStop(0, pal.glow + `${0.14 + breathe * 0.05})`)
  outerGrad.addColorStop(0.45, pal.lit + `${0.08 + breathe * 0.03})`)
  outerGrad.addColorStop(0.78, pal.glow + '0.04)')
  outerGrad.addColorStop(1, pal.glow + '0)')
  ctx.globalAlpha = 0.7
  ctx.fillStyle = outerGrad
  ctx.beginPath()
  ctx.arc(moonCx, moonCy, outerR, 0, Math.PI * 2)
  ctx.fill()

  const midGrad = ctx.createRadialGradient(moonCx, moonCy, 2, moonCx, moonCy, midR)
  midGrad.addColorStop(0, pal.lit + `${0.26 + breathe * 0.1})`)
  midGrad.addColorStop(0.5, pal.glow + `${0.15 + breathe * 0.06})`)
  midGrad.addColorStop(1, pal.glow + '0)')
  ctx.globalAlpha = 0.85
  ctx.fillStyle = midGrad
  ctx.beginPath()
  ctx.arc(moonCx, moonCy, midR, 0, Math.PI * 2)
  ctx.fill()

  for (let band = 0; band < 3; band++) {
    const bx = moonCx + sleepW * (band - 1) * 0.14
    const bandGrad = ctx.createLinearGradient(bx, topY, bx, fallBottom)
    bandGrad.addColorStop(0, pal.lit + '0)')
    bandGrad.addColorStop(0.18, pal.lit + `${0.16 + band * 0.03})`)
    bandGrad.addColorStop(0.42, pal.violet + `${0.12 + breathe * 0.04})`)
    bandGrad.addColorStop(0.68, pal.glow + '0.08)')
    bandGrad.addColorStop(1, pal.glow + '0)')
    ctx.globalAlpha = 0.38 + band * 0.08
    ctx.fillStyle = bandGrad
    ctx.beginPath()
    ctx.ellipse(bx, topY + fallSpan * 0.48, sleepW * (0.11 + band * 0.02), fallSpan * 0.52, 0.06, 0, Math.PI * 2)
    ctx.fill()
  }

  const coreGrad = ctx.createRadialGradient(moonCx, moonCy, 1, moonCx, moonCy, innerR)
  coreGrad.addColorStop(0, pal.lit + `${0.36 + breathe * 0.12})`)
  coreGrad.addColorStop(0.55, pal.glow + `${0.16 + breathe * 0.06})`)
  coreGrad.addColorStop(1, pal.glow + '0)')
  ctx.globalAlpha = 0.92
  ctx.fillStyle = coreGrad
  ctx.beginPath()
  ctx.arc(moonCx, moonCy, innerR, 0, Math.PI * 2)
  ctx.fill()

  const entry = { canvas, moonCx, moonCy, w: canvas.width, h: canvas.height }
  REST_GLOW_SPRITE_CACHE.set(key, entry)
  return entry
}

function bakeSoftDotSprite(color, size = 24) {
  const off = makeOffscreenCanvas(size, size)
  if (!off) return null
  const { canvas, ctx } = off
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, color + '1)')
  g.addColorStop(0.35, color + '0.55)')
  g.addColorStop(1, color + '0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(c, c, c, 0, Math.PI * 2)
  ctx.fill()
  return { canvas, size, c }
}

function bakeStreakSprite(c1, c2, w = 8, h = 40) {
  const off = makeOffscreenCanvas(w, h)
  if (!off) return null
  const { canvas, ctx } = off
  const g = ctx.createLinearGradient(w / 2, 0, w / 2, h)
  g.addColorStop(0, c1 + '0)')
  g.addColorStop(0.25, c1 + '0.65)')
  g.addColorStop(1, c2 + '1)')
  ctx.strokeStyle = g
  ctx.lineWidth = Math.max(1.2, w * 0.42)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(w / 2, 1)
  ctx.lineTo(w / 2, h - 1)
  ctx.stroke()
  return { canvas, w, h }
}

function bakeSparkSprite(flare, lit, size = 24) {
  const off = makeOffscreenCanvas(size, size)
  if (!off) return null
  const { canvas, ctx } = off
  const c = size / 2
  ctx.strokeStyle = flare + '0.85)'
  ctx.lineWidth = 1.1
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(2, c)
  ctx.lineTo(size - 2, c)
  ctx.moveTo(c, 4)
  ctx.lineTo(c, size - 4)
  ctx.stroke()
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.45)
  g.addColorStop(0, lit + '1)')
  g.addColorStop(1, lit + '0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(c, c, c * 0.42, 0, Math.PI * 2)
  ctx.fill()
  return { canvas, size, c }
}

/** 银河落尘粒子精灵：按主题烘焙，避免每帧 createLinearGradient */
function bakeRestGalaxySprites(pal, theme) {
  if (REST_GALAXY_SPRITE_CACHE.has(theme)) return REST_GALAXY_SPRITE_CACHE.get(theme)
  const entry = {
    streakLit: bakeStreakSprite(pal.lit, pal.flare),
    streakViolet: bakeStreakSprite(pal.violet, pal.flare),
    dotLit: bakeSoftDotSprite(pal.lit),
    dotViolet: bakeSoftDotSprite(pal.violet),
    spark: bakeSparkSprite(pal.flare, pal.lit),
  }
  REST_GALAXY_SPRITE_CACHE.set(theme, entry)
  return entry
}

/** 祈愿轨道：虚线圈 + 节点圆 + 光晕，一次烘焙后旋转 drawImage */
function bakeWishOrbitSprite(theme, orbitR, dotCount, dotR) {
  const key = `${theme}_${Math.round(orbitR)}_${dotCount}_${dotR}`
  if (WISH_ORBIT_SPRITE_CACHE.has(key)) return WISH_ORBIT_SPRITE_CACHE.get(key)

  const glowR = orbitR * 1.4
  const size = Math.ceil(glowR * 2 + 8)
  const off = makeOffscreenCanvas(size, size)
  if (!off) return null
  const { canvas, ctx } = off
  const cx = size / 2
  const cy = size / 2
  const dark = theme === 'dark'
  const ringStroke = dark ? 'rgba(198, 238, 255, 0.5)' : 'rgba(28, 98, 128, 0.38)'
  const dotStroke = dark ? 'rgba(210, 245, 255, 0.62)' : 'rgba(40, 108, 138, 0.48)'

  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR)
  glow.addColorStop(0, dark ? 'rgba(175, 225, 255, 0.24)' : 'rgba(72, 148, 188, 0.14)')
  glow.addColorStop(0.55, 'rgba(210, 170, 255, 0.08)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = ringStroke
  ctx.lineWidth = 1
  ctx.setLineDash([2.5, 4.5])
  ctx.beginPath()
  ctx.arc(cx, cy, orbitR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = dotStroke
  ctx.lineWidth = 1
  for (let i = 0; i < dotCount; i++) {
    const ang = (i / Math.max(1, dotCount)) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx + Math.cos(ang) * orbitR, cy + Math.sin(ang) * orbitR, dotR, 0, Math.PI * 2)
    ctx.stroke()
  }

  const entry = { canvas, size, cx, cy, orbitR }
  WISH_ORBIT_SPRITE_CACHE.set(key, entry)
  return entry
}

function bakePrimogemWithGlow(art) {
  if (!art?.canvas) return art
  const gem = Math.max(art.w, art.h)
  const glowR = gem * 0.85
  const size = Math.ceil(gem + glowR * 2)
  const off = makeOffscreenCanvas(size, size)
  if (!off) return art
  const { canvas, ctx } = off
  const cx = size / 2
  const cy = size / 2
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
  glow.addColorStop(0, 'rgba(230, 248, 255, 0.35)')
  glow.addColorStop(0.45, 'rgba(210, 175, 255, 0.12)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
  ctx.fill()
  const ox = (size - art.w) / 2
  const oy = (size - art.h) / 2
  ctx.drawImage(art.canvas, ox, oy)
  return {
    canvas,
    w: size,
    h: size,
    hotX: (ox + art.w * (art.hotX ?? 0.5)) / size,
    hotY: (oy + art.h * (art.hotY ?? 0.5)) / size,
  }
}

/** 用户提供的 SVG 线稿 → 栅格化为 Canvas 光标精灵 */
const COLUMBINA_CURSOR_SRC = 'assets/Columbina.svg'
const COLUMBINA_REF_IMG = new Image()
const COLUMBINA_LINE_ART = {
  ready: false,
  lightCanvas: null,
  darkCanvas: null,
  w: 0,
  h: 0,
  hotX: 0.5,
  hotY: 0.5,
}

/**
 * 线稿着色：浅色 / 深色各一份 Canvas 精灵。
 * TODO（合入 frontend 时）：绑定站点 theme（如 Pinia ui.theme / html[data-theme]），
 * 切换日/夜模式时改用对应精灵或在此表增删配色；勿写死 preview 页的 data-preview-theme。
 */
const COLUMBINA_INK = {
  light: { r: 12, g: 72, b: 92, a: 255 },
  dark: { r: 175, g: 252, b: 255, a: 255 },
}

function columbinaCanvasFromMask(mask, w, h, minX, minY, maxX, maxY, ink) {
  const outW = Math.max(1, maxX - minX + 1)
  const outH = Math.max(1, maxY - minY + 1)
  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const ocx = out.getContext('2d')
  if (!ocx) return out
  const id = ocx.createImageData(outW, outH)
  const d = id.data

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const strength = mask[y * w + x]
      if (strength <= 0) continue
      const i = ((y - minY) * outW + (x - minX)) * 4
      d[i] = Math.round(ink.r * (0.55 + strength * 0.45))
      d[i + 1] = Math.round(ink.g * (0.55 + strength * 0.45))
      d[i + 2] = Math.round(ink.b * (0.55 + strength * 0.45))
      d[i + 3] = Math.round(ink.a * (0.65 + strength * 0.35))
    }
  }

  ocx.putImageData(id, 0, 0)
  return out
}

function svgLineArtFromImage(img, ink, maxDim = 256) {
  const srcW = img.naturalWidth || 800
  const srcH = img.naturalHeight || 800
  const s = maxDim / Math.max(srcW, srcH)
  const w = Math.max(1, Math.round(srcW * s))
  const h = Math.max(1, Math.round(srcH * s))
  const temp = document.createElement('canvas')
  temp.width = w
  temp.height = h
  const tcx = temp.getContext('2d', { willReadFrequently: true })
  if (!tcx) return null
  tcx.drawImage(img, 0, 0, w, h)

  const id = tcx.getImageData(0, 0, w, h)
  const d = id.data
  const mask = new Float32Array(w * h)
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a < 8) continue
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    const strength = Math.max(a / 255, lum / 255)
    const px = (i / 4) % w
    const py = Math.floor(i / 4 / w)
    mask[py * w + px] = Math.max(mask[py * w + px], strength)
    if (px < minX) minX = px
    if (py < minY) minY = py
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
  }

  if (maxX <= minX || maxY <= minY) return null

  const pad = 2
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const outW = Math.max(1, maxX - minX + 1)
  const outH = Math.max(1, maxY - minY + 1)

  return {
    canvas: columbinaCanvasFromMask(mask, w, h, minX, minY, maxX, maxY, ink),
    w: outW,
    h: outH,
    hotX: 0.5,
    hotY: 0.5,
  }
}

function buildColumbinaLineArt(img) {
  const light = svgLineArtFromImage(img, COLUMBINA_INK.light)
  const dark = svgLineArtFromImage(img, COLUMBINA_INK.dark)
  if (!light || !dark) return

  COLUMBINA_LINE_ART.lightCanvas = light.canvas
  COLUMBINA_LINE_ART.darkCanvas = dark.canvas
  COLUMBINA_LINE_ART.w = light.w
  COLUMBINA_LINE_ART.h = light.h
  COLUMBINA_LINE_ART.hotX = light.hotX
  COLUMBINA_LINE_ART.hotY = light.hotY
  COLUMBINA_LINE_ART.ready = true
}

COLUMBINA_REF_IMG.onload = () => buildColumbinaLineArt(COLUMBINA_REF_IMG)
COLUMBINA_REF_IMG.src = COLUMBINA_CURSOR_SRC
if (COLUMBINA_REF_IMG.complete && COLUMBINA_REF_IMG.naturalWidth) {
  buildColumbinaLineArt(COLUMBINA_REF_IMG)
}

/** 点击祈愿 · wish.svg */
const WISH_CLICK_SRC = 'assets/wish.svg'
const WISH_CLICK_INK = {
  light: { r: 18, g: 78, b: 98, a: 255 },
  dark: { r: 175, g: 252, b: 255, a: 255 },
}
const WISH_CLICK_ART = {
  ready: false,
  lightCanvas: null,
  darkCanvas: null,
  w: 0,
  h: 0,
  hotX: 0.5,
  hotY: 0.5,
}
const WISH_CLICK_REF_IMG = new Image()

function buildWishClickArt(img) {
  const light = svgLineArtFromImage(img, WISH_CLICK_INK.light)
  const dark = svgLineArtFromImage(img, WISH_CLICK_INK.dark)
  if (!light || !dark) return
  WISH_CLICK_ART.lightCanvas = light.canvas
  WISH_CLICK_ART.darkCanvas = dark.canvas
  WISH_CLICK_ART.w = light.w
  WISH_CLICK_ART.h = light.h
  WISH_CLICK_ART.hotX = light.hotX
  WISH_CLICK_ART.hotY = light.hotY
  WISH_CLICK_ART.ready = true
}

WISH_CLICK_REF_IMG.onload = () => buildWishClickArt(WISH_CLICK_REF_IMG)
WISH_CLICK_REF_IMG.src = WISH_CLICK_SRC
if (WISH_CLICK_REF_IMG.complete && WISH_CLICK_REF_IMG.naturalWidth) {
  buildWishClickArt(WISH_CLICK_REF_IMG)
}

/** 点击祈愿 · Primogem.svg（多色原石） */
const PRIMOGEM_CLICK_SRC = 'assets/Primogem.svg'
const PRIMOGEM_INKS = [
  { r: 198, g: 242, b: 255, a: 255 },
  { r: 218, g: 178, b: 255, a: 255 },
  { r: 255, g: 192, b: 228, a: 255 },
  { r: 248, g: 252, b: 255, a: 255 },
]
const PRIMOGEM_SPRITES = []
const PRIMOGEM_REF_IMG = new Image()

function buildPrimogemSprites(img) {
  PRIMOGEM_SPRITES.length = 0
  for (const ink of PRIMOGEM_INKS) {
    const art = svgLineArtFromImage(img, ink, 128)
    if (art) PRIMOGEM_SPRITES.push(bakePrimogemWithGlow(art))
  }
}

PRIMOGEM_REF_IMG.onload = () => buildPrimogemSprites(PRIMOGEM_REF_IMG)
PRIMOGEM_REF_IMG.src = PRIMOGEM_CLICK_SRC
if (PRIMOGEM_REF_IMG.complete && PRIMOGEM_REF_IMG.naturalWidth) {
  buildPrimogemSprites(PRIMOGEM_REF_IMG)
}

/** 点击位置指示：Damselette.svg（替代三角） */
const DAMSELETTE_ANCHOR_SRC = 'assets/Damselette.svg'
const DAMSELETTE_ANCHOR = {
  ready: false,
  lightCanvas: null,
  darkCanvas: null,
  w: 0,
  h: 0,
  hotX: 0.06,
  hotY: 0.06,
}
const DAMSELETTE_REF_IMG = new Image()

function buildDamseletteAnchorArt(img) {
  const light = svgLineArtFromImage(img, COLUMBINA_INK.light)
  const dark = svgLineArtFromImage(img, COLUMBINA_INK.dark)
  if (!light || !dark) return
  DAMSELETTE_ANCHOR.lightCanvas = light.canvas
  DAMSELETTE_ANCHOR.darkCanvas = dark.canvas
  DAMSELETTE_ANCHOR.w = light.w
  DAMSELETTE_ANCHOR.h = light.h
  DAMSELETTE_ANCHOR.hotX = light.hotX
  DAMSELETTE_ANCHOR.hotY = light.hotY
  DAMSELETTE_ANCHOR.ready = true
}

DAMSELETTE_REF_IMG.onload = () => buildDamseletteAnchorArt(DAMSELETTE_REF_IMG)
DAMSELETTE_REF_IMG.src = DAMSELETTE_ANCHOR_SRC
if (DAMSELETTE_REF_IMG.complete && DAMSELETTE_REF_IMG.naturalWidth) {
  buildDamseletteAnchorArt(DAMSELETTE_REF_IMG)
}

/** 静憩态 · 月摇篮（左） */
const SLEEP_CURSOR_SRC = 'assets/sleep.svg'
const SLEEP_REF_IMG = new Image()
const SLEEP_LINE_ART = {
  ready: false,
  lightCanvas: null,
  darkCanvas: null,
  w: 0,
  h: 0,
}

/** 静憩态 · 空羽（右，推摇篮） */
const KUUHENKI_CURSOR_SRC = 'assets/Kuuhenki.svg'
const KUUHENKI_REF_IMG = new Image()
const KUUHENKI_LINE_ART = {
  ready: false,
  lightCanvas: null,
  darkCanvas: null,
  w: 0,
  h: 0,
}

const SLEEP_INK = {
  light: { r: 18, g: 78, b: 98, a: 255 },
  dark: { r: 155, g: 238, b: 255, a: 255 },
}

function lightenInk(ink, amount = 0.28) {
  return {
    r: Math.min(255, Math.round(ink.r + (255 - ink.r) * amount)),
    g: Math.min(255, Math.round(ink.g + (255 - ink.g) * amount)),
    b: Math.min(255, Math.round(ink.b + (255 - ink.b) * amount)),
    a: ink.a,
  }
}

/** 与 sleep 同色系，略浅一档 */
const KUUHENKI_INK = {
  light: lightenInk(SLEEP_INK.light, 0.34),
  dark: lightenInk(SLEEP_INK.dark, 0.2),
}

function buildSleepLineArt(img) {
  const light = svgLineArtFromImage(img, SLEEP_INK.light)
  const dark = svgLineArtFromImage(img, SLEEP_INK.dark)
  if (!light || !dark) return
  SLEEP_LINE_ART.lightCanvas = light.canvas
  SLEEP_LINE_ART.darkCanvas = dark.canvas
  SLEEP_LINE_ART.w = light.w
  SLEEP_LINE_ART.h = light.h
  SLEEP_LINE_ART.ready = true
}

function buildKuuhenkiLineArt(img) {
  const light = svgLineArtFromImage(img, KUUHENKI_INK.light, 192)
  const dark = svgLineArtFromImage(img, KUUHENKI_INK.dark, 192)
  if (!light || !dark) return
  KUUHENKI_LINE_ART.lightCanvas = light.canvas
  KUUHENKI_LINE_ART.darkCanvas = dark.canvas
  KUUHENKI_LINE_ART.w = light.w
  KUUHENKI_LINE_ART.h = light.h
  KUUHENKI_LINE_ART.ready = true
}

SLEEP_REF_IMG.onload = () => buildSleepLineArt(SLEEP_REF_IMG)
SLEEP_REF_IMG.src = SLEEP_CURSOR_SRC
if (SLEEP_REF_IMG.complete && SLEEP_REF_IMG.naturalWidth) {
  buildSleepLineArt(SLEEP_REF_IMG)
}

KUUHENKI_REF_IMG.onload = () => buildKuuhenkiLineArt(KUUHENKI_REF_IMG)
KUUHENKI_REF_IMG.src = KUUHENKI_CURSOR_SRC
if (KUUHENKI_REF_IMG.complete && KUUHENKI_REF_IMG.naturalWidth) {
  buildKuuhenkiLineArt(KUUHENKI_REF_IMG)
}

const THEME_TUNING = {
  light: { visibility: 1.85, trailMul: 1.65, coreMul: 1.4, lineMul: 1.35, glow: true },
  dark: { visibility: 1.0, trailMul: 1.0, coreMul: 1.0, lineMul: 1.0, glow: false },
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function tuningFor(theme) {
  return THEME_TUNING[theme] || THEME_TUNING.light
}

function constellationPalette(theme) {
  return CONSTELLATION_COLORS[theme] || CONSTELLATION_COLORS.light
}

class MoonlitCursorEngine {
  constructor(canvas, getConfig, getTheme) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.getConfig = getConfig
    this.getTheme = getTheme
    this.dpr = 1
    this.width = 0
    this.height = 0
    this.running = false
    this.raf = 0
    this.pointerFine = window.matchMedia('(pointer: fine)').matches

    this.mx = -100
    this.my = -100
    this.lastMove = 0
    this.hoverKind = 'none'
    this.hoverPhase = 0
    this.clickPulse = 0
    this.clickAt = 0
    this.clickEffect = { pointerFade: 0, wishAlpha: 0, active: false }
    this.clickPrimogems = []
    this._primogemsSpawnedThisClick = false
    this.idleAlpha = 0.55
    this.breathe = 0

    this.constellationNodes = []
    this.constellationPath = []
    this.constellationTailRetract = null
    this.moonFeathers = []
    this.headMoonRot = 0
    this.headMoonVr = rand(-0.016, 0.016) || 0.01
    this.phaseCounter = 0
    this.trailDistCarry = 0
    this.trailEmergenceT = 0
    this.smoothMx = -100
    this.smoothMy = -100
    this.hoverPickT = 0
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    /** 静憩态混合 0–1：Columbina/Damselette ↔ sleep/Kuuhenki */
    this.restBlend = 0
    this.restWakeTimer = 0
    this.restFpsTimer = 0
    this.lastTick = 0
    this.restGalaxyParticles = null

    this.onMove = this.onMove.bind(this)
    this.onDown = this.onDown.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onVisibility = this.onVisibility.bind(this)
  }

  start() {
    if (!this.pointerFine) return
    this.resize()
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onDown, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })
    document.addEventListener('visibilitychange', this.onVisibility)
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const onMotion = () => {
        this.reducedMotion = mq.matches
        this.wakeLoop()
      }
      if (mq.addEventListener) mq.addEventListener('change', onMotion)
      else if (mq.addListener) mq.addListener(onMotion)
    }
    this.running = true
    this.prewarmConstellationAssets()
    this.loop()
  }

  prewarmConstellationAssets() {
    const theme = this.getTheme()
    const pal = constellationPalette(theme)
    const tuning = tuningFor(theme)
    for (const phase of MOON_PHASE_CYCLE) {
      bakeTrailMoonSprite(phase, pal, tuning)
    }
    for (const key of Object.keys(CONSTELLATION_HOVER_MOONS)) {
      const moonPal = CONSTELLATION_HOVER_MOONS[key]
      bakeHoverOrbitSprite(moonPal)
      bakeHoverMoonSprite(moonPal)
    }
    const cfg = this.getConfig()
    const sleepPx = cfg.restSleepMaxPx ?? 54
    bakeRestGlowSprite(pal, theme, sleepPx, sleepPx, cfg)
    bakeRestGalaxySprites(pal, theme)
    bakeWishOrbitSprite(
      theme,
      cfg.clickPrimogemOrbitR ?? 42,
      cfg.clickOrbitDotCount ?? 10,
      cfg.clickOrbitDotR ?? 2.2,
    )
  }

  wakeLoop() {
    if (!this.running || document.hidden) return
    if (this.restFpsTimer) {
      clearTimeout(this.restFpsTimer)
      this.restFpsTimer = 0
    }
    if (!this.raf) this.loop()
  }

  needsConstellationFrame(now, cfg) {
    const idleMs = cfg.trailRetractMs || 180
    if (now - this.lastMove <= idleMs) return true
    if (this.constellationTailRetract) return true
    if (this.moonFeathers.length > 0) return true
    if (this.clickPulse > 0.02) return true
    if (this.clickEffect?.active) return true
    if (this.clickPrimogems.length > 0) return true
    if (this.constellationNodes.length > 0) return true
    if (this.hoverPhase > 0.02) return true
    if (this.hoverKind !== 'none' && this.hoverPhase < 0.98) return true
    if (this.restBlend > 0.005) return true
    if (this.isPointerResting(now, cfg)) return true
    return false
  }

  /** 仅静憩呼吸/落尘在动时降到 ~30fps，避免空闲阅读时锁 60fps */
  isRestOnlyAnimation(now, cfg) {
    const idleMs = cfg.trailRetractMs || 180
    if (now - this.lastMove <= idleMs) return false
    if (this.constellationTailRetract) return false
    if (this.moonFeathers.length > 0) return false
    if (this.clickEffect?.active) return false
    if (this.clickPrimogems.length > 0) return false
    if (this.constellationNodes.length > 0) return false
    if (this.hoverPhase > 0.02) return false
    if (this.hoverKind !== 'none' && this.hoverPhase < 0.98) return false
    return this.restBlend > 0.005 || this.isPointerResting(now, cfg)
  }

  isPointerResting(now, cfg) {
    const ms = cfg.restAfterMs ?? 2000
    return this.lastMove > 0 && this.mx >= 0 && this.my >= 0 && now - this.lastMove >= ms
  }

  initRestGalaxyParticles(cfg) {
    const n = cfg.restGalaxyParticleCount ?? 54
    this.restGalaxyParticles = []
    for (let i = 0; i < n; i++) {
      this.restGalaxyParticles.push({
        nx: rand(0.02, 0.98),
        offset: rand(0, 1),
        speedPx: rand(0.016, 0.042) * (cfg.restGalaxyFallMul ?? 1),
        sway: rand(0.4, 2.8),
        phase: rand(0, Math.PI * 2),
        r: rand(0.28, 1.65),
        kind: rand(0, 1),
        hue: rand(0, 1),
        trailLen: rand(6, 18),
      })
    }
  }

  /**
   * 静憩态氛围：月光 + 银河落尘。世界坐标固定，不随月弯摇摆。
   */
  drawRestMoonAmbience(
    ctx,
    drawX,
    drawY,
    sleepW,
    sleepH,
    sleepHotX,
    sleepHotY,
    alpha,
    tuning,
    pal,
    now,
    cfg,
  ) {
    const vis = Math.min(1, alpha * tuning.visibility)
    if (vis <= 0.01) return

    const glowVis = tuning.glow ? 1 : 0.75
    const breathe = Math.sin(now * 0.0016) * 0.5 + 0.5
    const moonCx = drawX + sleepW * (0.48 - sleepHotX)
    const moonCy = drawY + sleepH * (0.4 - sleepHotY)
    const topY = drawY - sleepHotY * sleepH - sleepH * 0.55
    const fallBottom = drawY + sleepH * 0.62 - sleepHotY * sleepH
    const fallSpan = fallBottom - topY
    const motion = !this.reducedMotion
    const theme = this.getTheme()
    const glowSprite = bakeRestGlowSprite(pal, theme, sleepW, sleepH, cfg)
    const galaxySprites = bakeRestGalaxySprites(pal, theme)

    ctx.save()

    if (glowSprite) {
      ctx.globalAlpha = vis * glowVis * (0.86 + breathe * 0.18)
      ctx.drawImage(glowSprite.canvas, moonCx - glowSprite.moonCx, moonCy - glowSprite.moonCy)
    }

    if (!this.restGalaxyParticles) this.initRestGalaxyParticles(cfg)

    for (const p of this.restGalaxyParticles) {
      const sway = motion ? Math.sin(now * 0.00085 + p.phase) * p.sway : 0
      const px = drawX + p.nx * sleepW - sleepHotX * sleepW + sway
      const travel = motion ? now * p.speedPx : p.offset * fallSpan
      const py = topY + ((p.offset * fallSpan + travel) % fallSpan)
      const depth = (py - topY) / fallSpan
      const topBright = 1 - depth * 0.28
      const tw = motion ? Math.sin(now * 0.004 + p.phase) * 0.5 + 0.5 : 0.72
      const dotA = vis * topBright * (0.38 + tw * 0.58)
      if (dotA <= 0.02) continue

      ctx.globalAlpha = dotA
      if (p.kind < 0.38) {
        const streak = p.hue > 0.55 ? galaxySprites.streakViolet : galaxySprites.streakLit
        if (!streak) continue
        const len = p.trailLen * (0.7 + tw * 0.4)
        const dw = Math.max(2, p.r * 1.1)
        ctx.drawImage(streak.canvas, px - dw * 0.5, py - len, dw, len)
      } else if (p.kind < 0.78) {
        const dot = p.hue > 0.62 ? galaxySprites.dotViolet : galaxySprites.dotLit
        if (!dot) continue
        const size = p.r * 2.4
        ctx.drawImage(dot.canvas, px - size * 0.5, py - size * 0.5, size, size)
      } else if (galaxySprites.spark) {
        const spark = galaxySprites.spark
        const size = p.r * 5
        ctx.drawImage(spark.canvas, px - size * 0.5, py - size * 0.5, size, size)
      }
    }

    ctx.restore()
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.constellationNodes = []
    this.constellationPath = []
    this.constellationTailRetract = null
    this.moonFeathers = []
    this.headMoonRot = 0
    this.headMoonVr = rand(-0.016, 0.016) || 0.01
    this.phaseCounter = 0
    this.trailDistCarry = 0
    this.smoothMx = -100
    this.smoothMy = -100
    this.restBlend = 0
    this.clickAt = 0
    this.clickPulse = 0
    this.clickEffect = { pointerFade: 0, wishAlpha: 0, active: false }
    this.clickPrimogems = []
    this._primogemsSpawnedThisClick = false
    if (this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
    if (this.restWakeTimer) {
      clearTimeout(this.restWakeTimer)
      this.restWakeTimer = 0
    }
    if (this.restFpsTimer) {
      clearTimeout(this.restFpsTimer)
      this.restFpsTimer = 0
    }
  }

  onVisibility() {
    if (document.hidden) {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      if (this.restFpsTimer) {
        clearTimeout(this.restFpsTimer)
        this.restFpsTimer = 0
      }
    } else if (this.running) {
      this.loop()
    }
  }

  onResize() {
    this.resize()
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  detectHover(x, y) {
    const el = document.elementFromPoint(x, y)
    if (!el) return 'none'
    if (el.closest('.project-chip')) return 'project'
    if (el.closest('.toc-row, .theme-btn, .mock-nav-links span')) return 'link'
    return 'none'
  }

  onMove(e) {
    if (!e.isPrimary) return
    const now = performance.now()
    const nx = e.clientX
    const ny = e.clientY
    const prevLastMove = this.lastMove
    this.mx = nx
    this.my = ny
    this.lastMove = now

    const cfg = this.getConfig()
    const idleMs = cfg.trailRetractMs || 180
    if (now - prevLastMove > idleMs) {
      this.trailEmergenceT = now
    }
    this.constellationTailRetract = null
    const trail = this.getConstellationTrailAnchor(cfg, nx, ny)
    this.updateConstellationTrail(trail.x, trail.y, now, cfg)
    if (now - this.hoverPickT >= 60) {
      this.hoverPickT = now
      this.hoverKind = this.detectHover(nx, ny)
    }
    this.hoverPhase =
      this.hoverKind === 'none' ? Math.max(0, this.hoverPhase - 0.1) : Math.min(1, this.hoverPhase + 0.14)
    this.wakeLoop()
  }

  onDown(e) {
    if (!e.isPrimary) return
    this.clickAt = performance.now()
    this.clickPulse = 0
    this.clickEffect = { pointerFade: 0, wishAlpha: 0, active: true }
    this.clickPrimogems = []
    this._primogemsSpawnedThisClick = false
    this.wakeLoop()
  }

  easeClick(t) {
    return t * t * (3 - 2 * t)
  }

  /** 点击祈愿时间轴：指针淡出 → wish 显现 → 原石从轨道内侧散落 */
  computeClickEffect(now, cfg) {
    if (!this.clickAt) {
      return { pointerFade: 0, wishAlpha: 0, active: false }
    }
    const total = cfg.clickWishMs ?? 1680
    const elapsed = now - this.clickAt
    if (elapsed <= 0) {
      return { pointerFade: 0, wishAlpha: 0, active: false }
    }
    if (elapsed >= total) {
      this.clickAt = 0
      this.clickPrimogems = []
      this._primogemsSpawnedThisClick = false
      return { pointerFade: 0, wishAlpha: 0, active: false }
    }

    const ptrMs = cfg.clickPointerFadeMs ?? 300
    const wishInMs = cfg.clickWishFadeInMs ?? 240
    const wishOutMs = cfg.clickWishFadeOutMs ?? 460
    const wishOutStart = total - wishOutMs

    const pointerFade = this.easeClick(Math.min(1, elapsed / ptrMs))

    let wishAlpha = 0
    if (elapsed > ptrMs) {
      if (elapsed < wishOutStart) {
        wishAlpha = this.easeClick(Math.min(1, (elapsed - ptrMs) / wishInMs))
      } else {
        wishAlpha = this.easeClick(Math.max(0, 1 - (elapsed - wishOutStart) / wishOutMs))
      }
    }

    return { pointerFade, wishAlpha, active: true }
  }

  spawnClickPrimogems(cx, cy, cfg, now) {
    const count = cfg.clickPrimogemCount ?? 8
    const orbitR = cfg.clickPrimogemOrbitR ?? 42
    if (!PRIMOGEM_SPRITES.length) return

    this.clickPrimogems = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.28, 0.28)
      const startR = orbitR * rand(0.68, 0.9)
      const sx = cx + Math.cos(angle) * startR
      const sy = cy + Math.sin(angle) * startR
      const scatter = rand(0.018, 0.052)
      this.clickPrimogems.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * scatter + rand(-0.02, 0.02),
        vy: rand(0.03, 0.075) + scatter * 0.35,
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.012, 0.012),
        scale: rand(0.5, 1.05),
        variant: Math.floor(rand(0, PRIMOGEM_SPRITES.length)),
        delay: rand(0, 380),
        born: now,
        life: 1,
      })
    }
  }

  updateClickPrimogems(now, cfg) {
    const list = this.clickPrimogems
    if (!list.length) return
    let write = 0
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      if (now - p.born >= p.delay) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.0012
        p.rot += p.vr
        p.life -= 0.00145
        p.vx *= 0.992
      }
      if (p.life > 0.02) list[write++] = p
    }
    list.length = write
  }

  loop() {
    if (!this.running || document.hidden) return
    const now = performance.now()
    const cfg = this.getConfig()
    this.update()
    this.draw()
    if (!this.needsConstellationFrame(now, cfg)) {
      this.raf = 0
      const restMs = cfg.restAfterMs ?? 2000
      if (this.lastMove > 0 && this.mx >= 0) {
        const idleFor = now - this.lastMove
        if (idleFor < restMs) {
          const delay = Math.max(16, restMs - idleFor + 24)
          if (this.restWakeTimer) clearTimeout(this.restWakeTimer)
          this.restWakeTimer = setTimeout(() => {
            this.restWakeTimer = 0
            this.wakeLoop()
          }, delay)
        }
      }
      return
    }
    if (this.isRestOnlyAnimation(now, cfg)) {
      this.raf = 0
      if (this.restFpsTimer) clearTimeout(this.restFpsTimer)
      this.restFpsTimer = setTimeout(() => {
        this.restFpsTimer = 0
        this.wakeLoop()
      }, 33)
      return
    }
    this.raf = requestAnimationFrame(() => this.loop())
  }

  update() {
    const now = performance.now()
    const cfg = this.getConfig()
    const dt = Math.min(0.05, (now - (this.lastTick || now)) / 1000)
    this.lastTick = now

    this.breathe = Math.sin(now * 0.0022) * 0.5 + 0.5
    const idleMs = cfg.trailRetractMs || 180
    const idle = now - this.lastMove > idleMs
    if (idle) {
      this.idleAlpha = Math.max(0.42, this.idleAlpha - 0.012)
      if (!this.constellationTailRetract && this.constellationNodes.length) {
        this.trimConstellationPathFromHead()
      }
      this.updateConstellationIdleRetract(cfg)
    } else {
      this.idleAlpha = Math.min(0.82, this.idleAlpha + 0.07)
      this.constellationTailRetract = null
    }
    this.smoothConstellationPointer(cfg)
    this.headMoonRot += this.headMoonVr
    for (const n of this.constellationNodes) {
      n.rot = (n.rot || 0) + (n.vr || 0)
    }
    this.moonFeathers = this.moonFeathers.filter((f) => {
      f.x += f.vx
      f.y += f.vy
      f.vy += 0.018
      f.vx *= 0.988
      f.rot += f.vr
      f.life -= 0.022
      return f.life > 0
    })
    this.clickEffect = this.computeClickEffect(now, cfg)
    this.clickPulse = this.clickEffect.pointerFade
    this.updateClickPrimogems(now, cfg)

    const resting = this.isPointerResting(now, cfg)
    if (resting) {
      this.restBlend = Math.min(1, this.restBlend + dt * 1.92)
    } else {
      this.restBlend = Math.max(0, this.restBlend - dt * 8.4)
    }
  }

  smoothConstellationPointer(cfg) {
    if (this.mx < 0 || this.my < 0) return
    const s = cfg.trailSmooth ?? 0.52
    if (this.smoothMx < 0) {
      this.smoothMx = this.mx
      this.smoothMy = this.my
      return
    }
    this.smoothMx += (this.mx - this.smoothMx) * s
    this.smoothMy += (this.my - this.smoothMy) * s
  }

  updateConstellationIdleRetract(cfg) {
    const nodes = this.constellationNodes
    const speed = cfg.trailTailRetractSpeed || 0.085

    if (this.constellationTailRetract) {
      const r = this.constellationTailRetract
      r.progress = Math.min(1, r.progress + speed)
      if (nodes.length > 0) {
        nodes[0].life = Math.max(0, 1 - r.progress)
      }
      if (r.progress >= 1) {
        const removed = nodes[0]
        if (removed) this.spawnMoonVanishFeathers(removed.x, removed.y, removed.phase)
        nodes.shift()
        this.constellationTailRetract = null
        this.trimConstellationPathFromHead()
      }
      return
    }

    if (nodes.length >= 2) {
      const z = nodes[0]
      const y = nodes[1]
      this.constellationTailRetract = {
        zX: z.x,
        zY: z.y,
        yX: y.x,
        yY: y.y,
        progress: 0,
      }
      return
    }

    if (nodes.length === 1) {
      const z = nodes[0]
      const tip = this.getConstellationTrailAnchor(cfg, this.mx, this.my)
      this.constellationTailRetract = {
        zX: z.x,
        zY: z.y,
        yX: tip.x,
        yY: tip.y,
        toCursor: true,
        progress: 0,
      }
    }
  }

  trimConstellationPathFromHead() {
    const nodes = this.constellationNodes
    const path = this.constellationPath
    const cfg = this.getConfig()
    if (!path.length) return
    if (!nodes.length) {
      if (this.mx >= 0 && this.my >= 0) {
        const tip = this.getConstellationTrailAnchor(cfg, this.mx, this.my)
        this.constellationPath = [{ x: tip.x, y: tip.y }]
      }
      return
    }
    const head = nodes[0]
    let bestIdx = 0
    let bestD = Infinity
    for (let i = 0; i < path.length; i++) {
      const d = Math.hypot(path[i].x - head.x, path[i].y - head.y)
      if (d < bestD) {
        bestD = d
        bestIdx = i
      }
    }
    this.constellationPath = path.slice(bestIdx)
  }

  syncConstellationPathToNodes() {
    this.trimConstellationPathFromHead()
  }

  trimConstellationPath(cfg) {
    let pts = this.constellationPath
    const maxPts = cfg.pathSampleMax || 56
    if (pts.length > maxPts) {
      pts = pts.slice(pts.length - maxPts)
      this.constellationPath = pts
    }
    const maxLen = (cfg.nodeSpacing || 80) * (cfg.maxTrailNodes || 9) * 1.6
    if (pts.length < 2) return

    let total = 0
    for (let i = pts.length - 1; i > 0; i--) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
      if (total > maxLen) {
        this.constellationPath = pts.slice(i - 1)
        return
      }
    }
  }

  spawnMoonVanishFeathers(x, y, phase) {
    const count = 4 + Math.floor(Math.random() * 4)
    const spread = 0.55 + phase * 0.45
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(0.5, 2.2) * spread
      this.moonFeathers.push({
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(0.15, 0.75),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.07, 0.07),
        life: 1,
        size: rand(7, 13),
      })
    }
  }

  pushConstellationNode(x, y, now, cfg) {
    const maxNodes = cfg.maxTrailNodes || 9
    if (this.constellationNodes.length >= maxNodes) {
      const removed = this.constellationNodes[0]
      this.spawnMoonVanishFeathers(removed.x, removed.y, removed.phase)
      this.constellationNodes.shift()
      this.constellationTailRetract = null
      this.trimConstellationPathFromHead()
    }
    const phase = MOON_PHASE_CYCLE[this.phaseCounter % MOON_PHASE_CYCLE.length]
    this.phaseCounter += 1
    let vr = rand(-0.018, 0.018)
    if (Math.abs(vr) < 0.004) vr = vr < 0 ? -0.006 : 0.006
    this.constellationNodes.push({
      x,
      y,
      t: now,
      phase,
      life: 1,
      rot: rand(0, Math.PI * 2),
      vr,
    })
  }

  updateConstellationTrail(nx, ny, now, cfg) {
    const spacing = Math.max(24, cfg.nodeSpacing || 80)
    const sampleMin = cfg.pathSampleMin || 3
    const path = this.constellationPath

    if (!path.length) {
      path.push({ x: nx, y: ny })
      return
    }

    const prev = path[path.length - 1]
    const dx = nx - prev.x
    const dy = ny - prev.y
    const segLen = Math.hypot(dx, dy)
    if (segLen < sampleMin) return

    path.push({ x: nx, y: ny })
    this.trimConstellationPath(cfg)

    const total = (this.trailDistCarry || 0) + segLen
    const count = Math.floor(total / spacing)
    const remainder = total % spacing
    const carryBefore = this.trailDistCarry || 0

    for (let i = 1; i <= count; i++) {
      const distFromPrev = i * spacing - carryBefore
      const t = Math.min(1, distFromPrev / segLen)
      this.pushConstellationNode(prev.x + dx * t, prev.y + dy * t, now, cfg)
    }

    this.trailDistCarry = remainder
  }

  drawMoonFeather(ctx, f, pal, alpha, tuning) {
    const s = f.size
    ctx.save()
    ctx.translate(f.x, f.y)
    ctx.rotate(f.rot)
    ctx.globalAlpha = Math.min(0.82, f.life * 0.72 * alpha * tuning.visibility)
    ctx.strokeStyle = pal.line + `${0.55 + f.life * 0.25})`
    ctx.fillStyle = pal.lit + `${0.12 + f.life * 0.18})`
    ctx.lineWidth = 0.65 * tuning.lineMul
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(0, s * 0.5)
    ctx.quadraticCurveTo(s * 0.06, s * 0.05, -s * 0.04, -s * 0.46)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, s * 0.42)
    ctx.bezierCurveTo(s * 0.48, s * 0.12, s * 0.4, -s * 0.32, s * 0.02, -s * 0.44)
    ctx.bezierCurveTo(-s * 0.15, -s * 0.18, -s * 0.1, s * 0.08, 0, s * 0.42)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue
      const ty = i * s * 0.11
      ctx.beginPath()
      ctx.moveTo(0, ty)
      ctx.lineTo(s * (0.28 + Math.abs(i) * 0.04), ty + s * 0.04)
      ctx.stroke()
    }

    ctx.restore()
  }

  drawMoonPhaseGlow(ctx, radius, phase, pal, alpha, tuning) {
    const fullness = phase >= 0.96 ? 1 : Math.max(0.06, phase)
    const glowR = radius * (1.9 + fullness * 2.4)
    const vis = alpha * tuning.visibility

    if (phase >= 0.96) {
      const grd = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, glowR)
      grd.addColorStop(0, pal.lit + `${0.22 * vis})`)
      grd.addColorStop(0.35, pal.glow + `${0.12 * vis})`)
      grd.addColorStop(0.7, pal.violet + `${0.04 * vis})`)
      grd.addColorStop(1, pal.glow + '0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(0, 0, glowR, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    if (phase < 0.08) {
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR * 0.55)
      grd.addColorStop(0, pal.glow + `${0.03 * vis})`)
      grd.addColorStop(1, pal.glow + '0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(0, 0, glowR * 0.55, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    const waxing = phase <= 0.5
    const litT = waxing ? phase * 2 : (1 - phase) * 2
    const offset = (waxing ? 1 : -1) * radius * (0.35 + (1 - litT) * 0.45)
    const litStrength = 0.05 + litT * 0.16
    const grd = ctx.createRadialGradient(offset, 0, radius * 0.15, offset, 0, glowR)
    grd.addColorStop(0, pal.lit + `${litStrength * vis})`)
    grd.addColorStop(0.45, pal.glow + `${(litStrength * 0.42) * vis})`)
    grd.addColorStop(1, pal.glow + '0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(offset, 0, glowR, 0, Math.PI * 2)
    ctx.fill()

    if (litT > 0.55) {
      ctx.save()
      ctx.globalAlpha = litT * 0.1 * vis
      ctx.strokeStyle = pal.flare + `${0.28 * litT})`
      ctx.lineWidth = 0.45
      const fl = radius * (0.9 + litT * 1.1)
      ctx.beginPath()
      ctx.ellipse(offset * 0.35, 0, fl, fl * 0.35, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  drawMoonPhaseNode(ctx, x, y, radius, phase, pal, alpha, tuning, rot = 0) {
    const vis = Math.min(1, alpha * tuning.visibility)
    const sprite = bakeTrailMoonSprite(phase, pal, tuning)
    if (sprite && !this.reducedMotion) {
      const scale = radius / sprite.refR
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.globalAlpha = vis
      ctx.drawImage(
        sprite.canvas,
        -sprite.cx * scale,
        -sprite.cy * scale,
        sprite.size * scale,
        sprite.size * scale,
      )
      ctx.restore()
      return
    }

    if (this.reducedMotion) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.globalAlpha = vis * 0.92
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fillStyle = pal.lit + '0.9)'
      ctx.fill()
      ctx.strokeStyle = pal.line + '0.75)'
      ctx.lineWidth = 0.85 * tuning.lineMul
      ctx.stroke()
      ctx.restore()
      return
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility)

    this.drawMoonPhaseGlow(ctx, radius, phase, pal, alpha, tuning)

    ctx.beginPath()
    ctx.arc(0, 0, radius + 0.6, 0, Math.PI * 2)
    ctx.strokeStyle = pal.line + '0.35)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fillStyle = pal.dark + '0.94)'
    ctx.fill()
    ctx.strokeStyle = pal.line + '0.95)'
    ctx.lineWidth = 1.05 * tuning.lineMul
    ctx.stroke()

    if (phase > 0.04 && phase < 0.96) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, radius - 0.15, 0, Math.PI * 2)
      ctx.clip()
      const waxing = phase <= 0.5
      const t = waxing ? phase * 2 : (1 - phase) * 2
      const offset = (waxing ? 1 : -1) * (1 - t) * radius * 0.92
      ctx.beginPath()
      ctx.arc(offset, 0, radius, 0, Math.PI * 2)
      ctx.fillStyle = pal.lit + '0.98)'
      ctx.fill()
      ctx.restore()
    } else if (phase >= 0.96) {
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fillStyle = pal.lit + '1)'
      ctx.fill()
      const fl = radius * 2.8
      ctx.strokeStyle = pal.flare + `${0.55 + this.breathe * 0.3})`
      ctx.lineWidth = 0.75 * tuning.lineMul
      ctx.beginPath()
      ctx.moveTo(-fl, 0)
      ctx.lineTo(fl, 0)
      ctx.moveTo(0, -fl)
      ctx.lineTo(0, fl)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-fl * 0.7, -fl * 0.7)
      ctx.lineTo(fl * 0.7, fl * 0.7)
      ctx.moveTo(fl * 0.7, -fl * 0.7)
      ctx.lineTo(-fl * 0.7, fl * 0.7)
      ctx.stroke()
    }

    ctx.restore()
  }

  /** 淡化曲线：amount 0–1 */
  smoothFadeAmount(amount) {
    const t = Math.min(1, Math.max(0, amount))
    return t * t * (3 - 2 * t)
  }

  /**
   * 指针/线稿淡化统一入口。
   * fade 0 = 原透明度；fade 1 = 淡化至 minAlpha（默认 0 = 完全透明）。
   */
  applySpriteFadeAlpha(baseAlpha, fade = 0, options = {}) {
    const eased = this.smoothFadeAmount(fade)
    const minAlpha = options.minAlpha ?? 0
    const factor = 1 - eased * (1 - minAlpha)
    return Math.min(1, Math.max(0, baseAlpha * factor))
  }

  /** 方案 D · 指针线稿渐淡强度（0–1）；hover / click 可分别传入后取叠加 */
  getConstellationPointerFade(hoverDim = 0, clickDim = 0) {
    return Math.min(1, Math.max(hoverDim, clickDim))
  }

  /** 方案 D · 根据渐淡强度计算线稿最终透明度（悬停保留少量线稿） */
  constellationPointerAlpha(baseAlpha, fadeAmount, clickDim = 0) {
    const minAlpha = clickDim > 0.01 ? 0 : 0.32
    return this.applySpriteFadeAlpha(baseAlpha, fadeAmount, { minAlpha })
  }

  /** 方案 D · 精灵热点（Damselette 尖端 = mx/my） */
  getConstellationSpriteHotspot(cfg) {
    return {
      x: cfg.spriteHotX ?? 0.08,
      y: cfg.spriteHotY ?? 0.08,
    }
  }

  /** 方案 D · Columbina 线稿绘制原点（相对热点右下偏移，避免压住 Damselette） */
  getConstellationSpriteDrawPoint(cfg, x, y) {
    return {
      x: x + (cfg.spriteOffsetX ?? 14),
      y: y + (cfg.spriteOffsetY ?? 12),
    }
  }

  /** 方案 D · 线稿视觉中心（三月轨道圆心，等同原先居中指针时的中心） */
  getConstellationVisualCenter(cfg, hotX, hotY) {
    const maxPx = cfg.spriteMaxPx || 48
    const artW = COLUMBINA_LINE_ART.w || 1
    const artH = COLUMBINA_LINE_ART.h || 1
    const scale = maxPx / Math.max(artW, artH)
    const w = artW * scale
    const h = artH * scale
    const off = this.getConstellationSpriteDrawPoint(cfg, hotX, hotY)
    const hot = this.getConstellationSpriteHotspot(cfg)
    return {
      x: off.x + w * (0.5 - hot.x),
      y: off.y + h * (0.5 - hot.y),
    }
  }

  /** 方案 D · Damselette 拖尾落点（默认热点 ≈ 精灵左上 / 尖端） */
  getConstellationTrailAnchor(cfg, anchorX, anchorY, corner = 'hotspot') {
    const maxPx = cfg.anchorMaxPx || 20
    const artW = DAMSELETTE_ANCHOR.w || 1
    const artH = DAMSELETTE_ANCHOR.h || 1
    const scale = maxPx / Math.max(artW, artH)
    const w = artW * scale
    const h = artH * scale
    const hotX = cfg.anchorHotX ?? DAMSELETTE_ANCHOR.hotX ?? 0.06
    const hotY = cfg.anchorHotY ?? DAMSELETTE_ANCHOR.hotY ?? 0.06

    if (corner === 'bottomRight') {
      return { x: anchorX + w * (1 - hotX), y: anchorY + h * (1 - hotY) }
    }
    if (corner === 'topLeft') {
      return { x: anchorX - w * hotX, y: anchorY - h * hotY }
    }
    return { x: anchorX, y: anchorY }
  }

  moonSpawnEase(cfg, bornAt, now) {
    const ms = cfg.moonSpawnMs || 520
    const t = Math.min(1, Math.max(0, (now - bornAt) / ms))
    const ease = t * t * (3 - 2 * t)
    return 0.1 + ease * 0.9
  }

  /** 静憩态 · 月摇篮视觉中心（悬停三月圆心） */
  getRestVisualCenter(cfg, hotX, hotY) {
    const draw = this.getConstellationSpriteDrawPoint(cfg, hotX, hotY)
    const sleepMax = cfg.restSleepMaxPx ?? 54
    if (!SLEEP_LINE_ART.ready) return draw
    const hot = this.getConstellationSpriteHotspot(cfg)
    const sleepHotX = cfg.restSleepHotX ?? hot.x
    const sleepHotY = cfg.restSleepHotY ?? hot.y
    const scale = sleepMax / Math.max(SLEEP_LINE_ART.w, SLEEP_LINE_ART.h)
    const w = SLEEP_LINE_ART.w * scale
    const h = SLEEP_LINE_ART.h * scale
    return {
      x: draw.x + w * (0.5 - sleepHotX),
      y: draw.y + h * (0.5 - sleepHotY),
    }
  }

  /** 点击祈愿 · 绘制原点（与静憩态相同：sprite 偏移锚点 + 可选微调） */
  getClickWishDrawPoint(cfg, hotX, hotY) {
    const base = this.getConstellationSpriteDrawPoint(cfg, hotX, hotY)
    return {
      x: base.x + (cfg.wishOffsetX ?? 0),
      y: base.y + (cfg.wishOffsetY ?? 0),
    }
  }

  /** 点击祈愿 · 视觉中心（轨道圆心 / 原石散落中心） */
  getClickWishVisualCenter(cfg, hotX, hotY) {
    const draw = this.getClickWishDrawPoint(cfg, hotX, hotY)
    if (!WISH_CLICK_ART.ready) return draw
    const wishMax = cfg.wishMaxPx ?? 56
    const spriteHot = this.getConstellationSpriteHotspot(cfg)
    const wishHotX = cfg.wishHotX ?? spriteHot.x
    const wishHotY = cfg.wishHotY ?? spriteHot.y
    const scale = wishMax / Math.max(WISH_CLICK_ART.w, WISH_CLICK_ART.h)
    const w = WISH_CLICK_ART.w * scale
    const h = WISH_CLICK_ART.h * scale
    return {
      x: draw.x + w * (0.5 - wishHotX),
      y: draw.y + h * (0.5 - wishHotY),
    }
  }

  /**
   * 静憩态指针：左侧 sleep 月摇篮 + 右侧 Kuuhenki 推摇。
   * 月弯绕左上悬挂点摇；Kuu 在右下触点反相前推（推时月弯被顶起，而非被拉）。
   */
  drawRestPointer(ctx, drawX, drawY, cfg, theme, alpha, tuning, now) {
    if (!SLEEP_LINE_ART.ready || !KUUHENKI_LINE_ART.ready || alpha <= 0.01) return

    const pal = constellationPalette(theme)
    const sleepMax = cfg.restSleepMaxPx ?? 54
    const kuuMax = cfg.restKuuMaxPx ?? 20
    const hot = this.getConstellationSpriteHotspot(cfg)
    const sleepHotX = cfg.restSleepHotX ?? hot.x
    const sleepHotY = cfg.restSleepHotY ?? hot.y

    const sleepScale = sleepMax / Math.max(SLEEP_LINE_ART.w, SLEEP_LINE_ART.h)
    const sleepW = SLEEP_LINE_ART.w * sleepScale
    const sleepH = SLEEP_LINE_ART.h * sleepScale

    const hangPivotX = (cfg.restHangPivotX ?? 0.24) * sleepW
    const hangPivotY = (cfg.restHangPivotY ?? 0.22) * sleepH
    const hangLocalX = hangPivotX - sleepW * sleepHotX
    const hangLocalY = hangPivotY - sleepH * sleepHotY

    const contactLocalX = (cfg.restContactX ?? 0.8) * sleepW - sleepW * sleepHotX
    const contactLocalY = (cfg.restContactY ?? 0.91) * sleepH - sleepH * sleepHotY

    const omega = ((cfg.restRockHz ?? 0.72) * Math.PI * 2) / 1000
    const rock = Math.sin(now * omega)
    const rockAngle = this.reducedMotion ? 0 : rock * (cfg.restRockAmpRad ?? 0.075)
    /** 与月弯同相：Kuu 前推（向左）时 rock>0，月弯顺时针被顶起 */
    const pushPx = this.reducedMotion ? 0 : -rock * (cfg.restKuuPushPx ?? 5)

    const sleepSprite =
      theme === 'dark' ? SLEEP_LINE_ART.darkCanvas : SLEEP_LINE_ART.lightCanvas
    const kuuSprite =
      theme === 'dark' ? KUUHENKI_LINE_ART.darkCanvas : KUUHENKI_LINE_ART.lightCanvas

    this.drawRestMoonAmbience(
      ctx,
      drawX,
      drawY,
      sleepW,
      sleepH,
      sleepHotX,
      sleepHotY,
      alpha,
      tuning,
      pal,
      now,
      cfg,
    )

    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.translate(hangLocalX, hangLocalY)
    ctx.rotate(rockAngle)
    ctx.translate(-hangLocalX, -hangLocalY)
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility)
    ctx.drawImage(sleepSprite, -sleepW * sleepHotX, -sleepH * sleepHotY, sleepW, sleepH)
    ctx.restore()

    const kuuScale = kuuMax / Math.max(KUUHENKI_LINE_ART.w, KUUHENKI_LINE_ART.h)
    const kuuW = KUUHENKI_LINE_ART.w * kuuScale
    const kuuH = KUUHENKI_LINE_ART.h * kuuScale
    const kuuPivotX = kuuW * 0.22
    const kuuPivotY = kuuH * 0.82
    const kuuGap = cfg.restKuuGapPx ?? 2
    const kuuOffX = cfg.restKuuOffsetX ?? 0
    const kuuOffY = cfg.restKuuOffsetY ?? 16
    const kuuBobY = this.reducedMotion ? 0 : rock * 1.2

    ctx.save()
    ctx.translate(
      drawX + contactLocalX + kuuGap + kuuOffX + pushPx,
      drawY + contactLocalY + kuuOffY + kuuBobY,
    )
    ctx.rotate(this.reducedMotion ? 0 : -rock * (cfg.restKuuLeanRad ?? 0.12))
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility * 0.96)
    ctx.drawImage(kuuSprite, -kuuPivotX, -kuuPivotY, kuuW, kuuH)
    ctx.restore()
  }

  /** 方案 D · 点击位置指示（Damselette.svg，尖端 = 热点） */
  drawConstellationPointerAnchor(ctx, x, y, cfg, pal, theme, alpha, tuning) {
    const sprite =
      theme === 'dark' ? DAMSELETTE_ANCHOR.darkCanvas : DAMSELETTE_ANCHOR.lightCanvas
    if (!DAMSELETTE_ANCHOR.ready || !sprite) return

    const maxPx = cfg.anchorMaxPx || 20
    const scale = maxPx / Math.max(DAMSELETTE_ANCHOR.w, DAMSELETTE_ANCHOR.h)
    const w = DAMSELETTE_ANCHOR.w * scale
    const h = DAMSELETTE_ANCHOR.h * scale
    const hotX = cfg.anchorHotX ?? DAMSELETTE_ANCHOR.hotX ?? 0.06
    const hotY = cfg.anchorHotY ?? DAMSELETTE_ANCHOR.hotY ?? 0.06
    const hx = -w * hotX
    const hy = -h * hotY

    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility)
    ctx.drawImage(sprite, hx, hy, w, h)
    ctx.restore()
  }

  /** 方案 D · 点击祈愿：轨道圆 + wish.svg + Primogem 散落 */
  drawClickWishEffect(ctx, drawX, drawY, centerX, centerY, cfg, theme, vis, tuning, clickEffect, now) {
    const wishAlpha = clickEffect.wishAlpha ?? 0
    if (wishAlpha <= 0.01 && !this.clickPrimogems.length) return

    const orbitR = cfg.clickPrimogemOrbitR ?? 42
    const wishMaxPx = cfg.wishMaxPx ?? 56
    const spriteHot = this.getConstellationSpriteHotspot(cfg)
    const wishHotX = cfg.wishHotX ?? spriteHot.x
    const wishHotY = cfg.wishHotY ?? spriteHot.y

    if (wishAlpha > 0.04) {
      const orbitSprite = bakeWishOrbitSprite(
        theme,
        orbitR,
        cfg.clickOrbitDotCount ?? 10,
        cfg.clickOrbitDotR ?? 2.2,
      )
      const ringAlpha = wishAlpha * vis * tuning.visibility * 0.72
      const dotSpin = this.reducedMotion ? 0 : now * 0.00035
      if (orbitSprite) {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(dotSpin)
        ctx.globalAlpha = ringAlpha
        ctx.drawImage(
          orbitSprite.canvas,
          -orbitSprite.cx,
          -orbitSprite.cy,
          orbitSprite.size,
          orbitSprite.size,
        )
        ctx.restore()
      }
    }

    this.drawClickPrimogems(ctx, cfg, vis, tuning, now)

    if (wishAlpha > 0.01 && WISH_CLICK_ART.ready) {
      const sprite =
        theme === 'dark' ? WISH_CLICK_ART.darkCanvas : WISH_CLICK_ART.lightCanvas
      if (!sprite) return

      const breath = this.reducedMotion ? 1 : 1 + Math.sin(now * 0.0042) * 0.045 * wishAlpha
      const scale = (wishMaxPx / Math.max(WISH_CLICK_ART.w, WISH_CLICK_ART.h)) * breath
      const w = WISH_CLICK_ART.w * scale
      const h = WISH_CLICK_ART.h * scale
      const hx = -w * wishHotX
      const hy = -h * wishHotY

      ctx.save()
      ctx.translate(drawX, drawY)
      ctx.globalAlpha = Math.min(1, wishAlpha * vis * tuning.visibility)
      ctx.drawImage(sprite, hx, hy, w, h)
      ctx.restore()
    }
  }

  drawClickPrimogems(ctx, cfg, vis, tuning, now) {
    if (!this.clickPrimogems.length || !PRIMOGEM_SPRITES.length) return

    const maxPx = cfg.clickPrimogemMaxPx ?? 14
    for (const p of this.clickPrimogems) {
      if (now - p.born < p.delay) continue
      const art = PRIMOGEM_SPRITES[p.variant % PRIMOGEM_SPRITES.length]
      if (!art?.canvas) continue

      const alpha = p.life * vis * tuning.visibility
      if (alpha <= 0.02) continue

      const scale = (maxPx / Math.max(art.w, art.h)) * p.scale
      const w = art.w * scale
      const h = art.h * scale
      const hx = -w * art.hotX
      const hy = -h * art.hotY

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = alpha
      ctx.drawImage(art.canvas, hx, hy, w, h)
      ctx.restore()
    }
  }

  /** 透明底线稿光标：绘制在热点右下偏移处，不参与 moveAngle 旋转（防抽搐） */
  drawColumbinaSprite(ctx, x, y, cfg, pal, theme, alpha, tuning, hoverDim = 0, clickDim = 0) {
    // TODO（合入 frontend）：theme 应对齐站点日/夜模式，切换时选用 lightCanvas / darkCanvas
    const sprite =
      theme === 'dark' ? COLUMBINA_LINE_ART.darkCanvas : COLUMBINA_LINE_ART.lightCanvas
    const fade = this.getConstellationPointerFade(hoverDim, clickDim)
    if (!COLUMBINA_LINE_ART.ready || !sprite) {
      this.drawConstellationVectorCursor(ctx, x, y, pal, theme, alpha, tuning, hoverDim, clickDim)
      return
    }

    const maxPx = cfg.spriteMaxPx || 96
    const scale = maxPx / Math.max(COLUMBINA_LINE_ART.w, COLUMBINA_LINE_ART.h)
    const w = COLUMBINA_LINE_ART.w * scale
    const h = COLUMBINA_LINE_ART.h * scale
    const hot = this.getConstellationSpriteHotspot(cfg)
    const hx = -w * hot.x
    const hy = -h * hot.y
    const spriteAlpha = this.constellationPointerAlpha(alpha, fade, clickDim)

    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = spriteAlpha

    ctx.drawImage(sprite, hx, hy, w, h)
    ctx.restore()
  }

  /** 线稿未加载时的矢量后备光标 */
  drawConstellationVectorCursor(ctx, x, y, pal, theme, alpha, tuning, hoverDim = 0, clickDim = 0) {
    const fade = this.getConstellationPointerFade(hoverDim, clickDim)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(0.42 * tuning.coreMul, 0.42 * tuning.coreMul)
    ctx.globalAlpha = this.constellationPointerAlpha(alpha, fade, clickDim)
    ctx.strokeStyle = pal.line + `${theme === 'dark' ? 0.85 : 0.65})`
    ctx.lineWidth = 1.1 * tuning.lineMul
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(34, 0, 48, -Math.PI * 0.52, Math.PI * 0.52)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, -18, 10, 14, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, 28)
    ctx.bezierCurveTo(-12, 20, -12, 34, 0, 38)
    ctx.bezierCurveTo(12, 34, 12, 20, 0, 28)
    ctx.stroke()
    ctx.restore()
  }

  isConstellationMoving(cfg) {
    const idleMs = cfg.trailRetractMs || 180
    return performance.now() - this.lastMove <= idleMs && !this.constellationTailRetract
  }

  constellationHeadPhase() {
    return MOON_PHASE_CYCLE[this.phaseCounter % MOON_PHASE_CYCLE.length]
  }

  drawConstellationHoverOrbit(ctx, cx, cy, radius, moonPal, alpha, tuning, now) {
    const sprite = bakeHoverOrbitSprite(moonPal)
    if (!sprite) return

    const rot = this.reducedMotion ? 0 : now * 0.00135
    const scale = radius / sprite.refRadius
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility)
    ctx.drawImage(
      sprite.canvas,
      -sprite.cx * scale,
      -sprite.cy * scale,
      sprite.size * scale,
      sprite.size * scale,
    )
    ctx.restore()
  }

  drawConstellationHoverFullMoon(ctx, x, y, radius, moonPal, alpha, tuning) {
    const sprite = bakeHoverMoonSprite(moonPal)
    if (!sprite) return

    const scale = radius / sprite.refR
    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = Math.min(1, alpha * tuning.visibility)
    ctx.drawImage(
      sprite.canvas,
      -sprite.cx * scale,
      -sprite.cy * scale,
      sprite.size * scale,
      sprite.size * scale,
    )
    ctx.restore()
  }

  /** 虹/恒/霜三月同轨旋转；kind 决定 link / project 轨道尺度 */
  drawConstellationTripleMoonHover(ctx, x, y, phase, tuning, now, kind = 'link') {
    if (phase <= 0.01) return

    const preset = CONSTELLATION_HOVER_TUNING[kind] || CONSTELLATION_HOVER_TUNING.link
    const ease = phase * phase * (3 - 2 * phase)
    const baseOrbit = preset.orbitBase + ease * preset.orbitGrow
    const baseOmega = preset.omega
    const bands = [
      {
        pal: CONSTELLATION_HOVER_MOONS.rainbow,
        orbitMul: preset.rainbow.orbitMul,
        speedMul: preset.rainbow.speedMul,
        moonR: preset.rainbow.moonR + ease * preset.rainbow.moonGrow,
        angleOff: preset.rainbow.angleOff,
      },
      {
        pal: CONSTELLATION_HOVER_MOONS.eternal,
        orbitMul: preset.eternal.orbitMul,
        speedMul: preset.eternal.speedMul,
        moonR: preset.eternal.moonR + ease * preset.eternal.moonGrow,
        angleOff: preset.eternal.angleOff,
      },
      {
        pal: CONSTELLATION_HOVER_MOONS.frost,
        orbitMul: preset.frost.orbitMul,
        speedMul: preset.frost.speedMul,
        moonR: preset.frost.moonR + ease * preset.frost.moonGrow,
        angleOff: preset.frost.angleOff,
      },
    ]

    for (const band of bands) {
      const orbitR = baseOrbit * band.orbitMul
      this.drawConstellationHoverOrbit(ctx, x, y, orbitR, band.pal, ease, tuning, now)
    }

    for (let i = bands.length - 1; i >= 0; i--) {
      const band = bands[i]
      const orbitR = baseOrbit * band.orbitMul
      const ang = now * baseOmega * band.speedMul + band.angleOff
      const mx = x + Math.cos(ang) * orbitR
      const my = y + Math.sin(ang) * orbitR
      this.drawConstellationHoverFullMoon(ctx, mx, my, band.moonR, band.pal, ease, tuning)
    }
  }

  /** 方案 D · 文章 / 目录行悬停（内收月环） */
  drawConstellationHoverLink(ctx, x, y, phase, tuning, now) {
    this.drawConstellationTripleMoonHover(ctx, x, y, phase, tuning, now, 'link')
  }

  /** 方案 D · 项目卡悬停（外张霜月） */
  drawConstellationHoverProject(ctx, x, y, phase, tuning, now) {
    this.drawConstellationTripleMoonHover(ctx, x, y, phase, tuning, now, 'project')
  }

  drawConstellationFrame(ctx, cfg, theme, tuning) {
    const pal = constellationPalette(theme)
    const nodes = this.constellationNodes
    const vis = this.idleAlpha * cfg.trailAlpha * tuning.visibility
    const now = performance.now()
    const hotX = this.mx
    const hotY = this.my
    const moving = this.isConstellationMoving(cfg)
    const sx = this.smoothMx >= 0 ? this.smoothMx : hotX
    const sy = this.smoothMy >= 0 ? this.smoothMy : hotY
    const spriteAt = this.getConstellationSpriteDrawPoint(cfg, sx, sy)
    const restBlend = this.restBlend
    const normalCenter = this.getConstellationVisualCenter(cfg, sx, sy)
    const restCenter = this.getRestVisualCenter(cfg, sx, sy)
    const moonCenter = {
      x: normalCenter.x * (1 - restBlend) + restCenter.x * restBlend,
      y: normalCenter.y * (1 - restBlend) + restCenter.y * restBlend,
    }
    const trailAt = this.getConstellationTrailAnchor(cfg, sx, sy)

    if (hotX < 0 || hotY < 0) return

    for (const f of this.moonFeathers) {
      this.drawMoonFeather(ctx, f, pal, vis, tuning)
    }

    const moonBase = cfg.moonRadiusBase || 4
    const spawnNow = now
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const isTailZ = i === 0
      if (isTailZ && this.constellationTailRetract && this.constellationTailRetract.progress > 0.92) {
        continue
      }
      const t = (i + 1) / Math.max(nodes.length + (moving ? 1 : 0), 1)
      const r = moonBase + n.phase * 1.5 + t * 0.35
      const moonOpacity = cfg.trailMoonOpacity ?? 0.4
      let moonAlpha = moonOpacity * n.life * this.moonSpawnEase(cfg, n.t, spawnNow)
      if (isTailZ && this.constellationTailRetract) {
        moonAlpha *= Math.max(0, 1 - this.constellationTailRetract.progress)
      }
      if (moonAlpha <= 0.02) continue
      this.drawMoonPhaseNode(ctx, n.x, n.y, r, n.phase, pal, moonAlpha, tuning, n.rot || 0)
    }

    if (moving) {
      const headPhase = this.constellationHeadPhase()
      const headR = moonBase + headPhase * 1.5 + 0.35
      const headBorn = this.trailEmergenceT || spawnNow
      const moonOpacity = cfg.trailMoonOpacity ?? 0.4
      const headAlpha = moonOpacity * this.moonSpawnEase(cfg, headBorn, spawnNow)
      if (headAlpha > 0.02) {
        this.drawMoonPhaseNode(ctx, trailAt.x, trailAt.y, headR, headPhase, pal, headAlpha, tuning, this.headMoonRot)
      }
    }

    const hoverActive = this.hoverKind === 'link' || this.hoverKind === 'project'
    const hoverDim = hoverActive ? this.hoverPhase * (1 - restBlend * 0.9) : 0
    const clickDim = this.clickPulse
    const clickEffect = this.clickEffect
    const normalVis = vis * (1 - restBlend)
    const restVis = vis * restBlend
    const wishDraw = this.getClickWishDrawPoint(cfg, sx, sy)
    const wishCenter = this.getClickWishVisualCenter(cfg, sx, sy)
    const pointerFadeAlpha = (base) =>
      this.applySpriteFadeAlpha(base, clickDim, { minAlpha: 0 })

    if (normalVis > 0.01) {
      this.drawColumbinaSprite(
        ctx,
        spriteAt.x,
        spriteAt.y,
        cfg,
        pal,
        theme,
        normalVis,
        tuning,
        hoverDim,
        clickDim,
      )
      if (cfg.pointerAnchor !== false) {
        this.drawConstellationPointerAnchor(
          ctx,
          sx,
          sy,
          cfg,
          pal,
          theme,
          pointerFadeAlpha(normalVis),
          tuning,
        )
      }
    }

    if (restVis > 0.01) {
      this.drawRestPointer(
        ctx,
        spriteAt.x,
        spriteAt.y,
        cfg,
        theme,
        pointerFadeAlpha(restVis),
        tuning,
        now,
      )
    }

    if (clickEffect.active) {
      if (
        clickEffect.wishAlpha > 0.08 &&
        !this._primogemsSpawnedThisClick &&
        PRIMOGEM_SPRITES.length
      ) {
        this._primogemsSpawnedThisClick = true
        this.spawnClickPrimogems(wishCenter.x, wishCenter.y, cfg, now)
      }
      this.drawClickWishEffect(
        ctx,
        wishDraw.x,
        wishDraw.y,
        wishCenter.x,
        wishCenter.y,
        cfg,
        theme,
        vis,
        tuning,
        clickEffect,
        now,
      )
    }

    if (this.hoverPhase > 0.01) {
      if (this.hoverKind === 'link') {
        this.drawConstellationHoverLink(ctx, moonCenter.x, moonCenter.y, this.hoverPhase, tuning, now)
      } else if (this.hoverKind === 'project') {
        this.drawConstellationHoverProject(ctx, moonCenter.x, moonCenter.y, this.hoverPhase, tuning, now)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const cfg = this.getConfig()
    const theme = this.getTheme()
    const tuning = tuningFor(theme)

    ctx.clearRect(0, 0, this.width, this.height)
    this.drawConstellationFrame(ctx, cfg, theme, tuning)
  }
}

function initPreview() {
  const canvas = document.getElementById('cursor-canvas')
  if (!canvas) return

  const getConfig = () => SCHEMES.d
  const getTheme = () => (document.documentElement.dataset.previewTheme === 'dark' ? 'dark' : 'light')

  const engine = new MoonlitCursorEngine(canvas, getConfig, getTheme)
  engine.start()

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('on'))
      btn.classList.add('on')
      document.documentElement.dataset.previewTheme = btn.dataset.theme
      engine.prewarmConstellationAssets()
      engine.wakeLoop()
    })
  })
}

initPreview()
