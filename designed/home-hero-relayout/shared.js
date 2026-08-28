(() => {
  const root = document.documentElement
  const note = document.getElementById('scroll-note')
  const stage = document.querySelector('.home-stage')
  const sheet = document.querySelector('.home-sheet')

  const themes = ['light', 'dark']
  let themeIdx = 0

  function setTheme(name) {
    root.dataset.previewTheme = name
    document.body.dataset.previewTheme = name
    document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.themeBtn === name)
    })
    const art = document.getElementById('home-stage-art-img')
    if (art) {
      const next = name === 'dark' ? art.dataset.artDark : art.dataset.artLight
      if (next && art.getAttribute('src') !== next) {
        art.setAttribute('src', next)
      }
    }
  }

  function setPhotoBg(on) {
    document.body.dataset.photoBg = on ? 'true' : 'false'
    const btn = document.getElementById('btn-photo-bg')
    if (btn) {
      btn.classList.toggle('is-on', on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.textContent = on ? '背景开' : '背景关'
    }
    if (!on) {
      root.style.setProperty('--page-photo-bg-blur-live', '0px')
    } else {
      updatePhotoBgBlur()
    }
  }

  function scrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0
  }

  /** 首屏只露 peek 行：负 margin = peek 区总高度 */
  function measureCoverPeek() {
    const peek = document.querySelector('.cover-story__peek')
    if (!peek) return
    const peekHeight = Math.ceil(peek.offsetHeight)
    root.style.setProperty('--cover-peek-height', `${peekHeight}px`)
    root.style.setProperty('--cover-lift', `${-peekHeight}px`)
  }

  function parseBlurPx() {
    const raw = getComputedStyle(root).getPropertyValue('--page-photo-bg-blur-user').trim()
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : 6
  }

  /** 滚动驱动照片背景 blur：首屏通透 → 随纸面上滑增至用户设定值 */
  function updatePhotoBgBlur() {
    const scrollLayer = document.querySelector('.home-scroll-layer')
    if (!scrollLayer) return
    const userBlur = parseBlurPx()
    const top = scrollLayer.getBoundingClientRect().top
    const viewport = root.clientHeight
    const start = viewport * 0.92
    const end = viewport * 0.42
    const t = (start - top) / (start - end)
    const progress = Math.min(1, Math.max(0, t))
    const liveBlur = userBlur * progress
    root.style.setProperty('--page-photo-bg-blur-live', `${liveBlur}px`)
  }

  function updateNote() {
    if (!note || !stage || !sheet) return
    const y = scrollY()
    const viewportBottom = root.clientHeight
    const scrollLayer = document.querySelector('.home-scroll-layer')
    const layerTop = scrollLayer?.getBoundingClientRect().top ?? viewportBottom

    if (y < 8) {
      note.textContent =
        '首屏：导航栏同款照片背景，blur=0（通透）；无额外 backdrop-filter 毛玻璃层。'
      return
    }
    if (layerTop > viewportBottom * 0.55) {
      note.textContent = '纸面上滑中：背景 blur 随滚动增至你在导航栏设定的强度。'
      return
    }
    note.textContent = '纸面覆盖中：照片背景仍 fixed，由纸面上推盖住。'
  }

  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn))
  })

  document.getElementById('btn-photo-bg')?.addEventListener('click', () => {
    const on = document.body.dataset.photoBg !== 'true'
    setPhotoBg(on)
  })

  document.getElementById('btn-scroll-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  document.getElementById('btn-scroll-sheet')?.addEventListener('click', () => {
    sheet?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  document.getElementById('btn-scroll-film')?.addEventListener('click', () => {
    document.querySelector('.home-film')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })

  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    themeIdx = (themeIdx + 1) % themes.length
    setTheme(themes[themeIdx])
  })

  window.addEventListener('scroll', () => {
    updatePhotoBgBlur()
    updateNote()
  }, { passive: true })
  window.addEventListener('resize', () => {
    measureCoverPeek()
    updatePhotoBgBlur()
    updateNote()
  })

  setTheme('light')
  setPhotoBg(true)
  measureCoverPeek()
  updatePhotoBgBlur()
  updateNote()

  /** 等 Noto Serif / Great Vibes 就绪后再露出问候语，避免强制刷新时回退字闪现 */
  function markFontsReady() {
    document.body.classList.remove('fonts-pending')
    document.body.classList.add('fonts-ready')
    measureCoverPeek()
  }

  const fontReady = document.fonts
    ? Promise.all([
        document.fonts.load('900 italic 4rem "Noto Serif SC"'),
        document.fonts.load('400 4rem "Great Vibes"'),
      ]).then(() => document.fonts.ready)
    : Promise.resolve()

  fontReady.then(markFontsReady).catch(markFontsReady)
  /* 兜底：网络慢也不无限隐藏 */
  window.setTimeout(markFontsReady, 2500)
})()
