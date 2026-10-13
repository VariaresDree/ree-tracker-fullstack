// src/components/SmartText.jsx
// Renders question text with domain-jargon glossary tooltips (EPIRA, PEC,
// NEC…) layered over normal LaTeX rendering.
//
// The whole string goes through ONE markdown + KaTeX pass, so inline math
// flows inside its sentence. The old version split the text into math and
// plain segments and rendered each as its own inline-block box with its own
// paragraph and scroll container: inline formulas were lifted above the line,
// left gaps where they should have been, and showed a scrollbar mid-sentence.
//
// Math safety: the glossary is applied AFTER KaTeX, to the plain text nodes of
// the rendered tree only, skipping anything inside a `.katex` element or code.
// A `$…$` pair is parsed whole before the glossary ever sees the text, so a
// dictionary word inside or beside a formula can never tear it apart.
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

function lookup(term) {
  const key = Object.keys(DICTIONARY).find((k) => k.toLowerCase() === term.toLowerCase());
  return key ? DICTIONARY[key] : null;
}

// One glossary term: a real button (not just a hover target) so it's reachable
// and operable by keyboard, not only a mouse. The tooltip is revealed on
// hover OR focus, and is properly associated via aria-describedby.
function GlossaryTerm({ term, definition }) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="text-reeCyan-text border-b border-dashed border-reeCyan font-bold cursor-help focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] rounded-[var(--radius-sm)]"
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
        <span className="block text-reePurple-text font-black uppercase mb-1">{term}</span>
        {definition}
      </span>
    </span>
  );
}

const SKIP_TAGS = new Set(['code', 'pre', 'a', 'button']);
function isSkipped(node) {
  if (SKIP_TAGS.has(node.tagName)) return true;
  const cls = node.properties?.className;
  return Array.isArray(cls) && cls.some((c) => String(c).startsWith('katex'));
}

// rehype plugin: wrap each dictionary word in plain text in an <abbr
// data-glossary> element, which the `abbr` component below turns into a
// GlossaryTerm. Runs after rehype-katex, so math is already a `.katex` subtree.
function rehypeGlossary() {
  const walk = (parent) => {
    if (!parent.children) return;
    const next = [];
    for (const child of parent.children) {
      if (child.type === 'element') {
        if (!isSkipped(child)) walk(child);
        next.push(child);
        continue;
      }
      if (child.type !== 'text' || !GLOSSARY_RE.test(child.value)) {
        GLOSSARY_RE.lastIndex = 0;
        next.push(child);
        continue;
      }
      GLOSSARY_RE.lastIndex = 0;
      child.value.split(GLOSSARY_RE).forEach((part, i) => {
        if (!part) return;
        if (i % 2 === 1) {
          next.push({
            type: 'element',
            tagName: 'abbr',
            properties: { dataGlossary: part },
            children: [{ type: 'text', value: part }],
          });
        } else {
          next.push({ type: 'text', value: part });
        }
      });
    }
    parent.children = next;
  };
  return (tree) => walk(tree);
}

const REHYPE = [rehypeGlossary];
const COMPONENTS = {
  // eslint-disable-next-line no-unused-vars
  abbr: ({ node, children, ...props }) => {
    const term = props['data-glossary'];
    const definition = term && lookup(term);
    if (!definition) return <abbr {...props}>{children}</abbr>;
    return <GlossaryTerm term={term} definition={definition} />;
  },
};

export default function SmartText({ text, className = '' }) {
  if (!text) return null;
  return (
    <LatexRenderer
      content={text}
      rehypePlugins={REHYPE}
      components={COMPONENTS}
      className={`leading-relaxed selection:bg-reeCyan/30 selection:text-reeCyan-text ${className}`.trim()}
    />
  );
}
