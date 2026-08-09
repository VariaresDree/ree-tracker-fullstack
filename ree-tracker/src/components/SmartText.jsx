// src/components/SmartText.jsx
// Renders text with domain-jargon glossary tooltips (EPIRA, PEC, NEC…) layered
// over normal LaTeX rendering.
//
// Math safety: the glossary regex used to split the WHOLE string, including
// across LaTeX delimiters — a dictionary word landing inside a `$…$` span (or
// even just near one) could tear the pair apart into two independently-passed
// fragments, each missing one `$`, so remark-math failed to parse either half
// and printed a literal stray `$`. Fixed by extracting math spans FIRST as
// atomic tokens, then only glossary-splitting the plain-text segments between
// them — a math span can never be cut mid-expression.
import { useId, useState } from 'react';
import LatexRenderer from './LatexRenderer';

const DICTIONARY = {
  "EPIRA": "Electric Power Industry Reform Act of 2001 (RA 9136)",
  "PEC": "Philippine Electrical Code",
  "NEC": "National Electrical Code",
  "permittivity": "Vacuum permittivity (ε₀) ≈ 8.854 x 10^-12 F/m",
  "permeability": "Vacuum permeability (μ₀) ≈ 4π x 10^-7 H/m",
  "KAIC": "Kilo Ampere Interrupting Capacity"
};

const GLOSSARY_RE = new RegExp(`\\b(${Object.keys(DICTIONARY).join('|')})\\b`, 'gi');
// Captures $$…$$ (block) or $…$ (inline) as one atomic token each. The capture
// group keeps the delimited match in String.split()'s output, interleaved
// with the surrounding plain text.
const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

// One glossary term: a real button (not just a hover target) so it's reachable
// and operable by keyboard, not only a mouse. The tooltip is revealed on
// hover OR focus, and is properly associated via aria-describedby — the
// previous version was a `<span>` with no interactive semantics at all, and
// its tooltip `<div>` (invalid nested inside the outer `<span>`) was
// permanently invisible to anyone not hovering with a mouse.
function GlossaryTerm({ term, definition }) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="text-reeCyan border-b border-dashed border-reeCyan font-bold cursor-help focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] rounded-[var(--radius-sm)]"
        aria-describedby={tooltipId}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {term}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${visible ? 'block' : 'hidden'} w-48 p-2 bg-surface2 border border-border2 rounded-lg shadow-xl text-[11px] text-textMain z-50 text-center pointer-events-none`}
      >
        <span className="block text-reePurple font-black uppercase mb-1">{term}</span>
        {definition}
      </span>
    </span>
  );
}

// Glossary-split a segment KNOWN to contain no math delimiters.
function renderPlainSegment(segment, keyPrefix) {
  const parts = segment.split(GLOSSARY_RE);
  return parts.map((part, i) => {
    const foundKey = Object.keys(DICTIONARY).find((k) => k.toLowerCase() === part.toLowerCase());
    if (foundKey) {
      return <GlossaryTerm key={`${keyPrefix}-${i}`} term={part} definition={DICTIONARY[foundKey]} />;
    }
    // compact: this segment is KNOWN non-math plain text (see function
    // comment) — math-scroll-mobile's overflow+padding has no wide-formula
    // case to protect here, and was measurably misaligning it against
    // adjacent GlossaryTerm/inline content's baseline (same defect as the
    // Flashcard variable rows — see LatexRenderer's `compact` doc).
    return part ? <LatexRenderer compact key={`${keyPrefix}-${i}`} content={part} className="!inline-block" /> : null;
  });
}

export default function SmartText({ text }) {
  if (!text) return null;

  // Math spans first — these pass straight to LatexRenderer untouched, never
  // glossary-split, so a $…$ pair can never be broken mid-expression.
  const segments = text.split(MATH_RE);

  // A <div> root, not <span>: LatexRenderer always renders a <div>, and this
  // component is only ever used inside an existing <div> in both call sites —
  // a <span> root put block content directly inside inline phrasing content,
  // which is invalid HTML. The LaTeX fragments below stay `inline-block`
  // styled so they still flow inline with the surrounding text visually.
  return (
    <div className="leading-relaxed selection:bg-reeCyan/30 selection:text-reeCyan">
      {segments.map((segment, i) => {
        if (!segment) return null;
        if (/^\$\$[\s\S]+\$\$$/.test(segment) || /^\$[^$\n]+\$$/.test(segment)) {
          return <LatexRenderer key={i} content={segment} className="!inline-block" />;
        }
        return renderPlainSegment(segment, i);
      })}
    </div>
  );
}
