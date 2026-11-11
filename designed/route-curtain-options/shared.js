const schemes = {
  spine: {
    description: 'A · 一道竖向纸缝从中央展开，铺满窗口；下一页在纸后就位，纸面再收成一道横缝离场。节奏简洁，适合日常切页。',
    cost: '预计 1.2 秒 · 主要使用 clip-path · 可复用壳层转场钩子，需协调正文入场时机。',
  },
  columns: {
    description: 'B · 五列纸页交错落下，像杂志分栏逐一合拢；换页后依次向上抽走。节拍更鲜明，适合栏目之间的切换。',
    cost: '预计 1.4 秒 · 主要使用 transform · 需要独立分栏遮罩，正文无需分栏或拆块。',
  },
  iris: {
    description: 'C · 墨色从左下角沿圆弧展开，盖满后留下目标栏目名；纸面从同一位置重新显露。更有仪式感，适合主要栏目跳转。',
    cost: '预计 1.3 秒 · 主要使用圆形裁切 · 需要独立遮罩，窄屏也保持同一圆弧起点。',
  },
};
const pages = {
  blog: { title: '写下，便有了回声。', label: '博客', english: 'JOURNAL', kicker: '文字与记录', index: '01', summary: '关于代码、日常，以及那些值得慢慢想清楚的事。', rows: [['09 / 19', '让动效也学会适时退后'], ['09 / 15', '一幅线稿，和首页的留白'], ['08 / 28', '把一个想法写成可以运行的东西']] },
  projects: { title: '一些想法，正在发生。', label: '项目', english: 'PROJECTS', kicker: '实践与作品', index: '02', summary: '从最初的草稿，到能被触碰和使用的小作品。', rows: [['2026', 'GrunRay wiki · 一本持续更新的个人杂志'], ['2026', '浏览器里的交互角色'], ['2026', '本地工具与工作流实践']] },
  about: { title: '代码之外，也有日常。', label: '关于', english: 'ABOUT', kicker: '关于这个人', index: '03', summary: '喜欢把好奇心留在生活里，再把生活中的问题写进代码。', rows: [['现在', '学习、实践，然后继续修改'], ['平日', '写代码，也收集一些微小的灵感'], ['这里', '记录来时路，留一页给未来']] },
};
const root = document.documentElement;
const curtain = document.querySelector('#curtain');
const sheet = curtain.querySelector('.sheet');
const columns = [...curtain.querySelectorAll('.column-sheets i')];
const title = curtain.querySelector('.curtain-title');
const status = document.querySelector('#status');
const motionSelect = document.querySelector('#motion');
const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const buttons = [...document.querySelectorAll('button')];
let scheme = 'spine';
let currentPage = 'blog';
let pendingPage = null;
let activeAnimations = [];
let runId = 0;

function updateScheme() {
  document.querySelector('#description').textContent = schemes[scheme].description;
  document.querySelector('#cost').textContent = schemes[scheme].cost;
  document.querySelectorAll('[data-scheme]').forEach((button) => {
    const selected = button.dataset.scheme === scheme;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function renderPage(key) {
  const page = pages[key];
  currentPage = key;
  document.querySelector('#page-title').textContent = page.title;
  document.querySelector('#page-kicker').textContent = `${page.english} / ${page.kicker}`;
  document.querySelector('#page-index').textContent = page.index;
  document.querySelector('#page-summary').textContent = page.summary;
  const rows = page.rows.map(([date, text]) => {
    const row = document.createElement('div');
    row.className = 'ledger-row';
    const time = document.createElement('time');
    time.textContent = date;
    const heading = document.createElement('h3');
    heading.textContent = text;
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    row.append(time, heading, arrow);
    return row;
  });
  document.querySelector('#ledger').replaceChildren(...rows);
  document.querySelectorAll('[data-page]').forEach((button) => {
    if (button.dataset.page === key) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function animate(element, frames, duration, delay = 0) {
  const animation = element.animate(frames, {
    duration, delay, fill: 'both', easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  });
  activeAnimations.push(animation);
  return animation.finished;
}

function clearCurtain() {
  curtain.hidden = true;
  activeAnimations.forEach((animation) => animation.cancel());
  activeAnimations = [];
  pendingPage = null;
  buttons.forEach((button) => button.removeAttribute('aria-disabled'));
}

function finishImmediately(message) {
  if (pendingPage) renderPage(pendingPage);
  runId += 1;
  clearCurtain();
  status.textContent = message;
}

function resolveMotion() {
  root.dataset.motion = systemReduced.matches ? 'minimal' : motionSelect.value;
  if (pendingPage && root.dataset.motion !== 'full') finishImmediately('动效降级 · 已直接显示目标页');
}

async function cover() {
  if (scheme === 'spine') {
    await animate(sheet, [{ clipPath: 'inset(0 50%)' }, { clipPath: 'inset(0 0%)' }], 430);
  } else if (scheme === 'columns') {
    await Promise.all(columns.map((column, index) => animate(column,
      [{ transform: `translateY(${index % 2 ? '101%' : '-101%'})` }, { transform: 'translateY(0)' }], 390, index * 38)));
  } else {
    await animate(sheet, [{ clipPath: 'circle(0% at 0% 100%)' }, { clipPath: 'circle(150% at 0% 100%)' }], 520);
  }
}

async function uncover() {
  if (scheme === 'spine') {
    await animate(sheet, [{ clipPath: 'inset(0 0%)' }, { clipPath: 'inset(50% 0)' }], 430);
  } else if (scheme === 'columns') {
    await Promise.all(columns.map((column, index) => animate(column,
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], 380, (4 - index) * 38)));
  } else {
    await animate(sheet, [{ clipPath: 'circle(150% at 0% 100%)' }, { clipPath: 'circle(0% at 0% 100%)' }], 520);
  }
}

async function navigate(to, replay = false) {
  if (pendingPage || (to === currentPage && !replay)) return;
  if (root.dataset.motion !== 'full') {
    renderPage(to);
    status.textContent = `已切换到${pages[to].label} · ${root.dataset.motion.toUpperCase()} 瞬切`;
    return;
  }
  pendingPage = to;
  const id = ++runId;
  buttons.forEach((button) => button.setAttribute('aria-disabled', 'true'));
  curtain.dataset.scheme = scheme;
  document.querySelector('#destination').textContent = pages[to].label;
  document.querySelector('#destination-label').textContent = pages[to].english;
  curtain.hidden = false;
  status.textContent = '合拢纸面…';
  try {
    await cover();
    if (id !== runId) return;
    renderPage(to);
    status.textContent = '已盖满 · 目标页已就位';
    await animate(title, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 150);
    await animate(title, [{ opacity: 1 }, { opacity: 0 }], 120, 30);
    await uncover();
    if (id !== runId) return;
    status.textContent = `已抵达${pages[to].label} · 可继续切换或重播`;
  } catch (error) {
    if (id === runId) {
      renderPage(to);
      status.textContent = '已显示目标页 · 转场提前结束';
      if (error.name !== 'AbortError') console.error(error);
    }
  } finally {
    if (id === runId) clearCurtain();
  }
}

document.querySelectorAll('[data-scheme]').forEach((button) => {
  button.addEventListener('click', () => {
    if (pendingPage) return;
    scheme = button.dataset.scheme;
    updateScheme();
    status.textContent = '方案已选定 · 点击模拟导航或重播';
  });
});
document.querySelectorAll('[data-page]').forEach((button) => {
  button.addEventListener('click', () => navigate(button.dataset.page));
});
document.querySelector('#replay').addEventListener('click', () => navigate(currentPage, true));
document.querySelector('#theme').addEventListener('change', (event) => { root.dataset.theme = event.target.value; });
motionSelect.addEventListener('change', resolveMotion);
systemReduced.addEventListener('change', resolveMotion);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pendingPage) finishImmediately('已结束转场 · 目标页已显示');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && pendingPage) finishImmediately('已直接显示目标页');
});
renderPage(currentPage);
updateScheme();
resolveMotion();
