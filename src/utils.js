// Shared helpers used across pages.
import { icon } from './icons.js';

// Escape user/API-provided strings before injecting into innerHTML.
export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Five-star rating from a 0–100 score (e.g. spoonacularScore).
export function stars(score) {
  const filled = Math.round((score || 0) / 20);
  let out = '<span class="rd-stars">';
  for (let i = 1; i <= 5; i++) {
    out += `<span class="rd-star${i <= filled ? ' is-on' : ''}">${icon('star', 'icon-sm')}</span>`;
  }
  return out + '</span>';
}
