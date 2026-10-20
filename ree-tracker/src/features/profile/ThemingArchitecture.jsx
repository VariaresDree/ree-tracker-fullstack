// src/features/profile/ThemingArchitecture.jsx
import { Palette } from '../../components/ui/icons';
import { Card, cn, Grid, SegmentedControl } from '../../components/ui';
// Three-dot swatches mirror each theme's real tokens ([page, panel, text or
// accent]): far more informative than the emoji they replace.
import { THEMES } from '../../theme/themes';

const BACKGROUNDS = [
  { value: 'textured', label: 'Textured' },
  { value: 'plain', label: 'Plain' },
];

export default function ThemingArchitecture({ theme, setTheme, plainBackground = false, setPlainBackground }) {
  return (
    <Card padding="lg" className="shadow-sm">
      <div className="border-b border-border pb-4 mb-6">
        <h3 className="text-h3 text-textMain flex items-center gap-2">
          <Palette size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" /> Theme
        </h3>
        <p className="text-xs text-muted2 mt-1">Choose how the app looks.</p>
      </div>

      <Grid kind="tiles" gap="sm" className="@2xl:grid-cols-4 @4xl:grid-cols-5" role="radiogroup" aria-label="Theme">
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
                'p-3 min-h-11 min-w-0 rounded-[var(--radius-default)] border flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center',
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
              <span className="text-micro text-muted2 block leading-tight">{t.desc}</span>
            </button>
          );
        })}
      </Grid>

      {setPlainBackground && (
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-textMain">Background</p>
            <p className="text-xs text-muted2 mt-0.5">Each theme's glow and pattern behind the page. Cards are unaffected.</p>
          </div>
          <SegmentedControl
            label="Background"
            size="sm"
            options={BACKGROUNDS}
            value={plainBackground ? 'plain' : 'textured'}
            onChange={(v) => setPlainBackground(v === 'plain')}
          />
        </div>
      )}
    </Card>
  );
}
