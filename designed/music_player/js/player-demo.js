/**
 * 音乐播放器方案预览 — 轻量交互（播放/进度/主题）
 */
(function () {
  var DEMO_DURATION = 176 // 2:56

  function pad(n) {
    return String(n).padStart(2, '0')
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0
    var m = Math.floor(sec / 60)
    var s = Math.floor(sec % 60)
    return m + ':' + pad(s)
  }

  function vinylHtml(interactive) {
    var cls = 'vinyl-deck' + (interactive ? ' is-interactive' : '')
    var overlay = interactive
      ? '<span class="vinyl-play-overlay" aria-hidden="true">▶</span>'
      : ''
    return (
      '<div class="' +
      cls +
      '" data-vinyl aria-live="polite">' +
      overlay +
      '<div class="vinyl-arm-wrap" aria-hidden="true">' +
      '<svg class="vinyl-arm-svg" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="86" cy="17" r="10.5" fill="#f8fafc"/>' +
      '<path d="M86 27.5 Q54 46 24 102 L20 106" stroke="#f8fafc" stroke-width="5.5" stroke-linecap="round" fill="none"/>' +
      '<rect x="10" y="102" width="20" height="14" rx="2" fill="#f8fafc"/>' +
      '<rect x="14" y="116" width="4" height="8" rx="1" fill="#cbd5e1"/>' +
      '</svg></div>' +
      '<div class="vinyl-platter-outer"><div class="vinyl-record">' +
      '<div class="vinyl-grooves" aria-hidden="true"></div>' +
      '<div class="vinyl-label-sparkle"><div class="vinyl-diamond-inner" aria-hidden="true"></div></div>' +
      '</div></div></div>'
    )
  }

  function volIconSvg() {
    return (
      '<svg class="floating-music__vol-icon" viewBox="0 0 100 100" aria-hidden="true">' +
      '<path fill="currentColor" d="M10,30 L30,30 L60,10 L60,90 L30,70 L10,70 Z"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="8" d="M75,35 A20,20 0 0 1 75,65"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="8" d="M85,25 A30,30 0 0 1 85,75"/>' +
      '</svg>'
    )
  }

  function chromeHtml() {
    return (
      '<div class="floating-music__chrome">' +
      '<div class="floating-music__drag-bar" aria-hidden="true"></div>' +
      '<div class="floating-music__chrome-row">' +
      '<p class="floating-music__title" lang="en">音乐运动员(bushi</p>' +
      '<button type="button" class="floating-music__minimize-btn" aria-label="收起">×</button>' +
      '</div></div>'
    )
  }

  function trackHeadHtml() {
    return (
      '<div class="floating-music__track-head">' +
      '<p class="floating-music__track-name" data-track-name>The Other Side of Paradise</p>' +
      '<span class="floating-music__count" data-track-count>第 1 / 2 首</span>' +
      '</div>'
    )
  }

  function progressInnerHtml() {
    return (
      '<div class="floating-music__time-row">' +
      '<span data-time-cur>0:00</span><span data-time-dur>' +
      formatTime(DEMO_DURATION) +
      '</span></div>' +
      '<div class="floating-music__progress-hit" data-progress-hit role="slider" aria-label="播放进度">' +
      '<div class="floating-music__progress-rail">' +
      '<div class="floating-music__progress-fill" data-progress-fill style="width:0%"></div>' +
      '<div class="floating-music__progress-thumb" data-progress-thumb style="left:0%"></div>' +
      '</div></div>'
    )
  }

  function progressHtml() {
    return '<div class="floating-music__progress-wrap" data-progress-wrap>' + progressInnerHtml() + '</div>'
  }

  function glassTransportHtml(showPlay) {
    var playBtn = showPlay
      ? '<button type="button" class="floating-music__play" data-play-btn aria-label="播放">▶</button>'
      : ''
    return (
      '<div class="floating-music__transport">' +
      '<div class="floating-music__transport-main">' +
      '<button type="button" class="floating-music__skip" data-prev-btn aria-label="上一首">⏮</button>' +
      playBtn +
      '<button type="button" class="floating-music__skip" data-next-btn aria-label="下一首">⏭</button>' +
      '</div>' +
      '<button type="button" class="floating-music__vol-btn" aria-label="音量">' +
      volIconSvg() +
      '</button></div>'
    )
  }

  function exp3TransportHtml() {
    return (
      '<div class="now-bar-body">' +
      '<div class="now-bar-center">' +
      '<button type="button" class="btn-skip" data-prev-btn aria-label="上一首">⏮</button>' +
      '<button type="button" class="now-play-main" data-play-btn aria-label="播放">▶</button>' +
      '<button type="button" class="btn-skip" data-next-btn aria-label="下一首">⏭</button>' +
      '</div>' +
      '<div class="now-bar-right">' +
      '<input type="range" min="0" max="1" step="0.01" value="0.4" aria-label="音量"/>' +
      '</div></div>'
    )
  }

  var schemes = {
    a: {
      className: 'scheme-a',
      wide: false,
      build: function () {
        return (
          chromeHtml() +
          '<div class="floating-music__vinyl-wrap">' +
          vinylHtml(false) +
          '</div>' +
          trackHeadHtml() +
          progressHtml() +
          glassTransportHtml(true)
        )
      },
    },
    b: {
      className: 'scheme-b',
      wide: false,
      build: function () {
        return (
          chromeHtml() +
          '<div class="floating-music__vinyl-wrap">' +
          vinylHtml(true) +
          '</div>' +
          trackHeadHtml() +
          progressHtml() +
          glassTransportHtml(false)
        )
      },
    },
    c: {
      className: 'scheme-c',
      wide: true,
      build: function () {
        return (
          chromeHtml() +
          '<div class="floating-music__vinyl-wrap">' +
          vinylHtml(false) +
          '</div>' +
          trackHeadHtml() +
          '<div class="now-bar-progress-wrap">' +
          progressInnerHtml() +
          '</div>' +
          exp3TransportHtml()
        )
      },
    },
  }

  function wirePlayer(root, schemeKey) {
    var playing = false
    var current = 0
    var raf = 0
    var lastTs = 0

    var vinyl = root.querySelector('[data-vinyl]')
    var playBtn = root.querySelector('[data-play-btn]')
    var prevBtn = root.querySelector('[data-prev-btn]')
    var nextBtn = root.querySelector('[data-next-btn]')
    var fill = root.querySelector('[data-progress-fill]')
    var thumb = root.querySelector('[data-progress-thumb]')
    var timeCur = root.querySelector('[data-time-cur]')
    var progressHit = root.querySelector('[data-progress-hit]')
    var overlay = root.querySelector('.vinyl-play-overlay')

    function setPlaying(next) {
      playing = next
      if (vinyl) vinyl.classList.toggle('is-playing', playing)
      if (playBtn) {
        playBtn.textContent = playing ? '⏸' : '▶'
        playBtn.setAttribute('aria-label', playing ? '暂停' : '播放')
      }
      if (overlay) overlay.textContent = playing ? '⏸' : '▶'
      if (playing) tick(performance.now())
      else cancelAnimationFrame(raf)
    }

    function setProgress(ratio) {
      var pct = Math.max(0, Math.min(1, ratio)) * 100
      if (fill) fill.style.width = pct + '%'
      if (thumb) thumb.style.left = pct + '%'
      if (timeCur) timeCur.textContent = formatTime((pct / 100) * DEMO_DURATION)
      if (progressHit) progressHit.setAttribute('aria-valuenow', String(Math.round(pct)))
    }

    function tick(ts) {
      if (!playing) return
      if (!lastTs) lastTs = ts
      var dt = (ts - lastTs) / 1000
      lastTs = ts
      current = Math.min(DEMO_DURATION, current + dt)
      setProgress(current / DEMO_DURATION)
      if (current >= DEMO_DURATION) {
        setPlaying(false)
        current = 0
        lastTs = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }

    function togglePlay() {
      if (playing) {
        playing = false
        cancelAnimationFrame(raf)
        lastTs = 0
        if (vinyl) vinyl.classList.remove('is-playing')
        if (playBtn) {
          playBtn.textContent = '▶'
          playBtn.setAttribute('aria-label', '播放')
        }
        if (overlay) overlay.textContent = '▶'
      } else {
        lastTs = 0
        setPlaying(true)
      }
    }

    if (playBtn) playBtn.addEventListener('click', togglePlay)
    if (vinyl && schemeKey === 'b') vinyl.addEventListener('click', togglePlay)

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        current = 0
        setProgress(0)
      })
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        current = 0
        setProgress(0)
        setPlaying(true)
      })
    }

    if (progressHit) {
      progressHit.addEventListener('click', function (e) {
        var rail = progressHit.querySelector('.floating-music__progress-rail')
        if (!rail) return
        var rect = rail.getBoundingClientRect()
        var ratio = (e.clientX - rect.left) / rect.width
        current = ratio * DEMO_DURATION
        setProgress(ratio)
      })
    }
  }

  function mountScheme(container, key) {
    var def = schemes[key]
    if (!def || !container) return

    var shell = document.createElement('div')
    shell.className = 'player-shell'
    shell.dataset.scheme = key

    var player = document.createElement('div')
    player.className = 'floating-music' + (def.wide ? ' floating-music--wide' : '') + ' ' + def.className
    player.setAttribute('role', 'region')
    player.setAttribute('aria-label', '音乐播放器 · 方案 ' + key.toUpperCase())
    player.innerHTML = def.build()

    shell.appendChild(player)
    container.appendChild(shell)
    wirePlayer(player, key)
  }

  function initThemeToggle(btn) {
    if (!btn) return
    var root = document.documentElement
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', next)
      btn.textContent = next === 'dark' ? '☀ 浅色' : '🌙 深色'
    })
  }

  window.MusicPlayerDemo = {
    mountScheme: mountScheme,
    initThemeToggle: initThemeToggle,
    schemes: schemes,
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle(document.getElementById('themeToggle'))

    document.querySelectorAll('[data-mount-scheme]').forEach(function (el) {
      mountScheme(el, el.getAttribute('data-mount-scheme'))
    })
  })
})()
