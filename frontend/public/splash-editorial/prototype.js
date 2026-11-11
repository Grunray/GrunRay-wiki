/* v4 铅笔底稿：身体打型完成后画铅笔稿，停留后再描墨。面部不画辅助线。 */
(() => {
  'use strict'

  const SOURCE = 16000
  const TIME_SCALE = 1
  const DURATION = SOURCE * TIME_SCALE
  const root = document.documentElement
  const $ = (id) => document.getElementById(id)
  const stage = $('stage')
  const seek = $('seek')
  const pauseButton = $('pauseButton')
  const chapters = [...document.querySelectorAll('.chapter-button')]
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const animations = []
  const chapterStarts = [0, 2100, 4600, 8200, 11100, 13500].map((ms) => ms * TIME_SCALE)
  const chapterNames = ['封签 · 一页将启', '打型 · 身体结构', '铅笔稿 · 下書き', '描线 · 正式墨线', '落版 · 原图渐显', '开卷 · 欢迎入刊']
  let elapsed = 0
  let playing = false
  let frame = 0
  let currentChapter = -1
  let requestedMotion = 'full'
  let ready = false
  let scrubWasPlaying = false
  let immersive = false
  let notifiedParent = false

  const params = new URLSearchParams(location.search)
  const themeParam = params.get('theme')
  if (themeParam === 'light' || themeParam === 'dark' || themeParam === 'abstract') {
    root.dataset.theme = themeParam
  }
  const motionParam = params.get('motion')
  if (motionParam === 'full' || motionParam === 'reduced' || motionParam === 'minimal') {
    requestedMotion = motionParam
  }

  function track(element, property, stops) {
    const keys = stops.map(([time, value, easing]) => ({
      offset: time / SOURCE,
      [property]: value,
      ...(easing ? { easing } : {}),
    }))
    const animation = element.animate(keys, { duration: DURATION, fill: 'both', easing: 'linear' })
    animation.pause()
    animation.currentTime = 0
    animations.push(animation)
  }

  // 从原人物几何生成固定的轻微复笔，重播与拖看时不会随机抖动。
  function pencilPath(source, length, seed, rough = false) {
    const steps = Math.max(3, Math.min(420, Math.ceil(length / (rough ? 10 : 7))))
    const stride = length / steps
    let previous = null
    let data = ''
    for (let index = 0; index <= steps; index++) {
      const point = source.getPointAtLength(index / steps * length)
      const amplitude = rough ? 1.45 : .3
      const x = point.x + Math.sin(index * 1.13 + seed * 2.1) * amplitude
      const y = point.y + Math.sin(index * .87 + seed * 1.7) * amplitude
      const split = !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > stride * 2.5 || (rough && index % 19 === 0)
      data += `${split ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
      previous = point
    }
    return data
  }

  function createPencil(items, ease) {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 1536 1024')
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice')
    svg.setAttribute('aria-hidden', 'true')
    $('sketch').append(svg)
    function addPath(data, className, width, start, end, transform) {
      const line = document.createElementNS(ns, 'path')
      line.setAttribute('d', data)
      line.setAttribute('class', className)
      if (transform) line.setAttribute('transform', transform)
      line.style.setProperty('--pencil-width', `${width}px`)
      line.setAttribute('pathLength', '1')
      line.style.strokeDasharray = '1'
      svg.append(line)
      track(line, 'strokeDashoffset', [[0, '1'], [start, '1', ease], [end, '0'], [SOURCE, '0']])
      return line
    }
    items.forEach(({ path, box, length, distance }, index) => {
      const inFace = box.x + box.width / 2 > 650 && box.x + box.width / 2 < 1050 && box.y + box.height / 2 < 410
      const start = 4600 + Math.min(distance / 950, 1) * 1300
      const end = start + Math.min(1350, 450 + length * .4)
      const line = addPath(pencilPath(path, length, index), 'pencil-primary', inFace ? 1.4 : 1.7 + index % 3 * .18, start, end, path.getAttribute('transform'))
      line.style.setProperty('--pencil-pressure', String(.70 + index % 5 * .045))
      // 只在脸部以外的大轮廓上留试探复笔，避免重新把面部画花。
      if (!inFace && length > 240 && index % 4 === 0) {
        addPath(pencilPath(path, length, index + 19, true), 'pencil-search', 1.15, start + 100, end + 120, path.getAttribute('transform'))
      }
    })
    // 局部浅排线随铅笔稿补入，不向面部叠加定位或几何网格。
    const patches = [
      { x: 492, y: 468, dx: 30, dy: -18, sx: 3, sy: 10, count: 8 },
      { x: 1056, y: 495, dx: 30, dy: 20, sx: -2, sy: 11, count: 8 },
      { x: 711, y: 545, dx: 25, dy: -13, sx: 2, sy: 10, count: 7 },
      { x: 879, y: 612, dx: 20, dy: 17, sx: -3, sy: 9, count: 7 },
      { x: 1146, y: 906, dx: 12, dy: -25, sx: 12, sy: 3, count: 8 },
    ]
    let hatchIndex = 0
    for (const patch of patches) {
      for (let index = 0; index < patch.count; index++) {
        const x = patch.x + patch.sx * index
        const y = patch.y + patch.sy * index
        const start = 5350 + hatchIndex++ * 28
        addPath(`M${x} ${y}q${patch.dx * .48} ${patch.dy * .65} ${patch.dx} ${patch.dy}`, 'pencil-shading', .95, start, start + 420)
      }
    }
  }

  function createAnimation() {
    if (!window.__GR_STARTUP_LINE_ART__ || !Element.prototype.animate) return false
    const doc = new DOMParser().parseFromString(window.__GR_STARTUP_LINE_ART__, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg || doc.querySelector('parsererror')) return false
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice')
    svg.setAttribute('aria-hidden', 'true')
    $('drawing').append(document.importNode(svg, true))

    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
    track($('prologue'), 'opacity', [[0, 1], [1450, 1, ease], [2250, 0], [SOURCE, 0]])
    track($('prologue'), 'pointerEvents', [[0, 'none'], [SOURCE, 'none']])
    track($('openingRule'), 'scale', [[0, '0 1', ease], [1050, '1 1'], [SOURCE, '1 1']])
    track($('masthead'), 'opacity', [[0, 0], [1950, 0, ease], [2850, 1], [SOURCE, 1]])
    track($('portraitStack'), 'opacity', [[0, 0], [1800, 0, ease], [2600, 1], [SOURCE, 1]])
    if (!frameFromParams()) {
      track($('portraitStack'), 'scale', [[0, '1.035'], [2100, '1.035', ease], [9200, '1'], [SOURCE, '1']])
    }
    track($('sketch'), 'opacity', [[0, 0], [4550, 0], [4800, 1], [9400, 1], [11000, 0], [SOURCE, 0]])
    track($('drawing'), 'opacity', [[0, 1], [11400, 1], [13300, 0], [SOURCE, 0]])
    track($('printedArt'), 'opacity', [[0, 0], [11100, 0], [11700, 1], [SOURCE, 1]])
    track($('printedArt'), 'clipPath', [
      [0, 'polygon(0 0, 0 0, 0 100%, 0 100%)'],
      [11100, 'polygon(0 0, 0 0, 0 100%, 0 100%)', ease],
      [13300, 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'],
      [SOURCE, 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'],
    ])
    track($('copyInk'), 'opacity', [[0, 0], [2150, 0, ease], [3050, 1], [4300, 1], [4700, 0], [SOURCE, 0]])
    track($('copyInk'), 'translate', [[0, '0 12px'], [2150, '0 12px', ease], [3050, '0 0'], [SOURCE, '0 0']])
    track($('copySketch'), 'opacity', [[0, 0], [4700, 0, ease], [5350, 1], [7850, 1], [8250, 0], [SOURCE, 0]])
    track($('copySketch'), 'translate', [[0, '0 12px'], [4700, '0 12px', ease], [5350, '0 0'], [SOURCE, '0 0']])
    track($('copyTrace'), 'opacity', [[0, 0], [8250, 0, ease], [9000, 1], [10700, 1], [11150, 0], [SOURCE, 0]])
    track($('copyTrace'), 'translate', [[0, '0 12px'], [8250, '0 12px', ease], [9000, '0 0'], [SOURCE, '0 0']])
    track($('copyPrint'), 'opacity', [[0, 0], [11150, 0, ease], [11900, 1], [13000, 1], [13500, 0], [SOURCE, 0]])
    track($('copyPrint'), 'translate', [[0, '0 12px'], [11150, '0 12px', ease], [11900, '0 0'], [SOURCE, '0 0']])
    track($('copyWelcome'), 'opacity', [[0, 0], [13500, 0, ease], [14500, 1], [SOURCE, 1]])
    track($('copyWelcome'), 'translate', [[0, '0 12px'], [13500, '0 12px', ease], [14500, '0 0'], [SOURCE, '0 0']])
    track($('artCaption'), 'opacity', [[0, 0], [12400, 0, ease], [13300, 1], [SOURCE, 1]])
    track($('marginNote'), 'opacity', [[0, 0], [3100, 0, ease], [4000, 1], [SOURCE, 1]])
    track($('stageFoot'), 'opacity', [[0, 0], [13500, 0, ease], [14700, 1], [SOURCE, 1]])

    // 打型和正稿共用时间轴，暂停、拖看或跳过不会留下额外定时器。
    const guideTiming = {
      perspective: { start: 1750, spread: 360, draw: 900, peak: .36, fade: 7500, end: 9600 },
      gesture: { start: 1850, spread: 230, draw: 1050, peak: .62, fade: 7100, end: 9000 },
      proportion: { start: 2100, spread: 430, draw: 820, peak: .58, fade: 7700, end: 9700 },
      volume: { start: 2400, spread: 650, draw: 1000, peak: .52, fade: 7900, end: 10100 },
      neck: { start: 2450, spread: 450, draw: 950, peak: .50, fade: 7600, end: 9800 },
      torso: { start: 2500, spread: 850, draw: 1100, peak: .48, fade: 8000, end: 10200 },
      limbs: { start: 2700, spread: 550, draw: 1000, peak: .42, fade: 7900, end: 10100 },
      mechanics: { start: 2650, spread: 650, draw: 1000, peak: .34, fade: 7400, end: 9600 },
    }
    for (const group of $('construction').querySelectorAll('[data-guide]')) {
      const timing = guideTiming[group.dataset.guide]
      track(group, 'opacity', [
        [0, 0], [timing.start, 0, ease], [timing.start + 430, timing.peak],
        [4200, timing.peak], [5200, timing.peak * .65],
        [timing.fade, timing.peak * .65, ease], [timing.end, 0], [SOURCE, 0],
      ])
      const lines = [...group.querySelectorAll('path, ellipse')]
      lines.forEach((line, index) => {
        const start = timing.start + index / Math.max(1, lines.length - 1) * timing.spread
        const duration = Math.min(timing.draw, 350 + line.getTotalLength() * .28)
        line.setAttribute('pathLength', '1')
        line.style.strokeDasharray = '1'
        track(line, 'strokeDashoffset', [[0, '1'], [start, '1', ease], [start + duration, '0'], [SOURCE, '0']])
      })
    }

    // 先生成铅笔底稿；身体辅助线已在 4.6 秒前绘制完成。
    const drawing = $('drawing')
    // display:none 的 SVG 可能量到空包围盒；先不可见地排版，再量路径。
    drawing.style.cssText = 'display:block;visibility:hidden'
    try {
      const items = [...drawing.querySelectorAll('path')].map((path) => {
        const box = path.getBBox()
        const distance = Math.hypot(box.x + box.width / 2 - 815, box.y + box.height / 2 - 295)
        return { path, box, distance, length: path.getTotalLength() }
      })
      createPencil(items, ease)
      // 底稿完整停留后才描墨，保留原人物 354 条正稿路径。
      for (const { path, distance, length } of items) {
        const start = 8200 + Math.min(distance / 950, 1) * 1250
        const end = start + Math.min(1450, 430 + length * .52)
        path.setAttribute('pathLength', '1')
        path.style.strokeDasharray = '1'
        track(path, 'strokeDashoffset', [[0, '1'], [start, '1', ease], [end, '0'], [SOURCE, '0']])
      }
    } finally {
      drawing.style.cssText = ''
    }
    return true
  }

  function render() {
    const seconds = elapsed / 1000
    seek.value = String(seconds)
    seek.style.setProperty('--played', `${elapsed / DURATION * 100}%`)
    $('timeOutput').value = `${seconds.toFixed(1).padStart(4, '0')} / ${(DURATION / 1000).toFixed(1)}s`
    const chapter = chapterStarts.reduce((last, start, index) => elapsed >= start ? index : last, 0)
    if (chapter !== currentChapter) {
      currentChapter = chapter
      stage.dataset.chapter = String(chapter)
      chapters.forEach((button, index) => button.setAttribute('aria-current', String(index === chapter)))
      $('stageNarration').textContent = chapter === chapterStarts.length - 1
        ? '你好，我是 GrunRay。欢迎来到我的个人刊，这本杂志，一直在写。'
        : chapterNames[chapter]
    }
    seek.setAttribute('aria-valuetext', `${seconds.toFixed(1)} 秒，${chapterNames[chapter]}`)
    const limited = root.dataset.motion !== 'full'
    pauseButton.disabled = limited || elapsed >= DURATION || !ready
    pauseButton.textContent = playing ? '暂停' : '继续'
    pauseButton.setAttribute('aria-pressed', String(!playing && elapsed < DURATION))
    $('skipButton').disabled = elapsed >= DURATION
    $('immersiveSkip').hidden = elapsed >= DURATION
    const message = limited ? (media.matches ? '系统减少动态 · 直接开卷' : '动效已降级 · 直接开卷')
      : !ready ? '静态预览' : elapsed >= DURATION ? '开场结束' : playing ? '正在播放' : '已暂停'
    if ($('playState').textContent !== message) $('playState').textContent = message
  }

  function stopFrame() {
    cancelAnimationFrame(frame)
    frame = 0
  }

  function pause() {
    playing = false
    stopFrame()
    animations.forEach((animation) => animation.pause())
    render()
  }

  function seekTo(time) {
    elapsed = Math.max(0, Math.min(DURATION, time))
    animations.forEach((animation) => { animation.currentTime = elapsed })
    render()
  }

  function tick() {
    if (!playing) return
    const raw = animations[0]?.currentTime
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      frame = requestAnimationFrame(tick)
      return
    }
    elapsed = Math.min(DURATION, raw)
    if (elapsed >= DURATION) {
      completeToHost()
      return
    }
    render()
    frame = requestAnimationFrame(tick)
  }

  function play() {
    if (!ready || root.dataset.motion !== 'full' || elapsed >= DURATION) return
    stopFrame()
    stage.classList.remove('is-pending')
    stage.classList.add('is-armed')
    playing = true
    const now = document.timeline.currentTime
    animations.forEach((animation) => {
      try {
        if (typeof now === 'number') {
          animation.startTime = now - elapsed
        } else {
          animation.currentTime = elapsed
          animation.play()
        }
      } catch {
        animation.currentTime = elapsed
        animation.play()
      }
    })
    render()
    frame = requestAnimationFrame(tick)
  }

  function finish() {
    playing = false
    stopFrame()
    animations.forEach((animation) => {
      animation.pause()
      animation.currentTime = DURATION
    })
    elapsed = DURATION
    stage.classList.remove('is-pending')
    // 隐藏临时 SVG 层与封签；不删除节点，暂停、重播、拖看都可复用。
    stage.classList.remove('is-armed')
    render()
  }

  function notifyParentComplete() {
    if (notifiedParent || !window.parent || window.parent === window) return
    notifiedParent = true
    window.parent.postMessage({
      type: 'grunray-splash-complete',
      play: params.get('play') || '0',
    }, '*')
  }

  function completeToHost() {
    finish()
    notifyParentComplete()
  }

  function replay() {
    notifiedParent = false
    if (root.dataset.motion !== 'full' || !ready) { finish(); return }
    pause()
    seekTo(0)
    play()
  }

  function applyMotion() {
    const motion = media.matches ? 'minimal' : requestedMotion
    root.dataset.motion = motion
    const limited = motion !== 'full' || !ready
    seek.disabled = limited
    chapters.forEach((button) => { button.disabled = limited })
    $('previewHint').textContent = limited
      ? '减少动态时直接显示落幕首屏。系统偏好优先，选择“完整”也不会覆盖系统设置。'
      : '空格 暂停 / 继续 · Esc 跳过 · 分镜与进度均可拖看。此页只演示启动动画及落幕首屏。'
    if (limited) finish()
  }

  function setImmersive(value) {
    immersive = value
    if (value) {
      $('immersiveTools').hidden = false
      $('exitImmerse').focus({ preventScroll: true })
      document.body.classList.add('is-immersive')
    } else {
      document.body.classList.remove('is-immersive')
      $('immerseButton').focus({ preventScroll: true })
      $('immersiveTools').hidden = true
    }
    $('immerseButton').setAttribute('aria-pressed', String(value))
  }

  $('replayButton').addEventListener('click', replay)
  pauseButton.addEventListener('click', () => playing ? pause() : play())
  $('skipButton').addEventListener('click', completeToHost)
  $('immersiveSkip').addEventListener('click', completeToHost)
  $('immerseButton').addEventListener('click', () => setImmersive(true))
  $('exitImmerse').addEventListener('click', () => setImmersive(false))
  $('themeSelect').addEventListener('change', (event) => { root.dataset.theme = event.target.value })
  $('motionSelect').addEventListener('change', (event) => {
    requestedMotion = event.target.value
    applyMotion()
    if (root.dataset.motion === 'full') replay()
  })
  media.addEventListener('change', applyMotion)
  chapters.forEach((button) => button.addEventListener('click', () => {
    pause()
    stage.classList.add('is-armed')
    seekTo(Number(button.dataset.seek) * 1000)
  }))
  seek.addEventListener('pointerdown', () => {
    scrubWasPlaying = playing
    pause()
  })
  seek.addEventListener('input', () => {
    const time = Number(seek.value) * 1000
    pause()
    stage.classList.add('is-armed')
    seekTo(time)
  })
  seek.addEventListener('change', () => {
    if (elapsed >= DURATION) finish()
    else if (scrubWasPlaying) play()
    scrubWasPlaying = false
  })
  seek.addEventListener('pointercancel', () => { scrubWasPlaying = false })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (immersive) setImmersive(false)
      else completeToHost()
      return
    }
    if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target.closest('button, input, select, textarea, a, [contenteditable]')) return
    event.preventDefault()
    if (playing) pause()
    else if (elapsed >= DURATION) replay()
    else play()
  })
  document.addEventListener('visibilitychange', () => {
    // 切后台就暂停，不让访客错过分镜，也不在后台保留 rAF。
    if (document.hidden && playing) pause()
  })
  window.addEventListener('pagehide', pause)
  window.addEventListener('message', (event) => {
    const type = event.data && event.data.type
    if (type === 'grunray-splash-theme') {
      const theme = event.data.theme
      if (theme === 'light' || theme === 'dark' || theme === 'abstract') root.dataset.theme = theme
    } else if (type === 'grunray-splash-toggle') {
      if (playing) pause()
      else play()
    } else if (type === 'grunray-splash-skip') {
      completeToHost()
    } else if (type === 'grunray-splash-handoff') {
      document.body.classList.add('is-handoff')
      document.querySelectorAll('.chapter-copy').forEach((node) => {
        node.getAnimations().forEach((animation) => animation.cancel())
        node.style.opacity = '0'
      })
    } else if (type === 'grunray-splash-frame') {
      applyHomeFrame(event.data.frame)
    }
  })

  function boxFrom(source, keys) {
    const top = Number(source[keys[0]])
    const left = Number(source[keys[1]])
    const width = Number(source[keys[2]])
    const height = Number(source[keys[3]])
    if (![top, left, width, height].every(Number.isFinite) || width < 8 || height < 8) return null
    return { top, left, width, height }
  }

  function applyHomeFrame(frame) {
    if (!frame) return
    const stack = $('portraitStack')
    const img = $('printedArt')
    const art = boxFrom(frame, ['top', 'left', 'width', 'height'])
    if (stack && art) {
      stack.classList.add('is-home-frame')
      stack.style.top = `${art.top}px`
      stack.style.left = `${art.left}px`
      stack.style.width = `${art.width}px`
      stack.style.height = `${art.height}px`
      stack.querySelectorAll('svg').forEach((svg) => {
        svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice')
      })
      if (img) {
        img.style.objectFit = 'cover'
        img.style.objectPosition = 'right center'
        if (typeof frame.src === 'string' && frame.src) {
          const next = new URL(frame.src, location.origin).href
          if (img.src !== next) img.src = next
        }
      }
    }
    applyHomeCopy(frame.copy)
  }

  function applyHomeCopy(copy) {
    const box = $('spreadCopy')
    const place = copy && boxFrom(copy, ['top', 'left', 'width', 'height'])
    if (!box || !place) return
    const pad = ['padTop', 'padRight', 'padBottom', 'padLeft'].map((key) => {
      const value = Number(copy[key])
      return Number.isFinite(value) ? value : 0
    })
    const top = place.top + pad[0]
    const left = place.left + pad[3]
    const width = place.width - pad[3] - pad[1]
    const height = place.height - pad[0] - pad[2]
    if (width < 8 || height < 8) return
    box.classList.add('is-home-copy')
    box.style.top = `${top}px`
    box.style.left = `${left}px`
    box.style.width = `${width}px`
    box.style.height = `${height}px`
    box.style.padding = '0'
  }

  function frameFromParams() {
    const art = boxFrom({
      top: params.get('ft'),
      left: params.get('fl'),
      width: params.get('fw'),
      height: params.get('fh'),
    }, ['top', 'left', 'width', 'height'])
    const copyBox = boxFrom({
      top: params.get('ct'),
      left: params.get('cl'),
      width: params.get('cw'),
      height: params.get('ch'),
    }, ['top', 'left', 'width', 'height'])
    if (!art && !copyBox) return null
    const pad = ['pt', 'pr', 'pb', 'pl'].map((key) => Number(params.get(key)))
    return {
      top: art ? art.top : 0,
      left: art ? art.left : 0,
      width: art ? art.width : 0,
      height: art ? art.height : 0,
      src: params.get('fsrc') || '',
      copy: copyBox ? {
        ...copyBox,
        padTop: pad[0],
        padRight: pad[1],
        padBottom: pad[2],
        padLeft: pad[3],
      } : null,
    }
  }

  const printedArt = $('printedArt')
  function handleArtError() {
    stage.classList.add('has-art-error')
    finish()
    $('previewHint').textContent = '人物图片未能读取，已保留可见的开卷文字。请在完整仓库中打开此原型。'
  }
  printedArt.addEventListener('error', handleArtError)

  async function init() {
    try {
      ready = createAnimation()
      applyHomeFrame(frameFromParams())
      const motion = media.matches ? 'minimal' : requestedMotion
      root.dataset.motion = motion
      const limited = motion !== 'full' || !ready
      seek.disabled = limited
      chapters.forEach((button) => { button.disabled = limited })
      if (!limited && !document.hidden) {
        seekTo(0)
        requestAnimationFrame(() => play())
      } else {
        finish()
        notifyParentComplete()
      }
      void Promise.race([
        Promise.allSettled([
          document.fonts.load('600 32px "Noto Serif SC"'),
          document.fonts.load('500 48px "Playfair Display"'),
          document.fonts.load('400 48px "Great Vibes"'),
          printedArt.decode(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 1800)),
      ])
      if (printedArt.complete && printedArt.naturalWidth === 0) { handleArtError(); return }
    } catch (error) {
      console.warn('启动原型回落到静态开卷画面：', error)
      ready = false
      animations.forEach((animation) => animation.cancel())
      finish()
      notifyParentComplete()
    }
  }

  init()
})()
