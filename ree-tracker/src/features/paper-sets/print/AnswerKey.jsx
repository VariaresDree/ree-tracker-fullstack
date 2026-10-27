// src/features/paper-sets/print/AnswerKey.jsx
//
// The answer key: the key table (column-major, five columns, "--*" for an
// item whose stored answer matches none of its options), then, when chosen,
// a worked solution per item, typeset like the paper (blocks.jsx orders them).
import { stripChoicePrefix } from '@ree/shared';
import LatexRenderer from '../../../components/LatexRenderer';
import { SHORT_LABEL } from '../../exam-export/drawExamPaper';
import { partLabel } from '../paperText';
import { PaperSheet, SheetColumn } from './PaperSheet';
import { KEY_GAP_MM, practiceText, showsParts } from './layout';

const KEY_COLS = 5;
const DASH = '\u2013';
const optionText = (o) => stripChoicePrefix(String(o ?? ''));

export function KeyHead({ draw, setCode }) {
  return (
    <div className="ree-key-head">
      <div className="ree-key-title-row">
        <span className="ree-key-title">ANSWER KEY</span>
        <span className="ree-set-box">{draw.setLabel}</span>
      </div>
      <div>Registered Electrical Engineer Pre-board Examination {DASH} {draw.plan?.title}</div>
      <div>
        {draw.items.length} items. Set code {setCode} {'\u00B7'} Key v{draw.keyVersion}. Score an answer sheet against this key by scanning it.
      </div>
      <div className="ree-practice">{practiceText()}</div>
      {showsParts(draw) && (
        <div className="ree-key-parts">
          {draw.sections.map((s, i) => (
            <div key={s.subject}>{partLabel(i)} {DASH} {s.title}: items {s.from}{DASH}{s.to}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KeyTable({ items }) {
  const rows = Math.max(1, Math.ceil(items.length / KEY_COLS));
  return (
    <div className="ree-key-table" style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
      {items.map((it) => {
        const matched = it.answerIndex >= 0;
        return (
          <div key={it.n} className="ree-key-row" data-n={it.n} data-letter={matched ? it.answerLetter : '-'}>
            <span className="ree-key-n">{it.n}.</span>
            {matched ? <b>{it.answerLetter}</b> : <b>--<sup>*</sup></b>}
          </div>
        );
      })}
    </div>
  );
}

export function Solution({ item }) {
  const matched = item.answerIndex >= 0;
  const topic = [SHORT_LABEL[item.subject] || item.subject, item.subtopic].filter(Boolean).join(` ${DASH} `);
  return (
    <div className="ree-solution" data-item={item.n}>
      <div className="ree-sol-head">
        <span><b>{item.n}.</b> <span className="ree-sol-topic">{topic}</span></span>
        <span>Answer: <b>{matched ? item.answerLetter : '--'}</b></span>
      </div>
      {matched ? (
        <div className="ree-sol-answer">
          <i>({item.answerLetter})</i> <LatexRenderer inline content={optionText(item.options[item.answerIndex]) || '\u00A0'} />
        </div>
      ) : (
        <div className="ree-sol-answer">
          <em>The stored answer matches none of the options:</em> <LatexRenderer inline content={optionText(item.answer) || 'none'} />
        </div>
      )}
      {item.explanation && String(item.explanation).trim()
        ? <LatexRenderer content={item.explanation} className="ree-sol-text" />
        : <div className="ree-sol-text"><em>No worked solution is stored for this item yet.</em></div>}
    </div>
  );
}

export function AnswerKeyPages({ layout, size, scale, footerLeft, render }) {
  const { pages, oversize, heights } = layout;
  return pages.map((page, i) => (
    <PaperSheet
      key={`key-${i}`}
      size={size}
      scale={scale}
      label={`Answer key, page ${i + 1} of ${pages.length}`}
      footer={{ left: footerLeft, right: `Page ${i + 1} of ${pages.length}` }}
    >
      <div className="ree-body">
        <div className="ree-columns ree-columns-one">
          <SheetColumn keys={page.cols[0]} oversize={oversize} heights={heights} render={render} gapMm={KEY_GAP_MM} />
        </div>
      </div>
    </PaperSheet>
  ));
}
