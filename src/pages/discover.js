import { getRandomRecipes } from '../api/spoonacular.js';
import { icon }             from '../icons.js';
import { escapeHtml, stars } from '../utils.js';

// Filter by cooking time in quarter-hour steps. Random recipes share too many
// dishType tags for a category filter to feel meaningful, but time splits cleanly.
// Empty buckets are hidden, and if every recipe lands in one bucket the whole
// filter row is dropped (see renderFilters) — filtering would be pointless then.
const BUCKETS = [
  { key: 'Alle', label: 'Alle',         test: () => true },
  { key: 'q1',   label: 'Unter 15 Min', test: r => r.readyInMinutes > 0  && r.readyInMinutes <= 15 },
  { key: 'q2',   label: '15–30 Min',    test: r => r.readyInMinutes > 15 && r.readyInMinutes <= 30 },
  { key: 'q3',   label: '30–45 Min',    test: r => r.readyInMinutes > 30 && r.readyInMinutes <= 45 },
  { key: 'q4',   label: '45–60 Min',    test: r => r.readyInMinutes > 45 && r.readyInMinutes <= 60 },
  { key: 'slow', label: 'Über 60 Min',  test: r => r.readyInMinutes > 60 },
];

const CACHE_KEY = 'rezeptbuch:discover';
let countdownTimer = null; // module-level so we can clear it when re-entering

export async function renderDiscover(app) {
  clearInterval(countdownTimer); // stop any countdown from a previous visit

  app.innerHTML = `
    <div class="page discover-page">
      <div class="disc-wrap">
        <header class="discover-header">
          <p class="section-label">Täglich wechselnd</p>
          <h1 class="section-title discover-title">Entdecke <em>Rezepte</em></h1>
          <p class="discover-lead">Eine handverlesene Auswahl an Gerichten, die dich heute inspirieren.</p>
        </header>
        <div class="disc-toolbar">
          <div class="disc-filters" id="disc-filters" role="group" aria-label="Nach Zubereitungszeit filtern"></div>
          <div class="disc-countdown" id="disc-countdown" title="Bis die nächste Auswahl geladen wird" hidden>
            ${icon('clock', 'icon-sm')}
            <span>Neue Rezepte in <strong id="cd-time">--:--:--</strong></span>
          </div>
        </div>
        <div class="discover-grid" id="discover-grid">${skeletonGrid(11)}</div>
      </div>
    </div>
  `;

  const grid      = document.getElementById('discover-grid');
  const filtersEl = document.getElementById('disc-filters');
  const cdEl      = document.getElementById('disc-countdown');

  let all    = [];
  let active = 'Alle';

  // 1) Use today's cached recipes if present — no API request needed.
  const cached = readCache();
  if (cached) {
    all = cached;
  } else {
    // 2) Otherwise fetch a fresh set and store it for the rest of the day.
    try {
      all = await getRandomRecipes();
      writeCache(all);
    } catch {
      const stale = readCache(true); // fall back to an old set if the request fails
      if (stale) {
        all = stale;
      } else {
        grid.innerHTML = emptyState('alert', 'Fehler beim Laden', 'Die Rezepte konnten nicht geladen werden. Bitte lade die Seite neu.');
        return;
      }
    }
  }

  if (!all.length) {
    grid.innerHTML = emptyState('search', 'Nichts gefunden', 'Im Moment gibt es keine Vorschläge. Versuch es später erneut.');
    return;
  }

  function renderFilters() {
    // Buckets that actually contain at least one recipe (excluding "Alle").
    const populated = BUCKETS.filter(b => b.key !== 'Alle' && all.some(b.test));
    // If every recipe falls in the same time range, filtering does nothing → hide it.
    if (populated.length <= 1) { filtersEl.innerHTML = ''; return; }

    const cats = [BUCKETS[0], ...populated];
    filtersEl.innerHTML = cats.map(b => `
      <button class="disc-chip${b.key === active ? ' is-active' : ''}" type="button"
              data-cat="${b.key}" aria-pressed="${b.key === active}">${b.label}</button>`).join('');
    filtersEl.querySelectorAll('.disc-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        active = chip.dataset.cat;
        filtersEl.querySelectorAll('.disc-chip').forEach(c => {
          const on = c.dataset.cat === active;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on);
        });
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const bucket = BUCKETS.find(b => b.key === active) || BUCKETS[0];
    const list   = all.filter(bucket.test);

    if (!list.length) {
      grid.innerHTML = emptyState('search', 'Keine Treffer', 'In diesem Zeitfenster ist gerade nichts dabei.');
      return;
    }

    grid.innerHTML = list.map((r, i) => card(r, i === 0)).join('');
    grid.querySelectorAll('.discover-card').forEach(c => {
      const go = () => {
        sessionStorage.setItem('backTo', '#/discover');
        window.location.hash = `#/detail/${c.dataset.id}`;
      };
      c.addEventListener('click', go);
      c.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  // When the day rolls over, load the new selection in place.
  async function loadNewDay() {
    grid.innerHTML = skeletonGrid(11);
    try {
      all = await getRandomRecipes();
      writeCache(all);
    } catch {
      const stale = readCache(true);
      if (stale) all = stale;
    }
    active = 'Alle';
    renderFilters();
    renderGrid();
    startCountdown(cdEl, loadNewDay);
  }

  renderFilters();
  renderGrid();
  startCountdown(cdEl, loadNewDay);
}

// ── daily cache ───────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function readCache(ignoreDate = false) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && Array.isArray(c.recipes) && c.recipes.length && (ignoreDate || c.date === todayStr())) {
      return c.recipes;
    }
  } catch {}
  return null;
}
function writeCache(recipes) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), recipes })); } catch {}
}

// ── countdown to midnight ─────────────────────────────────────
function startCountdown(el, onExpire) {
  clearInterval(countdownTimer);
  if (!el) return;
  const timeEl = el.querySelector('#cd-time');
  el.hidden = false;

  const tick = () => {
    if (!document.body.contains(el)) { clearInterval(countdownTimer); return; }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const ms = midnight - now;
    if (ms <= 0) { clearInterval(countdownTimer); onExpire(); return; }
    if (timeEl) timeEl.textContent = fmt(ms);
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}
function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

// ── cards ─────────────────────────────────────────────────────
function card(r, featured) {
  const score = Math.round(r.spoonacularScore || 0);
  const meta = [
    r.readyInMinutes ? `<span>${icon('clock', 'icon-sm')}${r.readyInMinutes} Min</span>` : '',
    r.servings       ? `<span>${icon('users', 'icon-sm')}${r.servings}</span>`           : '',
  ].filter(Boolean).join('');

  const diet = (r.diets && r.diets[0])
    ? `<span class="card-tag">${icon('leaf', 'icon-sm')} ${escapeHtml(r.diets[0])}</span>` : '';

  return `
    <article class="discover-card${featured ? ' is-featured' : ''}" data-id="${r.id}"
             tabindex="0" role="button" aria-label="Rezept öffnen: ${escapeHtml(r.title)}">
      <div class="disc-img-wrap">
        <img class="disc-img" src="${r.image}" alt="" loading="lazy">
        <div class="disc-shade"></div>
        ${diet}
        ${featured ? '<span class="card-feature">Empfehlung</span>' : ''}
        <span class="disc-go">${icon('arrowRight', 'icon-sm')}</span>
      </div>
      <div class="disc-body">
        ${score ? `<div class="card-rating">${stars(score)}<span class="card-score">${score}%</span></div>` : ''}
        <h3>${escapeHtml(r.title)}</h3>
        ${meta ? `<p class="card-meta">${meta}</p>` : ''}
      </div>
    </article>`;
}

function skeletonGrid(n) {
  return Array.from({ length: n }, (_, i) => `
    <div class="discover-card sk-card-d${i === 0 ? ' is-featured' : ''}">
      <div class="sk disc-img-wrap"></div>
      <div class="disc-body">
        <div class="sk sk-line w80"></div>
        <div class="sk sk-line w40"></div>
      </div>
    </div>`).join('');
}

function emptyState(ic, title, text) {
  return `
    <div class="disc-noresult"><div class="empty-state empty-wide">
      <span class="empty-icon">${icon(ic, 'icon-lg')}</span>
      <h3>${title}</h3>
      <p>${text}</p>
    </div></div>`;
}
