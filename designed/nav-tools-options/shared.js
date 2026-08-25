(function () {
  'use strict'

  const ICONS = {
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 17l-5-5-4 4-2-2-5 5"/></svg>',
    trail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 18c3-6 8-10 16-12"/><path d="M14 6l2 2"/><path d="M10 10l1.5 1.5"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg>',
    overflow: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>',
    create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14 19c0-2.2 1.8-4 4-4"/></svg>',
    xiqi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21c-4-3.5-7-7.2-7-11a7 7 0 0 1 14 0c0 3.8-3 7.5-7 11z"/><path d="M12 7v6M9 10h6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
  }

  const NAV_ITEMS = [
    { id: 'home', label: '首页', icon: 'home', active: true },
    { id: 'create', label: '创作', icon: 'create', group: true },
    { id: 'community', label: '社区', icon: 'community', group: true },
    { id: 'xiqi', label: '栖息', icon: 'xiqi', group: true },
  ]

  function icon(name) {
    return `<span class="ico" aria-hidden="true">${ICONS[name] || ''}</span>`
  }

  function themeExtraClass() {
    const theme = document.documentElement.getAttribute('data-preview-theme')
    if (theme === 'abstract') return 'tool-btn--theme-abstract'
    if (theme === 'dark') return 'tool-btn--theme-dark'
    return 'tool-btn--theme-light'
  }

  function themeShellClass() {
    const theme = document.documentElement.getAttribute('data-preview-theme')
    if (theme === 'abstract') return 'shell-pill--theme-abstract'
    if (theme === 'dark') return 'shell-pill--theme-dark'
    return 'shell-pill--theme-light'
  }

  function btn(scheme, opts) {
    const activeCls = scheme === 'e' && opts.active ? 'is-active' : ''
    const cls = [
      'tool-btn',
      opts.extra || '',
      opts.on ? 'is-on' : '',
      activeCls,
      opts.playing ? 'is-playing' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const label = opts.label || opts.title || ''
    return `<button type="button" class="${cls}" title="${opts.title || label}" aria-label="${label}">${opts.text || icon(opts.icon)}</button>`
  }

  function shellPill(opts) {
    const cls = [
      'shell-pill',
      opts.tool ? 'shell-pill--tool' : '',
      opts.text ? 'shell-pill--text' : '',
      opts.extra || '',
      opts.active ? 'is-active' : '',
      opts.on ? 'is-on' : '',
      opts.playing ? 'is-playing' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const label = opts.label || opts.title || ''
    const chevron = opts.group
      ? `<span class="shell-pill-chevron" aria-hidden="true">${icon('chevron')}</span>`
      : ''
    const body = opts.text || `${icon(opts.icon)}${opts.label ? `<span class="shell-pill-label">${opts.label}</span>` : ''}${chevron}`
    return `<button type="button" class="${cls}" title="${opts.title || label}" aria-label="${label}">${body}<span class="grow-line" aria-hidden="true"></span></button>`
  }

  function navHtmlE() {
    const home = NAV_ITEMS[0]
    const groups = NAV_ITEMS.slice(1)
    const homeBtn = btn('e', { icon: home.icon, active: home.active, title: home.label })
    const groupBtns = groups
      .map((item) => btn('e', { icon: item.icon, title: `${item.label}（分组）` }))
      .join('')
    return `<nav class="mock-nav-capsule" aria-label="主导航">${homeBtn}<span class="capsule-divider"></span>${groupBtns}</nav>`
  }

  function navHtmlF() {
    return NAV_ITEMS.map((item) =>
      shellPill({
        icon: item.icon,
        label: item.label,
        group: item.group,
        active: item.active,
        title: item.label,
      }),
    ).join('')
  }

  function shellCapsule(inner, extraClass) {
    const cls = ['shell-capsule', extraClass || ''].filter(Boolean).join(' ')
    return `<div class="${cls}">${inner}</div>`
  }

  function navHtmlG() {
    const home = NAV_ITEMS[0]
    const groups = NAV_ITEMS.slice(1)
    const homePill = shellPill({
      icon: home.icon,
      label: home.label,
      active: home.active,
      title: home.label,
    })
    const groupPills = groups
      .map((item) =>
        shellPill({
          icon: item.icon,
          label: item.label,
          group: item.group,
          title: item.label,
        }),
      )
      .join('')
    return shellCapsule(
      `${homePill}<span class="capsule-divider" aria-hidden="true"></span>${groupPills}`,
      'shell-capsule--nav',
    )
  }

  function toolbarHtmlG() {
    const themeClass = themeShellClass()
    return shellCapsule(
      [
        shellPill({ icon: 'theme', on: true, tool: true, extra: themeClass, title: '主题' }),
        '<span class="capsule-divider" aria-hidden="true"></span>',
        shellPill({ icon: 'photo', on: true, tool: true, title: '照片背景' }),
        shellPill({ icon: 'trail', on: true, tool: true, title: '光标拖尾' }),
        shellPill({ icon: 'music', playing: true, tool: true, title: '音乐' }),
        '<span class="capsule-divider" aria-hidden="true"></span>',
        shellPill({ text: 'EN', tool: true, title: '语言' }),
      ].join(''),
      'shell-capsule--tools',
    )
  }

  function toolbarHtml(scheme) {
    const themeClass = themeExtraClass()
    const themeBtn = btn(scheme, { icon: 'theme', on: true, extra: themeClass, title: '主题' })
    const photoBtn = btn(scheme, { icon: 'photo', on: true, title: '照片背景' })
    const trailBtn = btn(scheme, { icon: 'trail', on: true, title: '光标拖尾' })
    const musicBtn = btn(scheme, { icon: 'music', playing: true, title: '音乐' })
    const localeBtn = btn(scheme, { text: 'EN', extra: 'tool-btn--locale', title: '语言' })

    if (scheme === 'b' || scheme === 'd' || scheme === 'e') {
      return `${themeBtn}<span class="capsule-divider"></span>${photoBtn}${trailBtn}${musicBtn}<span class="capsule-divider"></span>${localeBtn}`
    }
    return `<div class="mock-toolbar-cluster">${themeBtn}</div><div class="mock-toolbar-cluster">${photoBtn}${trailBtn}${musicBtn}</div><div class="mock-toolbar-cluster">${localeBtn}</div>`
  }

  function toolbarHtmlF() {
    const themeClass = themeShellClass()
    return [
      shellPill({ icon: 'theme', on: true, tool: true, extra: themeClass, title: '主题' }),
      '<span class="tool-cluster-gap" aria-hidden="true"></span>',
      shellPill({ icon: 'photo', on: true, tool: true, title: '照片背景' }),
      shellPill({ icon: 'trail', on: true, tool: true, title: '光标拖尾' }),
      shellPill({ icon: 'music', playing: true, tool: true, title: '音乐' }),
      '<span class="tool-cluster-gap" aria-hidden="true"></span>',
      shellPill({ text: 'EN', tool: true, title: '语言' }),
    ].join('')
  }

  function statesHtml(scheme) {
    const theme = themeExtraClass()

    const items = [
      { title: '默认', buttons: [btn(scheme, { icon: 'music', title: '默认' })] },
      { title: '悬停', buttons: [btn(scheme, { icon: 'trail', title: '悬停（请鼠标移入顶栏）' })] },
      { title: '开启', buttons: [btn(scheme, { icon: 'photo', on: true, title: '开启' })] },
      { title: '音乐播放', buttons: [btn(scheme, { icon: 'music', playing: true, title: '播放' })] },
      {
        title: '主题当前',
        buttons: [btn(scheme, { icon: 'theme', on: true, extra: theme, title: '主题' })],
      },
      { title: '语言', buttons: [btn(scheme, { text: '中', extra: 'tool-btn--locale', title: '语言' })] },
    ]

    return items
      .map(
        (item) => `
      <article class="state-card">
        <h3>${item.title}</h3>
        <div class="state-row">${item.buttons.join('')}</div>
      </article>`,
      )
      .join('')
  }

  function statesHtmlE() {
    const items = [
      {
        title: '导航·当前页',
        buttons: [btn('e', { icon: 'home', active: true, title: '首页' })],
      },
      {
        title: '导航·分组',
        buttons: [btn('e', { icon: 'create', title: '创作' })],
      },
      ...[
        { title: '工具·默认', buttons: [btn('e', { icon: 'music', title: '默认' })] },
        { title: '工具·开启', buttons: [btn('e', { icon: 'photo', on: true, title: '开启' })] },
        {
          title: '工具·主题',
          buttons: [btn('e', { icon: 'theme', on: true, extra: themeExtraClass(), title: '主题' })],
        },
      ],
    ]

    return items
      .map(
        (item) => `
      <article class="state-card">
        <h3>${item.title}</h3>
        <div class="state-row">${item.buttons.join('')}</div>
      </article>`,
      )
      .join('')
  }

  function statesHtmlF() {
    const theme = themeShellClass()
    const items = [
      {
        title: '导航·当前页',
        buttons: [shellPill({ icon: 'home', label: '首页', active: true })],
      },
      {
        title: '导航·分组',
        buttons: [shellPill({ icon: 'community', label: '社区', group: true })],
      },
      { title: '工具·默认', buttons: [shellPill({ icon: 'music', tool: true, title: '默认' })] },
      { title: '工具·开启', buttons: [shellPill({ icon: 'trail', on: true, tool: true, title: '开启' })] },
      {
        title: '工具·播放',
        buttons: [shellPill({ icon: 'music', playing: true, tool: true, title: '播放' })],
      },
      {
        title: '工具·主题',
        buttons: [shellPill({ icon: 'theme', on: true, tool: true, extra: theme, title: '主题' })],
      },
    ]

    return items
      .map(
        (item) => `
      <article class="state-card">
        <h3>${item.title}</h3>
        <div class="state-row">${item.buttons.join('')}</div>
      </article>`,
      )
      .join('')
  }

  function statesHtmlG() {
    const theme = themeShellClass()
    const navSegment = shellCapsule(
      `${shellPill({ icon: 'home', label: '首页', active: true })}<span class="capsule-divider" aria-hidden="true"></span>${shellPill({ icon: 'create', label: '创作', group: true })}`,
      'shell-capsule--nav',
    )
    const toolSegment = shellCapsule(
      `${shellPill({ icon: 'theme', on: true, tool: true, extra: theme, title: '主题' })}<span class="capsule-divider" aria-hidden="true"></span>${shellPill({ icon: 'music', playing: true, tool: true, title: '音乐' })}`,
      'shell-capsule--tools',
    )
    const items = [
      { title: '导航分段', buttons: [navSegment] },
      { title: '工具分段', buttons: [toolSegment] },
      { title: '药丸·默认', buttons: [shellPill({ icon: 'trail', tool: true, title: '默认' })] },
      { title: '药丸·开启', buttons: [shellPill({ icon: 'photo', on: true, tool: true, title: '开启' })] },
      {
        title: '药丸·当前页',
        buttons: [shellPill({ icon: 'home', label: '首页', active: true })],
      },
      {
        title: '药丸·主题',
        buttons: [shellPill({ icon: 'theme', on: true, tool: true, extra: theme, title: '主题' })],
      },
    ]

    return items
      .map(
        (item) => `
      <article class="state-card">
        <h3>${item.title}</h3>
        <div class="state-row">${item.buttons.join('')}</div>
      </article>`,
      )
      .join('')
  }

  function mount() {
    ;['a', 'b', 'c', 'd'].forEach((s) => {
      const tb = document.getElementById(`toolbar-${s}`)
      const st = document.getElementById(`states-${s}`)
      if (tb) tb.innerHTML = toolbarHtml(s)
      if (st) st.innerHTML = statesHtml(s)
    })

    const navE = document.getElementById('nav-e')
    const tbE = document.getElementById('toolbar-e')
    const stE = document.getElementById('states-e')
    if (navE) navE.innerHTML = navHtmlE()
    if (tbE) tbE.innerHTML = toolbarHtml('e')
    if (stE) stE.innerHTML = statesHtmlE()

    const navF = document.getElementById('nav-f')
    const tbF = document.getElementById('toolbar-f')
    const stF = document.getElementById('states-f')
    if (navF) navF.innerHTML = navHtmlF()
    if (tbF) tbF.innerHTML = toolbarHtmlF()
    if (stF) stF.innerHTML = statesHtmlF()

    const navG = document.getElementById('nav-g')
    const tbG = document.getElementById('toolbar-g')
    const stG = document.getElementById('states-g')
    if (navG) navG.innerHTML = navHtmlG()
    if (tbG) tbG.innerHTML = toolbarHtmlG()
    if (stG) stG.innerHTML = statesHtmlG()

    document.querySelectorAll('[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon')
      if (name && ICONS[name]) el.innerHTML = ICONS[name]
    })
  }

  document.querySelectorAll('.scheme-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.scheme-btn').forEach((x) => x.classList.remove('on'))
      b.classList.add('on')
      const id = b.getAttribute('data-scheme')
      document.querySelectorAll('.variant').forEach((v) => v.classList.remove('on'))
      document.getElementById(`variant-${id}`)?.classList.add('on')
    })
  })

  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach((x) => x.classList.remove('on'))
      b.classList.add('on')
      document.documentElement.setAttribute('data-preview-theme', b.getAttribute('data-theme') || 'light')
      mount()
    })
  })

  mount()
})()
