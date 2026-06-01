import './style.css';
import { renderHome }    from './pages/home.js';
import { renderResults } from './pages/results.js';
import { renderDiscover }from './pages/discover.js';
import { renderDetail }  from './pages/detail.js';
import { renderAiPage }  from './pages/ai.js';

const app = document.getElementById('app');

// Signals that JS is running. Entrance animations are gated behind `.js-loaded`
// in CSS, so if this never runs the layout still renders at its visible defaults.
document.body.classList.add('js-loaded');

function renderNav(active) {
  document.querySelector('nav')?.remove();
  const nav = document.createElement('nav');
  nav.innerHTML = `
    <a class="nav-logo" href="#/">Rezeptbuch</a>
    <div class="nav-links">
      <a href="#/"        class="${active === 'home'     ? 'active' : ''}">Home</a>
      <a href="#/discover"class="${active === 'discover' ? 'active' : ''}">Discover</a>
    </div>
  `;
  document.body.insertBefore(nav, app);
}

async function router() {
  const hash = window.location.hash || '#/';
  if (hash === '#/' || hash === '') {
    renderNav('home');    renderHome(app);
  } else if (hash === '#/results') {
    renderNav('');        await renderResults(app);
  } else if (hash === '#/ai') {
    renderNav('');        await renderAiPage(app);
  } else if (hash === '#/discover') {
    renderNav('discover');await renderDiscover(app);
  } else if (hash.startsWith('#/detail/')) {
    renderNav('');        await renderDetail(app, hash.replace('#/detail/', ''));
  } else {
    renderNav('home');    renderHome(app);
  }
}

window.addEventListener('hashchange', router);
router();