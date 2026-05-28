/**
 * GrunRay Web 实验 exp.3 — jQuery + 原生 JS 页面交互
 * 在 exp.2 样式与 HTML5 能力基础上，脚本外置并强化交互。
 */
;(function ($) {
  'use strict'

  if (!$) {
    console.error('jQuery 未加载')
    return
  }

  var STORAGE = {
    theme: 'exp3.theme',
    volume: 'exp3.audioVol',
    accent: 'exp3.accent',
    prefs: 'exp3.prefs',
    diary: 'exp3.diary',
  }

  var DEFAULT_TRACKS = [
    { url: './The Best Of 咪.mp3', title: 'The Best Of 咪', artist: '本地' },
    { url: './The Other Side of Paradise.mp3', title: 'The Other Side of Paradise', artist: '本地' },
  ]

  /** @type {{url:string,title:string,artist:string,fromDrop?:boolean,dropId?:string}[]} */
  var tracks = []
  var currentIndex = 0
  var sleepDeadline = null
  var barPhase = 0
  var playlistFilter = ''

  var $html = $('html')
  var $mainAudio = $('#mainAudio')
  var $vinylDeck = $('#vinylDeck')
  var $playlistEl = $('#playlistEl')
  var ringCanvas = document.getElementById('ringCanvas')
  var ringCtx = ringCanvas ? ringCanvas.getContext('2d') : null
  var $svgBars = $('#svgBars')

  // —— 工具 —— //

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00'
    var m = Math.floor(sec / 60)
    var s = Math.floor(sec % 60)
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  function showToast(message, type) {
    var cls = type === 'error' ? 'toast toast--error' : 'toast'
    var $t = $('<div>', { class: cls, text: message })
    $('#toastHost').append($t)
    $t.hide().fadeIn(220).delay(2400).fadeOut(280, function () {
      $(this).remove()
    })
  }

  function setPlayerStatus(text) {
    $('#playerStatus').text(text)
  }

  // —— 主题与偏好 —— //

  function loadTheme() {
    var t = localStorage.getItem(STORAGE.theme)
    $html.attr('data-theme', t === 'dark' || t === 'light' ? t : 'light')
  }

  function saveTheme() {
    localStorage.setItem(STORAGE.theme, $html.attr('data-theme') || 'light')
  }

  function loadAccent() {
    try {
      var c = localStorage.getItem(STORAGE.accent)
      if (c && /^#[0-9a-fA-F]{6}$/.test(c)) {
        document.documentElement.style.setProperty('--color-accent', c)
        $('#accentPick').val(c)
      }
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE.prefs)
      if (!raw) return
      var p = JSON.parse(raw)
      if (p.mood) $('#mood').val(p.mood)
      if (p.quickVol != null) $('#quickVol').val(p.quickVol)
      if (p.listenDate) $('#listenDate').val(p.listenDate)
    } catch (e) {}
  }

  function savePrefs(data) {
    try {
      localStorage.setItem(STORAGE.prefs, JSON.stringify(data))
    } catch (e) {}
  }

  // —— 表单校验（非空 + 数字范围 + 日期格式） —— //

  function validateQuickVol() {
    var raw = $('#quickVol').val()
    if (raw === '' || raw == null) return { ok: false, msg: '音量预设不能为空' }
    var n = parseInt(String(raw), 10)
    if (!isFinite(n) || n < 0 || n > 100) return { ok: false, msg: '音量预设须在 0～100 之间' }
    return { ok: true, value: n }
  }

  function validateSleepMin() {
    var raw = $('#sleepMin').val()
    if (raw === '' || raw == null) return { ok: true, value: 0 }
    var n = parseInt(String(raw), 10)
    if (!isFinite(n) || n < 0 || n > 240) return { ok: false, msg: '睡眠定时须在 0～240 分钟之间' }
    return { ok: true, value: n }
  }

  function validateDateInput($el, label) {
    var v = $.trim($el.val())
    if (!v) return { ok: false, msg: label + '不能为空' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, msg: label + '格式应为 YYYY-MM-DD' }
    var d = new Date(v + 'T00:00:00')
    if (isNaN(d.getTime())) return { ok: false, msg: label + '不是有效日期' }
    return { ok: true, value: v }
  }

  function showFormFeedback(html, isError) {
    var $fb = $('#formFeedback')
    $fb.removeClass('is-error is-ok').addClass(isError ? 'is-error' : 'is-ok').html(html)
    if ($fb.is(':hidden')) {
      $fb.prop('hidden', false).hide().slideDown(200)
    } else {
      $fb.stop(true, true).slideDown(200)
    }
  }

  function validatePrefsForm() {
    var vol = validateQuickVol()
    if (!vol.ok) {
      showFormFeedback(vol.msg, true)
      $('#quickVol').trigger('focus')
      return false
    }
    var date = validateDateInput($('#listenDate'), '收听日期')
    if (!date.ok) {
      showFormFeedback(date.msg, true)
      $('#listenDate').trigger('focus')
      return false
    }
    var data = {
      mood: $('#mood').val(),
      quickVol: vol.value,
      listenDate: date.value,
    }
    savePrefs(data)
    showFormFeedback(
      '<strong>校验通过</strong><br>曲风：' +
        data.mood +
        '；音量预设：' +
        data.quickVol +
        '%；日期：' +
        data.listenDate,
      false
    )
    showToast('收听偏好已保存')
    return true
  }

  // —— 播放与进度 —— //

  function pctAudio() {
    var el = $mainAudio.get(0)
    if (!el) return 0
    var d = el.duration
    if (!isFinite(d) || d <= 0) return 0
    return (el.currentTime / d) * 100
  }

  function setAudioPct(pct) {
    var el = $mainAudio.get(0)
    if (!el) return
    var d = el.duration
    if (!isFinite(d) || d <= 0) return
    el.currentTime = Math.min(d, Math.max(0, (pct / 100) * d))
  }

  function drawRing(p) {
    if (!ringCtx || !ringCanvas) return
    var cx = ringCanvas.width / 2
    var cy = ringCanvas.height / 2
    var r = 72
    var lw = 10
    var pct = Math.max(0, Math.min(1, p))
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#a0ccab'
    var border = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()
    ringCtx.clearRect(0, 0, ringCanvas.width, ringCanvas.height)
    ringCtx.beginPath()
    ringCtx.arc(cx, cy, r, 0, Math.PI * 2)
    ringCtx.strokeStyle = border || '#a8c9b4'
    ringCtx.lineWidth = lw
    ringCtx.globalAlpha = 0.3
    ringCtx.stroke()
    ringCtx.globalAlpha = 1
    if (pct > 0) {
      ringCtx.beginPath()
      ringCtx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
      ringCtx.strokeStyle = accent
      ringCtx.lineWidth = lw
      ringCtx.lineCap = 'round'
      ringCtx.stroke()
    }
  }

  function ringFromEvent(clientX, clientY) {
    var rect = ringCanvas.getBoundingClientRect()
    var x = clientX - rect.left - rect.width / 2
    var y = clientY - rect.top - rect.height / 2
    var ang = Math.atan2(y, x) + Math.PI / 2
    if (ang < 0) ang += Math.PI * 2
    return ang / (Math.PI * 2)
  }

  function updateProgressUi() {
    var p = pctAudio()
    $('#aFill').css('width', p + '%')
    $('#aThumb').css('left', p + '%')
    $('#aProgressHit').attr('aria-valuenow', String(Math.round(p)))
    $('#aCur').text(formatTime($mainAudio.get(0).currentTime))
    $('#aDur').text(formatTime($mainAudio.get(0).duration || 0))
    drawRing(p / 100)
    var lm = Math.round($mainAudio.get(0).volume * 100)
    $('#loudMeter').val(Math.min(100, lm + Math.round(Math.sin(barPhase) * 8)))
    try {
      var el = $mainAudio.get(0)
      var d = el.duration
      if (isFinite(d) && d > 0 && el.buffered.length > 0) {
        var end = el.buffered.end(el.buffered.length - 1)
        $('#aBuffer').val(Math.round((end / d) * 100))
      } else $('#aBuffer').val(0)
    } catch (e) {
      $('#aBuffer').val(0)
    }
  }

  function mergeMixToVolumes() {
    var mv = parseFloat($('#mainVolRange').val()) || 0
    var fx = parseFloat($('#fxDepthRange').val()) || 0
    var baseA = parseFloat($('#aVol').val()) || 0.4
    $mainAudio.get(0).volume = Math.min(1, Math.max(0, baseA * (0.45 + mv * 0.55) * (0.72 + fx * 0.28)))
  }

  function updateMixOut() {
    var mv = parseFloat($('#mainVolRange').val()) || 0
    var fx = parseFloat($('#fxDepthRange').val()) || 0
    $('#mixOut').text(String(Math.round(mv * 100 + fx * 40)))
  }

  function filteredTracks() {
    var q = playlistFilter.toLowerCase()
    if (!q) return tracks.map(function (t, i) {
      return { track: t, index: i }
    })
    return tracks
      .map(function (t, i) {
        return { track: t, index: i }
      })
      .filter(function (item) {
        var t = item.track
        var hay = ((t.title || '') + ' ' + (t.artist || '') + ' ' + t.url).toLowerCase()
        return hay.indexOf(q) >= 0
      })
  }

  function renderPlaylist() {
    $playlistEl.empty()
    if (!tracks.length) {
      $('#nowTrackTitle').text('未选择曲目')
      $('#nowTrackArtist').text('请配置 media/playlist.json 或拖入音频')
      $playlistEl.append($('<li>', { class: 'playlist-empty', text: '（无曲目）请配置 media/playlist.json 或拖入音频' }))
      return
    }
    var list = filteredTracks()
    if (!list.length) {
      $playlistEl.append($('<li>', { class: 'playlist-empty', text: '没有匹配的曲目' }))
      return
    }
    list.forEach(function (item) {
      var i = item.index
      var t = item.track
      var label = (t.title || t.url) + (t.artist ? ' — ' + t.artist : '')
      var $btn = $('<button>', { type: 'button', text: label })
      if (i === currentIndex) $btn.addClass('is-current')
      var $li = $('<li>').append($btn)
      $playlistEl.append($li)
    })
  }

  function loadCurrentTrack() {
    var t = tracks[currentIndex]
    if (!t) return
    $mainAudio.attr('src', t.url)
    $mainAudio.get(0).play().catch(function () {})
    $('#nowTrackTitle').text(t.title || '未命名')
    $('#nowTrackArtist').text(t.artist || '—')
    $('#aPlay').text('⏸')
    setPlayerStatus('正在播放：' + (t.title || '未命名'))
  }

  function initSvgBars() {
    $svgBars.empty()
    for (var i = 0; i < 12; i++) {
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      r.setAttribute('x', String(10 + i * 15))
      r.setAttribute('y', '20')
      r.setAttribute('width', '10')
      r.setAttribute('height', '8')
      r.setAttribute('rx', '2')
      $svgBars.append(r)
    }
  }

  function tickSvgBars() {
    barPhase += 0.18
    var playing = !$mainAudio.get(0).paused
    $svgBars.children().each(function (i) {
      var h = 8 + (playing ? Math.abs(Math.sin(barPhase + i * 0.4)) * 28 : 4)
      this.setAttribute('y', String(40 - h))
      this.setAttribute('height', String(h))
    })
  }

  // —— 收听日记（动态 DOM） —— //

  function loadDiary() {
    try {
      var raw = localStorage.getItem(STORAGE.diary)
      if (!raw) return []
      var arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr : []
    } catch (e) {
      return []
    }
  }

  function saveDiary(entries) {
    try {
      localStorage.setItem(STORAGE.diary, JSON.stringify(entries))
    } catch (e) {}
  }

  function renderListenLog() {
    var entries = loadDiary()
    var $log = $('#listenLog').empty()
    if (!entries.length) {
      $log.append($('<li>', { class: 'listen-log-empty', text: '暂无日记，添加一条吧' }))
      return
    }
    entries.slice(0, 12).forEach(function (e) {
      var $card = $('<li>', { class: 'listen-log-item' })
      $card.append($('<time>', { class: 'listen-log-date', text: e.date }))
      $card.append($('<p>', { class: 'listen-log-note', text: e.note }))
      if (e.track) $card.append($('<span>', { class: 'listen-log-track', text: '曲目：' + e.track }))
      var $rm = $('<button>', { type: 'button', class: 'btn btn--sm listen-log-rm', text: '删除' })
      $rm.data('id', e.id)
      $card.append($rm)
      $log.append($card)
    })
  }

  function addDiaryEntry(date, note) {
    var entries = loadDiary()
    var track = tracks[currentIndex]
    entries.unshift({
      id: 'd-' + Date.now(),
      date: date,
      note: note,
      track: track ? track.title : '',
    })
    saveDiary(entries)
    renderListenLog()
  }

  // —— 拖放文件 —— //

  function addDropPreview(file) {
    var id = 'f-' + Math.random().toString(36).slice(2)
    var $card = $('<div>', { class: 'drop-card', 'data-id': id })
    if (file.type.indexOf('image/') === 0) {
      var url = URL.createObjectURL(file)
      $card.append($('<img>', { alt: file.name, src: url }))
      $card.data('objUrl', url)
    } else {
      var name = file.name.length > 18 ? file.name.slice(0, 18) + '…' : file.name
      $card.append($('<div>', { class: 'ph', text: name }))
    }
    var $rm = $('<button>', { type: 'button', class: 'rm', 'aria-label': '移除', text: '×' })
    $card.append($rm)
    $('#dropList').append($card.hide().fadeIn(300))

    if (file.type.indexOf('audio/') === 0) {
      var audioUrl = URL.createObjectURL(file)
      $card.data('objUrl', audioUrl)
      tracks.push({
        url: audioUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: '本地文件',
        fromDrop: true,
        dropId: id,
      })
      renderPlaylist()
      currentIndex = tracks.length - 1
      loadCurrentTrack()
      showToast('已添加音频：' + file.name)
    }
  }

  function removeDropCard(id) {
    var $card = $('.drop-card[data-id="' + id + '"]')
    var objUrl = $card.data('objUrl')
    if (objUrl) URL.revokeObjectURL(objUrl)
    $card.fadeOut(200, function () {
      $(this).remove()
    })
    tracks = tracks.filter(function (t) {
      return t.dropId !== id
    })
    if (currentIndex >= tracks.length) currentIndex = Math.max(0, tracks.length - 1)
    renderPlaylist()
    showToast('已从列表移除')
  }

  // —— 选项卡切换 —— //

  function switchNavTab(tabId) {
    if ($('.nav-tab.is-active').data('tab') === tabId) return
    $('.nav-tab').removeClass('is-active').attr('aria-selected', 'false')
    $('.nav-tab[data-tab="' + tabId + '"]').addClass('is-active').attr('aria-selected', 'true')
    $('.nav-panel').each(function () {
      var $p = $(this)
      var match = $p.data('panel') === tabId
      if (match) {
        $p.prop('hidden', false).hide().fadeIn(220)
      } else {
        $p.fadeOut(180, function () {
          $p.prop('hidden', true)
        })
      }
    })
  }

  // —— 事件绑定 —— //

  function bindNavTabs() {
    $('.nav-tab').on('click', function () {
      switchNavTab($(this).data('tab'))
    })
  }

  function bindSearch() {
    $('#playlistSearch')
      .on('input', function () {
        playlistFilter = $.trim($(this).val())
        renderPlaylist()
      })
      .on('keydown', function (e) {
        if (e.key === 'Escape') {
          $(this).val('')
          playlistFilter = ''
          renderPlaylist()
        }
      })
  }

  function bindForms() {
    $('#validatePrefs').on('click', function () {
      validatePrefsForm()
    })

    $('#quickVol').on('input change', function () {
      var r = validateQuickVol()
      $(this).toggleClass('is-invalid', !r.ok && $(this).val() !== '')
    })

    $('#sleepMin').on('change', function () {
      var r = validateSleepMin()
      $(this).toggleClass('is-invalid', !r.ok)
      if (!r.ok) showToast(r.msg, 'error')
    })

    $('#applyQuickVol').on('click', function () {
      var r = validateQuickVol()
      if (!r.ok) {
        showToast(r.msg, 'error')
        return
      }
      $('#aVol').val(String(r.value / 100))
      mergeMixToVolumes()
      try {
        localStorage.setItem(STORAGE.volume, $('#aVol').val())
      } catch (e) {}
      showToast('音量已设为 ' + r.value + '%')
    })

    $('#diaryForm').on('submit', function (e) {
      e.preventDefault()
      var $hint = $('#diaryFormHint')
      var dateR = validateDateInput($('#diaryDate'), '日期')
      var note = $.trim($('#diaryNote').val())
      if (!dateR.ok) {
        $hint.text(dateR.msg).addClass('is-error')
        return
      }
      if (!note) {
        $hint.text('收听感想不能为空').addClass('is-error')
        $('#diaryNote').trigger('focus')
        return
      }
      $hint.removeClass('is-error').text('')
      addDiaryEntry(dateR.value, note)
      $('#diaryNote').val('')
      showToast('日记已添加')
      $hint.text('已保存到本地列表')
    })

    $('#mixForm').on('input change', function () {
      updateMixOut()
      mergeMixToVolumes()
    })
  }

  function bindAsideCollapse() {
    var expanded = true
    $('#asideCollapseBtn').on('click', function () {
      var $body = $('#asideToolsBody')
      expanded = !expanded
      if (expanded) {
        $body.stop(true, true).slideDown(280)
        $(this).text('收起工具').attr('aria-expanded', 'true')
      } else {
        $body.stop(true, true).slideUp(260)
        $(this).text('展开工具').attr('aria-expanded', 'false')
      }
    })
  }

  function bindBackToTop() {
    var $btn = $('#backToTop')
    $(window).on('scroll', function () {
      if ($(this).scrollTop() > 280) {
        if ($btn.is(':hidden')) $btn.prop('hidden', false).fadeIn(200)
      } else {
        $btn.fadeOut(200, function () {
          $btn.prop('hidden', true)
        })
      }
    })
    $btn.on('click', function () {
      $('html, body').animate({ scrollTop: 0 }, 420)
    })
  }

  function bindAudio() {
    try {
      var sv = localStorage.getItem(STORAGE.volume)
      if (sv != null) {
        var n = parseFloat(sv)
        if (isFinite(n)) $('#aVol').val(String(Math.min(1, Math.max(0, n))))
      }
    } catch (e) {}
    mergeMixToVolumes()

    $mainAudio.on('timeupdate', function () {
      updateProgressUi()
      if (sleepDeadline && Date.now() >= sleepDeadline) {
        $mainAudio.get(0).pause()
        sleepDeadline = null
        showToast('睡眠定时已到，已暂停播放')
      }
    })
    $mainAudio.on('loadedmetadata', updateProgressUi)
    $mainAudio.on('play', function () {
      $('#aPlay').text('⏸')
      $vinylDeck.addClass('is-playing')
      var sm = parseInt($('#sleepMin').val(), 10)
      if (isFinite(sm) && sm > 0) sleepDeadline = Date.now() + sm * 60000
      setPlayerStatus('播放中')
    })
    $mainAudio.on('pause', function () {
      $('#aPlay').text('▶')
      $vinylDeck.removeClass('is-playing')
      setPlayerStatus('已暂停')
    })
    $mainAudio.on('ended', function () {
      if (currentIndex < tracks.length - 1) {
        currentIndex++
        loadCurrentTrack()
        renderPlaylist()
      } else {
        setPlayerStatus('播放结束')
      }
    })

    $('#aVol').on('input change', function () {
      $mainAudio.get(0).volume = parseFloat($(this).val())
      mergeMixToVolumes()
      try {
        localStorage.setItem(STORAGE.volume, $(this).val())
      } catch (e) {}
    })
  }

  function bindProgressPointer() {
    var dragging = false
    var $hit = $('#aProgressHit')

    function seekFromClientX(clientX) {
      var $rail = $hit.find('.progress-rail')
      if (!$rail.length) return
      var rect = $rail.get(0).getBoundingClientRect()
      var pct = ((clientX - rect.left) / rect.width) * 100
      setAudioPct(Math.min(100, Math.max(0, pct)))
      updateProgressUi()
    }

    $hit.on('pointerdown', function (e) {
      if (e.button !== 0) return
      dragging = true
      this.setPointerCapture(e.pointerId)
      seekFromClientX(e.clientX)
    })
    $hit.on('pointermove', function (e) {
      if (!dragging) return
      seekFromClientX(e.clientX)
    })
    $hit.on('pointerup pointercancel', function () {
      dragging = false
    })
    $hit.on('keydown', function (e) {
      if (e.key === 'ArrowRight') {
        setAudioPct(pctAudio() + 2)
        updateProgressUi()
      } else if (e.key === 'ArrowLeft') {
        setAudioPct(pctAudio() - 2)
        updateProgressUi()
      }
    })

    $('#ringCanvas').on('click', function (e) {
      var fr = ringFromEvent(e.clientX, e.clientY)
      setAudioPct(fr * 100)
      updateProgressUi()
    })
  }

  function bindTransport() {
    $('#aPlay').on('click', function () {
      if (!tracks.length) {
        showToast('请先选择或添加曲目', 'error')
        return
      }
      var el = $mainAudio.get(0)
      if (el.paused) {
        if (!el.src) loadCurrentTrack()
        el.play().catch(function () {})
      } else el.pause()
    })

    $('#aPrev').on('click', function () {
      if (currentIndex > 0) {
        currentIndex--
        loadCurrentTrack()
        renderPlaylist()
      }
    })

    $('#aNext').on('click', function () {
      if (currentIndex < tracks.length - 1) {
        currentIndex++
        loadCurrentTrack()
        renderPlaylist()
      }
    })
  }

  function bindTheme() {
    $('#themeToggle').on('click', function () {
      var next = $html.attr('data-theme') === 'dark' ? 'light' : 'dark'
      $html.attr('data-theme', next)
      saveTheme()
      drawRing(pctAudio() / 100)
      showToast(next === 'dark' ? '已切换深色主题' : '已切换浅色主题')
    })

    $('#accentPick').on('input change', function () {
      var c = $(this).val()
      document.documentElement.style.setProperty('--color-accent', c)
      try {
        localStorage.setItem(STORAGE.accent, c)
      } catch (e) {}
      drawRing(pctAudio() / 100)
    })
  }

  function bindGeo() {
    var $btn = $('#geoBtn')
    if (!navigator.geolocation) {
      $('#geoStatus').text('当前环境不支持 Geolocation API')
      $btn.prop('disabled', true)
      return
    }
    $btn.on('click', function () {
      $('#geoStatus').text('正在请求定位权限…')
      $('#geoHint').text('')
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude
          var lon = pos.coords.longitude
          $('#geoStatus').text('纬度 ' + lat.toFixed(4) + '，经度 ' + lon.toFixed(4))
          var hint = ''
          if (lat > 45) hint = '高纬度地区：适合节奏舒缓的原声与氛围音乐。'
          else if (lat > 20) hint = '中纬度：可尝试轻快原声与轻电子。'
          else if (lat > -20) hint = '低纬度：推荐明亮节拍与热带感律动。'
          else hint = '南半球季候：试试 Lo-Fi 与暖色爵士。'
          if (Math.abs(lon) > 100) hint += ' 偏内陆经度区：适合长时间专注播放列表。'
          $('#geoHint').text(hint)
          showToast('定位成功')
        },
        function () {
          $('#geoStatus').text('无法获取定位（用户拒绝或不可用）')
          $('#geoHint').text('')
          showToast('定位失败', 'error')
        },
        { enableHighAccuracy: false, timeout: 10000 }
      )
    })
  }

  function bindDropZone() {
    var $zone = $('#dropZone')
    $zone.on('dragenter dragover', function (e) {
      e.preventDefault()
      $zone.addClass('is-over')
    })
    $zone.on('dragleave drop', function (e) {
      e.preventDefault()
      if (e.type === 'drop') {
        var files = e.originalEvent.dataTransfer.files
        for (var i = 0; i < files.length; i++) addDropPreview(files[i])
      }
      $zone.removeClass('is-over')
    })

    $('#dropList').on('click', '.rm', function () {
      var id = $(this).closest('.drop-card').data('id')
      removeDropCard(id)
    })
  }

  function bindPlaylistHover() {
    $playlistEl
      .on('mouseenter', 'li button', function () {
        $(this).addClass('is-hover')
      })
      .on('mouseleave', 'li button', function () {
        $(this).removeClass('is-hover')
      })
      .on('click', 'li button', function () {
        var idx = $(this).closest('li').index()
        var list = filteredTracks()
        if (!list[idx]) return
        currentIndex = list[idx].index
        loadCurrentTrack()
        renderPlaylist()
      })
  }

  function bindListenLog() {
    $('#listenLog').on('click', '.listen-log-rm', function () {
      var id = $(this).data('id')
      var entries = loadDiary().filter(function (e) {
        return e.id !== id
      })
      saveDiary(entries)
      var $item = $(this).closest('.listen-log-item')
      $item.slideUp(200, function () {
        renderListenLog()
      })
      showToast('日记已删除')
    })
  }

  function fetchPlaylist() {
    return $.ajax({ url: './media/playlist.json', cache: false, dataType: 'json' })
      .done(function (data) {
        if (!data.tracks || !data.tracks.length) return
        data.tracks.forEach(function (item) {
          if (!item.url) return
          tracks.push({
            url: item.url,
            title: item.title || item.url,
            artist: item.artist || '',
          })
        })
      })
      .fail(function () {})
  }

  function ensureDefaultTracks() {
    if (tracks.length) return
    DEFAULT_TRACKS.forEach(function (t) {
      tracks.push({ url: t.url, title: t.title, artist: t.artist })
    })
  }

  function initDefaultDates() {
    var today = new Date().toISOString().slice(0, 10)
    if (!$('#listenDate').val()) $('#listenDate').val(today)
    if (!$('#diaryDate').val()) $('#diaryDate').val(today)
  }

  function boot() {
    loadTheme()
    loadAccent()
    loadPrefs()
    initDefaultDates()
    initSvgBars()

    bindNavTabs()
    bindSearch()
    bindForms()
    bindAsideCollapse()
    bindBackToTop()
    bindAudio()
    bindProgressPointer()
    bindTransport()
    bindTheme()
    bindGeo()
    bindDropZone()
    bindPlaylistHover()
    bindListenLog()

    updateMixOut()
    mergeMixToVolumes()
    renderListenLog()

    fetchPlaylist().always(function () {
      ensureDefaultTracks()
      renderPlaylist()
      if (tracks.length) loadCurrentTrack()
      $vinylDeck.toggleClass('is-playing', !$mainAudio.get(0).paused)
    })

    setInterval(tickSvgBars, 120)
    showToast('页面已就绪', 'ok')
  }

  $(boot)
})(window.jQuery)
