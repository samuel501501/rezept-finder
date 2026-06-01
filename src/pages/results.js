import { searchByIngredients } from '../api/spoonacular.js';
import { mountAiGenerator }    from './ai.js';
import { icon }                from '../icons.js';
import { escapeHtml }          from '../utils.js';

const CACHE_KEY = 'rezeptbuch:results';

export async function renderResults(app) {
  const raw         = (sessionStorage.getItem('ingredients') || '').trim();
  const ingredients = raw.split(',').map(s => s.trim()).filter(Boolean);

  app.innerHTML = `
    <div class="page results-page">

      <section class="results-left">
        <div class="results-head">
          <a class="back-link" href="#/">${icon('arrowLeft', 'icon-sm')} Home</a>
        </div>

        <div class="zutaten-block" id="zutaten-block">
          ${zutatenView(raw)}
        </div>

        <h2 class="section-title">Das kannst<br>du <em>kochen</em></h2>

        <!-- Mobile only: opens the full AI generator at #/ai (desktop uses the side panel) -->
        <a class="recipe-card ai-mobile-card" href="#/ai" aria-label="Eigenes KI-Rezept generieren">
          <span class="recipe-rank ai-mobile-rank">AI</span>
          <span class="ai-mobile-thumb">${icon('sparkles', 'icon')}</span>
          <div class="recipe-card-info">
            <h3>Eigenes Rezept generieren</h3>
            <p class="ai-mobile-sub">Aus deinen Zutaten — passend zu deinem Anlass.</p>
          </div>
          <span class="recipe-go">${icon('arrowRight', 'icon-sm')}</span>
        </a>

        <div id="recipes-list">${skeletonList(4)}</div>
      </section>

      <section class="aurora-panel">
        <div class="aurora-inner" id="aurora-inner"></div>
      </section>

    </div>
  `;

  setupEditor(app, raw);
  await loadRecipes(document.getElementById('recipes-list'), raw, ingredients);
  mountAiGenerator(app.querySelector('#aurora-inner'), ingredients, raw);
}

// ── ingredient header + inline editor ─────────────────────────
function zutatenView(raw) {
  const ingredients = raw.split(',').map(s => s.trim()).filter(Boolean);
  const chips = ingredients.length
    ? ingredients.map(i => `<span class="chip">${escapeHtml(i)}</span>`).join('')
    : '<span class="chip chip-muted">Keine Zutaten</span>';
  return `
    <div class="zutaten-head">
      <p class="section-label">Deine Zutaten</p>
      <button class="edit-btn" id="edit-ingredients" type="button">${icon('search', 'icon-sm')} Neue Suche</button>
    </div>
    <div class="chip-row">${chips}</div>`;
}

function setupEditor(app, raw) {
  const block = app.querySelector('#zutaten-block');
  app.querySelector('#edit-ingredients')?.addEventListener('click', () => {
    block.innerHTML = `
      <p class="section-label">Neue Zutaten eingeben</p>
      <div class="ingredient-edit">
        <input class="form-input" id="edit-input" value="${escapeHtml(raw)}"
               placeholder="Tomaten, Pasta, Käse..." autocomplete="off">
        <button class="aurora-btn" id="edit-go" type="button"><span class="btn-label">Suchen</span></button>
      </div>
      <button class="link-btn" id="edit-cancel" type="button">Abbrechen</button>`;

    const input = block.querySelector('#edit-input');
    input.focus(); input.select();

    const submit = () => {
      const val = input.value.trim();
      if (!val) {
        input.classList.add('input-error');
        setTimeout(() => input.classList.remove('input-error'), 1000);
        return;
      }
      sessionStorage.setItem('ingredients', val);
      sessionStorage.removeItem(CACHE_KEY); // new ingredients → fresh search
      renderResults(app);
    };

    block.querySelector('#edit-go').addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    block.querySelector('#edit-cancel').addEventListener('click', () => renderResults(app));
  });
}

// ── recipe list (cached) ──────────────────────────────────────
async function loadRecipes(listEl, raw, ingredients) {
  if (!ingredients.length) {
    listEl.innerHTML = stateBlock('utensils', 'Noch keine Zutaten',
      'Gib auf der Startseite ein, was du zuhause hast.',
      `<a class="ghost-btn" href="#/">Zur Suche</a>`);
    return;
  }

  // 1) Use cached results for these exact ingredients (no API call).
  const cached = readCache(raw);
  if (cached) { renderCards(listEl, cached, ingredients.length); return; }

  // 2) Otherwise fetch and cache.
  listEl.innerHTML = skeletonList(4);
  try {
    const recipes = await searchByIngredients(ingredients);
    writeCache(raw, recipes);
    if (!recipes.length) {
      listEl.innerHTML = stateBlock('search', 'Keine Treffer',
        'Mit diesen Zutaten haben wir nichts gefunden. Versuch es mit anderen.',
        `<button class="ghost-btn" id="edit-from-empty" type="button">Neue Suche</button>`);
      listEl.querySelector('#edit-from-empty')?.addEventListener('click',
        () => document.getElementById('edit-ingredients')?.click());
      return;
    }
    renderCards(listEl, recipes, ingredients.length);
  } catch (e) {
    const limited = /\b(402|429)\b/.test(String(e.message || ''));
    listEl.innerHTML = stateBlock('alert',
      limited ? 'API-Limit erreicht' : 'Fehler beim Laden',
      limited
        ? 'Das Tageslimit der Rezept-API ist aufgebraucht. Bitte versuch es später erneut.'
        : 'Die Rezepte konnten nicht geladen werden. Bitte versuch es erneut.',
      `<button class="ghost-btn" id="retry-btn" type="button">Erneut versuchen</button>`);
    listEl.querySelector('#retry-btn')?.addEventListener('click', () => {
      sessionStorage.removeItem(CACHE_KEY);
      loadRecipes(listEl, raw, ingredients);
    });
  }
}

function renderCards(listEl, recipes, userCount) {
  listEl.innerHTML = recipes.map((r, i) => {
    // Percentage of the user's own ingredient list that this recipe uses
    // (used ÷ entered), so good matches score high instead of being dragged
    // down by recipe ingredients the user simply doesn't have.
    const used = r.usedIngredientCount || 0;
    const pct  = userCount ? Math.min(100, Math.round((used / userCount) * 100)) : 0;
    return `
      <article class="recipe-card" data-id="${r.id}" tabindex="0" role="button"
               aria-label="Rezept öffnen: ${escapeHtml(r.title)}">
        <span class="recipe-rank">${String(i + 1).padStart(2, '0')}</span>
        <img src="${r.image}" alt="" loading="lazy">
        <div class="recipe-card-info">
          <h3>${escapeHtml(r.title)}</h3>
          <div class="match-row">
            <div class="match-bar"><span style="width:${pct}%"></span></div>
            <span class="match-pct">${pct}% deiner Zutaten</span>
          </div>
          <p class="match-meta">
            <span class="dot-have"></span>${r.usedIngredientCount} genutzt
            <span class="dot-miss"></span>${r.missedIngredientCount} fehlend
          </p>
        </div>
        <span class="recipe-go">${icon('arrowRight', 'icon-sm')}</span>
      </article>`;
  }).join('');

  listEl.querySelectorAll('.recipe-card').forEach((card, i) => {
    const r = recipes[i];
    const go = () => {
      sessionStorage.setItem('backTo', '#/results'); // tell detail where to return
      rememberHave(r);                                // so detail can pre-tick what you have
      window.location.hash = `#/detail/${r.id}`;
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
}

// Store which of the user's ingredients this recipe uses, so the detail page can
// pre-check them in its ingredient list (only set when opened via ingredient search).
function rememberHave(r) {
  try {
    const have = (r.usedIngredients || []).map(u => ({
      id: u.id,
      name: String(u.name || u.nameClean || '').toLowerCase(),
    }));
    sessionStorage.setItem(`rezeptbuch:have:${r.id}`, JSON.stringify(have));
  } catch {}
}

// ── results cache (per ingredient query, session-scoped) ──────
function readCache(raw) {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (c && c.query === raw && Array.isArray(c.recipes)) return c.recipes;
  } catch {}
  return null;
}
function writeCache(raw, recipes) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ query: raw, recipes })); } catch {}
}

// ── helpers ───────────────────────────────────────────────────
function skeletonList(n) {
  return `<div class="skeleton-list">${Array.from({ length: n }, () => `
    <div class="sk-card">
      <div class="sk sk-avatar"></div>
      <div class="sk-lines">
        <div class="sk sk-line w70"></div>
        <div class="sk sk-line w40"></div>
      </div>
    </div>`).join('')}</div>`;
}

function stateBlock(ic, title, text, actionHtml) {
  return `
    <div class="empty-state">
      <span class="empty-icon">${icon(ic, 'icon-lg')}</span>
      <h3>${title}</h3>
      <p>${text}</p>
      ${actionHtml || ''}
    </div>`;
}
