(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const variants = document.querySelectorAll('.variant')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    now: '对照：大图 Hero + 渐变标题 + 玻璃卡 + 药丸奖项。不合入。',
    a: '单栏履历。刊头对齐列表页；经历按时间一列排，最像打印简历。',
    b: '双栏履历。左栏身份/竞赛/证书钉住，右栏经历。扫描联系方式更快。',
    c: '名录履历。经历做成目录行，语言最靠近碎念/友链。',
  }

  function sync() {
    const scheme = document.body.dataset.scheme
    variants.forEach((v) => {
      v.classList.toggle('on', v.dataset.scheme === scheme)
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

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }

  document.querySelectorAll('[data-copy-mail]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copyMail || btn.textContent.trim()
      const hint = btn.parentElement && btn.parentElement.querySelector('.copy-hint')
      const ok = await copyText(text)
      if (!hint || !ok) return
      const prev = hint.textContent
      hint.textContent = '已复制'
      window.setTimeout(() => {
        hint.textContent = prev
      }, 1400)
    })
  })

  setScheme(document.body.dataset.scheme || 'a')
})()
