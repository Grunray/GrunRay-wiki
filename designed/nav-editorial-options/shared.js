(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const compactBtns = document.querySelectorAll('.compact-btn')
  const hint = document.querySelector('.preview-switcher .hint')
  const header = document.querySelector('.glass-nav')

  const hints = {
    now: '对照：绿色填充药丸 + 圆形开关键。结构可留，这层皮不要。',
    a: '推荐。外胶囊保留；首页/分组/工具都改成字 + 细线。点选与悬停看下划线。',
    b: '和 A 一样去按钮感，项与项用 / 分节，更像报刊目录。',
    c: '更进一步：拆掉左右内胶囊，整栏只剩文字和细线。收缩动画仍在。',
    d: '按钮组 hairline 弧线。创作下拉是内收 hairline 的 R 角纸面卡；悬停对齐笔记目录行。下方抽出件可对稿。',
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    if (hint) hint.textContent = hints[id] || ''
  }

  function setTheme(id) {
    document.documentElement.setAttribute('data-preview-theme', id)
    themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.theme === id))
  }

  function setCompact(on) {
    document.body.dataset.compact = on ? 'true' : 'false'
    if (header) header.setAttribute('data-nav-compact', on ? 'true' : 'false')
    compactBtns.forEach((b) => b.classList.toggle('on', (b.dataset.compact === 'true') === on))
  }

  function setActive(id) {
    document.body.dataset.active = id
    const home = document.querySelector('.nav-home')
    if (home) {
      if (id === 'home') home.setAttribute('aria-current', 'page')
      else home.removeAttribute('aria-current')
    }
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  compactBtns.forEach((b) =>
    b.addEventListener('click', () => setCompact(b.dataset.compact === 'true')),
  )

  document.querySelectorAll('[data-set-active]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      setActive(el.dataset.setActive)
    })
  })

  document.querySelectorAll('.nav-group').forEach((group) => {
    const id = group.dataset.group
    group.addEventListener('mouseenter', () => {
      document.body.dataset.open = id
    })
    group.addEventListener('mouseleave', () => {
      if (document.body.dataset.open === id) document.body.dataset.open = ''
    })
    group.addEventListener('focusin', () => {
      document.body.dataset.open = id
    })
    group.addEventListener('focusout', (e) => {
      if (!group.contains(e.relatedTarget)) {
        if (document.body.dataset.open === id) document.body.dataset.open = ''
      }
    })
  })

  document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool
      if (tool === 'theme') {
        const next =
          document.documentElement.getAttribute('data-preview-theme') === 'dark' ? 'light' : 'dark'
        setTheme(next)
        return
      }
      if (tool === 'locale') {
        btn.textContent = btn.textContent.trim() === 'EN' ? '中' : 'EN'
        return
      }
      if (tool === 'overflow') {
        const on = !btn.classList.contains('is-on')
        btn.classList.toggle('is-on', on)
        btn.setAttribute('aria-expanded', on ? 'true' : 'false')
        return
      }
      if (tool === 'splash') return
      const on = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.classList.toggle('is-on', on)
    })
  })

  setScheme(document.body.dataset.scheme || 'a')
  setCompact(document.body.dataset.compact === 'true')
  setActive(document.body.dataset.active || 'home')
})()
