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
//   - \n is kept: real newlines are common, and the rare \nabla / \neq
//     degrades to a newline rather than breaking every explanation.
//   - Any other \x is doubled.
// A compliant payload (already double-escaped) comes out unchanged.
const KEEP_ALWAYS = new Set(['"', '\\', '/', 'n']);
const CONTROL_VS_LATEX = new Set(['t', 'f', 'r', 'b']);

function repairJsonEscapes(text) {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== '\\') { out += ch; continue; }
        const next = text[i + 1];
        if (KEEP_ALWAYS.has(next)) {
            out += ch + next;
            i += 1;
        } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
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
 * Returns { json, complete }: `complete` is false when the brackets never
 * close (an answer cut off mid-way).
 */
function extractJson(text) {
    const start = text.search(/[[{]/);
    if (start === -1) return { json: '', complete: false };
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
            if (stack.pop() !== ch) return { json: text.slice(start, i + 1), complete: false };
            if (stack.length === 0) return { json: text.slice(start, i + 1), complete: true };
        }
    }
    return { json: text.slice(start), complete: false };
}

/**
 * Read a model's JSON answer. Returns { ok: true, value, text } where `text`
 * is clean JSON (re-serialised only when a repair was needed), or
 * { ok: false, reason: 'empty' | 'truncated' | 'invalid', message }.
 */
function parseModelJson(raw) {
    const clean = stripFences(raw);
    if (!clean) return { ok: false, reason: 'empty', message: 'The answer was empty.' };
    try {
        return { ok: true, value: JSON.parse(clean), text: clean };
    } catch (firstErr) {
        const { json, complete } = extractJson(clean);
        if (!json) return { ok: false, reason: 'invalid', message: 'The answer had no JSON in it.' };
        for (const candidate of [json, repairJsonEscapes(json)]) {
            try {
                const value = JSON.parse(candidate);
                return { ok: true, value, text: candidate === clean ? clean : JSON.stringify(value) };
            } catch { /* try the next repair */ }
        }
        if (!complete) return { ok: false, reason: 'truncated', message: 'The answer was cut off before it finished.' };
        return { ok: false, reason: 'invalid', message: `The answer wasn't valid JSON (${firstErr.message}).` };
    }
}

module.exports = { parseModelJson, repairJsonEscapes, stripModelJsonFences: stripFences };
