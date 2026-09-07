(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const roleBtns = document.querySelectorAll('.role-btn')
  const pageBtns = document.querySelectorAll('.page-btn')
  const variants = document.querySelectorAll('.variant')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    now: '对照用。大图 Hero、渐变标题、玻璃 intro 与左色条卡片。不合 DESIGN 纸面纪律。',
    b: '刊头对齐列表页。关着名录通栏，点开压缩左侧揭详情。合入时复用 XiqiSplitLayout。',
  }

  function setSplitHint(root, open) {
    const el = root && root.querySelector('[data-split-hint]')
    if (!el) return
    el.textContent = open ? 'Esc 或右上角关闭' : '点一行看详情'
  }

  function closeSplit(root) {
    if (!root) return
    root.classList.remove('is-open')
    root.querySelectorAll('[data-select-row]').forEach((r) => r.classList.remove('is-on'))
    setSplitHint(root, false)
  }

  function fillDetail(root, row) {
    const set = (key, value) => {
      const el = root.querySelector(`[data-detail="${key}"]`)
      if (!el) return
      if (key === 'link') {
        el.hidden = value !== '1'
        return
      }
      el.textContent = value || ''
    }
    const srcMeta = row.querySelector('.row-meta')
    const destMeta = root.querySelector('[data-detail="meta"]')
    if (srcMeta && destMeta) destMeta.innerHTML = srcMeta.innerHTML
    const srcCover = row.querySelector('.thumb img')
    const destCover = root.querySelector('[data-detail="cover"]')
    if (destCover) {
      if (srcCover && srcCover.getAttribute('src')) {
        destCover.src = srcCover.src
        destCover.hidden = false
      } else {
        destCover.removeAttribute('src')
        destCover.hidden = true
      }
    }
    set('title', row.dataset.title)
    set('body', row.dataset.body)
    set('link', row.dataset.link)
  }

  function sync() {
    const scheme = document.body.dataset.scheme
    const page = document.body.dataset.page
    variants.forEach((v) => {
      const on = v.dataset.scheme === scheme && v.dataset.page === page
      v.classList.toggle('on', on)
      if (!on) closeSplit(v.querySelector('.ed-split'))
    })
    if (hint) hint.textContent = hints[scheme] || ''
    document.querySelectorAll('.meta-note').forEach((n) => {
      n.style.display = n.classList.contains('scheme-' + scheme) ? 'block' : 'none'
    })
    requestAnimationFrame(() => requestAnimationFrame(updateVisibleCatLines))
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    sync()
  }

  function setPage(id) {
    document.body.dataset.page = id
    pageBtns.forEach((b) => b.classList.toggle('on', b.dataset.page === id))
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

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  pageBtns.forEach((b) => b.addEventListener('click', () => setPage(b.dataset.page)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  roleBtns.forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)))

  document.querySelectorAll('[data-select-row]').forEach((row) => {
    row.addEventListener('click', (e) => {
      e.preventDefault()
      const root = row.closest('.ed-split')
      if (!root) return
      fillDetail(root, row)
      root.classList.add('is-open')
      root.querySelectorAll('[data-select-row]').forEach((r) => r.classList.toggle('is-on', r === row))
      setSplitHint(root, true)
      requestAnimationFrame(() => requestAnimationFrame(updateVisibleCatLines))
    })
  })

  document.querySelectorAll('[data-close-detail]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeSplit(btn.closest('.ed-split'))
      requestAnimationFrame(() => requestAnimationFrame(updateVisibleCatLines))
    })
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    document.querySelectorAll('.ed-split.is-open').forEach(closeSplit)
  })

  /* SYNC：与 BlogView.updateCategoryLine 同一算法；合入后抽共用，留言 Inbox 工具也接这套。 */
  function updateCatLine(group) {
    const line = group.querySelector('.ed-cat-line')
    const on = group.querySelector('.ed-cat.is-on')
    if (!line || !on || group.offsetParent === null) return
    const g = group.getBoundingClientRect()
    const b = on.getBoundingClientRect()
    line.style.width = `${b.width}px`
    line.style.transform = `translateX(${b.left - g.left}px)`
    line.style.opacity = '1'
  }

  function updateVisibleCatLines() {
    document.querySelectorAll('.variant.on [data-cat-group]').forEach(updateCatLine)
  }

  document.querySelectorAll('[data-cat-group]').forEach((group) => {
    group.querySelectorAll('.ed-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.ed-cat').forEach((b) => b.classList.toggle('is-on', b === btn))
        updateCatLine(group)
      })
    })
  })

  window.addEventListener('resize', updateVisibleCatLines)

  sync()
})()
