(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const hint = document.querySelector('.preview-switcher .hint')
  const toast = document.getElementById('toast')

  const hints = {
    a: '对照：现生产深色令牌。',
    b: '极深绿黑底 + 黄绿 accent。最贴近提取色。',
    c: '占比第一的深青绿当页底，accent 再提亮一档。',
    d: '已选定 D，合入生产深色档。已归档点为灰金。',
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    if (hint) hint.textContent = hints[id] || ''
    document.querySelectorAll('.meta-note').forEach((n) => {
      n.style.display = n.classList.contains('scheme-' + id) ? 'block' : 'none'
    })
  }

  function showToast(text) {
    if (!toast) return
    toast.textContent = text
    toast.classList.add('show')
    clearTimeout(window.__toastTimer)
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 1200)
  }

  async function copyHex(hex) {
    try {
      await navigator.clipboard.writeText(hex)
      showToast('已复制 ' + hex)
    } catch {
      showToast(hex)
    }
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))

  document.querySelectorAll('[data-hex]').forEach((el) => {
    el.addEventListener('click', () => copyHex(el.dataset.hex))
  })

  setScheme(document.body.dataset.scheme || 'a')
})()
