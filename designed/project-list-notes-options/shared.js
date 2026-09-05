(function () {
  const MOCK_TAGS_REST = ['Vue', 'Flask', 'Python', 'Spark', 'Kotlin', 'Android', '算法']

  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const variants = document.querySelectorAll('.variant')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const selects = document.querySelectorAll('[data-tag-select]')

  function setScheme(id) {
    closeAllSelects()
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    variants.forEach((v) => v.classList.toggle('on', v.dataset.scheme === id))
    requestAnimationFrame(() => syncAllCatLines())
  }

  function syncCatLine(group) {
    const line = group.querySelector('.ed-cat-line')
    const on = group.querySelector('.ed-cat.is-on')
    if (!line || !on) return
    const g = group.getBoundingClientRect()
    const b = on.getBoundingClientRect()
    line.style.width = `${b.width}px`
    line.style.transform = `translateX(${b.left - g.left}px)`
    line.style.opacity = '1'
  }

  function syncAllCatLines() {
    document.querySelectorAll('[data-ed-cats]').forEach(syncCatLine)
  }

  function setTheme(id) {
    document.documentElement.setAttribute('data-preview-theme', id)
    themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.theme === id))
  }

  function menuEl(root) {
    return root.querySelector('[role="listbox"]')
  }

  function triggerEl(root) {
    return root.querySelector('button[aria-haspopup="listbox"]')
  }

  function closeSelect(root) {
    root.classList.remove('is-open')
    const menu = menuEl(root)
    const btn = triggerEl(root)
    if (menu) menu.hidden = true
    if (btn) btn.setAttribute('aria-expanded', 'false')
  }

  function closeAllSelects(except) {
    selects.forEach((root) => {
      if (root !== except) closeSelect(root)
    })
  }

  function openSelect(root) {
    closeAllSelects(root)
    root.classList.add('is-open')
    const menu = menuEl(root)
    const btn = triggerEl(root)
    if (menu) menu.hidden = false
    if (btn) btn.setAttribute('aria-expanded', 'true')
  }

  function fillMenu(root) {
    const menu = menuEl(root)
    if (!menu || menu.dataset.ready === '1') return
    const isEd = menu.classList.contains('ed-menu')
    const optionClass = isEd ? 'ed-option' : 'tool-option'
    const tags = [isEd ? '全部' : '全部标签', ...MOCK_TAGS_REST]
    menu.innerHTML = tags.map((label, i) => {
      const active = i === 0 ? ' is-active' : ''
      return `<button type="button" class="${optionClass}${active}" role="option" aria-selected="${i === 0}" data-value="${label}">${label}</button>`
    }).join('')
    menu.dataset.ready = '1'
  }

  selects.forEach((root) => {
    fillMenu(root)
    const btn = triggerEl(root)
    const menu = menuEl(root)
    const label = root.querySelector('[data-tag-label]')
    btn?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      if (root.classList.contains('is-open')) closeSelect(root)
      else openSelect(root)
    })
    menu?.addEventListener('click', (ev) => {
      const opt = ev.target.closest('[data-value]')
      if (!opt || !menu.contains(opt)) return
      menu.querySelectorAll('[data-value]').forEach((el) => {
        const on = el === opt
        el.classList.toggle('is-active', on)
        el.setAttribute('aria-selected', on ? 'true' : 'false')
      })
      if (label) label.textContent = opt.dataset.value
      closeSelect(root)
    })
  })

  document.addEventListener('mousedown', (ev) => {
    selects.forEach((root) => {
      if (!root.contains(ev.target)) closeSelect(root)
    })
  })

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeAllSelects()
  })

  schemeBtns.forEach((b) => {
    b.addEventListener('click', () => setScheme(b.dataset.scheme))
  })
  themeBtns.forEach((b) => {
    b.addEventListener('click', () => setTheme(b.dataset.theme))
  })

  document.querySelectorAll('[data-page-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.pageJump)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.querySelectorAll('[data-page-jump]').forEach((el) => {
        el.classList.toggle('on', el === btn)
      })
      requestAnimationFrame(() => syncAllCatLines())
    })
  })

  document.querySelectorAll('[data-archive-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.classList.toggle('is-on')
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      const label = btn.querySelector('[data-archive-label]')
      if (label) label.textContent = on ? '显示' : '隐藏'
    })
  })

  document.querySelectorAll('[data-ed-cats]').forEach((group) => {
    group.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.ed-cat')
      if (!btn || !group.contains(btn)) return
      group.querySelectorAll('.ed-cat').forEach((el) => {
        const on = el === btn
        el.classList.toggle('is-on', on)
        el.setAttribute('aria-pressed', on ? 'true' : 'false')
      })
      syncCatLine(group)
    })
  })

  window.addEventListener('resize', syncAllCatLines)
  requestAnimationFrame(() => syncAllCatLines())
})()
