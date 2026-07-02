// src/features/profile/ThemingArchitecture.jsx
import { Palette } from '../../components/ui/icons';
import { cn } from '../../components/ui';

// Three-dot swatches mirror each theme's real tokens in src/styles/index.css
// ([bg-primary, bg-surface(2), text-main/accent]) — far more informative than
// the emoji they replace, and immune to platform emoji fonts.
const THEMES = [
  { id: 'dark', label: 'Original', desc: 'Deep Space Matrix', swatch: ['#0b0f1a', '#1a2236', '#7c5cff'] },
  { id: 'light', label: 'Light', desc: 'PRC Standard', swatch: ['#f8fafc', '#e2e8f0', '#0f172a'] },
  { id: 'midnight', label: 'Midnight', desc: 'OLED Pure Black', swatch: ['#000000', '#09090b', '#fafafa'] },
  { id: 'paper', label: 'Paper', desc: 'Warm Sepia', swatch: ['#fdf6e3', '#fefce8', '#451a03'] },
  { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon Edge', swatch: ['#0f0f15', '#1e1b4b', '#fef08a'] },
  { id: 'retrowave', label: 'Retrowave', desc: 'Synth Vibe', swatch: ['#1e002a', '#3b0764', '#fdf4ff'] },
  { id: 'forest', label: 'Forest', desc: 'Deep Woods', swatch: ['#022c22', '#064e3b', '#ecfdf5'] },
  { id: 'ocean', label: 'Ocean', desc: 'Abyssal Depth', swatch: ['#082f49', '#164e63', '#e0f2fe'] },
  { id: 'sakura', label: 'Sakura', desc: 'Cherry Blossom', swatch: ['#fdf2f8', '#fce7f3', '#831843'] },
  { id: 'terminal', label: 'Terminal', desc: 'Hacker Green', swatch: ['#000000', '#052e16', '#4ade80'] },
  { id: 'organs', label: 'Organs', desc: 'Flesh & Crimson', swatch: ['#450a0a', '#7f1d1d', '#fef2f2'] },
  { id: 'math', label: 'Math', desc: 'Blueprint Grid', swatch: ['#1e3a8a', '#1e40af', '#eff6ff'] },
  { id: 'electrical', label: 'Electrical', desc: 'Copper & Amber', swatch: ['#24140b', '#451a03', '#fef3c7'] },
];

export default function ThemingArchitecture({ theme, setTheme }) {
  return (
    <div className="bg-surface border border-border p-6 rounded-[var(--radius-lg)] shadow-sm">
      <div className="border-b border-border pb-4 mb-6">
        <h3 className="text-sm font-semibold text-textMain flex items-center gap-2">
          <Palette size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" /> Theme
        </h3>
        <p className="text-xs text-muted2 mt-1">Choose how the app looks.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => {
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(t.id)}
              className={cn(
                'p-3 min-h-11 rounded-[var(--radius-default)] border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center',
                selected
                  ? 'bg-surface3 border-[color-mix(in_srgb,var(--accent)_60%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
                  : 'bg-bg border-border2 hover:border-muted hover:bg-surface2'
              )}
            >
              <span className="flex items-center gap-1" aria-hidden="true">
                {t.swatch.map((c, i) => (
                  <span key={i} className="w-3.5 h-3.5 rounded-full border border-border2 shadow-sm" style={{ background: c }}></span>
                ))}
              </span>
              <span className={cn('block text-xs font-bold', selected ? 'text-textMain' : 'text-muted')}>{t.label}</span>
              <span className="text-[11px] text-muted2 block leading-tight">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
