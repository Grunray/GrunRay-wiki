/* 首页底层图 · 开屏动画原型 shared.js
 * 方案切换 / 重播 / 动效档切换；方案 B 的线稿描绘编排（WAAPI） */
(() => {
  const mock = document.getElementById('mock')
  const descEl = document.getElementById('schemeDesc')
  const replayBtn = document.getElementById('replayBtn')
  const motionBtn = document.getElementById('motionBtn')
  const schemeBtns = Array.from(document.querySelectorAll('.scheme-btn'))

  const DESCS = {
    a: '方案 A · 扇启晨光 —— 底图自远景亮起，扇形以顶点为轴扫开 39°，一道暖光随扇缘扫过；落定后墨晕呼吸、整图轻浮。改动最小：只动 clip-path / opacity / filter，DOM 不变，可直接落在现有 .home-stage-art 三层上。',
    b: '方案 B · 纸上描绘 —— 354 笔线稿从扇轴起笔自绘（stroke-dashoffset），画定后交叉淡入 WebP 底图，SVG 仅作临时描绘层、不留热路径。最还原活动开场的「描绘感」，改动最大：需一次性取线稿 + WAAPI 编排。',
    c: '方案 C · 云开雾散 —— 底图升起、扇形自轴展开，底部双层纸云向两侧散开、纸鸟掠过；一缕残云常驻漂移。对应海灯节云层开合 + 琉形蜃境纸剧场。DOM 加雾带 / 纸鸟装饰层，改动中等。',
    d: '方案 D · 墨起扇鸣 —— A+B 两段式：线稿先从扇轴起笔自绘（同 B），画定后扇形随暖光扫开、底图着色（同 A 的扫扇与光束）。开场即高潮的完整仪式，时长最长（约 3.2s）。改动 = B 的描绘编排 + A 的扫扇层。',
  }

  let scheme = 'a'
  let motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'minimal' : 'full'

  /* ---------- 方案 B：线稿准备 ---------- */
  const drawLayer = document.getElementById('drawLayer')
  let linePaths = null // [{el, len, delay, dur, anim}]
  let bTimers = []

  function prepareLineArt() {
    if (linePaths) return true
    const raw = window.__GR_LINE_ART__
    if (!raw) return false
    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return false
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    drawLayer.appendChild(svg)

    const APEX = { x: 1270.93, y: 0 }
    const paths = Array.from(svg.querySelectorAll('path'))
    const items = []
    let maxDist = 1
    for (const el of paths) {
      let len = 0
      let cx = APEX.x
      let cy = APEX.y
      try {
        len = el.getTotalLength()
        const bb = el.getBBox()
        cx = bb.x + bb.width / 2
        cy = bb.y + bb.height / 2
      } catch { /* 忽略异常 path */ }
      const dist = Math.hypot(cx - APEX.x, cy - APEX.y)
      if (dist > maxDist) maxDist = dist
      items.push({ el, len, dist })
    }
    for (const it of items) {
      it.delay = (it.dist / maxDist) * 1100 // 距扇轴越远起笔越晚
      it.dur = Math.min(340 + it.len * 0.35, 1050)
    }
    linePaths = items
    return true
  }

  function resetLinePaths() {
    if (!linePaths) return
    for (const p of linePaths) {
      p.anim?.cancel()
      p.el.style.strokeDasharray = String(p.len)
      p.el.style.strokeDashoffset = String(p.len)
    }
  }

  function teardownDraw() {
    bTimers.forEach(clearTimeout)
    bTimers = []
    mock.classList.remove('b-inked')
    mock.classList.remove('d-inked')
    if (linePaths) {
      for (const p of linePaths) p.anim?.cancel()
    }
  }

  /** B / D 共用描绘段：起笔后 phase2At 挂 inkedClass（交叉淡化 / 扫扇光束），hideLayerAt 撤描绘层 */
  function playDraw(inkedClass, phase2At, hideLayerAt) {
    if (!prepareLineArt()) {
      // 取不到线稿时退化为底图淡入
      mock.classList.add(inkedClass)
      return
    }
    drawLayer.style.display = ''
    drawLayer.style.opacity = ''
    mock.classList.remove('b-inked')
    mock.classList.remove('d-inked')
    resetLinePaths()
    // 双 rAF 确保 dashoffset 初值生效后再起动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const p of linePaths) {
          p.anim = p.el.animate(
            [{ strokeDashoffset: p.len }, { strokeDashoffset: 0 }],
            {
              duration: p.dur,
              delay: p.delay,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              fill: 'forwards',
            },
          )
        }
        bTimers.push(setTimeout(() => mock.classList.add(inkedClass), phase2At))
        bTimers.push(
          setTimeout(() => {
            drawLayer.style.display = 'none'
          }, hideLayerAt),
        )
      })
    })
  }

  function playB() {
    playDraw('b-inked', 2000, 3100)
  }

  function playD() {
    playDraw('d-inked', 1950, 3250)
  }

  /* ---------- 播放控制 ---------- */
  function replay() {
    mock.classList.remove('playing')
    teardownDraw()
    void mock.offsetWidth // 强制 reflow，重启动画
    if (motion === 'minimal') {
      if (scheme === 'b') mock.classList.add('b-inked')
      if (scheme === 'd') mock.classList.add('d-inked')
    } else {
      if (scheme === 'b') playB()
      if (scheme === 'd') playD()
    }
    mock.classList.add('playing')
  }

  function setScheme(next) {
    scheme = next
    mock.dataset.scheme = next
    descEl.textContent = DESCS[next]
    schemeBtns.forEach((b) => b.classList.toggle('active', b.dataset.scheme === next))
    replay()
  }

  function setMotion(next) {
    motion = next
    mock.classList.toggle('minimal', next === 'minimal')
    motionBtn.textContent = next === 'minimal' ? '动效：瞬切' : '动效：完整'
    replay()
  }

  schemeBtns.forEach((b) => b.addEventListener('click', () => setScheme(b.dataset.scheme)))
  replayBtn.addEventListener('click', replay)
  motionBtn.addEventListener('click', () => setMotion(motion === 'minimal' ? 'full' : 'minimal'))

  /* ---------- 启动 ---------- */
  mock.classList.toggle('minimal', motion === 'minimal')
  if (motion === 'minimal') motionBtn.textContent = '动效：瞬切'
  descEl.textContent = DESCS[scheme]
  // 首进延迟一点再播，模拟开屏蜗牛退去后的节奏
  setTimeout(replay, 350)
})()
