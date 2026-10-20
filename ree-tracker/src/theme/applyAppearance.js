// src/theme/applyAppearance.js
//
// Puts a theme on the page: the data-theme attribute styles/index.css keys on
// (none for the default) and the browser's theme colour, so the status bar
// and the installed app's title bar match the theme instead of staying navy.
// index.html runs the same steps before first paint; the store's setTheme and
// MainLayout call this afterwards.
import { DEFAULT_THEME, themeById } from './themes';

export function applyTheme(id) {
  const theme = themeById(id);
  const root = document.documentElement;
  if (theme.id === DEFAULT_THEME) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.metaColor);
  return theme.id;
}
