// src/features/paper-sets/print/AnswerSheet.jsx
//
// The scannable answer sheet, one SVG per page, drawn from
// exam-export/sheetLayout's answerSheetGeometry: the geometry the LaTeX sheet
// draws and the scanner reads back, so the three agree to the hundredth of a
// millimetre. User units are page mm (viewBox 0 0 W H, sized W mm by H mm).
// Each bubble carries data-n (item) and data-k (option index). Text sizes and
// strokes follow the TikZ sheet: numbers 8 pt bold, right-aligned at label.x;
// box labels 6 pt; name and date boxes 0.5 pt, the SET box 0.6 pt; a text's
// y is its baseline.
import { PaperSheet } from './PaperSheet';
import { qrPath } from './qr';

const MM_PER_PT = 25.4 / 72;
// As the LaTeX sheet: bubble letters at 45% black (black!45), box labels at 70%.
const LETTER_GREY = 'rgb(140, 140, 140)';
const LABEL_GREY = 'rgb(77, 77, 77)';
const num = (v) => Number(v.toFixed(3));

export function AnswerSheetSvg({ geometry, page, modules }) {
  const { w, h } = geometry;
  const fs = page.fiducialSize;
  const qr = page.qr;
  const qrD = modules ? qrPath(modules, qr.x, qr.y, qr.size) : '';
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={`${w}mm`}
      height={`${h}mm`}
      data-sheet-page={page.index + 1}
      role="img"
      aria-label={`Answer sheet, page ${page.index + 1} of ${page.count}: items ${page.from} to ${page.to}, a row of answer circles for each`}
      className="ree-answer-svg"
    >
      <rect x="0" y="0" width={w} height={h} fill="#fff" />
      {page.fiducials.map((f, i) => (
        <rect key={`f${i}`} x={num(f.x - fs / 2)} y={num(f.y - fs / 2)} width={fs} height={fs} fill="#000" shapeRendering="crispEdges" />
      ))}
      {page.idCells.filter((c) => c.filled).map((c) => (
        <rect key={`id${c.x}`} x={num(c.x)} y={num(c.y)} width={c.size} height={c.size} fill="#000" shapeRendering="crispEdges" />
      ))}
      {qrD
        ? <path d={qrD} fill="#000" shapeRendering="crispEdges" />
        : modules === false && (
          <g>
            <rect x={qr.x} y={qr.y} width={qr.size} height={qr.size} fill="none" stroke="#000" strokeWidth={0.2} />
            <text x={num(qr.x + qr.size / 2)} y={num(qr.y + qr.size / 2)} fontSize={num(4 * MM_PER_PT)} textAnchor="middle" dominantBaseline="central">{qr.payload}</text>
          </g>
        )}
      {[page.nameBox, page.dateBox].filter(Boolean).map((box) => (
        <g key={box.label}>
          <rect x={num(box.x)} y={num(box.y)} width={num(box.w)} height={num(box.h)} fill="none" stroke="#000" strokeWidth={num(0.5 * MM_PER_PT)} />
          <text x={num(box.x + 1.2)} y={num(box.y + 1)} fontSize={num(6 * MM_PER_PT)} fill={LABEL_GREY} dominantBaseline="hanging">{box.label}</text>
        </g>
      ))}
      {page.text.map((t, i) => (
        <g key={`t${i}`}>
          {t.box && <rect x={num(t.box.x)} y={num(t.box.y)} width={num(t.box.w)} height={num(t.box.h)} fill="none" stroke="#000" strokeWidth={num(0.6 * MM_PER_PT)} />}
          <text
            x={num(t.x)}
            y={num(t.y)}
            fontSize={num(t.size * MM_PER_PT)}
            fontWeight={t.weight === 'bold' ? 700 : 400}
            fontStyle={t.italic ? 'italic' : undefined}
            textAnchor={t.anchor || 'start'}
          >
            {t.str}
          </text>
        </g>
      ))}
      {page.labels.map((l) => (
        <text key={`n${l.n}`} x={num(l.x)} y={num(l.y)} fontSize={num(8 * MM_PER_PT)} fontWeight={700} textAnchor="end" dominantBaseline="central">
          {l.n}.
        </text>
      ))}
      {page.bubbles.map((b) => (
        <g key={`b${b.n}-${b.k}`}>
          <circle cx={num(b.cx)} cy={num(b.cy)} r={b.r} fill="none" stroke="#000" strokeWidth={num(0.3 * MM_PER_PT)} data-n={b.n} data-k={b.k} />
          <text x={num(b.cx)} y={num(b.cy)} fontSize={num(5 * MM_PER_PT)} fill={LETTER_GREY} textAnchor="middle" dominantBaseline="central">
            {b.letter}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AnswerSheetPages({ geometry, scale, modules }) {
  const size = { w: geometry.w, h: geometry.h };
  return geometry.pages.map((page) => (
    <PaperSheet
      key={`sheet-${page.index}`}
      size={size}
      scale={scale}
      fit={false}
      label={`Answer sheet, page ${page.index + 1} of ${page.count}`}
    >
      <AnswerSheetSvg geometry={geometry} page={page} modules={modules?.[page.index] ?? null} />
    </PaperSheet>
  ));
}
