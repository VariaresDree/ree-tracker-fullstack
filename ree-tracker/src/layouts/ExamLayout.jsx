import { ShieldAlert } from '../components/ui/icons';

export default function ExamLayout({
  children,
  shortMessage = 'Exam in progress — clock running',
  message = 'Exam in progress — the clock is running, and results come at the end',
}) {
  return (
    // Sticky children sit at the top of the screen once the banner has scrolled
    // away, and there is no bottom bar, only the home indicator to clear.
    <div
      className="exam-environment min-h-dvh flex flex-col bg-bg"
      style={{ '--sticky-top': 'max(0.5rem, env(safe-area-inset-top))', '--bottom-bar-h': 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Minimalist high-contrast warning header. It scrolls away: it stuck above
          the session bar for the whole exam, when the running clock says the same
          thing. Copy + size step down on phones so it stays one line.
          shortMessage/message default to plain mock-board copy. The old
          default promised "real-time penalties" that don't exist, and the
          Gauntlet (which shares this layout) passes its own pair.
          The banner is a danger button's fill and ink (--on-danger), not white
          on the raw token: text this size (12.8px semibold) needs 4.5:1, and
          white on a darkened danger read 2.65-4.13:1 on the math, ocean,
          forest, organs, electrical and retrowave themes, whose danger is a
          light pink. themeContrast.test.js measures the pair in every theme. */}
      <header
        className="flex items-center justify-center gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-xs sm:text-[0.8rem] font-semibold tracking-wide uppercase"
        style={{
          background: 'color-mix(in srgb, var(--accent-danger) 88%, black)',
          color: 'var(--on-danger)',
          boxShadow: '0 2px 10px color-mix(in srgb, var(--accent-danger) 30%, transparent)',
        }}
      >
        <ShieldAlert size={15} strokeWidth={2} className="shrink-0" />
        <span>
          <span className="sm:hidden">{shortMessage}</span>
          <span className="hidden sm:inline">{message}</span>
        </span>
      </header>

      {/* Centered, fluid exam viewport (wide enough for circuits/derivations).
          overflow-x-clip rather than overflow-y-auto: this <main> never
          scrolled (the window does), but overflow-y-auto made it the scroll
          container of the sticky exam toolbar, so the toolbar and its clock
          scrolled away on a long question. */}
      <main id="main-content" className="flex-1 min-w-0 overflow-x-clip flex justify-center px-4 py-3 sm:py-8">
        <div className="w-full max-w-[1000px]">{children}</div>
      </main>
    </div>
  );
}
