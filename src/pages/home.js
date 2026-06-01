// Candidate hero photos (moody editorial food / ingredients) for review.
// Any that fail to load are dropped automatically (see onerror below).
const HERO_PHOTOS = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1800&q=85',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1800&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1800&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1800&q=85',
];

const MIN_INTERVAL = 5 * 60 * 1000;  // 5 min
const MAX_INTERVAL = 10 * 60 * 1000; // 10 min
let heroTimer = null;                // module-level so it survives/clears across renders

export function renderHome(app) {
  clearTimeout(heroTimer);

  app.innerHTML = `
    <div class="hero">
      <div class="hero-slides" id="hero-slides">
        ${HERO_PHOTOS.map(url => `
          <img class="hero-slide" src="${url}" alt="" aria-hidden="true">`).join('')}
      </div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="hero-eyebrow">Rezepte entdecken</p>
        <h1 class="hero-headline">
          Was hast du
          <em>zuhause?</em>
        </h1>
        <p class="hero-sub">Gib deine Zutaten ein und wir finden dein nächstes Rezept.</p>
        <div class="hero-search">
          <input
            class="hero-input"
            id="ingredient-input"
            type="text"
            placeholder="Tomaten, Pasta, Käse..."
            autocomplete="off"
          >
          <button class="hero-btn" id="search-btn">Suchen →</button>
        </div>
      </div>
    </div>
  `;

  setupSlideshow();

  const input = document.getElementById('ingredient-input');
  const btn   = document.getElementById('search-btn');

  function search() {
    const val = input.value.trim();
    if (!val) {
      input.style.borderColor = 'rgba(255,100,100,0.5)';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }
    sessionStorage.setItem('ingredients', val);
    window.location.hash = '#/results';
  }

  btn.addEventListener('click', search);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
}

function setupSlideshow() {
  const wrap = document.getElementById('hero-slides');
  if (!wrap) return;

  // Drop any photo that fails to load so it never shows as a blank slide.
  wrap.querySelectorAll('.hero-slide').forEach(img => {
    img.addEventListener('error', () => {
      const wasActive = img.classList.contains('is-active');
      img.remove();
      if (wasActive) {
        const first = wrap.querySelector('.hero-slide');
        if (first) first.classList.add('is-active');
      }
    });
  });

  // Random starting photo on every load/reload.
  const slides = [...wrap.querySelectorAll('.hero-slide')];
  if (!slides.length) return;
  slides[Math.floor(Math.random() * slides.length)].classList.add('is-active');

  // Then crossfade to a different random photo every 5–10 minutes.
  function scheduleNext() {
    const ms = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
    heroTimer = setTimeout(() => {
      if (!document.body.contains(wrap)) return;
      advance();
      scheduleNext();
    }, ms);
  }

  function advance() {
    const current = wrap.querySelectorAll('.hero-slide');
    if (current.length < 2) return;
    const arr = [...current];
    const active = wrap.querySelector('.hero-slide.is-active') || arr[0];
    let next = active;
    while (next === active) next = arr[Math.floor(Math.random() * arr.length)];
    active.classList.remove('is-active');
    next.classList.add('is-active');
  }

  scheduleNext();
}
