(function () {
  'use strict'

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>',
    create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14 19c0-2.2 1.8-4 4-4"/></svg>',
    xiqi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21c-4-3.5-7-7.2-7-11a7 7 0 0 1 14 0c0 3.8-3 7.5-7 11z"/><path d="M12 7v6M9 10h6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 17l-5-5-4 4-2-2-5 5"/></svg>',
    trail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 18c3-6 8-10 16-12"/><path d="M14 6l2 2"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg>',
    overflow: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
  }

  function icon(name) {
    return `<span class="ico" aria-hidden="true">${ICONS[name] || ''}</span>`
  }

  function navPill(label, iconName, opts) {
    const cls = ['shell-pill', 'shell-pill--nav', opts?.active ? 'is-active' : ''].filter(Boolean).join(' ')
    const chevron = opts?.group
      ? `<span class="ico chevron" aria-hidden="true">${ICONS.chevron}</span>`
      : ''
    return `<button type="button" class="${cls}">${icon(iconName)}<span>${label}</span>${chevron}</button>`
  }

  function toolPill(iconName, opts) {
    const cls = [
      'shell-pill',
      opts?.on ? 'is-on' : '',
      opts?.theme ? 'shell-pill--theme' : '',
      opts?.text ? 'shell-pill--text' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const body = opts?.text || icon(iconName)
    return `<button type="button" class="${cls}" title="${opts?.title || ''}">${body}</button>`
  }

  function headerHtml(status) {
    const navCapsule = `
      <div class="shell-capsule shell-capsule--nav" aria-label="主导航">
        ${navPill('首页', 'home', { active: true })}
        <span class="shell-capsule__divider" aria-hidden="true"></span>
        ${navPill('创作', 'create', { group: true })}
        ${navPill('社区', 'community', { group: true })}
        ${navPill('栖息', 'xiqi', { group: true })}
      </div>`

    const toolsCapsule = `
      <div class="shell-capsule shell-capsule--tools" aria-label="工具">
        ${toolPill('theme', { on: true, theme: true, title: '主题' })}
        <span class="shell-capsule__divider" aria-hidden="true"></span>
        ${toolPill('photo', { on: true, title: '照片背景' })}
        ${toolPill('trail', { on: true, title: '光标拖尾' })}
        ${toolPill('music', { on: true, title: '音乐' })}
        <span class="shell-capsule__divider" aria-hidden="true"></span>
        ${toolPill('', { text: 'EN', title: '语言' })}
      </div>`

    const statusHtml =
      status === 'bad'
        ? '<span class="status-pill status-pill--bad">⚠ 左侧导航可能挤成两行</span>'
        : '<span class="status-pill status-pill--good">✓ 单行容纳（工具全展开）</span>'

    return `
      <header class="mock-header">
        <div class="mock-header-inner">
          <div class="mock-header-left">
            <div class="mock-brand-row">
              <span class="mock-avatar" aria-hidden="true"></span>
              <span class="mock-brand">GrunRay</span>
            </div>
            ${navCapsule}
          </div>
          <div class="mock-header-spacer" aria-hidden="true"></div>
          <div class="mock-header-right">
            ${toolsCapsule}
            ${toolPill('overflow', { title: '更多' })}
          </div>
        </div>
      </header>
      <div class="scroll-filler">
        <h3>向下滚动以离开 sticky 顶栏，再滚到下一方案</h3>
        <p>预览宽度固定约 <strong>1140px</strong>（红虚线内），模拟桌面窄窗 + 右侧工具全部在顶栏展开时的拥挤场景。${statusHtml}</p>
        <div class="lorem">
          <p>纸面顶栏在工具全展开时，左侧分段胶囊与右侧工具胶囊争夺同一行宽度。若药丸 padding 与字号偏大，或左右簇之间没有弹性留白，「首页 | 创作·社区·栖息」会先折行，破坏方案 G 的整齐分段感。</p>
          <p>本页上下分块展示两套对策：A 整体缩小药丸与胶囊内边距；B 保持字号体感，用 header 中部弹性间距把左右推开，并加宽胶囊水平 padding。选定后再合入 AppShell / SiteNav / nav-toolbar.css。</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div>
      </div>`
  }

  function mount() {
    const baseline = document.getElementById('mount-baseline')
    const schemeA = document.getElementById('mount-a')
    const schemeB = document.getElementById('mount-b')
    if (baseline) baseline.innerHTML = headerHtml('bad')
    if (schemeA) schemeA.innerHTML = headerHtml('good')
    if (schemeB) schemeB.innerHTML = headerHtml('good')
  }

  mount()
})()
