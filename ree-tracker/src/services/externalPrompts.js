// src/services/externalPrompts.js
//
// Prompts to paste into another AI's own app (Claude, ChatGPT, Gemini), whose
// reply comes back through Admin's "Import from another AI"
// (features/admin/exchange/aiExchange reads it). The same item and explanation
// rules as the in-app generator (services/aiPrompts).
import { apportion, calculationCount, DIFFICULTY_MIXES, EXPLANATION_RULES, ITEM_RULES, MATH_RULES, SUBJECT_SCOPE } from './aiPrompts';

export const MAX_PER_MESSAGE = 20;

// Free chat apps cut long replies off, and render math outside a code block, so
// what gets copied would have lost its LaTeX.
const DELIVERY = `How to reply:
- Put your whole reply in ONE code block, so it copies exactly as written. No text outside it.
- This is plain text, not JSON: write LaTeX normally, with single backslashes ($\\frac{1}{2}$).
- Copy the markers exactly: three equals signs on both sides of QUESTION, CARD and END, and three hyphens on both sides of every section name, with nothing before them.
- If you run out of room, stop after a complete item. I'll reply "continue" for the rest.`;

const QUESTION_FORMAT = `Write each item exactly like this, with these markers on their own lines:

===QUESTION===
subject: <subject>
topic: <topic>
type: calculation or conceptual
difficulty: 1, 2 or 3
---STEM---
The question, with $...$ math.
---OPTIONS---
A. first choice
B. second choice
C. third choice
D. fourth choice
---KEY---
The letter of the correct option, and nothing else.
---EXPLANATION---
The explanation, in the layout above.
===END===`;

const DIFFICULTY_WORDS = { 1: 'easy', 2: 'medium', 3: 'hard' };

const typeLine = (count, type, calcShare) => {
  const calculation = calculationCount(count, type, calcShare);
  const conceptual = count - calculation;
  if (!conceptual) return `Every item is a calculation (problem-solving) item.`;
  if (!calculation) return `Every item is a conceptual (theory, definition or code) item.`;
  return `Exactly ${calculation} calculation (problem-solving) and ${conceptual} conceptual (theory, definition or code).`;
};

const difficultyLine = (count, difficulty) => {
  const perLevel = apportion(count, (DIFFICULTY_MIXES[difficulty] || DIFFICULTY_MIXES.board).weights);
  return `Difficulty: exactly ${['1', '2', '3'].filter((k) => perLevel[k] > 0).map((k) => `${perLevel[k]} ${DIFFICULTY_WORDS[k]} (difficulty ${k})`).join(', ')}.`;
};

/**
 * The prompt for writing new questions.
 *   topic     a TOS topic, or 'All' for any topic in `topics`
 *   focus     a finer steer within the topic (the "topic:" line still follows the rule)
 *   notes     anything else from the admin
 *   fromFile  the admin will attach a reviewer for the AI to work from
 */
export function buildQuestionImportPrompt({ subject, topic, topics = [], focus = '', count = 10, type = 'mixed', calcShare = 0.6, difficulty = 'board', notes = '', fromFile = false }) {
  const specific = topic && topic !== 'All';
  const howMany = Math.min(Math.max(1, Math.round(count) || 1), MAX_PER_MESSAGE);
  return [
    'You are a senior item writer for the Philippine Professional Regulation Commission (PRC) Registered Electrical Engineer (REE) licensure examination. Accuracy matters more than anything else: a wrong answer key teaches a reviewee the wrong thing.',
    '',
    `Write ${howMany} original multiple-choice items for ${SUBJECT_SCOPE[subject] || subject}.`,
    specific
      ? `Every item is on the topic "${topic}". Set "topic:" to exactly that.`
      : `Spread them across these topics, and set "topic:" to exactly one of them: ${topics.join(' | ')}.`,
    `Set "subject:" to exactly "${subject}".`,
    focus.trim() ? `Center every item on this finer focus: "${focus.trim()}".` : null,
    typeLine(howMany, type, calcShare),
    difficultyLine(howMany, difficulty),
    notes.trim() ? `Additional instructions: ${notes.trim()}` : null,
    fromFile ? 'Base the items on the file I attached. Use only what it supports, and correct any error in it.' : null,
    '',
    ITEM_RULES,
    '',
    EXPLANATION_RULES,
    '',
    MATH_RULES,
    '',
    DELIVERY,
    '',
    QUESTION_FORMAT,
  ].filter((line) => line !== null).join('\n');
}

const CARD_FORMAT = `Write each card exactly like this, with these markers on their own lines. Leave out a section that doesn't apply:

===CARD===
kind: formula or constant
subject: <subject>
topic: <topic>
tag: <the card's family>
name: Full name, such as Capacitive Reactance
symbol: $X_c$
---FORMULA---
For a formula: $X_c = \\frac{1}{2\\pi f C}$
---VALUE---
For a constant: the exact value with units, such as $8.854\\times10^{-12}$ F/m. For a formula: the unit of its result.
---MEANING---
One to three plain sentences on what it represents.
---VARIABLES---
$f$ | frequency | $\\text{Hz}$
$C$ | capacitance | $\\text{F}$
---TIP---
How it's used in board problems, and one common trap.
===END===`;

/** The prompt for writing new formula and constant cards. */
export function buildCardImportPrompt({ subject, topic, topics = [], count = 10, existingNames = [], existingTags = [], fromFile = false }) {
  const specific = !!topic;
  return [
    'You compile the formula and constant flashcards for a Philippine Registered Electrical Engineer (REE) board exam reviewer. Every value, unit and formula must be exactly right: a wrong constant teaches the wrong number. Use SI units and the values in standard references (CODATA for physical constants, the PEC 2017 for code values, standard engineering handbooks). Never round a standard constant. If you are not sure of an entry, leave it out rather than guess.',
    '',
    `Write ${Math.min(count, MAX_PER_MESSAGE)} cards for ${SUBJECT_SCOPE[subject] || subject}: only formulas and constants that board problems use, no definitions or theories.`,
    specific
      ? `Every card is on the topic "${topic}". Set "topic:" to exactly that.`
      : `Set "topic:" to exactly one of these: ${topics.join(' | ')}.`,
    `Set "subject:" to exactly "${subject}".`,
    fromFile ? 'Read them from the file I attached, copying values and formulas faithfully. Leave out anything you can\'t read.' : null,
    existingNames.length ? `Already in the library, so skip these: ${existingNames.slice(0, 150).join('; ')}.` : null,
    '',
    `"tag" names the family of cards this one belongs to, in 2 to 4 words in Title Case ("AC Power", "Resonance", "Annuities"): a family of at least two cards, never the card's own name, and never a word like "Formulas" or "Misc".${existingTags.length ? ` Reuse one of these when it fits: ${existingTags.slice(0, 60).join('; ')}.` : ''}`,
    'For a formula, VARIABLES lists every symbol in it, the defined symbol included (known constants like \\pi aside), one per line as: symbol | meaning | unit.',
    '',
    MATH_RULES,
    '',
    DELIVERY,
    '',
    CARD_FORMAT,
  ].filter((line) => line !== null).join('\n');
}
