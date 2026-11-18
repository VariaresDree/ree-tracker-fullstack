// src/features/reference/fastMath.jsx
//
// MathText: card text drawn straight with KaTeX (fastMathText.js says why and
// holds the helpers), falling back to LatexRenderer for real Markdown.
import LatexRenderer from '../../components/LatexRenderer';
import { katexHtml, mathSegments } from './fastMathText';

/**
 * Card text, fast. `inline` for a span inside a sentence; `display` draws a
 * lone formula in display style (full-size fractions), as a card's main
 * formula. Same wrapper classes as LatexRenderer, so the math CSS applies.
 */
export function MathText({ content, inline = false, display = false, className = '' }) {
  if (content === null || content === undefined || content === '') return null;
  const parts = mathSegments(content);
  if (!parts) return <LatexRenderer content={String(content)} inline={inline} className={className} />;
  const Tag = inline ? 'span' : 'div';
  const lone = display && parts.length === 1 && parts[0].math;
  return (
    <Tag className={`math-text${inline ? ' math-text-inline' : ' leading-relaxed'} ${className}`.trim()}>
      {parts.map((p, i) => (p.math
        ? <span key={i} dangerouslySetInnerHTML={{ __html: katexHtml(p.value, lone) }} />
        : <span key={i}>{p.value}</span>))}
    </Tag>
  );
}
