(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const roleBtns = document.querySelectorAll('.role-btn')
  const pageBtns = document.querySelectorAll('.page-btn')
  const variants = document.querySelectorAll('.variant')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    now: '对照用。居中渐变标题 + 玻璃欢迎卡 + 封面模糊卡片，不合 DESIGN 纸面纪律。',
    a: '一级列表刊头，对齐 /projects /messages。申请 / 审核是下划线字。合入时保留站点图标预览。',
  }

  function sync() {
    const scheme = document.body.dataset.scheme
    const page = document.body.dataset.page
    variants.forEach((v) => {
      const on = v.dataset.scheme === scheme && v.dataset.page === page
      v.classList.toggle('on', on)
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

  function setRole(id) {
    document.body.dataset.role = id
    roleBtns.forEach((b) => b.classList.toggle('on', b.dataset.role === id))
  }

  function setPage(id) {
    document.body.dataset.page = id
    pageBtns.forEach((b) => b.classList.toggle('on', b.dataset.page === id))
    sync()
  }

  function faviconFromUrl(raw) {
    try {
      const host = new URL(raw).hostname
      if (!host) return ''
      return 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(host)
    } catch {
      return ''
    }
  }

  function bindIconPreview(root) {
    const urlInput = root.querySelector('[data-icon-url]')
    const explicitInput = root.querySelector('[data-icon-explicit]')
    const box = root.querySelector('.icon-preview')
    const img = root.querySelector('[data-icon-img]')
    if (!box || !img) return

    const refresh = () => {
      const explicit = (explicitInput && explicitInput.value.trim()) || ''
      const fromUrl = urlInput ? faviconFromUrl(urlInput.value.trim()) : ''
      const src = explicit || fromUrl
      if (!src) {
        box.hidden = true
        img.removeAttribute('src')
        return
      }
      img.src = src
      box.hidden = false
    }

    urlInput && urlInput.addEventListener('input', refresh)
    explicitInput && explicitInput.addEventListener('input', refresh)
    refresh()
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  roleBtns.forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)))
  pageBtns.forEach((b) => b.addEventListener('click', () => setPage(b.dataset.page)))

  document.querySelectorAll('[data-go-page]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      setPage(el.dataset.goPage)
    })
  })

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy || ''
      if (navigator.clipboard && text) {
        void navigator.clipboard.writeText(text).then(() => {
          const prev = btn.textContent
          btn.textContent = '已复制'
          setTimeout(() => {
            btn.textContent = prev
          }, 1200)
        })
      }
    })
  })

  document.querySelectorAll('.admin-tabs, .now-admin-tabs').forEach((row) => {
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn || !row.contains(btn)) return
      row.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b === btn))
    })
  })

  document.querySelectorAll('[data-icon-preview]').forEach(bindIconPreview)

  setRole(document.body.dataset.role || 'guest')
  setPage(document.body.dataset.page || 'list')
  setScheme(document.body.dataset.scheme || 'a')
})()
