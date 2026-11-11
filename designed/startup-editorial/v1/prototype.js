/* 单套启动分镜；原生 WAAPI，无包依赖，支持 file:// 直接打开。 */
(() => {
  'use strict'

  const DURATION = 12000
  const root = document.documentElement
  const $ = (id) => document.getElementById(id)
  const stage = $('stage')
  const seek = $('seek')
  const pauseButton = $('pauseButton')
  const chapters = [...document.querySelectorAll('.chapter-button')]
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const animations = []
  const chapterStarts = [0, 2100, 6000, 9300]
  const chapterNames = ['封签 · 一页将启', '起笔 · 人物描绘', '落版 · 原图渐显', '开卷 · 欢迎入刊']
  let elapsed = DURATION
  let playing = false
  let frame = 0
  let currentChapter = -1
  let requestedMotion = 'full'
  let ready = false
  let scrubWasPlaying = false
  let immersive = false

  function track(element, property, stops) {
    const keys = stops.map(([time, value, easing]) => ({
      offset: time / DURATION,
      [property]: value,
      ...(easing ? { easing } : {}),
    }))
    const animation = element.animate(keys, { duration: DURATION, fill: 'both', easing: 'linear' })
    animation.pause()
    animation.currentTime = 0
    animations.push(animation)
  }

  function createAnimation() {
    if (!window.__GR_STARTUP_LINE_ART__ || !Element.prototype.animate) return false
    const doc = new DOMParser().parseFromString(window.__GR_STARTUP_LINE_ART__, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg || doc.querySelector('parsererror')) return false
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.setAttribute('aria-hidden', 'true')
    $('drawing').append(document.importNode(svg, true))

    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
    track($('prologue'), 'opacity', [[0, 1], [1450, 1, ease], [2250, 0], [DURATION, 0]])
    track($('prologue'), 'pointerEvents', [[0, 'none'], [DURATION, 'none']])
    track($('openingRule'), 'scale', [[0, '0 1', ease], [1050, '1 1'], [DURATION, '1 1']])
    track($('masthead'), 'opacity', [[0, 0], [1950, 0, ease], [2850, 1], [DURATION, 1]])
    track($('portraitStack'), 'opacity', [[0, 0], [1800, 0, ease], [2600, 1], [DURATION, 1]])
    track($('portraitStack'), 'scale', [[0, '1.035'], [2100, '1.035', ease], [9200, '1'], [DURATION, '1']])
    track($('drawing'), 'opacity', [[0, 1], [6600, 1], [8350, 0], [DURATION, 0]])
    track($('printedArt'), 'opacity', [[0, 0], [6200, 0], [6800, 1], [DURATION, 1]])
    track($('printedArt'), 'clipPath', [
      [0, 'polygon(0 0, 0 0, 0 100%, 0 100%)'],
      [6200, 'polygon(0 0, 0 0, 0 100%, 0 100%)', ease],
      [8500, 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'],
      [DURATION, 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'],
    ])
    track($('copyInk'), 'opacity', [[0, 0], [2150, 0, ease], [3050, 1], [5550, 1], [6100, 0], [DURATION, 0]])
    track($('copyInk'), 'translate', [[0, '0 12px'], [2150, '0 12px', ease], [3050, '0 0'], [DURATION, '0 0']])
    track($('copyPrint'), 'opacity', [[0, 0], [6100, 0, ease], [6900, 1], [8650, 1], [9300, 0], [DURATION, 0]])
    track($('copyPrint'), 'translate', [[0, '0 12px'], [6100, '0 12px', ease], [6900, '0 0'], [DURATION, '0 0']])
    track($('copyWelcome'), 'opacity', [[0, 0], [9350, 0, ease], [10300, 1], [DURATION, 1]])
    track($('copyWelcome'), 'translate', [[0, '0 12px'], [9350, '0 12px', ease], [10300, '0 0'], [DURATION, '0 0']])
    track($('artCaption'), 'opacity', [[0, 0], [7400, 0, ease], [8350, 1], [DURATION, 1]])
    track($('marginNote'), 'opacity', [[0, 0], [3100, 0, ease], [4000, 1], [DURATION, 1]])
    track($('stageFoot'), 'opacity', [[0, 0], [9400, 0, ease], [10600, 1], [DURATION, 1]])

    // 从人物面部向外起笔；354 条路径只在开场播放，不保留环境循环。
    for (const path of $('drawing').querySelectorAll('path')) {
      const box = path.getBBox()
      const distance = Math.hypot(box.x + box.width / 2 - 815, box.y + box.height / 2 - 295)
      const start = 2200 + Math.min(distance / 950, 1) * 1750
      const end = start + Math.min(1500, 430 + path.getTotalLength() * .52)
      path.setAttribute('pathLength', '1')
      path.style.strokeDasharray = '1'
      track(path, 'strokeDashoffset', [[0, '1'], [start, '1', ease], [end, '0'], [DURATION, '0']])
    }
    return true
  }

  function render() {
    const seconds = elapsed / 1000
    seek.value = String(seconds)
    seek.style.setProperty('--played', `${seconds / 12 * 100}%`)
    $('timeOutput').value = `${seconds.toFixed(1).padStart(4, '0')} / 12.0s`
    const chapter = chapterStarts.reduce((last, start, index) => elapsed >= start ? index : last, 0)
    if (chapter !== currentChapter) {
      currentChapter = chapter
      stage.dataset.chapter = String(chapter)
      chapters.forEach((button, index) => button.setAttribute('aria-current', String(index === chapter)))
      $('stageNarration').textContent = chapter === 3
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
    elapsed = Math.min(DURATION, Number(animations[0]?.currentTime ?? elapsed))
    if (elapsed >= DURATION) {
      finish()
      return
    }
    render()
    frame = requestAnimationFrame(tick)
  }

  function play() {
    if (!ready || root.dataset.motion !== 'full' || elapsed >= DURATION) return
    stopFrame()
    stage.classList.add('is-armed')
    playing = true
    const now = document.timeline.currentTime
    animations.forEach((animation) => {
      animation.currentTime = elapsed
      animation.play()
      animation.startTime = now - elapsed
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
    // 隐藏临时 SVG 层与封签；不删除节点，暂停、重播、拖看都可复用。
    stage.classList.remove('is-armed')
    render()
  }

  function replay() {
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
    finish()
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
  $('skipButton').addEventListener('click', finish)
  $('immersiveSkip').addEventListener('click', finish)
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
      else finish()
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
      applyMotion()
      // 仅等本场标题与人物；字体/图片异常不会把首屏留在预隐藏状态。
      await Promise.race([
        Promise.allSettled([
          document.fonts.load('600 32px "Noto Serif SC"'),
          document.fonts.load('500 48px "Playfair Display"'),
          document.fonts.load('400 48px "Great Vibes"'),
          printedArt.decode(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 1800)),
      ])
      if (printedArt.complete && printedArt.naturalWidth === 0) { handleArtError(); return }
      if (!document.hidden && root.dataset.motion === 'full' && ready) replay()
    } catch (error) {
      console.warn('启动原型回落到静态开卷画面：', error)
      ready = false
      animations.forEach((animation) => animation.cancel())
      finish()
    }
  }

  init()
})()
