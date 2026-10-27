// src/features/paper-sets/print/ItemBlock.jsx
//
// One question as it prints: the number in bold, the stem (typeset by the
// app's KaTeX renderer, so a formula prints as a formula, never as "$x^2$"),
// a placeholder when the stem mentions a figure the bank doesn't have, and
// the options laid out by length (chooseOptionLayout, the rule the LaTeX
// paper uses), column-major: A and B down the first column, C and D down the
// second. In edit mode the whole item is a button that opens its editor.
import { memo } from 'react';
import { stripChoicePrefix } from '@ree/shared';
import LatexRenderer from '../../../components/LatexRenderer';
import { chooseOptionLayout } from '../paperText';

const letterOf = (i) => String.fromCharCode(65 + i);

function ItemBlock({ item, onEdit }) {
  const options = (item.options || []).map((o) => stripChoicePrefix(String(o ?? '')));
  const layout = chooseOptionLayout(options);
  return (
    <div className="ree-item" data-item={item.n}>
      <span className="ree-item-n">{item.n}.</span>
      <div className="ree-item-body">
        {item.text ? <LatexRenderer content={item.text} className="ree-stem" /> : <div className="ree-stem">&nbsp;</div>}
        {item.figure && <div className="ree-figure">Figure not in the question bank.</div>}
        <div
          className="ree-options"
          style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${layout.rows}, auto)` }}
        >
          {options.map((o, i) => (
            <div key={i} className="ree-opt">
              <span className="ree-opt-letter">({letterOf(i)})</span>
              <LatexRenderer inline content={o || '\u00A0'} />
            </div>
          ))}
        </div>
      </div>
      {onEdit && (
        <button type="button" className="ree-edit-hit ree-screen-only" aria-label={`Edit item ${item.n}`} onClick={() => onEdit(item.n)}>
          {item.edited && <span className="ree-edited-tag">Edited</span>}
        </button>
      )}
    </div>
  );
}

export default memo(ItemBlock);
