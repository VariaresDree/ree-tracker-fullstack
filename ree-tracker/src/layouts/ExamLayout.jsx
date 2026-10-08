import React from 'react';
import { ShieldAlert } from '../components/ui/icons';

export default function ExamLayout({
  children,
  shortMessage = 'Distraction-free exam — timer running',
  message = 'Distraction-free board simulation active — real-time penalties apply',
}) {
  return (
    // Sticky children sit just under the exam banner; there is no bottom bar.
    <div
      className="exam-environment min-h-dvh flex flex-col bg-bg"
      style={{ '--sticky-top': 'calc(max(0.5rem, env(safe-area-inset-top)) + 2.25rem)', '--bottom-bar-h': '0px' }}
    >
      {/* Minimalist high-contrast warning header (sticky so it stays visible).
          Copy + size step down on phones so it stays one line and doesn't
          double the sticky chrome above the toolbar.
          shortMessage/message default to the original Board Simulator copy —
          this layout is shared with Gauntlet, which was getting that same
          "board simulation... real-time penalties" text unconditionally on
          desktop (only the mobile string was generic enough to read as
          accurate there). Gauntlet now passes its own pair.
          Background is a darkened accent-danger, not the raw token: measured
          white-on-raw-accent-danger at ~3.2:1, under the 4.5:1 AA floor for
          text this size (12.8px semibold doesn't qualify as "large text").
          Mixing in 25% black brings it to ~5.3:1 without touching the shared
          --accent-danger variable, which reads fine elsewhere because those
          usages put the accent color as TEXT on a low-opacity tint, not white
          text on a full-strength fill — a different contrast pair entirely. */}
      <header
        className="sticky top-0 z-30 flex items-center justify-center gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-[0.7rem] sm:text-[0.8rem] font-semibold tracking-wide uppercase text-white"
        style={{
          background: 'color-mix(in srgb, var(--accent-danger) 75%, black)',
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
      <main id="main-content" className="flex-1 min-w-0 overflow-x-clip flex justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[1000px]">{children}</div>
      </main>
    </div>
  );
}
