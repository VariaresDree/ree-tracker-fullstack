// src/features/profile/ThemingArchitecture.jsx
import { cn, SegmentedControl } from '../../components/ui';
// Three-dot swatches mirror each theme's real tokens ([page, panel, text or
// accent]): far more informative than the emoji they replace.
import { THEMES } from '../../theme/themes';

const BACKGROUNDS = [
  { value: 'textured', label: 'Textured' },
  { value: 'plain', label: 'Plain' },
];

export default function ThemingArchitecture({ theme, setTheme, plainBackground = false, setPlainBackground }) {
  // No card of its own: it sits in Account's Appearance card, and a card in
  // a card drew a second frame.
  return (
    <div className="flex flex-col gap-4">
      {/* Three across on a phone, seen rather than read: the swatches show each
          theme, and the description is on hover. It was two across with a line of
          text each, about 1,000px of the page. */}
      <div className="@container">
        <div className="grid grid-cols-3 @2xl:grid-cols-5 gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={t.desc}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'p-2 min-h-11 min-w-0 rounded-[var(--radius-default)] border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center',
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
                <span className={cn('block text-xs font-semibold', selected ? 'text-textMain' : 'text-muted2')}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {setPlainBackground && (
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
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
    </div>
  );
}
