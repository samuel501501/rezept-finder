import { getRecipeDetail } from '../api/spoonacular.js';
import { icon }            from '../icons.js';
import { escapeHtml, stars } from '../utils.js';

export async function renderDetail(app, id) {
  app.innerHTML = loadingView();

  const back = backTarget();

  let r;
  try {
    r = await getRecipeDetail(id);
  } catch {
    app.innerHTML = errorView(back);
    return;
  }

  const steps       = r.analyzedInstructions?.[0]?.steps || [];
  const ingredients = r.extendedIngredients || [];
  const score       = Math.round(r.spoonacularScore || 0);
  const source      = r.creditsText || r.sourceName || 'Rezeptbuch';
  const dish        = (r.dishTypes && r.dishTypes[0]) ? cap(r.dishTypes[0]) : '';
  const intro       = summarize(r.summary);

  app.innerHTML = `
    <div class="page recipe-detail">
      <article class="rd-wrap">

        <a class="back-link" href="${back.href}">${icon('arrowLeft', 'icon-sm')} ${back.label}</a>

        <header class="rd-head">
          <div class="rd-badges">
            ${score ? `<span class="rd-pill rd-pill-accent">${icon('flame', 'icon-sm')} ${score}% Empfehlung</span>` : ''}
            ${stars(score)}
            ${r.aggregateLikes ? `<span class="rd-likes">${icon('heart', 'icon-sm')} ${formatNum(r.aggregateLikes)}</span>` : ''}
          </div>

          <h1 class="rd-title">${escapeHtml(r.title)}</h1>

          <div class="rd-byline">
            <span class="rd-avatar">${escapeHtml(source.charAt(0).toUpperCase())}</span>
            <span class="rd-author">${escapeHtml(source)}</span>
            ${dish ? `<span class="rd-sep"></span><span>${escapeHtml(dish)}</span>` : ''}
            ${r.readyInMinutes ? `<span class="rd-sep"></span><span>${r.readyInMinutes} Min</span>` : ''}
          </div>

          ${intro ? `<p class="rd-intro">${escapeHtml(intro)}</p>` : ''}
        </header>

        <figure class="rd-hero">
          <img src="${r.image}" alt="${escapeHtml(r.title)}">
        </figure>

        <div class="rd-metabar">
          ${metaItem('clock', r.readyInMinutes ? `${r.readyInMinutes} Min` : '—', 'Gesamtzeit')}
          ${metaItem('utensils', r.preparationMinutes > 0 ? `${r.preparationMinutes} Min` : 'k. A.', 'Vorbereitung')}
          ${metaItem('users', r.servings ? `${r.servings}` : '—', 'Portionen')}
        </div>

        <div class="rd-body">
          <main class="rd-main">

            <section>
              <div class="rd-h2-row">
                <h2 class="rd-h2">Zutaten</h2>
                ${ingredients.length ? '<span class="rd-progress" id="ing-progress"></span>' : ''}
              </div>
              ${ingredients.length ? `
                <div class="rd-ing-bar"><span id="ing-bar-fill"></span></div>
                <div class="rd-hint-row">
                  <p class="rd-hint" id="ing-hint">Tippe eine Zutat an, um sie abzuhaken.</p>
                  <button class="rd-reset" id="ing-reset" type="button" hidden>Alle zurücksetzen</button>
                </div>` : ''}
              <ul class="rd-ingredients" id="ingredient-list">
                ${ingredients.length
                  ? ingredients.map((i, idx) => `
                    <li class="rd-ing" role="button" tabindex="0" data-idx="${idx}" aria-pressed="false">
                      <span class="rd-check">${icon('check', 'icon-sm')}</span>
                      <span class="rd-ing-text">${escapeHtml(i.original)}</span>
                    </li>`).join('')
                  : '<li class="rd-ing rd-ing-empty"><span class="rd-ing-text">Keine Zutaten verfügbar.</span></li>'}
              </ul>
            </section>

            <section>
              <h2 class="rd-h2">Zubereitung</h2>
              <ol class="rd-steps">
                ${steps.length
                  ? steps.map((s, i) => `
                    <li class="rd-step">
                      <span class="rd-step-n">${i + 1}</span>
                      <p class="rd-step-text">${escapeHtml(s.step)}</p>
                    </li>`).join('')
                  : '<li class="rd-step"><span class="rd-step-n">–</span><p class="rd-step-text">Keine Schritte verfügbar.</p></li>'}
              </ol>
            </section>

            ${r.sourceUrl
              ? `<a class="ghost-btn rd-source" href="${r.sourceUrl}" target="_blank" rel="noopener noreferrer">
                   ${icon('link', 'icon-sm')} Originalrezept ansehen</a>`
              : ''}
          </main>

          <aside class="rd-sidebar">
            ${nutritionCard(r.nutrition)}
            ${dietCard(r.diets)}
          </aside>
        </div>

      </article>
    </div>
  `;

  setupIngredients(app, id, ingredients);
}

// ── interactive ingredient checklist ──────────────────────────
function setupIngredients(app, id, recipeIngredients = []) {
  const items = [...app.querySelectorAll('.rd-ing[data-idx]')];
  if (!items.length) return;

  const storeKey  = `rezeptbuch:checked:${id}`;
  const progress  = app.querySelector('#ing-progress');
  const barFill   = app.querySelector('#ing-bar-fill');
  const hint      = app.querySelector('#ing-hint');
  const resetBtn  = app.querySelector('#ing-reset');
  const total     = items.length;

  let checked = loadChecked(storeKey);

  // When opened from an ingredient search, pre-tick the ingredients the user
  // already has. Runs only once per recipe (flagged) so later manual edits stick.
  const autoKey = `rezeptbuch:autoticked:${id}`;
  if (!localStorage.getItem(autoKey)) {
    const have = loadHave(id);
    if (have.length) {
      recipeIngredients.forEach((ing, idx) => {
        if (have.some(h => matchHave(h, ing))) checked.add(idx);
      });
      if (checked.size) saveChecked(storeKey, checked);
      try { localStorage.setItem(autoKey, '1'); } catch {} // only flag once we've applied
    }
  }

  function apply(animate) {
    items.forEach(li => {
      const on = checked.has(Number(li.dataset.idx));
      li.classList.toggle('is-checked', on);
      li.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const done = checked.size;
    const pct  = Math.round((done / total) * 100);
    if (barFill) {
      barFill.style.transition = animate ? '' : 'none';
      barFill.style.width = pct + '%';
    }
    if (progress) {
      const all = done === total;
      progress.textContent = all ? 'Fertig ✓' : `${done} / ${total}`;
      progress.classList.toggle('is-done', all);
    }
    if (hint) {
      hint.textContent = done === 0
        ? 'Tippe eine Zutat an, um sie abzuhaken.'
        : done === total
          ? 'Alles bereit — viel Spass beim Kochen!'
          : `Noch ${total - done} ${total - done === 1 ? 'Zutat' : 'Zutaten'} übrig.`;
    }
    if (resetBtn) resetBtn.hidden = done === 0;
  }

  function toggle(li) {
    const idx = Number(li.dataset.idx);
    checked.has(idx) ? checked.delete(idx) : checked.add(idx);
    saveChecked(storeKey, checked);
    apply(true);
  }

  items.forEach(li => {
    li.addEventListener('click', () => toggle(li));
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(li); }
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      checked = new Set();
      saveChecked(storeKey, checked);
      apply(true);
    });
  }

  apply(false); // restore saved state without animating the bar from 0
}

// The user's available ingredients for this recipe (set on the results page).
function loadHave(id) {
  try { return JSON.parse(sessionStorage.getItem(`rezeptbuch:have:${id}`)) || []; }
  catch { return []; }
}
// Match a stored "have" entry against a recipe ingredient — by Spoonacular id
// first (most reliable), then by a loose name comparison as a fallback.
function matchHave(have, ing) {
  if (have.id && ing.id && have.id === ing.id) return true;
  if (!have.name) return false;
  return [ing.name, ing.nameClean, ing.original]
    .filter(Boolean)
    .map(s => String(s).toLowerCase())
    .some(c => c.includes(have.name) || have.name.includes(c));
}

function loadChecked(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key)) || []); }
  catch { return new Set(); }
}
function saveChecked(key, set) {
  try {
    if (set.size) localStorage.setItem(key, JSON.stringify([...set]));
    else localStorage.removeItem(key);
  } catch {}
}

// ── components ────────────────────────────────────────────────
function nutritionCard(nutrition) {
  const nutrients = nutrition?.nutrients;
  if (!nutrients || !nutrients.length) return '';
  const wanted = [
    ['Calories', 'Kalorien'], ['Fat', 'Fett'], ['Saturated Fat', 'davon gesättigt'],
    ['Carbohydrates', 'Kohlenhydrate'], ['Sugar', 'davon Zucker'],
    ['Protein', 'Eiweiss'], ['Fiber', 'Ballaststoffe'], ['Sodium', 'Natrium'],
  ];
  const rows = wanted.map(([en, de]) => {
    const n = nutrients.find(x => x.name === en);
    if (!n) return '';
    const val = `${Math.round(n.amount * 10) / 10} ${n.unit}`;
    return `<div class="nutri-row"><span>${de}</span><strong>${val}</strong></div>`;
  }).filter(Boolean).join('');
  if (!rows) return '';
  return `
    <div class="side-card nutri-card">
      <h3 class="side-title">Nährwerte</h3>
      <p class="side-sub">pro Portion</p>
      ${rows}
    </div>`;
}

function dietCard(diets) {
  if (!diets || !diets.length) return '';
  const tags = diets.slice(0, 6)
    .map(d => `<span class="diet-tag">${icon('leaf', 'icon-sm')} ${escapeHtml(cap(d))}</span>`).join('');
  return `
    <div class="side-card">
      <h3 class="side-title">Geeignet für</h3>
      <div class="diet-row">${tags}</div>
    </div>`;
}

function metaItem(ic, value, label) {
  return `
    <div class="rd-meta-item">
      <span class="rd-meta-icon">${icon(ic, 'icon-sm')}</span>
      <div class="rd-meta-text"><strong>${value}</strong><span>${label}</span></div>
    </div>`;
}

// ── views ─────────────────────────────────────────────────────
function loadingView() {
  return `
    <div class="page recipe-detail">
      <article class="rd-wrap">
        <div class="sk sk-line w40" style="margin-bottom:2rem"></div>
        <div class="sk sk-line w80" style="height:2.6rem;margin-bottom:1rem"></div>
        <div class="sk sk-line w50" style="margin-bottom:2rem"></div>
        <div class="sk rd-hero" style="aspect-ratio:16/9"></div>
        <div class="rd-metabar" style="border:none">
          <div class="sk sk-line w80" style="height:2.4rem"></div>
        </div>
        <div class="rd-body">
          <div class="sk-lines" style="flex:1">
            <div class="sk sk-line w40" style="height:1.6rem;margin-bottom:1.2rem"></div>
            <div class="sk sk-line w90"></div><div class="sk sk-line w80"></div>
            <div class="sk sk-line w70"></div><div class="sk sk-line w90"></div>
          </div>
          <div class="sk side-card" style="height:280px"></div>
        </div>
      </article>
    </div>`;
}

function errorView(back) {
  const b = back || backTarget();
  return `
    <div class="page recipe-detail rd-centered">
      <div class="empty-state empty-wide">
        <span class="empty-icon">${icon('alert', 'icon-lg')}</span>
        <h3>Rezept nicht gefunden</h3>
        <p>Dieses Rezept konnte nicht geladen werden.</p>
        <a class="ghost-btn" href="${b.href}">${b.label}</a>
      </div>
    </div>`;
}

// Where the user came from (set when a recipe card is opened).
function backTarget() {
  const from = sessionStorage.getItem('backTo');
  if (from === '#/results') return { href: '#/results', label: 'Zurück zu den Rezepten' };
  return { href: '#/discover', label: 'Zurück zu Discover' };
}

// ── utils ─────────────────────────────────────────────────────
function summarize(html) {
  if (!html) return '';
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const decoded = text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&deg;/g, '°');
  const parts = decoded.split('. ');
  let out = '';
  for (const p of parts) {
    if ((out + p).length > 260) break;
    out += p + '. ';
  }
  return (out || decoded.slice(0, 260)).trim();
}

function cap(s = '') { return s.charAt(0).toUpperCase() + s.slice(1); }

function formatNum(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : `${n}`; }
