import './style.css'
import { clouds, cloudById, familyLabels, type CloudFamily } from './data/clouds'
import type { CloudRenderer, Quality } from './engine/CloudRenderer'
import { dailySeed, isStateHash, parseState, serializeState } from './lib/state'
import { requiredElement as $ } from './lib/dom'
import { icon } from './lib/icons'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let state = parseState(location.hash, dailySeed(), reducedMotion.matches)
let selected = cloudById(state.cloud)!
let renderer: CloudRenderer | undefined
let activeFilter = 'all'
let toastTimer = 0
let isImmersive = false

$('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="#" aria-label="cloud 首页">${icon('cloud')}<span>cloud<span class="brand-dot">.</span></span><span class="brand-caption">一部会呼吸的云图鉴</span></a>
    <nav aria-label="主导航"><a class="nav-link active" href="#sky" data-scroll="sky">云端漫游</a><a class="nav-link" href="#atlas" data-scroll="atlas">云的图鉴</a><a class="nav-link" href="./lab/">动态云实验</a><button class="nav-link" id="about-button">关于 cloud</button></nav>
    <button class="quiet-button escape-button" id="immerse">放空一下 ${icon('diagonal')}</button>
  </header>
  <main>
    <section class="sky" id="sky" aria-label="实时云天空">
      <canvas id="sky-canvas" aria-label="由程序实时生成、持续变化的云天空"></canvas>
      <div class="sky-wash"></div>
      <div class="hero-copy">
        <div class="eyebrow"><span class="live-dot"></span><span id="live-label">天空正在缓慢生长</span><span class="eyebrow-line"></span>LIVE SKY</div>
        <h1>抬头，<br>让思绪随云漫游<span>。</span></h1>
        <p>不必去远方，就在这一片天空。<br>看云聚散，等风经过。</p>
        <a class="text-link" href="#atlas" data-scroll="atlas">探索云的世界 ${icon('arrow')}</a>
      </div>
      <button id="settings-toggle" class="settings-toggle" aria-label="天空设置" aria-expanded="false" aria-controls="settings-panel">${icon('settings')}<span>天空设置</span></button>
      <div class="cloud-marker" aria-hidden="true"><span class="marker-cross">+</span><span id="marker-label">Cu · 积云</span></div>
      <div class="render-message" id="render-message" role="status"><span class="loading-ring"></span>正在唤醒天空…</div>
      <aside class="settings-panel" id="settings-panel" aria-label="天空设置" hidden>
        <div class="panel-heading"><span>调一片喜欢的天空</span><button class="icon-button" id="close-settings" aria-label="关闭天空设置">${icon('close')}</button></div>
        <label class="range-label" for="wind">${icon('wind')}风的速度<output id="wind-value">1.0×</output></label>
        <input id="wind" type="range" min="0" max="3" step="0.1" value="${state.wind}">
        <div class="range-ends"><span>静止</span><span>轻快</span></div>
        <label class="range-label" for="density">${icon('cloud')}云的丰盈<output id="density-value">65%</output></label>
        <input id="density" type="range" min="0.2" max="1" step="0.01" value="${state.density}">
        <div class="range-ends"><span>轻盈</span><span>浓厚</span></div>
        <label class="range-label" for="sun">${icon('sun')}日光的温度<output id="sun-value">日间</output></label>
        <input id="sun" type="range" min="0" max="1" step="0.01" value="${state.sun}">
        <div class="range-ends"><span>清晨</span><span>日落</span></div>
        <div class="quality-row"><label for="quality">画面品质</label><select id="quality"><option value="auto">自动适应</option><option value="high">细腻</option><option value="low">流畅</option></select></div>
        <div class="panel-footer"><span>天空种子 <b id="seed-value"></b></span><button class="text-button" id="reset">${icon('reset')}重置</button></div>
      </aside>
      <div class="sky-bottom">
        <div class="current-cloud"><span class="cloud-number" id="cloud-number">01 <span>/ 10</span></span><div><button class="cloud-title-button" id="show-detail"><span id="current-name">积云</span><em id="current-latin">Cumulus</em>${icon('diagonal')}</button><p id="current-tagline"></p></div></div>
        <div class="sky-toolbar"><div class="weather-summary">${icon('wind')}<span id="wind-summary">微风 · 1.0×</span><span class="toolbar-divider"></span>${icon('sun')}<span id="sun-summary">日间</span></div><div class="toolbar-actions"><button class="icon-button" id="pause" title="暂停演化（空格）" aria-label="暂停演化" aria-pressed="false">${icon('pause')}</button><button class="icon-button" id="randomize" title="另一片天空" aria-label="生成另一片天空">${icon('shuffle')}</button><button class="icon-button" id="save" title="保存天空" aria-label="保存天空图片">${icon('download')}</button><button class="icon-button" id="fullscreen" title="沉浸观云" aria-label="进入沉浸模式">${icon('expand')}</button></div></div>
      </div>
      <button id="exit-immersive" class="exit-immersive quiet-button" hidden>${icon('close')}退出观云 <kbd>Esc</kbd></button>
      <div class="immersive-caption" aria-hidden="true">停一停。天空有自己的时间。</div>
    </section>
    <section class="atlas section-shell" id="atlas" aria-labelledby="atlas-heading">
      <div class="section-heading"><div><div class="section-kicker">A FIELD GUIDE TO THE SKY</div><h2 id="atlas-heading">认识天空的十种模样<span>云的图鉴</span></h2></div><div class="gallery-navigation"><span id="gallery-count">10 种云，10 种心情</span><button class="icon-button" id="gallery-prev" aria-label="向前浏览云图鉴">${icon('left')}</button><button class="icon-button" id="gallery-next" aria-label="向后浏览云图鉴">${icon('right')}</button></div></div>
      <div class="filter-row" role="group" aria-label="按云族筛选">
        <button class="filter active" data-filter="all" aria-pressed="true">全部 <span>10</span></button>
        <button class="filter" data-filter="low" aria-pressed="false">低云 <span>2</span></button>
        <button class="filter" data-filter="middle" aria-pressed="false">中云 <span>3</span></button>
        <button class="filter" data-filter="high" aria-pressed="false">高云 <span>3</span></button>
        <button class="filter" data-filter="vertical" aria-pressed="false">垂直发展云 <span>2</span></button>
        <span class="filter-note">每一朵，都是此刻的独一无二</span>
      </div>
      <div class="cloud-gallery" id="cloud-gallery" role="group" aria-label="选择云种">${clouds
        .map(
          (cloud, i) => `
        <button class="cloud-card ${cloud.id === selected.id ? 'selected' : ''}" data-cloud="${cloud.id}" aria-pressed="${cloud.id === selected.id}" aria-label="观赏${cloud.name} ${cloud.latin}">
          <div class="card-sky" data-kind="${cloud.kind}"><img class="cloud-preview" data-preview="${cloud.id}" alt="" hidden><span class="card-index">${String(i + 1).padStart(2, '0')}</span><span class="card-check">${icon('check')}</span><span class="preview-placeholder">${cloud.abbreviation}</span></div>
          <div class="card-copy"><span>${cloud.name}<small>${cloud.abbreviation}</small></span><em>${cloud.latin}</em></div>
        </button>`,
        )
        .join('')}
      </div>
    </section>
    <section class="cloud-detail section-shell" id="cloud-detail" aria-labelledby="detail-name"></section>
    <footer class="site-footer section-shell"><button class="footer-brand" id="footer-about" aria-label="关于 cloud">cloud.</button><span>天空从不重复，云也一样。</span><button class="text-button" id="share">分享这片天空 ${icon('share')}</button></footer>
  </main>
  <dialog id="about-dialog" class="about-dialog"><button class="icon-button dialog-close" id="close-about" aria-label="关闭关于">${icon('close')}</button><div class="about-cloud">${icon('cloud')}</div><div class="section-kicker">A LITTLE SPACE TO SLOW DOWN</div><h2>把一片天空，<br>留在浏览器里。</h2><p>cloud 是一部会呼吸的云图鉴。这里没有云的照片，每一片天空都由程序生成，在光与风中缓慢变化。</p><p>十种云，十种观察天空的方式。你可以调节日光、改变风速，或者什么也不做，只看一会儿云。</p><div class="about-note">以云的形态为灵感的艺术模拟，并非气象预报。高度随纬度、季节及天气变化；云种资料参考 <a href="https://cloudatlas.wmo.int/en/home.html" target="_blank" rel="noreferrer">WMO 国际云图集 ↗</a>。</div><div class="about-shortcuts"><span><kbd>←</kbd><kbd>→</kbd> 切换云种</span><span><kbd>空格</kbd> 暂停</span><span><kbd>Esc</kbd> 返回</span></div></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`

function toast(message: string) {
  window.clearTimeout(toastTimer)
  $('#toast').textContent = message
  $('#toast').hidden = false
  toastTimer = window.setTimeout(() => {
    $('#toast').hidden = true
  }, 3200)
}

function updateUrl() {
  state.time = renderer?.time ?? state.time
  history.replaceState(null, '', `${location.pathname}${location.search}#${serializeState(state)}`)
}

function renderDetail() {
  $('#cloud-number').innerHTML =
    `${String(clouds.indexOf(selected) + 1).padStart(2, '0')} <span>/ 10</span>`
  $('#current-name').textContent = selected.name
  $('#current-latin').textContent = selected.latin
  $('#current-tagline').textContent = selected.tagline
  $('#marker-label').textContent = `${selected.abbreviation} · ${selected.name}`
  $('#sky-canvas').setAttribute(
    'aria-label',
    `${selected.name}：${selected.tagline} 程序生成的动态天空`,
  )
  $('#cloud-detail').innerHTML = `
    <div class="detail-story"><div class="detail-label"><span class="family-tag">${familyLabels[selected.family]}</span><span>云朵档案 / ${selected.abbreviation}</span></div><h2 id="detail-name">${selected.name}<em>${selected.latin}</em></h2><p>${selected.description}</p><div class="observation">${icon('sun')}<div><b>下次抬头时</b><p>${selected.observation}</p></div></div></div>
    <div class="detail-facts"><div class="fact-grid"><div class="fact">${icon('height')}<span>${selected.altitudeLabel}</span><strong>${selected.altitude}<small> m</small></strong></div><div class="fact">${icon('drop')}<span>落地降水</span><strong class="fact-text">${selected.precipitation}</strong></div><div class="fact fact-region">${icon('globe')}<span>形成区域</span><strong class="fact-text">${selected.region}</strong></div></div><div class="species-section"><h3>${selected.species.length ? `它的 ${selected.species.length} 种模样` : '细看这片云'}</h3><div class="species-list">${selected.species.map((species, i) => `<button class="species-chip ${i === 0 ? 'active' : ''}" data-species="${i}" aria-pressed="${i === 0}">${species.name}</button>`).join('') || '<span class="species-empty">这一云属不再划分云种</span>'}</div><p class="species-description" id="species-description">${selected.species[0]?.description ?? (selected.varieties.length ? `常见变种：${selected.varieties.join('、')}。` : '雨层云以连续而厚重的云层为特征，不划分云种与变种。')}</p>${selected.varieties.length && selected.species.length ? `<div class="varieties">常见变种 · ${selected.varieties.join(' / ')}</div>` : ''}</div><p class="altitude-note">高度为参考范围，随纬度与天气变化。<a href="https://cloudatlas.wmo.int/some-useful-concepts-levels.html" target="_blank" rel="noreferrer">了解云的高度 ↗</a></p></div>`
  document.querySelectorAll<HTMLButtonElement>('[data-cloud]').forEach((button) => {
    const active = button.dataset.cloud === selected.id
    button.classList.toggle('selected', active)
    button.setAttribute('aria-pressed', String(active))
  })
}

function selectCloud(id: string, immediate = false) {
  const cloud = cloudById(id)
  if (!cloud) return
  selected = cloud
  state.cloud = id
  renderer?.setCloud(selected, immediate || reducedMotion.matches)
  renderDetail()
  updateUrl()
}

function syncWeather() {
  renderer?.setWeather(state.seed, state.wind, state.sun, state.density)
  const sunLabel =
    state.sun < 0.15 ? '清晨' : state.sun < 0.55 ? '日间' : state.sun < 0.8 ? '午后' : '日落'
  $('#wind-value').textContent = `${state.wind.toFixed(1)}×`
  $('#density-value').textContent = `${Math.round(state.density * 100)}%`
  $('#sun-value').textContent = sunLabel
  $('#wind-summary').textContent =
    `${state.wind === 0 ? '无风' : state.wind < 1.6 ? '微风' : '轻风'} · ${state.wind.toFixed(1)}×`
  $('#sun-summary').textContent = sunLabel
  $('#seed-value').textContent = String(state.seed)
  for (const key of ['wind', 'sun', 'density'] as const) {
    const input = $<HTMLInputElement>(`#${key}`)
    input.value = String(state[key])
    const percentage =
      ((state[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100
    input.style.setProperty('--range-progress', `${percentage}%`)
  }
}

function syncPause() {
  renderer?.setPaused(state.paused)
  $('#pause').innerHTML = icon(state.paused ? 'play' : 'pause')
  $('#pause').setAttribute('aria-label', state.paused ? '继续演化' : '暂停演化')
  $('#pause').setAttribute('aria-pressed', String(state.paused))
  $('#pause').title = `${state.paused ? '继续' : '暂停'}演化（空格）`
  $('#live-label').textContent = state.paused ? '让这一刻，多停留一会儿' : '天空正在缓慢生长'
  $('#sky').classList.toggle('is-paused', state.paused)
}

function scrollToSection(id: string) {
  $(`#${id}`).scrollIntoView({
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
    block: 'start',
  })
}

function toggleSettings(open: boolean) {
  $('#settings-panel').hidden = !open
  $('#settings-toggle').setAttribute('aria-expanded', String(open))
  if (open) $('#wind').focus({ preventScroll: true })
}

function setImmersive(value: boolean) {
  isImmersive = value
  document.body.classList.toggle('immersive', value)
  $('#exit-immersive').hidden = !value
  $('#fullscreen').setAttribute('aria-label', value ? '退出沉浸模式' : '进入沉浸模式')
  if (value) {
    toggleSettings(false)
    $('#exit-immersive').focus({ preventScroll: true })
  } else $('#fullscreen').focus({ preventScroll: true })
}

function filterClouds(filter: string) {
  activeFilter = filter
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === filter
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
  let count = 0
  document.querySelectorAll<HTMLButtonElement>('[data-cloud]').forEach((button) => {
    button.hidden = filter !== 'all' && cloudById(button.dataset.cloud!)!.family !== filter
    if (!button.hidden) count++
  })
  $('#gallery-count').textContent = `${count} 种云，${count} 种心情`
  $('#cloud-gallery').scrollLeft = 0
  updateGalleryArrows()
}

function updateGalleryArrows() {
  const gallery = $('#cloud-gallery')
  $<HTMLButtonElement>('#gallery-prev').disabled = gallery.scrollLeft < 2
  $<HTMLButtonElement>('#gallery-next').disabled =
    gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2
}

function stepCloud(direction: number) {
  const list = clouds.filter(
    (cloud) => activeFilter === 'all' || cloud.family === (activeFilter as CloudFamily),
  )
  const index = list.findIndex((cloud) => cloud.id === selected.id)
  const next = list[(index + direction + list.length) % list.length]
  if (!next) return
  selectCloud(next.id)
  const card = $<HTMLButtonElement>(`[data-cloud="${next.id}"]`)
  const gallery = $('#cloud-gallery')
  gallery.scrollTo({
    left: card.offsetLeft - gallery.offsetLeft - gallery.clientWidth / 2 + card.offsetWidth / 2,
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  })
}

renderDetail()
syncWeather()
syncPause()

// Let the shell paint before generating the reusable noise volume.
window.setTimeout(async () => {
  const onError = (message: string) => {
    $('#render-message').textContent = message
    $('#render-message').hidden = false
    $('#sky').classList.add('render-unavailable')
    $('#live-label').textContent = '天空暂时休息，图鉴仍可探索'
    for (const id of ['pause', 'randomize', 'save', 'settings-toggle'])
      $<HTMLButtonElement>(`#${id}`).disabled = true
  }
  try {
    const { CloudRenderer } = await import('./engine/CloudRenderer')
    renderer = new CloudRenderer($<HTMLCanvasElement>('#sky-canvas'), onError, () => {
      $('#render-message').hidden = true
      $('#sky').classList.remove('render-unavailable')
      for (const id of ['pause', 'randomize', 'save', 'settings-toggle'])
        $<HTMLButtonElement>(`#${id}`).disabled = false
      syncPause()
    })
    renderer.setCloud(selected, true)
    renderer.time = state.time
    renderer.setPaused(state.paused)
    renderer.setWeather(state.seed, state.wind, state.sun, state.density)
    renderer.queuePreviews(clouds, (id, image) => {
      const preview = $<HTMLImageElement>(`[data-preview="${id}"]`)
      preview.src = image
      preview.hidden = false
      preview.parentElement!.classList.add('preview-ready')
    })
    const visibility = new IntersectionObserver(
      (entries) => renderer?.setVisible(entries[0]!.isIntersecting),
      { threshold: 0 },
    )
    visibility.observe($('#sky'))
    if (import.meta.hot)
      import.meta.hot.dispose(() => {
        visibility.disconnect()
        renderer?.dispose()
      })
  } catch (error) {
    console.error(error)
    onError('这个浏览器暂不支持 WebGL 2。请开启硬件加速或换用较新的浏览器；云图鉴仍可阅读。')
  }
}, 50)

document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((link) =>
  link.addEventListener('click', (event) => {
    event.preventDefault()
    scrollToSection(link.dataset.scroll!)
  }),
)
$('.brand').addEventListener('click', (event) => {
  event.preventDefault()
  scrollToSection('sky')
})
$('#show-detail').addEventListener('click', () => scrollToSection('cloud-detail'))
$('#cloud-gallery').addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cloud]')
  if (card) {
    selectCloud(card.dataset.cloud!)
    scrollToSection('sky')
  }
})
$('.filter-row').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]')
  if (button) filterClouds(button.dataset.filter!)
})
$('#cloud-detail').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-species]')
  if (!button) return
  document.querySelectorAll<HTMLButtonElement>('[data-species]').forEach((chip) => {
    chip.classList.toggle('active', chip === button)
    chip.setAttribute('aria-pressed', String(chip === button))
  })
  const species = selected.species[Number(button.dataset.species)]!
  $('#species-description').textContent = `${species.latin} · ${species.description}`
})
$('#pause').addEventListener('click', () => {
  state.paused = !state.paused
  syncPause()
  updateUrl()
})
$('#randomize').addEventListener('click', () => {
  state.seed = (crypto.getRandomValues(new Uint32Array(1))[0]! % 999999999) + 1
  state.time = 0
  if (renderer) renderer.time = 0
  syncWeather()
  updateUrl()
  toast('风又带来了一片新的天空')
})
for (const key of ['wind', 'density', 'sun'] as const) {
  $(`#${key}`).addEventListener('input', (event) => {
    state[key] = Number((event.target as HTMLInputElement).value)
    syncWeather()
  })
  $(`#${key}`).addEventListener('change', updateUrl)
}
$('#quality').addEventListener('change', (event) =>
  renderer?.setQuality((event.target as HTMLSelectElement).value as Quality),
)
$('#reset').addEventListener('click', () => {
  state = { ...parseState('', dailySeed()), cloud: selected.id, paused: state.paused }
  if (renderer) renderer.time = 0
  syncWeather()
  updateUrl()
  toast('已回到今天最初的天空')
})
$('#settings-toggle').addEventListener('click', () =>
  toggleSettings(Boolean($('#settings-panel').hidden)),
)
$('#close-settings').addEventListener('click', () => {
  toggleSettings(false)
  $('#settings-toggle').focus()
})
$('#fullscreen').addEventListener('click', () => setImmersive(!isImmersive))
$('#immerse').addEventListener('click', () => setImmersive(true))
$('#exit-immersive').addEventListener('click', () => setImmersive(false))
for (const id of ['about-button', 'footer-about']) {
  $(`#${id}`).addEventListener('click', () => $<HTMLDialogElement>('#about-dialog').showModal())
}
$('#close-about').addEventListener('click', () => $<HTMLDialogElement>('#about-dialog').close())
$('#about-dialog').addEventListener('click', (event) => {
  if (event.target === $('#about-dialog')) $<HTMLDialogElement>('#about-dialog').close()
})
$('#gallery-prev').addEventListener('click', () =>
  $('#cloud-gallery').scrollBy({
    left: -510,
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  }),
)
$('#gallery-next').addEventListener('click', () =>
  $('#cloud-gallery').scrollBy({
    left: 510,
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
  }),
)
$('#cloud-gallery').addEventListener('scroll', updateGalleryArrows, { passive: true })
new ResizeObserver(updateGalleryArrows).observe($('#cloud-gallery'))
$('#sky').addEventListener('pointermove', (event) => {
  if (reducedMotion.matches || event.pointerType === 'touch') return
  const bounds = $('#sky').getBoundingClientRect()
  renderer?.setPointer(
    (event.clientX - bounds.left) / bounds.width - 0.5,
    (event.clientY - bounds.top) / bounds.height - 0.5,
  )
})
$('#sky').addEventListener('pointerleave', () => renderer?.setPointer(0, 0))

$('#save').addEventListener('click', async () => {
  if (!renderer) return
  const button = $<HTMLButtonElement>('#save')
  button.disabled = true
  try {
    const blob = await renderer.capture()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloud-${selected.id}-${state.seed}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('这一刻的天空，已保存为图片')
  } catch {
    toast('图片暂时未能保存，请再试一次')
  } finally {
    button.disabled = false
  }
})
$('#share').addEventListener('click', async () => {
  updateUrl()
  try {
    await navigator.clipboard.writeText(location.href)
    toast('天空链接已复制，送给一起看云的人')
  } catch {
    // A selectable fallback also works without secure-context clipboard permission.
    const dialog = document.createElement('dialog')
    dialog.className = 'share-dialog'
    const label = document.createElement('label')
    label.textContent = '复制这片天空的链接'
    const input = document.createElement('input')
    input.value = location.href
    input.readOnly = true
    input.setAttribute('aria-label', '天空分享链接')
    const close = document.createElement('button')
    close.textContent = '完成'
    close.className = 'quiet-button'
    close.addEventListener('click', () => dialog.close())
    dialog.addEventListener('close', () => dialog.remove())
    dialog.append(label, input, close)
    document.body.append(dialog)
    dialog.showModal()
    input.select()
  }
})
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (isImmersive) setImmersive(false)
    toggleSettings(false)
    return
  }
  if (
    (event.target as HTMLElement).closest(
      'input, select, textarea, button, a, dialog, [contenteditable]',
    ) ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  )
    return
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    stepCloud(event.key === 'ArrowRight' ? 1 : -1)
  }
  if (event.code === 'Space') {
    event.preventDefault()
    state.paused = !state.paused
    syncPause()
    updateUrl()
  }
})
window.addEventListener('hashchange', () => {
  if (!isStateHash(location.hash)) return
  state = parseState(location.hash, dailySeed(), reducedMotion.matches)
  if (renderer) renderer.time = state.time
  selectCloud(state.cloud, true)
  syncWeather()
  syncPause()
})
reducedMotion.addEventListener('change', (event) => {
  if (event.matches) {
    state.paused = true
    syncPause()
    renderer?.setPointer(0, 0)
  }
})
