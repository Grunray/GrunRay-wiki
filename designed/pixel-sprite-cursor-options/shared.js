/**
 * Pixel Companion · 方案 A / B / C / D
 * D = 哥伦比娅 · 像素三月伴侣：融合惯性伴随 + 形态 Morph + 交互层
 * 移动 → 散成虹月 / 恒月 / 霜月；点击 → 像素羽毛；热点仍是鼠标坐标。
 */
(() => {
  const SPRITE_SRC = './sprite@3x.png'
  const HOTSPOT = 3
  const SPRITE_SIZE = 48
  const LAG = 0.14
  const IDLE_MS = 900
  const PALETTE = [
    { r: 42, g: 42, b: 46 },
    { r: 196, g: 90, b: 138 },
    { r: 200, g: 200, b: 204 },
    { r: 90, g: 90, b: 98 },
  ]

  /** 三月：公转角速度 3:2:1；显示直径 1:3:2；内→外 虹/霜/恒 轨道 */
  const MOON_META = [
    {
      id: 'rainbow',
      label: '虹月',
      src: './assets/moon-rainbow@3x.png',
      lag: 0.2,
      orbit: 16,
      speed: 3,
      diam: 1,
      /** 烘焙画布 / 月体逻辑尺寸，用于校正显示直径 */
      fit: 18 / 10,
      angle0: 0,
    },
    {
      id: 'frost',
      label: '霜月',
      src: './assets/moon-frost@3x.png',
      lag: 0.14,
      orbit: 24,
      speed: 1,
      diam: 2,
      fit: 28 / 20,
      angle0: (Math.PI * 2) / 3,
    },
    {
      id: 'eternal',
      label: '恒月',
      src: './assets/moon-eternal@3x.png',
      lag: 0.11,
      orbit: 34,
      speed: 2,
      diam: 3,
      fit: 32 / 30,
      angle0: (Math.PI * 4) / 3,
    },
  ]

  const FEATHER_SRCS = [
    './assets/feather-0a@2x.png',
    './assets/feather-0b@2x.png',
    './assets/feather-0c@2x.png',
    './assets/feather-1a@2x.png',
    './assets/feather-1b@2x.png',
    './assets/feather-1c@2x.png',
    './assets/feather-2a@2x.png',
    './assets/feather-2b@2x.png',
    './assets/feather-2c@2x.png',
  ]

  /** 公转基准：霜月一圈的角速度（rad / ms）；虹月×3、恒月×2 */
  const ORBIT_OMEGA = 0.00105
  /** 三月月体显示基准直径（px），再乘 diam；整体偏小 */
  const MOON_BASE_DIAM = 7

  /** @type {'a'|'b'|'c'|'d'} */
  let scheme = 'd'
  /** @type {HTMLImageElement | null} */
  let spriteReady = null
  /** @type {Record<string, HTMLImageElement>} */
  const moonImgs = {}
  /** @type {HTMLImageElement[]} */
  const featherImgs = []

  let mouseX = innerWidth * 0.55
  let mouseY = innerHeight * 0.4
  let spriteX = mouseX
  let spriteY = mouseY
  let lastMove = performance.now()
  let speed = 0
  let breath = 0
  let state = 'default'
  let clickBurst = null
  /** 方案 D：形态混合 0=完整角色，1=完全散成三月 */
  let morph = 0
  let morphPinUntil = 0
  let orbitPhase = 0

  /** @type {{x:number,y:number,life:number,vx:number,vy:number,c:{r:number,g:number,b:number},s:number}[]} */
  let particles = []
  /** @type {{x:number,y:number,life:number,c:{r:number,g:number,b:number}}[]} */
  let trail = []
  /** @type {{x:number,y:number,vx:number,vy:number,rot:number,vr:number,life:number,img:HTMLImageElement,scale:number}[]} */
  let feathers = []
  /** 三月各自跟随点 */
  const moonPos = MOON_META.map(() => ({ x: mouseX, y: mouseY }))

  const layer = document.getElementById('cursor-layer')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: true })
  layer.appendChild(canvas)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(innerWidth * dpr)
    canvas.height = Math.floor(innerHeight * dpr)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  async function loadAll() {
    spriteReady = await loadImage(SPRITE_SRC).catch(() => loadImage('./sprite.png'))
    await Promise.all(
      MOON_META.map(async (m) => {
        moonImgs[m.id] = await loadImage(m.src)
      }),
    )
    const loaded = await Promise.all(FEATHER_SRCS.map((s) => loadImage(s).catch(() => null)))
    for (const img of loaded) if (img) featherImgs.push(img)
  }

  function setScheme(next) {
    scheme = next
    particles = []
    trail = []
    feathers = []
    clickBurst = null
    morph = 0
    document.querySelectorAll('.scheme-btn').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.scheme === next)
    })
    document.querySelectorAll('.scheme-panel').forEach((panel) => {
      panel.classList.toggle('on', panel.dataset.scheme === next)
    })
  }

  function hitKind(target) {
    if (!(target instanceof Element)) return 'default'
    if (target.closest('input, textarea, [contenteditable="true"]')) return 'text'
    if (target.closest('a, button, .project-card, [data-cursor="hover"]')) return 'hover'
    return 'default'
  }

  function spawnTrail(x, y, n = 2) {
    for (let i = 0; i < n; i++) {
      const c = PALETTE[(Math.random() * PALETTE.length) | 0]
      trail.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        life: 1,
        c,
      })
    }
  }

  function spawnMorphBurst(x, y, amount = 18) {
    for (let i = 0; i < amount; i++) {
      const c = PALETTE[(Math.random() * PALETTE.length) | 0]
      const ang = Math.random() * Math.PI * 2
      const sp = 0.4 + Math.random() * 2.2
      particles.push({
        x,
        y,
        life: 0.7 + Math.random() * 0.5,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        c,
        s: 2 + ((Math.random() * 3) | 0),
      })
    }
  }

  function spawnFeathers(x, y, amount = 10) {
    if (!featherImgs.length) return
    for (let i = 0; i < amount; i++) {
      const ang = -Math.PI * 0.75 + (Math.PI * 1.5 * i) / Math.max(1, amount - 1)
      const jitter = (Math.random() - 0.5) * 0.5
      const sp = 0.7 + Math.random() * 1.8
      const step = Math.PI / 4
      feathers.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(ang + jitter) * sp,
        vy: Math.sin(ang + jitter) * sp * 0.55 - 1.1 - Math.random() * 0.7,
        rot: ((Math.random() * 8) | 0) * step,
        vr: (((Math.random() * 3) | 0) - 1) * step,
        life: 1.15 + Math.random() * 0.5,
        img: featherImgs[(Math.random() * featherImgs.length) | 0],
        scale: 1.05 + Math.random() * 0.55,
        flutter: Math.random() * Math.PI * 2,
        drift: 0.35 + Math.random() * 0.55,
      })
    }
  }

  function spawnClickBurst(x, y) {
    clickBurst = { x, y, t: 0 }
    if (scheme === 'd') {
      spawnFeathers(x, y, 12)
      morph = Math.min(1, morph + 0.35)
    } else {
      spawnMorphBurst(x, y, scheme === 'c' ? 22 : 14)
    }
  }

  /** 隐隐显示的像素轨道（点虚线椭圆） */
  function drawOrbitRing(cx, cy, rx, ry, alpha) {
    if (alpha < 0.03) return
    ctx.fillStyle = `rgb(180 200 230 / ${alpha})`
    const steps = Math.max(24, Math.round((rx + ry) * 0.9))
    for (let i = 0; i < steps; i++) {
      if (i % 2 !== 0) continue
      const a = (Math.PI * 2 * i) / steps
      const x = Math.round(cx + Math.cos(a) * rx)
      const y = Math.round(cy + Math.sin(a) * ry)
      ctx.fillRect(x, y, 1, 1)
    }
  }

  function drawHotspot(x, y, scale = 1, accent = false) {
    const s = HOTSPOT * scale
    ctx.fillStyle = '#2a2a2e'
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s)
    if (accent) {
      ctx.fillStyle = '#c45a8a'
      ctx.fillRect(Math.round(x + s), Math.round(y - s / 2), s, s)
    }
  }

  function drawSprite(img, x, y, opts = {}) {
    const size = opts.size ?? SPRITE_SIZE
    const alpha = opts.alpha ?? 1
    const rot = opts.rot ?? 0
    const ox = opts.ox ?? 18
    const oy = opts.oy ?? 22
    if (alpha <= 0.02) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.imageSmoothingEnabled = false
    ctx.translate(x + ox, y + oy)
    if (rot) ctx.rotate(rot)
    const bw = opts.breathe ? 1 + Math.sin(breath) * 0.03 : 1
    ctx.scale(bw, bw)
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
    ctx.restore()
  }

  function drawPixelImage(img, x, y, size, alpha = 1, rot = 0) {
    if (!img || alpha <= 0.02) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.imageSmoothingEnabled = false
    ctx.translate(Math.round(x), Math.round(y))
    if (rot) ctx.rotate(rot)
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
    ctx.restore()
  }

  /** 方案 A */
  function drawSchemeA(img, moving, idle) {
    drawHotspot(mouseX, mouseY, state === 'hover' ? 1.15 : 1)
    const rot = moving ? Math.atan2(mouseY - spriteY, mouseX - spriteX) * 0.08 : Math.sin(breath) * 0.04
    drawSprite(img, spriteX, spriteY, {
      ox: 16,
      oy: 20,
      alpha: moving ? 0.92 : 1,
      rot,
      breathe: idle,
      size: state === 'hover' ? 50 : 44,
    })
  }

  /** 方案 B */
  function drawSchemeB(img, moving, idle) {
    drawHotspot(mouseX, mouseY)
    const reform = idle ? 1 : moving ? Math.max(0.15, 1 - Math.min(speed / 28, 0.85)) : 0.55
    if (moving && speed > 4 && Math.random() < 0.35) spawnMorphBurst(spriteX + 16, spriteY + 18, 2)
    for (const p of particles) {
      ctx.fillStyle = `rgb(${p.c.r} ${p.c.g} ${p.c.b} / ${Math.max(0, p.life)})`
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s)
    }
    if (reform > 0.2) {
      const jitter = (1 - reform) * 5
      drawSprite(img, spriteX + (Math.random() - 0.5) * jitter, spriteY + (Math.random() - 0.5) * jitter, {
        ox: 16,
        oy: 20,
        alpha: 0.55 + reform * 0.45,
        size: 40 + reform * 6,
        breathe: idle,
      })
    } else {
      for (let i = 0; i < 8; i++) {
        const c = PALETTE[i % PALETTE.length]
        ctx.fillStyle = `rgb(${c.r} ${c.g} ${c.b} / 0.75)`
        ctx.fillRect(
          Math.round(spriteX + 10 + (i % 4) * 5 + Math.sin(breath + i) * 2),
          Math.round(spriteY + 12 + ((i / 4) | 0) * 6),
          3,
          3,
        )
      }
    }
  }

  /** 方案 C */
  function drawSchemeC(img, moving, idle) {
    for (const t of trail) {
      ctx.fillStyle = `rgb(${t.c.r} ${t.c.g} ${t.c.b} / ${t.life * 0.55})`
      ctx.fillRect(Math.round(t.x), Math.round(t.y), 3, 3)
    }
    for (const p of particles) {
      ctx.fillStyle = `rgb(${p.c.r} ${p.c.g} ${p.c.b} / ${Math.max(0, p.life)})`
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s)
    }
    if (state === 'text') {
      ctx.fillStyle = '#2a2a2e'
      ctx.fillRect(Math.round(mouseX), Math.round(mouseY - 8), 2, 16)
      ctx.fillRect(Math.round(mouseX - 2), Math.round(mouseY - 8), 6, 2)
      ctx.fillRect(Math.round(mouseX - 2), Math.round(mouseY + 6), 6, 2)
      drawSprite(img, spriteX, spriteY, { ox: 22, oy: 26, alpha: 0.35, size: 32 })
      return
    }
    drawHotspot(mouseX, mouseY, state === 'hover' ? 1.25 : 1, state === 'hover')
    const look =
      state === 'hover'
        ? Math.atan2(mouseY - spriteY, mouseX - spriteX) * 0.2
        : moving
          ? Math.atan2(mouseY - spriteY, mouseX - spriteX) * 0.1
          : Math.sin(breath) * 0.05
    drawSprite(img, spriteX, spriteY, {
      ox: 18,
      oy: 22,
      alpha: moving ? 0.9 : 1,
      rot: look,
      size: state === 'hover' ? 52 : moving ? 42 : 46,
      breathe: idle && state === 'default',
    })
    if (clickBurst) {
      const t = clickBurst.t
      const r = 6 + t * 28
      ctx.strokeStyle = `rgb(196 90 138 / ${Math.max(0, 1 - t)})`
      ctx.lineWidth = 2
      ctx.strokeRect(Math.round(clickBurst.x - r / 2), Math.round(clickBurst.y - r / 2), Math.round(r), Math.round(r))
    }
  }

  /**
   * 方案 D · 哥伦比娅像素伴侣
   * 移动散成虹月·恒月·霜月；悬停公转（3:2:1）+ 隐轨道；点击淡蓝白羽毛
   * 角色：无呼吸、移动无偏转
   */
  function drawSchemeD(img, moving, idle, dt) {
    const hover = state === 'hover'
    const isText = state === 'text'

    const pinned = performance.now() < morphPinUntil
    const targetMorph = pinned
      ? morph
      : isText
        ? 0.15
        : moving || (clickBurst && clickBurst.t < 0.45)
          ? Math.min(1, 0.5 + Math.min(speed / 14, 0.5))
          : hover
            ? 0.55
            : 0
    if (!pinned) morph += (targetMorph - morph) * (targetMorph > morph ? 0.08 : 0.05)

    // 公转：角速度基准 × speed（虹3 / 恒2 / 霜1）
    if (hover || morph > 0.25) orbitPhase += dt * ORBIT_OMEGA

    const baseX = spriteX + 18
    const baseY = spriteY + 20
    const orbitScale = 0.88 + morph * 0.28

    for (let i = 0; i < MOON_META.length; i++) {
      const m = MOON_META[i]
      const p = moonPos[i]
      let tx
      let ty
    // 悬停公转时不锁死 pin，避免三月叠在一起
    if (pinned && !(hover && morph > 0.2)) {
        const back = Math.PI
        const spread = -0.7 + i * 0.7
        const dist = 18 + m.orbit * 0.55
        tx = mouseX + Math.cos(back + spread) * dist
        ty = mouseY + Math.sin(back + spread) * dist
        p.x = tx
        p.y = ty
        continue
      }
      if (hover && morph > 0.2) {
        const ang = orbitPhase * m.speed + m.angle0
        const rad = m.orbit * orbitScale
        tx = baseX + Math.cos(ang) * rad
        ty = baseY + Math.sin(ang) * rad * 0.7
      } else if (morph > 0.15) {
        const back = Math.atan2(spriteY - mouseY, spriteX - mouseX) || Math.PI
        const spread = (-0.7 + i * 0.7) * morph
        const dist = (14 + m.orbit * 0.65) * morph
        tx = mouseX + Math.cos(back + spread) * dist
        ty = mouseY + Math.sin(back + spread) * dist
      } else {
        tx = baseX + Math.cos(m.angle0) * 1.5
        ty = baseY + Math.sin(m.angle0) * 1.5
      }
      p.x += (tx - p.x) * m.lag
      p.y += (ty - p.y) * m.lag
    }

    if (morph > 0.45 && moving && speed > 8 && Math.random() < 0.18) {
      const m = moonPos[(Math.random() * 3) | 0]
      const pal =
        Math.random() < 0.33
          ? { r: 255, g: 120, b: 130 }
          : Math.random() < 0.5
            ? { r: 255, g: 200, b: 80 }
            : { r: 150, g: 200, b: 255 }
      trail.push({
        x: m.x + (Math.random() - 0.5) * 4,
        y: m.y + (Math.random() - 0.5) * 4,
        life: 0.7,
        c: pal,
      })
    }

    for (const t of trail) {
      ctx.fillStyle = `rgb(${t.c.r} ${t.c.g} ${t.c.b} / ${t.life * 0.5})`
      ctx.fillRect(Math.round(t.x), Math.round(t.y), 2, 2)
    }

    if (isText) {
      ctx.fillStyle = '#2a2a2e'
      ctx.fillRect(Math.round(mouseX), Math.round(mouseY - 8), 2, 16)
      ctx.fillRect(Math.round(mouseX - 2), Math.round(mouseY - 8), 6, 2)
      ctx.fillRect(Math.round(mouseX - 2), Math.round(mouseY + 6), 6, 2)
      drawSprite(img, spriteX, spriteY, { ox: 22, oy: 26, alpha: 0.28, size: 30, rot: 0, breathe: false })
      return
    }

    drawHotspot(mouseX, mouseY, hover ? 1.2 : 1, hover)

    // 隐轨道（悬停或三月显现时）
    const ringA = Math.min(0.32, morph * 0.36) * (hover ? 1 : 0.5)
    if (ringA > 0.04) {
      for (const m of MOON_META) {
        const rad = m.orbit * orbitScale
        drawOrbitRing(baseX, baseY, rad, rad * 0.7, ringA * (0.5 + m.diam * 0.1))
      }
    }

    const moonAlpha = Math.min(1, morph * 1.15)
    if (moonAlpha > 0.05) {
      for (let i = 0; i < MOON_META.length; i++) {
        const m = MOON_META[i]
        const p = moonPos[i]
        const imgM = moonImgs[m.id]
        // size 指整张贴图；用 fit 校正后，月体直径 ≈ BASE * diam
        const size = Math.max(8, Math.round(MOON_BASE_DIAM * m.diam * m.fit * (hover ? 1.04 : 1)))
        drawPixelImage(imgM, p.x, p.y, size, moonAlpha * 0.95, 0)
      }
    }

    const bodyAlpha = Math.max(0, 1 - morph * 1.05)
    if (bodyAlpha > 0.04) {
      drawSprite(img, spriteX, spriteY, {
        ox: 18,
        oy: 22,
        alpha: bodyAlpha * (moving ? 0.94 : 1),
        rot: 0,
        size: hover ? 50 : 46,
        breathe: false,
      })
    }

    // 羽毛画在最上层，避免被角色/三月盖住；45° 步进保持像素轮廓
    for (const f of feathers) {
      const snap = Math.round(f.rot / (Math.PI / 4)) * (Math.PI / 4)
      const sz = Math.round(18 * f.scale)
      const a = Math.min(1, Math.max(0, f.life))
      drawPixelImage(f.img, Math.round(f.x), Math.round(f.y), sz, a, snap)
    }

    if (clickBurst) {
      const t = clickBurst.t
      const r = 8 + t * 22
      ctx.strokeStyle = `rgb(200 220 240 / ${Math.max(0, 0.7 - t)})`
      ctx.lineWidth = 2
      ctx.imageSmoothingEnabled = false
      const x0 = Math.round(clickBurst.x - r / 2)
      const y0 = Math.round(clickBurst.y - r / 2)
      const s = Math.round(r)
      ctx.strokeRect(x0, y0, s, s)
    }
  }

  function tick(now) {
    const dt = Math.min(32, now - (tick._t || now))
    tick._t = now
    breath += dt * 0.004

    const dx = mouseX - spriteX
    const dy = mouseY - spriteY
    const dist = Math.hypot(dx, dy)
    speed = dist

    const lag = scheme === 'b' ? 0.2 : scheme === 'd' ? 0.16 : LAG
    spriteX += dx * lag
    spriteY += dy * lag

    const moving = dist > 2.2 || now - lastMove < 140
    const idle = !moving && now - lastMove > IDLE_MS
    if (moving && state !== 'text' && state !== 'click') state = state === 'hover' ? 'hover' : 'move'
    if (idle && state === 'move') state = 'default'

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.96
      p.vy *= 0.96
      p.life -= dt * 0.0018
    }
    particles = particles.filter((p) => p.life > 0)

    if ((scheme === 'c' || scheme === 'd') && moving && speed > 6 && scheme === 'c') {
      spawnTrail(spriteX + 14, spriteY + 16, speed > 18 ? 3 : 1)
    }
    for (const t of trail) t.life -= dt * 0.0024
    trail = trail.filter((t) => t.life > 0)

    for (const f of feathers) {
      f.flutter += dt * 0.007
      f.x += f.vx + Math.sin(f.flutter) * f.drift
      f.y += f.vy
      f.vx *= 0.986
      f.vy = f.vy * 0.99 + 0.022
      // 旋转偶发步进，避免平滑自旋糊掉像素感
      if (Math.random() < 0.04) f.rot += f.vr
      f.life -= dt * 0.00115
    }
    feathers = feathers.filter((f) => f.life > 0)

    if (clickBurst) {
      clickBurst.t += dt * 0.0028
      if (clickBurst.t > 1) {
        clickBurst = null
        if (state === 'click') state = hitKind(document.elementFromPoint(mouseX, mouseY))
      }
    }

    ctx.clearRect(0, 0, innerWidth, innerHeight)
    if (spriteReady) {
      if (scheme === 'a') drawSchemeA(spriteReady, moving, idle)
      else if (scheme === 'b') drawSchemeB(spriteReady, moving, idle)
      else if (scheme === 'c') drawSchemeC(spriteReady, moving, idle)
      else drawSchemeD(spriteReady, moving, idle, dt)
    }

    requestAnimationFrame(tick)
  }

  function onPointerMove(e) {
    if (!e.isPrimary) return
    mouseX = e.clientX
    mouseY = e.clientY
    lastMove = performance.now()
    const k = hitKind(e.target)
    if (state !== 'click') state = k
  }

  function onPointerOver(e) {
    if (state !== 'click') state = hitKind(e.target)
  }

  function onPointerDown(e) {
    if (!e.isPrimary) return
    // 方案切换条保留系统手感：不触发羽毛（仍在 cursor-active 下被隐藏，但避免误触）
    if (e.target instanceof Element && e.target.closest('.preview-switcher')) return
    if (hitKind(e.target) === 'text') return
    state = 'click'
    spawnClickBurst(e.clientX, e.clientY)
  }

  document.querySelectorAll('.scheme-btn').forEach((btn) => {
    btn.addEventListener('click', () => setScheme(btn.dataset.scheme))
  })

  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerover', onPointerOver, { passive: true })
  window.addEventListener('pointerdown', onPointerDown)

  resize()
  document.body.classList.add('cursor-active')
  setScheme('d')
  loadAll()
    .then(() => requestAnimationFrame(tick))
    .catch((err) => {
      console.error('assets load failed', err)
      requestAnimationFrame(tick)
    })

  /** 预览/截图驱动（仅原型） */
  window.__pixelCompanionDebug = {
    moveTo(x, y) {
      mouseX = x
      mouseY = y
      lastMove = performance.now()
      if (state !== 'click') state = 'move'
    },
    hoverAt(x, y) {
      mouseX = x
      mouseY = y
      lastMove = performance.now()
      state = 'hover'
      morph = Math.max(morph, 0.45)
    },
    clickAt(x, y) {
      mouseX = x
      mouseY = y
      state = 'click'
      spawnClickBurst(x, y)
    },
    idleAt(x, y) {
      mouseX = x
      mouseY = y
      spriteX = x - 8
      spriteY = y - 6
      lastMove = performance.now() - IDLE_MS - 50
      state = 'default'
      morph = 0
    },
    forceMorph(v, holdMs = 2500) {
      morph = Math.max(0, Math.min(1, v))
      morphPinUntil = performance.now() + holdMs
      state = 'move'
      lastMove = performance.now()
      const back = Math.PI
      for (let i = 0; i < MOON_META.length; i++) {
        const spread = -0.7 + i * 0.7
        const dist = 22 + i * 16
        moonPos[i].x = mouseX + Math.cos(back + spread) * dist
        moonPos[i].y = mouseY + Math.sin(back + spread) * dist
      }
    },
    getMorph: () => morph,
    assetStatus: () => ({
      sprite: !!(spriteReady && spriteReady.complete),
      moons: MOON_META.map((m) => ({
        id: m.id,
        ok: !!(moonImgs[m.id] && moonImgs[m.id].complete && moonImgs[m.id].naturalWidth > 0),
      })),
      feathers: featherImgs.length,
      moonPos: moonPos.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
    }),
  }
})()
