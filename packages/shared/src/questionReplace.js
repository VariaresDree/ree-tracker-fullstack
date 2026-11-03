// Replacing a live question with a corrected copy: what changed, and whether it
// may be applied. The review screen shows it and the server enforces it. Options
// are compared by slot: past answers are stored as option text and remapped by
// slot, so a reply that reorders them would silently mark them wrong.

'use strict';

const { paperSetHash } = require('./paperSets');
const { isClosingOption, isLetterReference } = require('./optionOrder');

/** Stands for a question's content, so an edit since it was exported is noticed. */
const questionContentHash = (q) => paperSetHash(JSON.stringify([q?.text, q?.options, q?.answer, q?.fixedExplanation ?? null]));

const looseKey = (text) => String(text ?? '').toLowerCase().replace(/[\s$]/g, '');
const shufflePinned = (option) => isClosingOption(option) || isLetterReference(option);

/**
 * `before`: the live question. `after`: { hash, text, options, answer,
 * fixedExplanation }. `refusal` is null or a reason: 'stale' |
 * 'option-count-changed' | 'options-reordered' | 'key-not-an-option'.
 */
function replacePlan(before, after) {
    const oldKey = before.options.indexOf(before.answer);
    const newKey = after.options.indexOf(after.answer);
    const oldLoose = before.options.map(looseKey);
    const newLoose = after.options.map(looseKey);

    let refusal = null;
    if (after.hash !== questionContentHash(before)) refusal = 'stale';
    else if (after.options.length !== before.options.length) refusal = 'option-count-changed';
    else if (newLoose.some((o, i) => o !== oldLoose[i] && oldLoose.includes(o))) refusal = 'options-reordered';
    else if (newKey === -1) refusal = 'key-not-an-option';

    const stemChanged = after.text !== before.text;
    const optionsChanged = after.options.some((o, i) => o !== before.options[i]);
    const explanationChanged = (after.fixedExplanation ?? null) !== (before.fixedExplanation ?? null);
    const keyChanged = oldKey !== newKey;
    return {
        refusal, oldKey, newKey, keyChanged, stemChanged, optionsChanged, explanationChanged,
        unchanged: !stemChanged && !optionsChanged && !explanationChanged && !keyChanged,
        // "All of the above" stays last in a shuffle, so gaining or losing one
        // changes the order past sittings rebuild for their review.
        changesReviewOrder: after.options.some((o, i) => shufflePinned(o) !== shufflePinned(before.options[i])),
    };
}

module.exports = { questionContentHash, replacePlan };
