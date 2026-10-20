// src/theme/themes.js
//
// The 13 themes, one list for the picker (features/profile/ThemingArchitecture),
// the browser's theme colour and the pre-paint script in index.html. The
// colours themselves live in styles/index.css; `swatch` previews a theme
// ([page, panel, accent or text]) and `metaColor` is its card surface
// (--bg-surface), which the browser bar and the phone header share.
// themeMeta.test.js keeps these in step with index.css and index.html.

export const THEMES = [
  { id: 'dark', label: 'Original', desc: 'Deep space', swatch: ['#0b0f1a', '#1a2236', '#7c5cff'], metaColor: '#121826' },
  { id: 'light', label: 'Light', desc: 'PRC Standard', swatch: ['#f8fafc', '#e2e8f0', '#0f172a'], metaColor: '#ffffff', isLight: true },
  { id: 'midnight', label: 'Midnight', desc: 'OLED Pure Black', swatch: ['#000000', '#09090b', '#fafafa'], metaColor: '#09090b' },
  { id: 'paper', label: 'Paper', desc: 'Warm Sepia', swatch: ['#fdf6e3', '#fefce8', '#451a03'], metaColor: '#fefce8', isLight: true },
  { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon Edge', swatch: ['#0f0f15', '#1e1b4b', '#fef08a'], metaColor: '#1e1b4b' },
  { id: 'retrowave', label: 'Retrowave', desc: 'Synth Vibe', swatch: ['#1e002a', '#3b0764', '#fdf4ff'], metaColor: '#3b0764' },
  { id: 'forest', label: 'Forest', desc: 'Deep Woods', swatch: ['#022c22', '#064e3b', '#ecfdf5'], metaColor: '#064e3b' },
  { id: 'ocean', label: 'Ocean', desc: 'Abyssal Depth', swatch: ['#082f49', '#164e63', '#e0f2fe'], metaColor: '#164e63' },
  { id: 'sakura', label: 'Sakura', desc: 'Cherry Blossom', swatch: ['#fdf2f8', '#fce7f3', '#831843'], metaColor: '#fce7f3', isLight: true },
  { id: 'terminal', label: 'Phosphor', desc: 'Green on black', swatch: ['#000000', '#052e16', '#4ade80'], metaColor: '#000000' },
  { id: 'organs', label: 'Organs', desc: 'Flesh & Crimson', swatch: ['#450a0a', '#7f1d1d', '#fef2f2'], metaColor: '#7f1d1d' },
  { id: 'math', label: 'Math', desc: 'Blueprint Grid', swatch: ['#1e3a8a', '#1e40af', '#eff6ff'], metaColor: '#1e40af' },
  { id: 'electrical', label: 'Electrical', desc: 'Copper & Amber', swatch: ['#24140b', '#451a03', '#fef3c7'], metaColor: '#451a03' },
];

export const DEFAULT_THEME = 'dark';
const BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** The theme for an id, or the default for an unknown one. */
export const themeById = (id) => BY_ID[id] || BY_ID[DEFAULT_THEME];
