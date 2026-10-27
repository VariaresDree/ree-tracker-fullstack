// src/features/paper-sets/print/blocks.jsx
//
// The documents as ordered blocks: what the measuring pass sizes and the
// pagination packs into columns. Each has a key that stays the same between
// renders, so a re-measure after an edit moves only what changed.
import { partLabel } from '../paperText';
import ItemBlock from './ItemBlock';
import { KeyHead, KeyTable, Solution } from './AnswerKey';
import { showsParts } from './layout';

const DASH = '\u2013';

/**
 * The question paper's column blocks: Part headings (kept with the item after
 * them) and items. `onEdit` turns each item into an edit button.
 * @returns {{ key: string, node: any, keepWithNext?: boolean }[]}
 */
export function questionPaperBlocks(draw, { onEdit } = {}) {
  const blocks = [];
  const sections = (draw.sections || []).length ? draw.sections : [{ from: 1, to: draw.items.length, title: draw.plan?.title }];
  const parts = showsParts(draw);
  sections.forEach((section, i) => {
    if (parts) {
      blocks.push({
        key: `qp:part:${i}`,
        keepWithNext: true,
        node: <div className="ree-part">{partLabel(i)} {DASH} {section.title} (items {section.from}{DASH}{section.to})</div>,
      });
    }
    draw.items.filter((it) => it.n >= section.from && it.n <= section.to).forEach((item) => {
      blocks.push({ key: `qp:item:${item.n}`, node: <ItemBlock item={item} onEdit={onEdit} /> });
    });
  });
  return blocks;
}

/** The answer key's blocks, one column: head, table, note, solutions. */
export function answerKeyBlocks(draw, { solutions, setCode }) {
  const blocks = [
    { key: 'key:head', node: <KeyHead draw={draw} setCode={setCode} /> },
    { key: 'key:table', node: <KeyTable items={draw.items} /> },
  ];
  if (draw.items.some((it) => !(it.answerIndex >= 0))) {
    blocks.push({
      key: 'key:note',
      node: <div className="ree-small"><sup>*</sup>The stored answer matches none of the options. Check the item in the question bank, or edit it here.</div>,
    });
  }
  if (solutions) {
    blocks.push({ key: 'key:solhead', keepWithNext: true, node: <div className="ree-part">Worked solutions</div> });
    draw.items.forEach((item) => blocks.push({ key: `key:sol:${item.n}`, node: <Solution item={item} /> }));
  }
  return blocks;
}
