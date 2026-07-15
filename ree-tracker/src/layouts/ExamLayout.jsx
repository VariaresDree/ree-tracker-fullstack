import React from 'react';
import { ShieldAlert } from '../components/ui/icons';

export default function ExamLayout({ children }) {
  return (
    <div className="exam-environment min-h-dvh flex flex-col bg-bg">
      {/* Minimalist high-contrast warning header (sticky so it stays visible).
          Copy + size step down on phones so it stays one line and doesn't
          double the sticky chrome above the toolbar. */}
      <header
        className="sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-2 text-center text-[0.7rem] sm:text-[0.8rem] font-semibold tracking-wide uppercase text-white"
        style={{
          background: 'var(--accent-danger)',
          boxShadow: '0 2px 10px color-mix(in srgb, var(--accent-danger) 30%, transparent)',
        }}
      >
        <ShieldAlert size={15} strokeWidth={2} className="shrink-0" />
        <span>
          <span className="sm:hidden">Distraction-free exam — timer running</span>
          <span className="hidden sm:inline">Distraction-free board simulation active — real-time penalties apply</span>
        </span>
      </header>

      {/* Centered, fluid exam viewport (wide enough for circuits/derivations) */}
      <main className="flex-1 overflow-y-auto flex justify-center px-4 py-6 sm:py-8 custom-scrollbar">
        <div className="w-full max-w-[1000px]">{children}</div>
      </main>
    </div>
  );
}
