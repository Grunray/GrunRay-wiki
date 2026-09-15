(() => {
  const SRC_LINE = '../home-hero-relayout/polonia_sandoren_line.svg'
  const SRC_FILLED = {
    light: './filled-light.svg',
    dark: './filled-dark.svg',
    abstract: './filled-abstract.svg',
  }
  const VB_W = 1536
  const VB_H = 1024
  const RAY = 4800
  /** 浅色用调参结果；深色 / abstract 仍用各自初始扇形墨 */
  const PRESET = {
    ax: 1270.93,
    ay: 0,
    angle: 39,
    heading: -45,
  }
  const THEME_WEDGE = {
    light: '#38697a',
    dark: '#abde6b',
    abstract: '#f4f1e8',
  }

  const root = document.documentElement
  const body = document.body
  const svg = document.getElementById('art-svg')
  const artOld = document.getElementById('art-old')
  const artNew = document.getElementById('art-new')
  const loadMsg = document.getElementById('load-msg')
  const poly = document.getElementById('wedge-poly')
  const outsidePath = document.getElementById('outside-path')
  const wash = document.getElementById('wedge-wash')
  const rayL = document.getElementById('ray-l')
  const rayR = document.getElementById('ray-r')
  const apexEl = document.getElementById('apex')
  const angleInput = document.getElementById('angle')
  const headingInput = document.getElementById('heading')
  const angleOut = document.getElementById('angle-out')
  const headingOut = document.getElementById('heading-out')
  const colorInput = document.getElementById('wedge-color')
  const btnWash = document.getElementById('btn-wash')
  const btnRays = document.getElementById('btn-rays')
  const btnReset = document.getElementById('btn-reset')
  const paramsLive = document.getElementById('params-live')
  const btnCopy = document.getElementById('btn-copy-params')
  const copyStatus = document.getElementById('copy-status')

  const state = {
    ax: PRESET.ax,
    ay: PRESET.ay,
    angle: PRESET.angle,
    heading: PRESET.heading,
    wash: true,
    rays: false,
  }

  let copyTimer = 0

  function themeName() {
    return root.dataset.previewTheme || 'light'
  }

  function fmtCoord(n) {
    return Number(n.toFixed(2))
  }

  function currentColor() {
    return (colorInput.value || '').toLowerCase()
  }

  function paramsPayload() {
    return {
      angle: state.angle,
      heading: state.heading,
      color: currentColor(),
      apex: { x: fmtCoord(state.ax), y: fmtCoord(state.ay) },
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      theme: themeName(),
    }
  }

  function paramsText() {
    const p = paramsPayload()
    return [
      `angle: ${p.angle}`,
      `heading: ${p.heading}`,
      `color: ${p.color}`,
      `apex: ${p.apex.x}, ${p.apex.y}`,
      `viewBox: ${p.viewBox}`,
      `theme: ${p.theme}`,
    ].join('\n')
  }

  function updateParamsLive() {
    const p = paramsPayload()
    paramsLive.textContent = `angle ${p.angle}° · heading ${p.heading}° · color ${p.color} · apex (${p.apex.x}, ${p.apex.y})`
  }

  function setTheme(name) {
    root.dataset.previewTheme = name
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.theme === name)
    })
    colorInput.value = THEME_WEDGE[name]
    root.style.setProperty('--wedge', THEME_WEDGE[name])
    updateParamsLive()
    if (artNew.childElementCount) void loadFilled(name)
  }

  function clientToVb(clientX, clientY) {
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: state.ax, y: state.ay }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return {
      x: Math.min(VB_W, Math.max(0, p.x)),
      y: Math.min(VB_H, Math.max(0, p.y)),
    }
  }

  function rayEnd(degFromDown) {
    const r = (degFromDown * Math.PI) / 180
    return [state.ax + Math.sin(r) * RAY, state.ay + Math.cos(r) * RAY]
  }

  function clipToViewBox(ex, ey) {
    const dx = ex - state.ax
    const dy = ey - state.ay
    let t = 1
    if (dx > 0) t = Math.min(t, (VB_W - state.ax) / dx)
    if (dx < 0) t = Math.min(t, -state.ax / dx)
    if (dy > 0) t = Math.min(t, (VB_H - state.ay) / dy)
    if (dy < 0) t = Math.min(t, -state.ay / dy)
    if (!Number.isFinite(t) || t < 0) t = 1
    return [state.ax + dx * t, state.ay + dy * t]
  }

  function render() {
    const half = state.angle / 2
    const [lx, ly] = rayEnd(state.heading - half)
    const [rx, ry] = rayEnd(state.heading + half)
    const [clx, cly] = clipToViewBox(lx, ly)
    const [crx, cry] = clipToViewBox(rx, ry)
    const points = `${state.ax},${state.ay} ${lx},${ly} ${rx},${ry}`
    poly.setAttribute('points', points)
    outsidePath.setAttribute(
      'd',
      `M0,0H${VB_W}V${VB_H}H0Z M${state.ax},${state.ay} L${lx},${ly} L${rx},${ry} Z`,
    )
    wash.setAttribute('points', points)
    rayL.setAttribute('x1', String(state.ax))
    rayL.setAttribute('y1', String(state.ay))
    rayL.setAttribute('x2', String(clx))
    rayL.setAttribute('y2', String(cly))
    rayR.setAttribute('x1', String(state.ax))
    rayR.setAttribute('y1', String(state.ay))
    rayR.setAttribute('x2', String(crx))
    rayR.setAttribute('y2', String(cry))
    apexEl.setAttribute('cx', String(state.ax))
    apexEl.setAttribute('cy', String(state.ay))
    angleOut.textContent = `${state.angle}°`
    headingOut.textContent = `${state.heading}°`
    body.dataset.wash = state.wash ? 'true' : 'false'
    body.dataset.rays = state.rays ? 'true' : 'false'
    btnWash.classList.toggle('is-on', state.wash)
    btnWash.textContent = state.wash ? '扇形底 开' : '扇形底 关'
    btnRays.classList.toggle('is-on', state.rays)
    btnRays.textContent = state.rays ? '射线 开' : '射线 关'
    updateParamsLive()
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }

  function selectParamsLive() {
    const range = document.createRange()
    range.selectNodeContents(paramsLive)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  async function copyParams() {
    const text = paramsText()
    let copied = false
    if (navigator.clipboard?.writeText) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(text),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('clipboard-timeout')), 800)
          }),
        ])
        copied = true
      } catch {
        copied = false
      }
    }
    if (!copied) copied = fallbackCopy(text)
    if (!copied) selectParamsLive()
    copyStatus.textContent = copied ? '已复制' : '请 Ctrl+C'
    btnCopy.classList.toggle('is-on', copied)
    window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => {
      copyStatus.textContent = ''
      btnCopy.classList.remove('is-on')
    }, 1600)
  }

  function resetGeom() {
    state.ax = PRESET.ax
    state.ay = PRESET.ay
    state.angle = PRESET.angle
    state.heading = PRESET.heading
    angleInput.value = String(PRESET.angle)
    headingInput.value = String(PRESET.heading)
    render()
  }

  async function importPaths(url, target, stripStroke) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} ${res.status}`)
    const text = await res.text()
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    if (doc.querySelector('parsererror')) throw new Error(`parse ${url}`)
    const frag = document.createDocumentFragment()
    doc.querySelectorAll('path').forEach((path) => {
      const node = document.importNode(path, true)
      if (stripStroke) {
        const style = (node.getAttribute('style') || '').replace(/stroke\s*:[^;]*;?/gi, '')
        node.setAttribute('style', style)
      }
      frag.appendChild(node)
    })
    target.replaceChildren(frag)
  }

  async function loadFilled(name) {
    const url = SRC_FILLED[name] || SRC_FILLED.light
    await importPaths(url, artOld, false)
  }

  async function loadArt() {
    try {
      await Promise.all([importPaths(SRC_LINE, artNew, true), loadFilled(themeName())])
      loadMsg.classList.add('is-hidden')
    } catch (err) {
      loadMsg.classList.add('is-error')
      loadMsg.textContent =
        '线稿没载入。请从 designed/ 起一个本地静态服务再打开本页（file:// 下 fetch 会被拦）。'
      console.error(err)
    }
  }

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme))
  })

  angleInput.addEventListener('input', () => {
    state.angle = Number(angleInput.value)
    render()
  })

  headingInput.addEventListener('input', () => {
    state.heading = Number(headingInput.value)
    render()
  })

  colorInput.addEventListener('input', () => {
    root.style.setProperty('--wedge', colorInput.value)
    updateParamsLive()
  })

  btnWash.addEventListener('click', () => {
    state.wash = !state.wash
    render()
  })

  btnRays.addEventListener('click', () => {
    state.rays = !state.rays
    render()
  })

  btnReset.addEventListener('click', resetGeom)
  btnCopy.addEventListener('click', () => {
    void copyParams()
  })

  let dragging = false

  function onPointerDown(event) {
    dragging = true
    body.classList.add('is-dragging')
    apexEl.setPointerCapture(event.pointerId)
    const p = clientToVb(event.clientX, event.clientY)
    state.ax = p.x
    state.ay = p.y
    render()
  }

  function onPointerMove(event) {
    if (!dragging) return
    const p = clientToVb(event.clientX, event.clientY)
    state.ax = p.x
    state.ay = p.y
    render()
  }

  function onPointerUp(event) {
    if (!dragging) return
    dragging = false
    body.classList.remove('is-dragging')
    if (apexEl.hasPointerCapture(event.pointerId)) {
      apexEl.releasePointerCapture(event.pointerId)
    }
  }

  apexEl.addEventListener('pointerdown', onPointerDown)
  apexEl.addEventListener('pointermove', onPointerMove)
  apexEl.addEventListener('pointerup', onPointerUp)
  apexEl.addEventListener('pointercancel', onPointerUp)

  setTheme('light')
  render()
  loadArt()
})()
