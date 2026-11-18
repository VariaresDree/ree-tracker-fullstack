'use strict';

// ESAS › EE Laws, Codes, & Professional Ethics cards (Library round,
// 2026-11-18): the topic had no cards. Law is taught in the lesson; cards
// hold only the numbers worth memorising: which RA is which and when, the
// board exam's weights and passing rule, the Civil Code's prescription
// periods, and the net-metering ceiling. See mathematics/algebra.js for the
// format; tests/safetyAndLawsFormulas.test.js checks the arithmetic in them.

const r = String.raw;

const RA7920 = 'RA 7920 New Electrical Engineering Law';
const BOARD = 'Board and Licensure';
const OBL = 'Obligations and Contracts';
const RE = 'RA 9513 Renewable Energy';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const drafts = [
    K(RA7920, 'Laws for Electrical Engineers', r`$\text{RA } 7920$`, r`$\text{RA } 7920\ (1995) \text{ EE law};\ \text{RA } 9136\ (2001) \text{ EPIRA};\ \text{RA } 9513\ (2008) \text{ Renewable Energy};\ \text{RA } 10912\ (2016) \text{ CPD};\ \text{RA } 11058\ (2018) \text{ OSH};\ \text{RA } 11285\ (2019) \text{ Energy Efficiency}$`, 'The Republic Acts the board asks about, with the year each was enacted.', 'Also: PD 1096 (1977) National Building Code; RA 9514 (2008) Fire Code. The PEC itself is adopted under RA 7920.'),
    K(BOARD, 'REE Board Exam Weights and Passing Rule', r`$25/30/45$`, r`$\text{Mathematics } 25\%,\ \text{ESAS } 30\%,\ \text{EE } 45\%;\quad \text{pass: general average} \ge 70\%,\ \text{no subject below } 50\%$`, 'How the Registered Electrical Engineer licensure exam is weighted and passed.', 'A candidate who averages 70% or more but has a subject between 50% and 70% still passes; below 50% in any subject fails.'),
    K(OBL, 'Prescription of Actions (Civil Code)', r`$10/6/4\ \text{years}$`, r`$10 \text{ years: written contract, obligation by law, judgment};\ 6 \text{ years: oral contract, quasi-contract};\ 4 \text{ years: quasi-delict, injury to rights}$`, 'How long a party has to bring a case to court (Civil Code Arts. 1144–1146).', 'A breached written engineering contract can be sued on within 10 years; a negligence (quasi-delict) claim within 4.'),
    K(RE, 'Net Metering Limit', r`$\le 100\ \text{kW}$`, r`$\text{renewable-energy systems up to } 100\ \text{kW}$`, 'Under RA 9513, a customer\'s own RE system up to 100 kW can export its surplus to the distribution utility for credit.', 'Exports are credited at the utility\'s blended generation cost, not the retail rate.'),
];

module.exports = { subject: 'ESAS', topic: 'EE Laws, Codes, & Professional Ethics', migration: '20261222000001_cards_ee_laws_codes_professional_ethics', file, revisions, retire, drafts };
