(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const roleBtns = document.querySelectorAll('.role-btn')
  const variants = document.querySelectorAll('.variant')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    now: '对照用。居中渐变标题 + 玻璃卡，不合 DESIGN 纸面纪律。',
    a: '与 121/122 刊头同语汇。改动量最小，推荐先看。',
    b: '左写信、右读信。桌面杂志栏，窄屏会叠回单列。',
    c: '登记簿编号行。最像印刷品，登录与头像最克制。',
    d: '一级列表页造型。无返回链；Write 用欢迎句；列表上是 Inbox 行。',
  }

  function syncVariants() {
    const scheme = document.body.dataset.scheme
    variants.forEach((v) => {
      v.classList.toggle('on', v.dataset.scheme === scheme)
    })
    if (hint) hint.textContent = hints[scheme] || ''
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    syncVariants()
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
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  roleBtns.forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)))

  function replyPrefix(wrap) {
    const name = (wrap.dataset.replyTo || '').trim()
    return name ? `回复 ${name}：` : ''
  }

  function openReply(wrap) {
    wrap.classList.add('is-open')
    const ta = wrap.querySelector('textarea')
    const prefix = replyPrefix(wrap)
    if (ta && prefix && !ta.value.startsWith(prefix)) ta.value = prefix
    if (ta) ta.focus()
  }

  function closeReply(wrap) {
    wrap.classList.remove('is-open')
    const ta = wrap.querySelector('textarea')
    if (ta) ta.value = ''
  }

  document.querySelectorAll('[data-reply-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('[data-reply]')
      if (!wrap) return
      if (wrap.querySelector('[data-reply-cancel]')) {
        openReply(wrap)
        return
      }
      wrap.classList.toggle('is-open')
      btn.textContent = wrap.classList.contains('is-open') ? '取消回复' : '回复'
    })
  })

  document.querySelectorAll('[data-reply-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('[data-reply]')
      if (wrap) closeReply(wrap)
    })
  })

  document.querySelectorAll('[data-thread-fold]').forEach((thread) => {
    const wrap = thread.closest('.thread-wrap')
    const btn = wrap && wrap.querySelector('.thread-fold')
    const items = [...thread.children].filter((el) => el.tagName === 'LI')
    const limit = Number(thread.dataset.threadFold) || 2
    const extra = items.length - limit
    if (!btn || extra <= 0) return

    function paintLabel(expanded) {
      const label = btn.querySelector('.thread-fold-label')
      if (label) label.textContent = expanded ? '收起其余回复' : '展开其余回复'
      btn.classList.toggle('is-expanded', expanded)
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    }

    function collapse() {
      items.forEach((li, i) => {
        li.classList.toggle('is-folded', i >= limit)
      })
      thread.classList.remove('is-expanded')
      btn.hidden = false
      paintLabel(false)
    }

    function expand() {
      items.forEach((li) => {
        li.classList.remove('is-folded')
      })
      thread.classList.add('is-expanded')
      paintLabel(true)
    }

    btn.addEventListener('click', () => {
      if (thread.classList.contains('is-expanded')) collapse()
      else expand()
    })
    collapse()
  })

  document.querySelectorAll('textarea[data-count]').forEach((ta) => {
    const out = ta.parentElement.querySelector('[data-count-out]')
    const max = Number(ta.getAttribute('maxlength') || 500)
    const paint = () => {
      if (out) out.textContent = `${ta.value.length} / ${max} 字`
    }
    ta.addEventListener('input', paint)
    paint()
  })

  setRole(document.body.dataset.role || 'guest')
  setScheme(document.body.dataset.scheme || 'a')
})()
