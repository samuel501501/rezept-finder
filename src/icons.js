// Inline SVG icons (Lucide-style, 24×24, currentColor stroke).
// Use: icon('clock', 'icon-sm') → returns an <svg> string.

const PATHS = {
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:    '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 4.13A4 4 0 0 1 16 11.87"/>',
  flame:    '<path d="M12 2.5c1.5 3 4.5 4.5 4.5 8a4.5 4.5 0 0 1-9 0c0-1.3.5-2.3 1.2-3.2C9.6 8.5 11 7.5 12 2.5Z"/><path d="M12 19a3 3 0 0 0 3-3c0-1.4-1.2-2.5-1.8-3.4C12.4 13.6 11 14.5 11 16a1 1 0 0 0 1 1Z"/>',
  sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z"/><path d="M5 14l.6 1.6L7 16l-1.4.4L5 18l-.6-1.6L3 16l1.4-.4Z"/>',
  arrowLeft:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowRight:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  copy:     '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  check:    '<path d="M20 6 9 17l-5-5"/>',
  link:     '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  leaf:     '<path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16Z"/><path d="M11 20c0-5 2-9 6-12"/>',
  utensils: '<path d="M3 3v6a3 3 0 0 0 3 3v9"/><path d="M6 3v6"/><path d="M9 3v6"/><path d="M17 3c-1.5 0-3 1.5-3 5v4h3"/><path d="M17 3v18"/>',
  alert:    '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  star:     '<path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9Z"/>',
  refresh:  '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v5h-5"/>',
  heart:    '<path d="M12 20s-7-4.4-9.3-8.6C1 8 2.8 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.2 0 5 3 3.3 6.4C19 15.6 12 20 12 20Z"/>',
};

export function icon(name, cls = 'icon') {
  const d = PATHS[name];
  if (!d) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
