// src/features/quiz/ExplanationBody.jsx
//
// A worked explanation, in layers: labelled parts in reading order, with why
// the other options are wrong folded until asked. Old rows written on one line
// get the same layout (structureExplanation, @ree/shared). Text with no labels
// renders as plain paragraphs.
import { useMemo } from 'react';
import { structureExplanation, explanationSections } from '@ree/shared';
import LatexRenderer from '../../components/LatexRenderer';
import { Disclosure } from '../../components/ui';

const FOLDED = 'Why the others are wrong';

export default function ExplanationBody({ text }) {
  const sections = useMemo(() => explanationSections(structureExplanation(text)), [text]);
  return (
    <div className="flex flex-col gap-4">
      {sections.map(({ label, body }, i) => {
        if (label === FOLDED) {
          return <Disclosure key={i} title={label}><LatexRenderer content={body} /></Disclosure>;
        }
        return (
          <div key={i} className="min-w-0">
            {label && <div className="text-eyebrow mb-1">{label}</div>}
            <div className={label === 'Answer' ? 'font-semibold text-textMain' : undefined}>
              <LatexRenderer content={body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
