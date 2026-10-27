// src/features/paper-sets/print/PaperSheet.jsx
//
// One sheet of paper at its real size in mm, black on white whatever the
// app's theme. On a narrow screen it is scaled down to fit (a transform, so
// its layout, and so its pagination, stay exactly the printed one); printing
// drops the scale. Every sheet carries its own footer, numbered per document.
import { useLayoutEffect, useRef } from 'react';
import { mmToPx } from './paginate';
import { fitDisplays } from './useMeasuredPages';

export function PaperSheet({ size, scale = 1, label, footer, children, fit = true }) {
  const ref = useRef(null);
  // The display formulas that are too wide for their column, shrunk as in
  // the measuring pass (the same widths, so the same result).
  useLayoutEffect(() => {
    if (fit) fitDisplays(ref.current);
  });
  return (
    <div
      className="ree-sheet-frame"
      style={{ width: `${mmToPx(size.w) * scale}px`, height: `${mmToPx(size.h) * scale}px` }}
      role="group"
      aria-label={label}
    >
      <div
        ref={ref}
        className="ree-sheet ree-sheet-type"
        style={{ width: `${size.w}mm`, height: `${size.h}mm`, transform: scale === 1 ? undefined : `scale(${scale})` }}
      >
        {children}
        {footer && (
          <div className="ree-footer">
            <span>{footer.left}</span>
            <span>{footer.right}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** A column of blocks; a block too tall for it is scaled down to fit. */
export function SheetColumn({ keys, oversize, heights, render, gapMm = 0 }) {
  return (
    <div className="ree-col" style={{ gap: `${gapMm}mm` }}>
      {keys.map((key) => {
        const scale = oversize?.[key];
        if (!scale) return <div key={key} className="ree-block">{render(key)}</div>;
        const h = heights?.[key] || 0;
        return (
          <div key={key} className="ree-block ree-block-scaled" style={{ height: `${h * scale}px` }}>
            <div style={{ transform: `scale(${scale})` }}>{render(key)}</div>
          </div>
        );
      })}
    </div>
  );
}
