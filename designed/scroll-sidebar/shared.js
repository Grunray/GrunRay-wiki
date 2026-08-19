/* 106-2 详情滚动侧栏 · GSAP scrub + 收满时 DOM 落位 */
(function () {
  'use strict'

  const schemes = ['flip', 'fold', 'stack', 'ghost']
  let scheme = 'flip'

  const detail = document.querySelector('[data-detail]')
  const foldZone = document.querySelector('[data-fold-zone]')
  const bodyZone = document.querySelector('[data-body-zone]')
  const rail = document.querySelector('[data-sidebar-rail]')
  const spine = document.querySelector('[data-sidebar-spine]')
  const card = document.querySelector('[data-sidebar-card]')
  const slotsHost = document.querySelector('[data-sidebar-slots]')
  const hint = document.querySelector('[data-demo-hint]')

  if (!detail || !foldZone || !bodyZone || !rail || !card || !slotsHost) return
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[scroll-sidebar] GSAP / ScrollTrigger 未加载')
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const blocks = Array.from(foldZone.querySelectorAll('[data-fold-block]'))
  const slotByBlock = new Map()

  let ghost = null
  let slotLayouts = []
  let scrollTrigger = null
  let parked = false
  let lastProgress = 0

  const PARK_THRESHOLD = 0.9
  const FLY_THRESHOLD = 0.02
  let foldClearScroll = 0

  function sidebarShiftRem() {
    if (!window.matchMedia('(min-width: 1100px)').matches) return 0
    const root = getComputedStyle(document.documentElement)
    const w = parseFloat(root.getPropertyValue('--sidebar-width')) || 15.5
    const g = parseFloat(root.getPropertyValue('--sidebar-gap')) || 1.5
    return w + g
  }

  function buildSlots() {
    slotsHost.innerHTML = ''
    slotByBlock.clear()
    blocks.forEach((b, i) => {
      const slot = document.createElement('div')
      slot.className = 'side-slot'
      slot.dataset.slotIndex = String(i)
      slotsHost.appendChild(slot)
      slotByBlock.set(b, slot)
    })
  }

  function setHint(text, active) {
    if (!hint) return
    hint.textContent = text
    hint.classList.toggle('is-active', !!active)
  }

  function clearBlockMotion(el) {
    gsap.set(el, { clearProps: 'all' })
  }

  function ensureBlocksInFoldZone() {
    blocks.forEach((b) => {
      if (b.parentElement !== foldZone) foldZone.appendChild(b)
      clearBlockMotion(b)
    })
  }

  function showRailForMeasure() {
    gsap.set(rail, { opacity: 1, x: 0, y: 0 })
    gsap.set(card, { scale: 1, rotateY: 0 })
    if (spine) gsap.set(spine, { scaleY: 1 })
  }

  /** 页首量一次侧栏自然流坐标（滚动中 rail 为 fixed，坐标稳定） */
  function captureSlotLayouts() {
    showRailForMeasure()
    blocks.forEach((b) => {
      clearBlockMotion(b)
      slotByBlock.get(b)?.appendChild(b)
    })
    const layouts = blocks.map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    })
    blocks.forEach((b) => foldZone.appendChild(b))
    return layouts
  }

  function measureHomeFromGhost() {
    if (!ghost) {
      return blocks.map((el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, top: r.top, width: r.width, height: r.height }
      })
    }
    const ghostBlocks = ghost.querySelectorAll('[data-ghost-block]')
    return blocks.map((_, i) => {
      const node = ghostBlocks[i]
      if (!node) return { left: 0, top: 0, width: 0, height: 0 }
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    })
  }

  function mountGhost() {
    if (ghost) return
    ghost = foldZone.cloneNode(true)
    ghost.classList.add('fold-ghost')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.querySelectorAll('[data-fold-block]').forEach((n) => {
      n.setAttribute('data-ghost-block', '')
      n.removeAttribute('data-fold-block')
    })
    foldZone.parentNode.insertBefore(ghost, foldZone)
  }

  function unmountGhost() {
    ghost?.remove()
    ghost = null
  }

  function parkBlocks() {
    if (parked) return
    const holdH = foldZone.offsetHeight
    if (holdH > 0) foldZone.style.minHeight = `${holdH}px`
    blocks.forEach((b) => {
      clearBlockMotion(b)
      slotByBlock.get(b)?.appendChild(b)
    })
    parked = true
    rail.classList.add('is-parked')
  }

  function unparkBlocks() {
    if (!parked) return
    blocks.forEach((b) => {
      clearBlockMotion(b)
      document.body.appendChild(b)
    })
    parked = false
    rail.classList.remove('is-parked')
  }

  function blockProgress(globalP, index) {
    if (scheme !== 'stack') return globalP
    const lead = index * 0.11
    return gsap.utils.clamp(0, 1, (globalP - lead) / (1 - lead * 0.85))
  }

  function eased(p) {
    return gsap.parseEase('power2.inOut')(p)
  }

  function updateShell(p) {
    const shiftRem = sidebarShiftRem() * p
    gsap.set(rail, {
      opacity: p,
      x: (1 - p) * -22,
      y: (1 - p) * 14,
    })
    rail.classList.toggle('is-interactive', p > 0.72)
    if (spine) gsap.set(spine, { scaleY: gsap.utils.clamp(0, 1, (p - 0.06) / 0.94) })
    gsap.set(card, {
      scale: parked ? 1 : 0.955 + p * 0.045,
      rotateY: scheme === 'fold' && !parked ? (1 - p) * -5 : 0,
    })
    gsap.set(bodyZone, { marginLeft: `${shiftRem}rem` })
    detail.classList.toggle('is-folded', p > 0.85)
  }

  function setFoldZoneVisual(p) {
    if (scheme === 'fold') {
      const clipPct = (1 - p) * 100
      gsap.set(foldZone, {
        clipPath: `inset(0 0 ${clipPct}% 0)`,
        rotateX: (1 - p) * -7,
        opacity: parked ? 0 : 0.9 + p * 0.1,
      })
    } else {
      gsap.set(foldZone, {
        opacity: parked ? 0 : 1 - p * 0.28,
        clipPath: 'none',
        rotateX: 0,
      })
    }
  }

  /** 飞行阶段：只平移 + 等比缩放，不改 width，避免侧栏内重排重叠 */
  function setBlockFlying(el, i, bp, from, to) {
    if (!from?.width || !to?.width || bp <= 0) {
      clearBlockMotion(el)
      return
    }

    const endScale = (to.width / from.width) * 0.96
    const scale = gsap.utils.interpolate(1, endScale, bp)
    const x = gsap.utils.interpolate(from.left, to.left, bp)
    const y = gsap.utils.interpolate(from.top, to.top, bp)
    let rotateX = 0
    let rotateZ = 0
    if (scheme === 'fold') {
      rotateX = gsap.utils.interpolate(0, -16, Math.sin(bp * Math.PI))
    } else if (scheme === 'flip') {
      rotateZ = gsap.utils.interpolate(0, -1.2, Math.sin(bp * Math.PI))
    }

    gsap.set(el, {
      position: 'fixed',
      left: 0,
      top: 0,
      width: from.width,
      zIndex: 40 + i,
      x,
      y,
      scale,
      rotateX,
      rotateZ,
      transformOrigin: 'top left',
      opacity: 0.92 + bp * 0.08,
      boxShadow: bp > 0.35 ? '0 10px 28px rgb(43 40 35 / 12%)' : 'none',
    })
  }

  function resetToTop() {
    parked = false
    rail.classList.remove('is-parked', 'is-interactive')
    ensureBlocksInFoldZone()
    unmountGhost()
    foldZone.classList.remove('is-scrubbing')
    foldZone.style.minHeight = ''
    gsap.set(foldZone, { clearProps: 'all' })
    gsap.set(rail, { opacity: 0, x: -22, y: 14 })
    gsap.set(bodyZone, { marginLeft: 0 })
    gsap.set(card, { clearProps: 'scale,rotateY' })
    if (spine) gsap.set(spine, { scaleY: 0 })
    detail.classList.remove('is-folded')
    setHint('已展开 · 向下滚动到正文收拢成侧栏', false)
  }

  function applyProgress(rawP) {
    const p = eased(rawP)
    lastProgress = p

    if (p < FLY_THRESHOLD) {
      resetToTop()
      return
    }

    updateShell(p)
    mountGhost()
    foldZone.classList.add('is-scrubbing')

    /* 收满：DOM 落位到侧栏，不再 fixed */
    if (p >= PARK_THRESHOLD) {
      parkBlocks()
      setFoldZoneVisual(p)
      setHint('已收成侧栏 · 向上滚回页首展开', true)
      return
    }

    unparkBlocks()
    setFoldZoneVisual(p)

    /* 飞行中把侧栏 transform 设到当前进度，与 slotLayouts 测量态一致 */
    gsap.set(rail, { opacity: p, x: (1 - p) * -22, y: (1 - p) * 14 })
    gsap.set(card, {
      scale: 0.955 + p * 0.045,
      rotateY: scheme === 'fold' ? (1 - p) * -5 : 0,
    })
    if (spine) gsap.set(spine, { scaleY: gsap.utils.clamp(0, 1, (p - 0.06) / 0.94) })

    const homeRects = measureHomeFromGhost()
    blocks.forEach((el, i) => {
      const bp = blockProgress(p, i)
      setBlockFlying(el, i, bp, homeRects[i], slotLayouts[i])
    })

    setHint(
      p > 0.55 ? '收拢中…' : '向下滚动 · 正文以上将收成侧栏',
      p > 0.35,
    )
  }

  function foldEndViewportRatio() {
    return 0.38
  }

  function measureFoldEndScroll() {
    const bodyTop = bodyZone.getBoundingClientRect().top
    const targetLine = window.innerHeight * foldEndViewportRatio()
    return Math.max(96, bodyTop - targetLine)
  }

  /** 题录区底边滚出视口顶所需的 scrollY（页首测量） */
  function captureFoldClearScroll() {
    const r = foldZone.getBoundingClientRect()
    return Math.max(24, Math.ceil(r.bottom + window.scrollY))
  }

  function isFoldHeaderClear() {
    return window.scrollY >= foldClearScroll
  }

  function ghostRevealProgress() {
    const endScroll = measureFoldEndScroll()
    const span = Math.max(96, endScroll - foldClearScroll)
    return gsap.utils.clamp(0, 1, (window.scrollY - foldClearScroll) / span)
  }

  function updateGhostShell(p) {
    const shiftRem = sidebarShiftRem() * p
    gsap.set(rail, {
      opacity: p,
      x: (1 - p) * -22,
      y: (1 - p) * 14,
    })
    rail.classList.toggle('is-interactive', p > 0.72)
    if (spine) gsap.set(spine, { scaleY: gsap.utils.clamp(0, 1, (p - 0.06) / 0.94) })
    gsap.set(card, { scale: parked ? 1 : 0.955 + p * 0.045 })
    gsap.set(bodyZone, { marginLeft: `${shiftRem}rem` })
    detail.classList.toggle('is-folded', p > 0.85)
  }

  /** 方案 D 阶段一：题录仍在视口内，侧栏不出现，题录随页面自然滚动 */
  function ghostScrollPhase1() {
    parked = false
    rail.classList.remove('is-parked', 'is-interactive')
    ensureBlocksInFoldZone()
    unmountGhost()
    foldZone.classList.remove('is-scrubbing')
    foldZone.style.minHeight = ''
    gsap.set(foldZone, { clearProps: 'all' })
    gsap.set(rail, { opacity: 0, x: -22, y: 14 })
    gsap.set(bodyZone, { marginLeft: 0 })
    gsap.set(card, { clearProps: 'scale,rotateY' })
    if (spine) gsap.set(spine, { scaleY: 0 })
    detail.classList.remove('is-folded')
    lastProgress = 0
    setHint('向下滚动 · 题录滚出视口后侧栏将印出', false)
  }

  function applyGhostReveal(rawP) {
    const p = eased(rawP)
    lastProgress = p

    /* 题录不强行 opacity:0，靠滚动自然离开视口；侧栏卡片与块印出 */
    gsap.set(foldZone, { clearProps: 'opacity,y,filter' })
    updateGhostShell(p)

    if (p >= PARK_THRESHOLD) {
      parkBlocks()
      blocks.forEach((b) => gsap.set(b, { clearProps: 'opacity' }))
      setHint('侧栏已印出 · 向上滚回展开', true)
      return
    }

    const showP = gsap.utils.clamp(0, 1, (p - 0.04) / 0.9)
    if (showP > 0) {
      parkBlocks()
      blocks.forEach((b) => gsap.set(b, { opacity: showP }))
    }

    setHint(
      p > 0.45 ? '侧栏印出中…' : '题录已滚出 · 侧栏卡片淡入',
      p > 0.2,
    )
  }

  function tickFromScroll() {
    if (window.scrollY <= 2) {
      resetToTop()
      return
    }

    if (scheme === 'ghost') {
      if (!isFoldHeaderClear()) {
        ghostScrollPhase1()
        return
      }
      applyGhostReveal(ghostRevealProgress())
      return
    }

    applyProgress(scrollTrigger?.progress ?? lastProgress)
  }

  function handleScrollProgress() {
    tickFromScroll()
  }

  function setupScrollTrigger() {
    scrollTrigger?.kill()
    buildSlots()
    slotLayouts = captureSlotLayouts()
    foldClearScroll = captureFoldClearScroll()
    resetToTop()

    const endScroll = Math.max(foldClearScroll + 96, measureFoldEndScroll())

    if (reduced) {
      ScrollTrigger.create({
        start: 0,
        end: endScroll,
        onEnter: () => {
          if (scheme === 'ghost' && !isFoldHeaderClear()) return
          if (scheme === 'ghost') {
            applyGhostReveal(1)
            return
          }
          mountGhost()
          updateShell(1)
          parkBlocks()
          setFoldZoneVisual(1)
          setHint('已收成侧栏', true)
        },
        onLeaveBack: resetToTop,
      })
      return
    }

    scrollTrigger = ScrollTrigger.create({
      start: 0,
      end: endScroll,
      scrub: 0.55,
      invalidateOnRefresh: true,
      onUpdate: handleScrollProgress,
      onLeaveBack: resetToTop,
    })
  }

  function resetAndRebuild() {
    slotLayouts = captureSlotLayouts()
    setupScrollTrigger()
    ScrollTrigger.refresh()
  }

  window.addEventListener('message', (ev) => {
    if (ev.data?.type === 'scroll-sidebar-scheme' && schemes.includes(ev.data.scheme)) {
      if (scheme !== ev.data.scheme) {
        scheme = ev.data.scheme
        resetAndRebuild()
      }
    }
  })

  window.addEventListener('resize', () => {
    slotLayouts = captureSlotLayouts()
    foldClearScroll = captureFoldClearScroll()
    if (scrollTrigger) scrollTrigger.vars.end = Math.max(foldClearScroll + 96, measureFoldEndScroll())
    ScrollTrigger.refresh()
    tickFromScroll()
  })

  window.parent?.postMessage({ type: 'scroll-sidebar-ready' }, '*')

  setupScrollTrigger()
  setHint('向下滚动到正文 · 侧栏随滚动丝滑收拢', false)
})()
