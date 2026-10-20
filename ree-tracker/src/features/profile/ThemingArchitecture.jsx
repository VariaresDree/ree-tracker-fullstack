// src/features/profile/ThemingArchitecture.jsx
import { Palette } from '../../components/ui/icons';
import { cn } from '../../components/ui';
// Three-dot swatches mirror each theme's real tokens ([page, panel, text or
// accent]): far more informative than the emoji they replace.
import { THEMES } from '../../theme/themes';

export default function ThemingArchitecture({ theme, setTheme }) {
  return (
    <div className="bg-surface border border-border p-6 rounded-[var(--radius-lg)] shadow-sm">
      <div className="border-b border-border pb-4 mb-6">
        <h3 className="text-sm font-semibold text-textMain flex items-center gap-2">
          <Palette size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" /> Theme
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
