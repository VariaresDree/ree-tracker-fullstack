// src/features/conversion/unitLink.js
//
// Which conversion a formula card's unit belongs to, so the card can link there.
// Exact symbols only: a card with no plain unit gets no link rather than a wrong one.
const BY_SYMBOL = {
  V: 'voltage', kV: 'voltage', mV: 'voltage',
  A: 'current', mA: 'current', kA: 'current',
  'Ω': 'resistance', 'kΩ': 'resistance', 'MΩ': 'resistance',
  F: 'capacitance', 'µF': 'capacitance', 'μF': 'capacitance', nF: 'capacitance', pF: 'capacitance',
  H: 'inductance', mH: 'inductance',
  C: 'charge', Ah: 'charge',
  W: 'power', kW: 'power', MW: 'power', hp: 'power',
  VA: 'apparent', kVA: 'apparent', MVA: 'apparent',
  var: 'reactive', VAR: 'reactive', kVAR: 'reactive', MVAR: 'reactive',
  J: 'energy', kJ: 'energy', kWh: 'energy', BTU: 'energy',
  Hz: 'frequency', 'rad/s': 'frequency', rpm: 'frequency',
  Wb: 'flux', T: 'density',
  'Ω·m': 'resistivity', 'Ω·cmil/ft': 'resistivity',
  cmil: 'conductor', 'mm²': 'conductor',
  lx: 'illuminance', dB: 'ratio',
  m: 'length', ft: 'length', km: 'length',
  N: 'force', 'N·m': 'torque', Pa: 'pressure', kPa: 'pressure', psi: 'pressure',
  K: 'temperature', '°C': 'temperature',
  s: 'time', kg: 'mass', rad: 'angle',
};

const plain = (latex) => String(latex || '')
  .replace(/\$/g, '')
  .replace(/\\text\{([^}]*)\}/g, '$1')
  .replace(/\\Omega/g, 'Ω')
  .replace(/\\mu\s*/g, 'µ')
  .replace(/\\cdot/g, '·')
  .replace(/\\times/g, '×')
  .replace(/\\,|\\ /g, ' ')
  .replace(/\^\{?2\}?/g, '²')
  .trim();

/** The category id for a unit written in a card, or null. A leading value is ignored. */
export function categoryForUnit(latex) {
  const text = plain(latex);
  if (BY_SYMBOL[text]) return BY_SYMBOL[text];
  const withValue = text.match(/^[-+\d.\s×x^{}]*(?:10\^?\{?-?\d+\}?)?\s*([^\s\d]+)$/);
  return (withValue && BY_SYMBOL[withValue[1]]) || null;
}

/** The first of a card's units that has a conversion. */
export function categoryForCard(card) {
  const candidates = [card?.valueUnit, ...(Array.isArray(card?.variables) ? card.variables.map((v) => v?.unit) : [])];
  for (const unit of candidates) {
    const category = categoryForUnit(unit);
    if (category) return category;
  }
  return null;
}
