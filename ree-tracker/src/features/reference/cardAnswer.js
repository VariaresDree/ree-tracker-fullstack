/** What you'd recall from a formula card: a constant's value, or a formula. */
export const cardAnswer = (card) => (card.kind === 'constant'
  ? card.valueUnit || card.formulaLatex
  : card.formulaLatex || card.valueUnit);
