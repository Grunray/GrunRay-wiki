(function () {
  const schemeBtns = document.querySelectorAll('.scheme-btn')
  const pageBtns = document.querySelectorAll('.page-jump')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const variants = document.querySelectorAll('.variant')

  function syncVariants() {
    const scheme = document.body.dataset.scheme
    const page = document.body.dataset.page
    variants.forEach((v) => {
      v.classList.toggle('on', v.dataset.scheme === scheme && v.dataset.page === page)
    })
  }

  function setScheme(id) {
    document.body.dataset.scheme = id
    schemeBtns.forEach((b) => b.classList.toggle('on', b.dataset.scheme === id))
    syncVariants()
  }

  function setPage(id) {
    document.body.dataset.page = id
    pageBtns.forEach((b) => b.classList.toggle('on', b.dataset.page === id))
    syncVariants()
  }

  function setTheme(id) {
    document.documentElement.setAttribute('data-preview-theme', id)
    themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.theme === id))
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  pageBtns.forEach((b) => b.addEventListener('click', () => setPage(b.dataset.page)))
  themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)))

  setPage(document.body.dataset.page || 'blog')
  setScheme(document.body.dataset.scheme || 'a')
})()
