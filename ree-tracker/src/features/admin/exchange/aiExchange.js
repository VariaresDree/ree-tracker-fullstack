// src/features/admin/exchange/aiExchange.js
//
// Reading what another AI (Claude, ChatGPT, Gemini in their own apps) wrote. The
// main format is tagged plain text rather than JSON: backslashes need no escaping,
// so LaTeX survives, and a reply cut off mid-way loses only its last item. JSON
// pasted instead is read too. This only reads; the server validates every item
// (POST /api/questions/import, /api/reference-cards/ai-intake).
import { matchOption } from '@ree/shared';
import { parseModelJson } from '@ree/shared/modelJson';
import { normalizeMathDelimiters } from '../../../utils/mathDelimiters';

// What real replies did to a marker: ChatGPT's copy wrote \===QUESTION=== (a
// Markdown escape), Gemini closed ---EXPLANATION=== with the wrong sign, and word
// processors turn --- into a dash. One marker, however it arrives.
const RULE = '[-=\\u2013\\u2014]{3,}|[\\u2013\\u2014]+';
const MARK = (name) => new RegExp(`^[\\s\\\\*#>_]*(?:${RULE})\\s*(${name})\\s*\\\\?(?:${RULE})[\\s\\\\*_]*$`, 'i');
const BLOCK = MARK('QUESTION|CARD|END');
const SECTION = MARK('[A-Z ]+?');
const FIELD = /^[\s*]*([a-z]+)[\s*]*:[\s*]*(.*)$/i;
const FENCE_LINE = /^\s*`{3,}[a-z]*\s*$/i;
const OPTION = /^\s*\(?([A-F])[.):]\s+(.*)$/i;

const CUT_OFF = (n, kind) => `${kind} ${n} was cut off, so it was left out. Ask the AI to write it again.`;
const UNREADABLE = "Couldn't find any questions or cards in this. Check that you copied the AI's whole reply, from its copy button on the code block.";

/** Blocks of { kind, fields, sections, ended } from the text's lines. */
function readBlocks(raw) {
  const blocks = [];
  let block = null;
  let section = null;
  for (const line of raw.split(/\r?\n/)) {
    // Some apps' copy escapes each character of a marker.
    const plain = line.replace(/\\(?=[-=])/g, '');
    const mark = BLOCK.exec(plain);
    if (mark) {
      const name = mark[1].toUpperCase();
      if (name === 'END') {
        if (block) block.ended = true;
        block = null;
      } else {
        block = { kind: name, fields: {}, sections: {}, ended: false };
        blocks.push(block);
      }
      section = null;
    } else if (block && !FENCE_LINE.test(line)) {
      const head = SECTION.exec(plain);
      if (head) {
        section = head[1].toUpperCase();
        block.sections[section] = [];
      } else if (section) {
        block.sections[section].push(line);
      } else {
        const field = FIELD.exec(line);
        if (field) block.fields[field[1].toLowerCase()] = field[2].trim();
      }
    }
  }
  return blocks;
}

const sectionText = (block, name) => (block.sections[name] || []).join('\n').trim();
const tidyMath = (text) => (text ? normalizeMathDelimiters(text).trim() : text);

function readOptions(text) {
  const options = [];
  for (const line of text.split('\n')) {
    const hit = OPTION.exec(line);
    if (hit) options.push(hit[2].trim());
    else if (options.length && line.trim()) options[options.length - 1] += `\n${line.trim()}`;
  }
  return options;
}

// A letter is the normal key: repeating an option's text is where models slip.
function readKey(text, options) {
  const key = text.trim();
  const letter = /^\(?([A-F])\)?[.):]?$/i.exec(key)?.[1];
  if (letter) return options[letter.toUpperCase().charCodeAt(0) - 65] ?? key;
  const labelled = OPTION.exec(key)?.[2]?.trim();
  return matchOption(labelled ?? key, options) ?? key;
}

function toQuestion(block) {
  const options = readOptions(sectionText(block, 'OPTIONS'));
  // Only in a reply to the fix-it prompt: which live question this corrects.
  const fix = block.fields.id ? { id: block.fields.id, hash: block.fields.hash || '', verdict: (block.fields.verdict || '').toLowerCase(), notes: sectionText(block, 'NOTES') } : {};
  return {
    ...fix,
    subject: block.fields.subject || '',
    subtopic: block.fields.topic || '',
    type: block.fields.type || '',
    difficulty: Number(block.fields.difficulty) || 2,
    text: tidyMath(sectionText(block, 'STEM')),
    options,
    answer: readKey(sectionText(block, 'KEY'), options),
    fixedExplanation: tidyMath(sectionText(block, 'EXPLANATION')) || null,
  };
}

function readVariables(text) {
  return text.split('\n').map((line) => line.split(' | ').map((part) => part.trim())).filter(([symbol, meaning]) => symbol && meaning)
    .map(([symbol, meaning, unit]) => ({ symbol, meaning, unit: unit || null }));
}

function toCard(block) {
  const { fields } = block;
  return {
    kind: (fields.kind || '').toLowerCase(),
    subject: fields.subject || '',
    topic: fields.topic || '',
    subtopicTag: fields.tag || null,
    name: fields.name || '',
    symbol: fields.symbol || null,
    formulaLatex: sectionText(block, 'FORMULA') || null,
    valueUnit: sectionText(block, 'VALUE') || null,
    description: sectionText(block, 'MEANING'),
    variables: readVariables(sectionText(block, 'VARIABLES')),
    purposeExamTip: sectionText(block, 'TIP') || null,
    dimensionless: /^(true|yes)$/i.test(fields.dimensionless || ''),
  };
}

// The sections a block can't do without. Short of one, with no end marker, the
// reply stopped mid-way.
const isComplete = (block) => (block.kind === 'QUESTION'
  ? !!(sectionText(block, 'STEM') && sectionText(block, 'OPTIONS') && sectionText(block, 'KEY'))
  : !!sectionText(block, 'MEANING'));

function readTagged(raw) {
  const out = { questions: [], cards: [], problems: [] };
  let number = 0;
  for (const block of readBlocks(raw)) {
    number += 1;
    if (!block.ended && !isComplete(block)) {
      out.problems.push(CUT_OFF(number, block.kind === 'QUESTION' ? 'Question' : 'Card'));
    } else if (block.kind === 'QUESTION') {
      out.questions.push(toQuestion(block));
    } else {
      out.cards.push(toCard(block));
    }
  }
  return out;
}

const listIn = (value) => (Array.isArray(value)
  ? value
  : Object.values(value || {}).find(Array.isArray) || []);

function readJson(raw) {
  const parsed = parseModelJson(raw);
  if (!parsed.ok) return null;
  const items = listIn(parsed.value).filter((item) => item && typeof item === 'object');
  const out = { questions: [], cards: [], problems: [] };
  for (const item of items) {
    if (Array.isArray(item.options)) {
      out.questions.push({ ...item, subtopic: item.subtopic || item.topic || '', fixedExplanation: item.fixedExplanation || item.explanation || null });
    } else if (item.kind) {
      out.cards.push(item);
    }
  }
  return out;
}

/** A live question as a block for the fix-it prompt. Options keep their order. */
export function toExchangeBlock(q) {
  const key = q.options.indexOf(q.answer);
  return [
    '===QUESTION===',
    `id: ${q.id}`,
    `hash: ${q.hash}`,
    `subject: ${q.subject}`,
    `topic: ${q.subtopic}`,
    'verdict: ',
    '---STEM---',
    q.text,
    '---OPTIONS---',
    ...q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`),
    '---KEY---',
    key >= 0 ? String.fromCharCode(65 + key) : q.answer,
    '---EXPLANATION---',
    q.fixedExplanation || '',
    '---NOTES---',
    '',
    '===END===',
  ].join('\n');
}

/** { questions, cards, problems } from a pasted reply. `problems` are readable strings. */
export function parseExchange(raw) {
  const text = String(raw ?? '');
  const tagged = readTagged(text);
  if (tagged.questions.length || tagged.cards.length || tagged.problems.length) return tagged;
  const json = readJson(text);
  if (json && (json.questions.length || json.cards.length)) return json;
  return { questions: [], cards: [], problems: [UNREADABLE] };
}
