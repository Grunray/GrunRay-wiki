// @ts-nocheck — rest/wish sprite baking, ported from designed/moonlit-cursor-options/shared.js

const REST_GLOW_SPRITE_CACHE = new Map()
const REST_GALAXY_SPRITE_CACHE = new Map()
const WISH_ORBIT_SPRITE_CACHE = new Map()

function makeOffscreenCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w))
  canvas.height = Math.max(1, Math.ceil(h))
  const ctx = canvas.getContext('2d')
  return ctx ? { canvas, ctx } : null
}

export function bakeRestGlowSprite(pal, theme, sleepW, sleepH, cfg) {
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

export function bakeRestGalaxySprites(pal, theme) {
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

export function bakeWishOrbitSprite(theme, orbitR, dotCount, dotR) {
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

export function bakePrimogemWithGlow(art) {
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
