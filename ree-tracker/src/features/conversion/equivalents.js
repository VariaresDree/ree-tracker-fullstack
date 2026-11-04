// src/features/conversion/equivalents.js
//
// The equivalents and constants reviewers ask to be known by heart, worked out from
// the units table rather than typed, so they can't disagree with the converter. A
// constant that isn't a conversion is written out, with the units it's quoted in.
import { convert } from '@ree/shared/units';
import { formatNumber } from './calc';

const row = (cat, value, from, to) => ({ cat, value, from, to });

export const EQUIVALENTS = [
  {
    title: 'Pressure',
    lead: '1 atm',
    rows: [['kPa'], ['psi'], ['bar'], ['mmHg'], ['inHg'], ['mH₂O'], ['ftH₂O'], ['kgf/cm²']].map(([to]) => row('pressure', 1, 'atm', to)),
  },
  {
    title: 'Mechanical power',
    lead: '1 hp, mechanical',
    rows: [['W'], ['kW'], ['ft·lbf/s'], ['ft·lbf/min'], ['BTU/min'], ['BTU/h']].map(([to]) => row('power', 1, 'hp(I)', to)),
  },
  {
    title: 'Electrical power',
    lead: '1 hp, electric',
    rows: [row('power', 1, 'hp', 'W'), row('power', 1, 'hp', 'kW')],
  },
  {
    title: 'Heat',
    lead: '1 BTU',
    rows: [['J'], ['cal'], ['ft·lbf'], ['kcal']].map(([to]) => row('energy', 1, 'BTU', to)),
  },
  {
    title: 'Kilocalorie',
    lead: '1 kcal',
    rows: [['kJ'], ['BTU'], ['ft·lbf']].map(([to]) => row('energy', 1, 'kcal', to)),
  },
  {
    title: 'Electrical energy',
    lead: '1 kWh',
    rows: [['kJ'], ['BTU'], ['kcal'], ['ft·lbf']].map(([to]) => row('energy', 1, 'kWh', to)),
  },
  {
    title: 'Refrigeration',
    lead: '1 ton',
    rows: [['kW'], ['BTU/h'], ['BTU/min']].map(([to]) => row('power', 1, 'TR', to)),
  },
  {
    title: 'Length and mass',
    lead: 'Everyday',
    rows: [row('length', 1, 'in', 'mm'), row('length', 1, 'ft', 'm'), row('length', 1, 'mi', 'km'), row('mass', 1, 'lb', 'kg'), row('mass', 1, 'slug', 'lb'), row('force', 1, 'lbf', 'N'), row('force', 1, 'kgf', 'N')],
  },
];

export const CONSTANTS = [
  { name: 'Standard gravity', values: ['9.80665 m/s²', '32.174 ft/s²'] },
  { name: 'Universal gas constant', values: ['8.314 kJ/(kmol·K)', '1545 ft·lbf/(lbmol·°R)'] },
  { name: 'Gas constant of air', values: ['0.287 kJ/(kg·K)', '53.35 ft·lbf/(lb·°R)'] },
  { name: 'Air, specific heat at constant pressure', values: ['1.005 kJ/(kg·K)', '0.24 BTU/(lb·°F)'] },
  { name: 'Air, specific heat at constant volume', values: ['0.718 kJ/(kg·K)', '0.171 BTU/(lb·°F)'] },
  { name: 'Air, ratio of specific heats', values: ['k = 1.4'] },
  { name: 'Water, density', values: ['1000 kg/m³', '62.4 lb/ft³', '1 g/cm³'] },
  { name: 'Water, specific weight', values: ['9.81 kN/m³', '62.4 lbf/ft³'] },
  { name: 'Water, specific heat', values: ['4.187 kJ/(kg·K)', '1 BTU/(lb·°F)', '1 kcal/(kg·°C)'] },
  { name: 'Water, latent heat of vaporisation at 100 °C', values: ['2257 kJ/kg', '970 BTU/lb'] },
  { name: 'Ice, latent heat of fusion', values: ['334 kJ/kg', '144 BTU/lb'] },
  { name: 'Absolute zero', values: ['0 K', '−273.15 °C', '−459.67 °F', '0 °R'] },
];

/** A row's numbers, worked out from the table. */
export function readRow({ cat, value, from, to }) {
  const out = convert(cat, value, from, to);
  return { text: `${formatNumber(out, 6)} ${to}`, link: `/library?tab=conversion&cat=${cat}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&v=${value}`, out };
}
