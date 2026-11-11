(() => {
  const gap = document.getElementById('gap')
  const output = document.getElementById('gapValue')
  gap.addEventListener('input', () => {
    const value = Number(gap.value)
    document.documentElement.style.setProperty('--spread-gap', value + 'px')
    output.value = value + 'px'
  })
})()
