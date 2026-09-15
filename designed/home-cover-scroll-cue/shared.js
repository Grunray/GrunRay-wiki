(() => {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const motionBtns = document.querySelectorAll('.motion-btn')
  const hint = document.querySelector('.preview-switcher .hint')

  const hints = {
    a: '加高 peek：SCROLL · 下读 → hairline → COVER STORY。',
    b: '加高 peek：方章 01 ↓ → hairline → COVER STORY。',
    c: '加高 peek：↓ 最新文章 → hairline → COVER STORY。',
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

  function setMotion(on) {
    document.body.dataset.motion = on ? 'on' : 'off'
    motionBtns.forEach((b) => b.classList.toggle('on', (b.dataset.motion === 'on') === on))
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))
  motionBtns.forEach((b) =>
    b.addEventListener('click', () => setMotion(b.dataset.motion === 'on')),
  )
})()
