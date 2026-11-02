// Reading the JSON an AI model writes. One routine for the server, which
// checks an answer before accepting it (and moves to the next model when it
// can't be read), and the client, which parses what the server passed on.
//
// Models asked for JSON still wrap it in code fences, add a sentence before
// it, or write LaTeX with single backslashes (\frac, \sqrt), which isn't
// valid JSON. Groq's JSON mode rejects such an answer outright
// (json_validate_failed); other hosts pass it through. All three are repaired
// here. An answer cut off at the token limit can't be repaired and is
// reported as truncated, so the caller can try another model.

'use strict';

const FENCE = String.fromCharCode(96, 96, 96);

/** Drop a surrounding code fence (with or without a language tag). */
function stripFences(text) {
    let clean = String(text ?? '').trim();
    if (clean.startsWith(FENCE)) {
        const firstBreak = clean.indexOf('\n');
        clean = firstBreak === -1 ? clean.slice(3) : clean.slice(firstBreak + 1);
    }
    if (clean.endsWith(FENCE)) clean = clean.slice(0, -3);
    return clean.trim();
}

// Single-backslash LaTeX inside JSON strings, two failure classes:
//   1. ILLEGAL JSON escapes (\pi, \sqrt, \() make JSON.parse throw.
//   2. LaTeX that COLLIDES with legal escapes (\times reads as tab + "imes",
//      \frac as formfeed + "rac") parses but corrupts the math.
// Rules (tuned for board-exam LaTeX):
//   - \" \\ \/ and \uXXXX are always kept.
//   - \t \f \r \b followed by a letter are LaTeX commands, so doubled.
//   - \n is a real newline, unless it spells \neq, \nu, \nabla or \not.
//   - Any other \x is doubled.
// A compliant payload (already double-escaped) comes out unchanged, so this
// runs on every answer: \frac alone is legal JSON, and a parse that succeeds
// says nothing about whether the math survived.
const KEEP_ALWAYS = new Set(['"', '\\', '/']);
const CONTROL_VS_LATEX = new Set(['t', 'f', 'r', 'b']);
const LATEX_AFTER_N = /^n(?:eq|u|abla|ot)(?![a-zA-Z])/;

function repairJsonEscapes(text) {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== '\\') { out += ch; continue; }
        const next = text[i + 1];
        if (KEEP_ALWAYS.has(next)) {
            out += ch + next;
            i += 1;
        } else if (next === 'n' && !LATEX_AFTER_N.test(text.slice(i + 1, i + 8))) {
            out += ch + next;
            i += 1;
        } else if (next === 'u' &&/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
            out += text.slice(i, i + 6);
            i += 5;
        } else if (CONTROL_VS_LATEX.has(next) && !/[a-zA-Z]/.test(text[i + 2] ?? '')) {
            out += ch + next;
            i += 1;
        } else {
            out += '\\\\';
        }
    }
    return out;
}

/**
 * The outermost JSON object or array in `text`, skipping prose around it.
 * Returns { json, complete, end }: `complete` is false when the brackets never
 * close (an answer cut off mid-way); `end` is where to look for the next one.
 */
function extractJson(text, from = 0) {
    const offset = text.slice(from).search(/[[{]/);
    if (offset === -1) return { json: '', complete: false, end: text.length };
    const start = from + offset;
    const stack = [];
    let inString = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (ch === '\\') i += 1;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
        else if (ch === '}' || ch === ']') {
            if (stack.pop() !== ch) return { json: text.slice(start, i + 1), complete: false, end: i + 1 };
            if (stack.length === 0) return { json: text.slice(start, i + 1), complete: true, end: i + 1 };
        }
    }
    return { json: text.slice(start), complete: false, end: text.length };
}

function parseRepaired(json) {
    try {
        return { value: JSON.parse(repairJsonEscapes(json)) };
    } catch {
        return null;
    }
}

// What a model's answer is: an object, or a list of them. "[10]" in the
// sentence before the answer is valid JSON too, and isn't one.
const isAnswerShape = (value) => (Array.isArray(value)
    ? value.every((item) => item && typeof item === 'object')
    : !!value && typeof value === 'object');

/**
 * Read a model's JSON answer. Returns { ok: true, value, text } where `text`
 * is clean JSON (re-serialised only when a repair was needed), or
 * { ok: false, reason: 'empty' | 'truncated' | 'invalid', message }.
 */
function parseModelJson(raw) {
    const clean = stripFences(raw);
    if (!clean) return { ok: false, reason: 'empty', message: 'The answer was empty.' };
    const whole = parseRepaired(clean);
    if (whole) return { ok: true, value: whole.value, text: repairJsonEscapes(clean) === clean ? clean : JSON.stringify(whole.value) };

    let found = extractJson(clean);
    if (!found.json) return { ok: false, reason: 'invalid', message: 'The answer had no JSON in it.' };
    while (found.json) {
        const part = parseRepaired(found.json);
        if (part && isAnswerShape(part.value)) return { ok: true, value: part.value, text: JSON.stringify(part.value) };
        if (!found.complete) return { ok: false, reason: 'truncated', message: 'The answer was cut off before it finished.' };
        found = extractJson(clean, found.end);
    }
    return { ok: false, reason: 'invalid', message: "The answer wasn't valid JSON." };
}

/**
 * Put back the backslashes an earlier parse swallowed from text already stored
 * ("\frac" saved as a form feed + "rac"). Text without such damage comes back
 * as it went in; a lone tab or line break stays.
 */
function repairSwallowedLatex(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/\f/g, '\\f')
        .replace(/[\b]/g, '\\b')
        .replace(/\t(?=[a-zA-Z])/g, '\\t')
        .replace(/\r(?=[a-zA-Z])/g, '\\r')
        .replace(/\n(?=(?:eq|u|abla|ot)(?![a-zA-Z]))/g, '\\n');
}

module.exports = { parseModelJson, repairJsonEscapes, repairSwallowedLatex, stripModelJsonFences: stripFences };
