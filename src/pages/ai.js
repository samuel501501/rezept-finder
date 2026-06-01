import { generateRecipe } from '../api/groq.js';
import { icon }           from '../icons.js';
import { escapeHtml }     from '../utils.js';

// Standalone AI generator page (#/ai) — used on mobile, where the desktop side
// panel is replaced by a recipe-style card that links here.
export async function renderAiPage(app) {
  const raw         = (sessionStorage.getItem('ingredients') || '').trim();
  const ingredients = raw.split(',').map(s => s.trim()).filter(Boolean);

  app.innerHTML = `
    <div class="page ai-page">
      <div class="ai-page-wrap">
        <a class="back-link" href="#/results">${icon('arrowLeft', 'icon-sm')} Zurück zu den Rezepten</a>
        <div class="ai-page-content" id="aurora-inner"></div>
      </div>
    </div>
  `;

  mountAiGenerator(app.querySelector('#aurora-inner'), ingredients, raw);
}

// Mounts the AI generator into a panel's inner element. Swaps between the input
// form, a loading state, and the finished recipe. Shared by the desktop results
// panel and the standalone #/ai page so both behave identically.
export function mountAiGenerator(inner, ingredients, raw) {
  renderForm();

  function renderForm() {
    inner.innerHTML = `
      <p class="section-label">${icon('sparkles', 'icon-sm')} KI-Generierung</p>
      <h2 class="section-title">Dein kreatives<br><em>Rezept</em></h2>
      <p class="aurora-lead">Lass dir aus deinen Zutaten ein einzigartiges Rezept zaubern — passend zu deinem Anlass.</p>
      <div class="ai-form">
        <div class="form-group">
          <label class="form-label" for="ai-ingredients">Deine Zutaten</label>
          <input class="form-input" id="ai-ingredients" value="${escapeHtml(raw)}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label" for="ai-theme">Thema / Anlass</label>
          <input class="form-input" id="ai-theme" placeholder="z.B. Romantisches Dinner, schnelles Mittagessen...">
        </div>
        <button class="aurora-btn" id="ai-btn">
          <span class="btn-label">${icon('sparkles', 'icon-sm')} Rezept generieren</span>
        </button>
      </div>`;

    const btn      = inner.querySelector('#ai-btn');
    const themeInp = inner.querySelector('#ai-theme');

    const generate = async () => {
      const theme = themeInp.value.trim();
      if (!theme) {
        themeInp.classList.add('input-error');
        setTimeout(() => themeInp.classList.remove('input-error'), 1000);
        themeInp.focus();
        return;
      }
      renderLoading();
      try {
        renderRecipe(await generateRecipe(ingredients, theme));
      } catch {
        renderError();
      }
    };

    btn.addEventListener('click', generate);
    themeInp.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  }

  function renderLoading() {
    inner.innerHTML = `
      <div class="ai-recipe-loading">
        <div class="sk sk-line w40" style="height:1.3rem; margin-bottom:1.4rem"></div>
        <div class="sk sk-line w80" style="height:2.2rem; margin-bottom:1.6rem"></div>
        ${skeletonLines(6)}
      </div>`;
  }

  function renderRecipe(recipe) {
    inner.innerHTML = `
      <button class="copy-btn" type="button" title="Kopieren" aria-label="Rezept kopieren">${icon('copy', 'icon-sm')}</button>
      ${aiRecipeView(recipe)}
      <button class="ai-regen" id="ai-regen" type="button">${icon('refresh', 'icon-sm')} Neues Rezept</button>`;

    const copyBtn = inner.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(recipeToText(recipe)); } catch {}
      copyBtn.innerHTML = icon('check', 'icon-sm');
      setTimeout(() => { copyBtn.innerHTML = icon('copy', 'icon-sm'); }, 1500);
    });
    inner.querySelector('#ai-regen').addEventListener('click', renderForm);
  }

  function renderError() {
    inner.innerHTML = `
      <p class="ai-error">${icon('alert', 'icon-sm')} Generierung fehlgeschlagen.</p>
      <button class="ghost-btn" id="ai-retry" type="button">Erneut versuchen</button>`;
    inner.querySelector('#ai-retry').addEventListener('click', renderForm);
  }
}

// Render the structured Groq recipe into a vibrant, AI-styled card.
function aiRecipeView(r) {
  const meta = [
    r.time     ? `<span class="ai-meta-pill">${icon('clock', 'icon-sm')} ${escapeHtml(r.time)}</span>` : '',
    r.servings ? `<span class="ai-meta-pill">${icon('users', 'icon-sm')} ${escapeHtml(r.servings)}</span>` : '',
  ].filter(Boolean).join('');

  const ingredients = r.ingredients.length
    ? `<section class="ai-sec">
         <h4 class="ai-sec-title">${icon('utensils', 'icon-sm')} Zutaten</h4>
         <ul class="ai-ingredients">
           ${r.ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
         </ul>
       </section>`
    : '';

  const steps = r.steps.length
    ? `<section class="ai-sec">
         <h4 class="ai-sec-title">${icon('flame', 'icon-sm')} Zubereitung</h4>
         <ol class="ai-steps">
           ${r.steps.map((s, i) => `
             <li class="ai-step"><span class="ai-step-n">${i + 1}</span><p>${escapeHtml(s)}</p></li>`).join('')}
         </ol>
       </section>`
    : '';

  return `
    <span class="ai-badge">${icon('sparkles', 'icon-sm')} KI-kreiert</span>
    <h3 class="ai-recipe-title">${escapeHtml(r.title)}</h3>
    ${r.intro ? `<p class="ai-recipe-intro">${escapeHtml(r.intro)}</p>` : ''}
    ${meta ? `<div class="ai-meta">${meta}</div>` : ''}
    <div class="ai-recipe-body">
      ${ingredients}
      ${steps}
    </div>`;
}

// Plain-text version of the recipe for the copy button.
function recipeToText(r) {
  const lines = [r.title];
  if (r.intro) lines.push('', r.intro);
  if (r.time || r.servings) lines.push('', [r.time, r.servings].filter(Boolean).join('  •  '));
  if (r.ingredients.length) lines.push('', 'Zutaten:', ...r.ingredients.map(i => `- ${i}`));
  if (r.steps.length) lines.push('', 'Zubereitung:', ...r.steps.map((s, i) => `${i + 1}. ${s}`));
  return lines.join('\n');
}

function skeletonLines(n) {
  const widths = ['w90', 'w70', 'w80', 'w50', 'w60'];
  return Array.from({ length: n }, (_, i) => `<div class="sk sk-line ${widths[i % widths.length]}"></div>`).join('');
}
