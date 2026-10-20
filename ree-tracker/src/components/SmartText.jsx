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
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

// Kept clear of the screen's edge, in px.
const EDGE = 8;

// One glossary term: a real button (not just a hover target) so it's reachable
// and operable by keyboard, not only a mouse, with the definition tied to it
// by aria-describedby. It shows while a mouse hovers it or keyboard focus is
// on it, and a click or tap pins it open (hover and focus alone never opened
// it on a phone: iOS doesn't focus a tapped button). Escape, a press outside
// or leaving it closes it. The definition was a fixed w-48 box centred on the
// term, so near a screen edge it was cut off; it is now measured as it opens,
// slid sideways to stay on screen, and dropped under the term when there is
// no room above.
function GlossaryTerm({ term, definition }) {
  const tooltipId = useId();
  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  // Focus that follows a press is a click or tap, not the keyboard.
  const pressedRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const visible = hovered || focused || pinned;

  const close = () => { setHovered(false); setFocused(false); setPinned(false); };

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setHovered(false); setFocused(false); setPinned(false);
    };
    const onPointerDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setHovered(false); setFocused(false); setPinned(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [visible]);

  // Place it before it paints: centred over the term, moved sideways as far
  // as it takes to stay EDGE px inside the viewport, under the term when the
  // space above is too short. Written straight to the element's style.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const anchor = wrapRef.current;
    if (!visible || !tip || !anchor) return;
    const box = anchor.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const width = tip.offsetWidth;
    const centred = box.left + box.width / 2 - width / 2;
    const left = Math.min(Math.max(EDGE, centred), Math.max(EDGE, viewport - EDGE - width));
    const below = box.top - tip.offsetHeight - EDGE < EDGE;
    tip.style.translate = `calc(-50% + ${Math.round(left - centred)}px) 0`;
    tip.style.top = below ? '100%' : '';
    tip.style.bottom = below ? 'auto' : '';
    tip.style.marginTop = below ? '0.5rem' : '';
    tip.style.marginBottom = below ? '0' : '';
  }, [visible]);

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        className="text-reeCyan-text border-b border-dashed border-reeCyan font-bold cursor-help rounded-[var(--radius-sm)]"
        aria-describedby={tooltipId}
        aria-expanded={visible}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
        onPointerDown={() => { pressedRef.current = true; }}
        onFocus={() => { if (!pressedRef.current) setFocused(true); pressedRef.current = false; }}
        onBlur={() => { setFocused(false); setPinned(false); }}
        onClick={() => { pressedRef.current = false; setPinned((p) => !p); }}
        // Escape here closes the definition and stops there, so a dialog
        // around the text stays open.
        onKeyDown={(e) => { if (e.key === 'Escape' && visible) { e.stopPropagation(); close(); } }}
      >
        {term}
      </button>
      <span
        ref={tipRef}
        id={tooltipId}
        role="tooltip"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${visible ? 'block' : 'hidden'} w-max max-w-[min(18rem,calc(100vw-2rem))] p-2 bg-surface2 border border-border2 rounded-lg shadow-xl text-xs text-textMain z-50 text-left pointer-events-none`}
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
