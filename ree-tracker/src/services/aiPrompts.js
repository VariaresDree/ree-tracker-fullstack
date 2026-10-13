// src/services/aiPrompts.js
//
// The prompts behind admin question generation, in one place and pure, so the
// wording can be tested and tuned without touching the UI.
//
// A generation run is split into batches of at most BATCH_SIZE questions. Long
// JSON answers are where models slip (a dropped brace, a miscounted list), and
// small batches run in parallel finish sooner than one long answer. Each batch
// gets an exact count of calculation and conceptual items, and an exact count
// per difficulty, so a run of 10 at "70% calculation" really is 7 and 3.

export const BATCH_SIZE = 5;
export const MAX_QUESTIONS = 30;

export const QUESTION_TYPES = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'conceptual', label: 'Conceptual' },
  { value: 'calculation', label: 'Calculation' },
];

// The REE board leans on problem solving, but a third or so of each paper is
// theory, definitions and code. "Board mix" mirrors that spread of difficulty.
export const DIFFICULTY_MIXES = {
  board: { label: 'Board mix', weights: { 1: 0.3, 2: 0.5, 3: 0.2 } },
  easy: { label: 'Easy', weights: { 1: 1, 2: 0, 3: 0 } },
  medium: { label: 'Medium', weights: { 1: 0, 2: 1, 3: 0 } },
  hard: { label: 'Hard', weights: { 1: 0, 2: 0, 3: 1 } },
};

const DIFFICULTY_WORDS = { 1: 'easy', 2: 'medium', 3: 'hard' };

/** Split `total` into integer parts proportional to `weights` (largest remainder). */
export function apportion(total, weights) {
  const keys = Object.keys(weights);
  const sum = keys.reduce((s, k) => s + (weights[k] || 0), 0) || 1;
  const exact = keys.map((k) => ((weights[k] || 0) / sum) * total);
  const floors = exact.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0; j = (j + 1) % order.length, left -= 1) floors[order[j][1]] += 1;
  return Object.fromEntries(keys.map((k, i) => [k, floors[i]]));
}

/** How many calculation questions a run of `count` holds. */
export function calculationCount(count, type, calcShare = 0.6) {
  if (type === 'calculation') return count;
  if (type === 'conceptual') return 0;
  return Math.round(count * Math.min(1, Math.max(0, calcShare)));
}

/**
 * The batches for one run: [{ size, calculation, conceptual, difficulty: {1,2,3} }].
 * Calculation items and each difficulty are dealt across batches in turn, so
 * every batch gets a fair share instead of one batch taking all the hard ones.
 */
export function planBatches({ count, type = 'mixed', calcShare = 0.6, difficulty = 'board' }) {
  const n = Math.min(MAX_QUESTIONS, Math.max(1, Math.round(count) || 1));
  const sizes = [];
  for (let left = n; left > 0; left -= BATCH_SIZE) sizes.push(Math.min(BATCH_SIZE, left));
  const batches = sizes.map((size) => ({ size, calculation: 0, conceptual: 0, difficulty: { 1: 0, 2: 0, 3: 0 } }));

  const deal = (total, add) => {
    let i = 0;
    for (let placed = 0; placed < total; i = (i + 1) % batches.length) {
      if (add(batches[i])) placed += 1;
    }
  };
  deal(calculationCount(n, type, calcShare), (b) => (b.calculation < b.size ? (b.calculation += 1, true) : false));
  batches.forEach((b) => { b.conceptual = b.size - b.calculation; });

  const weights = (DIFFICULTY_MIXES[difficulty] || DIFFICULTY_MIXES.board).weights;
  const perLevel = apportion(n, weights);
  const used = (b) => b.difficulty[1] + b.difficulty[2] + b.difficulty[3];
  for (const level of ['3', '2', '1']) {
    deal(perLevel[level], (b) => (used(b) < b.size ? (b.difficulty[level] += 1, true) : false));
  }
  return batches;
}

const SUBJECT_SCOPE = {
  Mathematics: 'Mathematics (20% of the board): algebra, trigonometry, analytic and solid geometry, differential and integral calculus, differential equations, complex numbers, matrices, probability and statistics, numerical methods.',
  ESAS: 'Engineering Sciences and Allied Subjects (30% of the board): physics, chemistry, statics and dynamics, strength of materials, fluid mechanics, thermodynamics, engineering economics, computer fundamentals, engineering materials, and engineering laws, ethics and contracts.',
  EE: 'Electrical Engineering Professional Subjects (50% of the board): DC and AC circuits, electrical machines, power systems, transmission and distribution, protection, electronics, instrumentation and control, illumination, power plant engineering, and the Philippine Electrical Code (PEC 2017).',
};

/**
 * The system prompt for every admin question run: who the model is writing
 * for and what a good board item looks like.
 */
export const BOARD_EXAM_SYSTEM = `You are a senior item writer for the Philippine Professional Regulation Commission (PRC) Registered Electrical Engineer (REE) licensure examination. You write original multiple-choice items that match the real board exam in scope, wording and difficulty. Accuracy matters more than anything else: a wrong answer key teaches a reviewee the wrong thing.

What a good item looks like:
- One clear stem, written the way the PRC writes it: direct, technical, no story padding. Give every value with its unit.
- Exactly four options, exactly one correct. All four are plausible, in the same unit and format, and of similar length. Never "all of the above", "none of the above", or "both A and B".
- Calculation items use realistic Philippine values: 60 Hz systems, 230 V single-phase and 230/400 V or 13.8 kV, 34.5 kV, 69 kV, 115 kV and 230 kV three-phase. They are solvable in one to three minutes with a scientific calculator.
- Numerical distractors come from specific mistakes reviewees make: line versus phase quantities, a missing square root of 3, peak versus RMS, degrees versus radians, ignoring power factor or efficiency, a wrong unit prefix, or an inverted ratio.
- Round the correct answer to three or four significant figures, and round the distractors the same way.
- Conceptual items test understanding: principles, definitions, behaviour of machines and systems, standards, and the PEC. Cite a PEC article, standard or law (RA 7920, RA 9136, the Philippine Grid Code) only when you are certain of the number; otherwise state the rule without a number.
- Before you write the answer of a calculation item, solve it fully, then check the result by substituting back. If the numbers don't work out cleanly, change the givens.

Difficulty:
- 1 (easy): one concept, one formula or one step.
- 2 (medium): two or three steps; a typical board item.
- 3 (hard): several steps or concepts combined, or distractors that punish a common misconception.

Explanations ("fixedExplanation"):
- Calculation: **Given:** the values. **Find:** what is asked. **Solution:** numbered steps, each with the formula and the substituted numbers. **Answer:** the result with its unit, matching the correct option.
- Conceptual: why the correct option is right in two to four sentences, then one short line on why each distractor is wrong.

Math formatting (the app renders Markdown with KaTeX):
- Inline math in single dollar signs ($X_L = 2\\pi f L$), a displayed equation in double dollar signs on its own line.
- Never use \\( \\), \\[ \\], or bare LaTeX outside dollar signs. Never put **bold** inside math.
- Write units after the number in plain text or with \\text{} inside math ($120\\ \\text{V}$).
- The output is JSON: every LaTeX backslash must be written twice (\\\\frac, \\\\sqrt, \\\\times).

Options never carry their own letter ("A.", "(b)"): the app adds the letters.`;

const typeLine = (b) => {
  if (b.calculation && b.conceptual) return `${b.calculation} calculation (problem-solving) item${b.calculation === 1 ? '' : 's'} and ${b.conceptual} conceptual (theory, definition or code) item${b.conceptual === 1 ? '' : 's'}`;
  if (b.calculation) return `${b.calculation} calculation (problem-solving) item${b.calculation === 1 ? '' : 's'}`;
  return `${b.conceptual} conceptual (theory, definition or code) item${b.conceptual === 1 ? '' : 's'}`;
};

const difficultyLine = (d) => ['1', '2', '3']
  .filter((k) => d[k] > 0)
  .map((k) => `${d[k]} ${DIFFICULTY_WORDS[k]} (difficulty ${k})`)
  .join(', ');

/**
 * The user prompt for one batch.
 *   subject, topic   the TOS subject and topic ('All' = any topic in `topics`)
 *   topics           the live topic list for the subject
 *   focus            optional finer steer (a subtopic, device, code article, style)
 *   batch            one entry of planBatches()
 *   avoid            question stems already written this session
 *   notes            optional free-text instructions from the admin
 */
export function buildQuestionPrompt({ subject, topic, topics = [], focus, batch, avoid = [], notes, seed = Math.floor(Math.random() * 1e6) }) {
  const specificTopic = topic && topic !== 'All' && topic !== 'General';
  const topicRule = specificTopic
    ? `Every item is on the topic "${topic}", and its "subtopic" field is exactly "${topic}".`
    : `Spread the items across different topics. Each item's "subtopic" field is exactly one of: [${topics.length ? topics.join(', ') : 'General'}].`;

  const lines = [
    `Write ${batch.size} original REE board exam item${batch.size === 1 ? '' : 's'} for ${SUBJECT_SCOPE[subject] || subject}.`,
    topicRule,
    focus ? `Center every item on this finer focus: "${focus}". The "subtopic" field still follows the rule above.` : null,
    `Exactly ${typeLine(batch)}.`,
    `Difficulty: exactly ${difficultyLine(batch.difficulty)}.`,
    notes ? `Additional instructions from the reviewer: ${notes}` : null,
    avoid.length
      ? `Do not repeat or lightly reword any of these items already written:\n${avoid.slice(-20).map((t, i) => `${i + 1}. ${String(t).slice(0, 220)}`).join('\n')}`
      : null,
    `Vary the scenarios, devices and numbers (variation key ${seed}).`,
    '',
    'Return one JSON object and nothing else, in this shape:',
    `{"items": [{
  "text": "the stem, with $...$ math",
  "options": ["four", "option", "strings", "without letters"],
  "answer": "the exact text of the correct option",
  "type": "calculation or conceptual",
  "difficulty": 1,
  "subtopic": "${specificTopic ? topic : 'one of the listed topics'}",
  "fixedExplanation": "the explanation in the format above"
}]}`,
  ];
  return lines.filter((l) => l !== null).join('\n');
}

/**
 * The checker's prompt: solve each item without being told the key. Its
 * choice is compared with the generator's answer in the preview.
 */
export const VERIFY_SYSTEM = `You are checking items for the Philippine REE board exam. Solve each item yourself, carefully and independently, before choosing. Work out every calculation fully. If no option is correct, or more than one is, say so.`;

export function buildVerifyPrompt(questions) {
  const body = questions.map((q, i) => {
    const opts = (q.options || []).map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n');
    return `Item ${i}:\n${q.text}\n${opts}`;
  }).join('\n\n');
  return `${body}

For every item, return your own answer. Return one JSON object and nothing else:
{"items": [{"index": 0, "choice": "A", "confidence": "high, medium or low", "issue": "empty, or one short sentence if no option is right, more than one is right, or the item is unclear"}]}`;
}

/**
 * Merge the checker's answers into the questions: each gets
 * `check: { status: 'agrees' | 'disagrees' | 'flagged' | 'unchecked', choice, confidence, issue }`.
 */
export function applyVerification(questions, verdicts) {
  const byIndex = new Map((Array.isArray(verdicts) ? verdicts : []).map((v) => [Number(v?.index), v]));
  return questions.map((q, i) => {
    const v = byIndex.get(i);
    if (!v) return { ...q, check: { status: 'unchecked' } };
    const letter = String(v.choice || '').trim().toUpperCase().replace(/[^A-D]/g, '').charAt(0);
    const keyIndex = (q.options || []).findIndex((o) => o === q.answer);
    const choiceIndex = letter ? letter.charCodeAt(0) - 65 : -1;
    const issue = typeof v.issue === 'string' && v.issue.trim() ? v.issue.trim() : null;
    let status = choiceIndex === keyIndex && keyIndex >= 0 ? 'agrees' : 'disagrees';
    if (issue && status === 'agrees') status = 'flagged';
    return {
      ...q,
      check: {
        status,
        choice: letter || null,
        confidence: ['high', 'medium', 'low'].includes(v.confidence) ? v.confidence : null,
        issue,
      },
    };
  });
}
