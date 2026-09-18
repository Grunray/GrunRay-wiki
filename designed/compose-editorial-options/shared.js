(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const pageBtns = document.querySelectorAll('.page-btn')
  const variants = document.querySelectorAll('.variant')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    now: '对照用。玻璃刊头 + 药丸下拉 + 胶囊 btn-accent。不合 DESIGN 纸面纪律。',
    a: '次级刊头 + 双栏纸面。控件走 editorial AppSelect / .ed-action。推荐撰写可共用。',
    b: '单栏同构 /now。心情/状态用 .ed-cats 下划线。改动更小、预览下沉。',
  }

  function sync() {
    const scheme = document.body.dataset.scheme
    const page = document.body.dataset.page
    variants.forEach((v) => {
      v.classList.toggle('on', v.dataset.scheme === scheme && v.dataset.page === page)
    })
    if (hint) hint.textContent = hints[scheme] || ''
    document.querySelectorAll('.meta-note').forEach((n) => {
      n.style.display = n.classList.contains('scheme-' + scheme) ? 'block' : 'none'
    })
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    sync()
  }

  function setTheme(id) {
    document.documentElement.setAttribute('data-preview-theme', id)
    themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.theme === id))
  }

  function setPage(id) {
    document.body.dataset.page = id
    pageBtns.forEach((b) => b.classList.toggle('on', b.dataset.page === id))
    sync()
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  pageBtns.forEach((b) => b.addEventListener('click', () => setPage(b.dataset.page)))

  document.querySelectorAll('.ed-cats').forEach((row) => {
    row.addEventListener('click', (event) => {
      const btn = event.target.closest('.ed-cat')
      if (!btn || !row.contains(btn)) return
      row.querySelectorAll('.ed-cat').forEach((el) => el.classList.toggle('is-on', el === btn))
    })
  })

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.select-ed-btn')
    const wrap = btn && btn.closest('.select-ed')
    document.querySelectorAll('.select-ed.is-open').forEach((el) => {
      if (el !== wrap) el.classList.remove('is-open')
    })
    if (wrap) wrap.classList.toggle('is-open')
    const option = event.target.closest('.select-ed-option')
    if (option) {
      const box = option.closest('.select-ed')
      const label = box.querySelector('[data-select-label]')
      box.querySelectorAll('.select-ed-option').forEach((el) => el.classList.toggle('is-on', el === option))
      if (label) label.textContent = option.textContent.trim()
      box.classList.remove('is-open')
    }
  })

  document.querySelectorAll('[data-live-source]').forEach((source) => {
    const id = source.getAttribute('data-live-source')
    const targets = document.querySelectorAll(`[data-live-target="${id}"]`)
    const syncText = () => {
      const text = source.value.trim() || '正文预览将显示在这里…'
      targets.forEach((el) => {
        el.textContent = text
      })
    }
    source.addEventListener('input', syncText)
    syncText()
  })

  document.querySelectorAll('[data-mock-save]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      const root = btn.closest('.variant')
      const ok = root && root.querySelector('[data-save-ok]')
      if (ok) ok.hidden = false
    })
  })

  document.querySelectorAll('[data-mock-publish]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      const root = btn.closest('.variant')
      const ok = root && root.querySelector('[data-publish-ok]')
      if (ok) ok.hidden = false
    })
  })

  sync()
})()
