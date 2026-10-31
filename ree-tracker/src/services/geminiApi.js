// src/services/geminiApi.js (name kept for its many importers)
//
// Every AI feature in the app goes through POST /api/ai/generate with a
// `task` that picks its model chain on the server
// (ree-tracker-backend/src/config/aiModels.js):
//   report    Progress › AI board report            fast open model
//   explain   "Explain with AI" on any question     fast open model
//   practice  AI questions in Practice / mock board fast open model
//   author    Admin question and flashcard writing  strongest open model
//   verify    Admin answer double-check             a second model family
//   vision    Admin image extraction                multimodal model
import { parseModelJson, repairJsonEscapes } from '@ree/shared';
import { apiRequest } from './dbQueries';
import { useStore } from '../store/useStore';
import { sanitizeGeneratedBatch } from '../utils/sanitizeOptions';
import { BOARD_EXAM_SYSTEM, VERIFY_SYSTEM, buildQuestionPrompt, buildVerifyPrompt, applyVerification } from './aiPrompts';

// Reading a model's JSON lives in @ree/shared (modelJson.js): the server
// already checked the answer with the same routine before passing it on, so
// this mostly takes the fast path. Re-exported for the tests and importers.
export { repairJsonEscapes };

// Parse an AI answer, or throw with a message the UI can toast.
export const parseAiJson = (rawText) => {
    const result = parseModelJson(rawText);
    if (result.ok) return result.value;
    throw new Error(`AI returned malformed JSON (${result.message}). Regenerate and try again.`);
};

// Unwraps the { "items": [...] } envelope the JSON-mode prompts ask for
// (OpenAI-compatible JSON mode only returns objects). A bare array, the old
// shape, passes through.
export const asItems = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
        for (const key of ['items', 'questions', 'cards', 'results']) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
        const firstArray = Object.values(parsed).find(Array.isArray);
        if (firstArray) return firstArray;
    }
    return [];
};

// How long the app waits on each AI feature before giving up. The server has
// its own, shorter per-model limits and falls back between models inside this
// window (ree-tracker-backend/src/config/aiModels.js). The abort of a
// long-timeout call is scoped to NOT trip the API circuit breaker.
const AI_TIMEOUT_MS = {
    report: 35_000,
    explain: 60_000,
    practice: 70_000,
    general: 70_000,
    author: 125_000,
    verify: 115_000,
    vision: 125_000,
};

const OFFLINE_MESSAGE = 'Cannot connect to AI while offline.';

// Admin tasks are long and run on free-tier keys, where a whole chain can fail
// in a bad minute (every model rate limited at once). One more try a few
// seconds later usually lands; learner tasks fail fast instead.
const RETRY_TASKS = new Set(['author', 'verify', 'vision']);
export const AI_RETRY_DELAY_MS = 4_000;

// Why each model failed, in the words of Admin › AI status.
const FAILURE_WORDS = {
    not_found: 'retired',
    auth: 'key rejected',
    rate_limited: 'rate limited',
    timeout: 'timed out',
    unavailable: 'unavailable',
    bad_output: 'unusable answer',
    too_large: 'too large',
};

/** "gpt-oss-120b timed out, gemini-3.5-flash rate limited" from an AI_EXHAUSTED error. */
export function describeTriedModels(tried) {
    if (!Array.isArray(tried) || !tried.length) return '';
    return tried
        .filter((t) => t?.status && t.status !== 'ok')
        .map((t) => `${String(t.model || '').split('/').pop()} ${FAILURE_WORDS[t.status] || 'failed'}`)
        .join(', ');
}

const isRetryable = (err) => err?.code === 'AI_EXHAUSTED' || err?.message === '[TIMEOUT]';
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * One AI request for a feature (`task`). Returns { text, model, provider,
 * providerLabel, latencyMs, fallbacks }. Throws with a readable message.
 */
export async function callAITask(task, contents, { system, json = false, temperature, maxTokens } = {}) {
    if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);
    const config = {};
    if (temperature !== undefined) config.temperature = temperature;
    if (maxTokens !== undefined) config.maxOutputTokens = maxTokens;
    const send = () => apiRequest('/api/ai/generate', 'POST', {
        task,
        contents,
        ...(system ? { system } : {}),
        ...(json ? { json: true } : {}),
        ...(Object.keys(config).length ? { config } : {}),
    }, { timeoutMs: AI_TIMEOUT_MS[task] || AI_TIMEOUT_MS.general });
    try {
        try {
            return await send();
        } catch (err) {
            if (!RETRY_TASKS.has(task) || !isRetryable(err)) throw err;
            await wait(AI_RETRY_DELAY_MS);
            return await send();
        }
    } catch (err) {
        if (err?.message === '[TIMEOUT]') throw new Error('The AI took too long to answer. Try again, or try fewer items.', { cause: err });
        if (err?.message === '[OFFLINE]') throw new Error(OFFLINE_MESSAGE, { cause: err });
        if (err?.status === 413) throw new Error('That upload is too large. Send fewer or smaller images.', { cause: err });
        if (err?.code === 'AI_EXHAUSTED') {
            const why = describeTriedModels(err.triedModels);
            const retried = RETRY_TASKS.has(task) ? ', twice' : '';
            const message = `Every AI model failed${retried}. Try again in a minute.${why ? ` Last try: ${why}.` : ''}`;
            throw Object.assign(new Error(message, { cause: err }), { code: err.code, triedModels: err.triedModels });
        }
        throw err;
    }
}

async function callAI(prompt, isJson = false, { task = 'general', system, temperature, maxTokens } = {}) {
    const response = await callAITask(task, prompt, {
        system,
        json: isJson,
        temperature: temperature ?? (isJson ? 0.2 : 0.7),
        maxTokens,
    });
    if (isJson) return asItems(parseAiJson(response.text));
    return response.text;
}

/** GET /api/ai/status: per-feature state, plus the model chains for admins. */
export const fetchAiStatus = () => apiRequest('/api/ai/status');

/** Admin: ping every configured model once and return the fresh status. */
export const probeAiModels = () => apiRequest('/api/ai/status/probe', 'POST', { at: Date.now() }, { timeoutMs: 45_000 });

// The live taxonomy (GET /api/config/tos → store.dynamicTOS), NOT the static
// offline snapshot in config/constants.js: labels the model picks are resolved
// against the Topic table at publish, and a stale list mints labels that match
// no topic (the "Transient Response" / "AC Impedance" drift).
const liveTopicsFor = (subject) => {
    const topics = useStore.getState().dynamicTOS?.[subject];
    return Array.isArray(topics) ? topics : [];
};

export const getStrictRules = (subject, targetSubtopic, topics = liveTopicsFor(subject)) => {
    const availableSubtopics = topics.length ? topics.join(', ') : 'General';

    const subtopicRule = targetSubtopic && targetSubtopic !== 'All' && targetSubtopic !== 'General'
        ? `3. The "subtopic" field MUST be EXACTLY "${targetSubtopic}". Do NOT use any other category name.`
        : `3. Categorize "subtopic" STRICTLY as one of the following exact strings: [${availableSubtopics}].`;

    return `
    CRITICAL RULES:
    1. Return ONLY one JSON object of the form {"items": [ ... ]}. Do not use markdown blocks like \`\`\`json.
    2. Categorize "type" as either "calculation" or "conceptual".
    ${subtopicRule}
    4. The "answer" field MUST contain the EXACT full string value of the correct option.
    5. Evaluate the cognitive load of the question. Assign a "difficulty" rating: 1 (Foundational/Easy), 2 (Core/Medium), or 3 (Complex/Hard).
    6. Format ALL mathematical formulas and variables using standard Markdown LaTeX (e.g., $V = I \\times R$).
    7. Provide a "fixedExplanation" for EVERY question detailing the step-by-step mathematical derivation in Markdown LaTeX.
    8. ZERO-HALLUCINATION POLICY: When extracting data from technical charts (especially logarithmic graphs, X/R ratios, or PEC tables), you MUST explicitly state the exact plotted intersection in the explanation. DO NOT round standard engineering constants. If a chart intersection is 37, return 37, not 40.
    9. OPTION FORMATTING: Each string in "options" — and the "answer" — MUST contain ONLY the choice's content. NEVER prefix a choice with an enumerator label such as "A.", "B)", "(C)", or "D:". The interface renders the A/B/C/D labels automatically; a baked-in label is a formatting error that renders as a duplicate ("A. A. ...").
    10. OPTION ORDER: The options are shuffled for every sitting, so their order means nothing. Put the correct option at a random position, not first. In the explanation, refer to an option by its content, NEVER by its letter or position ("option B", "the first choice"), and never write an option that names others by letter ("Both A and B").

    JSON SCHEMA:
    {"items": [
      {
        "text": "Detailed question string containing LaTeX formatting.",
        "options": ["First choice text (no letter prefix)", "Second choice text", "Third choice text", "Fourth choice text"],
        "answer": "EXACT string matching the correct option",
        "type": "conceptual or calculation",
        "difficulty": 1,
        "subtopic": "${targetSubtopic && targetSubtopic !== 'All' && targetSubtopic !== 'General' ? targetSubtopic : 'Must exactly match target'}",
        "fixedExplanation": "A highly detailed, step-by-step mathematical derivation."
      }
    ]}`;
};

export const generateQuestionsAI = async (subject, subtopic, useWeb = false, count = 5, recentContext = [], specificFocus = null) => {
    const randomSeed = Math.floor(Math.random() * 10000);

    const exclusionDirective = recentContext.length > 0
        ? `\nCRITICAL ANTI-LOOP DIRECTIVE: You MUST NOT generate questions that are structurally or conceptually identical to these recent outputs:\n${recentContext.map((q, i) => `${i+1}. ${q}`).join('\n')}\n`
        : '';

    // Optional free-text steering (finer than the TOS dropdown): a sub-subtopic
    // ("Circle"), a device ("transformer losses"), or a question style ("PEC
    // code questions"). Content-only — the "subtopic" field still obeys
    // getStrictRules, so stored taxonomy/analytics are unaffected.
    const focusDirective = specificFocus
        ? `\nSPECIFIC FOCUS: Center every question on "${specificFocus}" — a finer slice of the target topic (sub-subtopic, device, code article, or question style). The "subtopic" field must STILL obey the rules below.\n`
        : '';

    const prompt = `You are an elite examiner writing questions for the Philippine Registered Electrical Engineer (REE) Board Exam.
    Generate EXACTLY ${count} multiple-choice questions for the subject: ${subject}. Target Focus: ${subtopic}.
    ${focusDirective}
    ${getStrictRules(subject, subtopic)}
    ${exclusionDirective}

    VARIANCE REQUIREMENT [Seed: ${randomSeed}]:
    You must generate entirely distinct structural problems. Alter circuit parameters, change numerical vectors, vary component loads, or approach definitions from distinct engineering angles. Never return identical text strings or formula values from previous processing blocks.

    ${useWeb ? 'Utilize current real-world engineering data where applicable.' : ''}`;

    try {
        return sanitizeGeneratedBatch(await callAI(prompt, true, { task: 'practice', temperature: 0.7 }));
    } catch (error) {
        console.error("AI Generation pipeline connection failed:", error);
        return [];
    }
};

export const generateMasterExplanation = async (questionObj, isRetry = false) => {
    const retryContext = isRetry ? `CRITICAL WARNING: Your previous attempt produced broken LaTeX. Use standard Markdown tables. DO NOT mix **bold** inside LaTeX math tags. Ensure $ delimiters are perfectly balanced.` : '';

    const prompt = `Act as an expert Engineering Tutor. A student is reviewing the following question:
        Question: ${questionObj.text || questionObj.question || questionObj.content || ''}
        Correct Answer: ${questionObj.answer}
        Options Available: ${questionObj.options ? questionObj.options.join(', ') : 'N/A'}

        Provide a "Master Explanation" with standard Markdown formatting and $$...$$ or $...$ for math.
        ${retryContext}

        1. **Step-by-Step Derivation:** How to arrive at the correct answer.
        2. **Option Analysis:** Briefly debunk distractors.`;

    // Throws on failure. It used to return an apology as if it were the
    // explanation, which then got saved and shown as one.
    return callAI(prompt, false, { task: 'explain', temperature: 0.3 });
};

// A fast open model writes this (task "report"): three sentences from the
// numbers below. It used to wait on the biggest Gemini model first.
export const REPORT_SYSTEM = 'You are a concise, encouraging coach for Filipino reviewees taking the Registered Electrical Engineer (REE) board exam. Plain English, no headings, no lists, no military or sci-fi wording. Exactly three short sentences.';

export const generateBoardReadinessReport = async (stats, readinessScore, weakTopics) => {
    const prompt = `Reviewee profile:
- Readiness index: ${readinessScore ?? 'not available yet'}${readinessScore != null ? ' of 100 (70 is the passing line)' : ''}
- Ability estimate (IRT theta, about -3 to +3): ${stats?.irt?.theta ?? 0}
- Study streak: ${stats?.globalStreak || 0} days
- Weakest topics (under the accuracy line): ${weakTopics?.length ? weakTopics.slice(0, 8).join(', ') : 'none yet'}
- Confidence check: ${stats?.matrix?.hc || 0} sure and right, ${stats?.matrix?.hw || 0} sure but wrong (blind spots), ${stats?.matrix?.lc || 0} unsure but right, ${stats?.matrix?.lw || 0} unsure and wrong

Say what to study next and why. Name specific topics from the list. If there are blind spots, say to review those first, since confident mistakes cost the most on the board.`;

    try {
        return await callAI(prompt, false, { task: 'report', system: REPORT_SYSTEM, temperature: 0.5, maxTokens: 500 });
    } catch {
        return "Couldn’t write the board report right now. Try again in a minute.";
    }
};

export const generateQuestionsFromText = async (rawText, subject, subtopic, count = 3) => {
    const prompt = `You are an elite examiner writing questions for the Philippine Registered Electrical Engineer (REE) Board Exam.
    Extract key engineering principles from this text and generate EXACTLY ${count} multiple-choice questions. Subject: ${subject}.
    ${getStrictRules(subject, subtopic)}

    SOURCE TEXT:
    """
    ${rawText}
    """`;

    try {
        return sanitizeGeneratedBatch(await callAI(prompt, true, { task: 'author', system: BOARD_EXAM_SYSTEM, temperature: 0.2 }));
    } catch (error) {
        console.error("AI Text Extraction pipeline failed:", error);
        throw error;
    }
};

// Generate COMPLETE reference flashcards (constants / formulas / concepts)
// shaped for POST /api/reference-cards/ai-intake. Every field is required — no
// bare symbols; the client previews + pre-validates, and the server
// re-validates authoritatively and queues only complete cards for HUMAN review
// (a wrong constant value is as damaging as a wrong answer key).
//   kind: 'constant' | 'formula' | 'concept'
//   topic: an EXACT topic name from the shared taxonomy (dynamicTOS[subject]).
export const REFERENCE_SYSTEM = `You compile the formula, constant and concept flashcards for a Philippine Registered Electrical Engineer (REE) board exam reviewer. Every value, unit and formula must be exactly right: a wrong constant teaches the wrong number. Use SI units and the values in standard references (CODATA for physical constants, the PEC 2017 for code values, standard engineering handbooks). Never round a standard constant. If you are not sure of an entry, leave it out rather than guess. Write formulas in the form reviewees will meet on the board, and name the trap reviewees fall into with each one.`;

const generateReferenceCardBatch = async (kind, subject, topic, count, existingNames, specificFocus) => {
    const seed = Math.floor(Math.random() * 10000);
    const names = (existingNames || []).filter(Boolean).slice(0, 200);
    const exclusionDirective = names.length > 0
        ? `\nALREADY IN THE LIBRARY — do NOT generate any of these (nor trivial rewordings). Produce ONLY new, missing entries:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n`
        : '';
    const focusDirective = specificFocus
        ? `\nSPECIFIC FOCUS: center every card on "${specificFocus}" (a finer slice of the topic).\n`
        : '';
    const kindNoun = kind === 'constant' ? 'engineering constants/standard values'
        : kind === 'formula' ? 'engineering formulas'
        : 'engineering concepts';

    const prompt = `You are compiling an authoritative FLASHCARD reference for the Philippine Registered Electrical Engineer (REE) Board Exam, built for deep comprehension — not bare-symbol memorization.
    Generate EXACTLY ${count} COMPLETE ${kindNoun} flashcards for Subject: ${subject}, Topic: ${topic}.
    ${focusDirective}
    CRITICAL RULES:
    1. Return ONLY one JSON object of the form {"items": [ ...cards ]} — no markdown fences, no prose.
    2. Each card MUST include ALL of these fields, fully filled (a bare symbol or empty field is a hard failure):
      {
        "kind": "${kind}",
        "symbol": "short symbol wrapped in $ delimiters (e.g. '$X_c$'); null only if the entry truly has none",
        "name": "Full name (e.g. 'Capacitive Reactance')",
        "formulaLatex": ${kind === 'formula'
            ? '"REQUIRED — the expression as LaTeX, WRAPPED IN $ DELIMITERS so it renders (e.g. \'$X_c = \\\\frac{1}{2\\\\pi f C}$\')"'
            : '"a defining relation as LaTeX WRAPPED IN $ DELIMITERS, or null"'},
        "valueUnit": ${kind === 'constant'
            ? '"REQUIRED — the exact value WITH units as LaTeX, WRAPPED IN $ DELIMITERS (e.g. \'$8.854\\\\times10^{-12}$ F/m\'); if genuinely dimensionless set dimensionless true instead of inventing a value"'
            : '"the unit of the result WRAPPED IN $ DELIMITERS (e.g. \'$\\\\Omega$\'), or null"'},
        "description": "REQUIRED — 1-3 plain-language sentences on what the concept represents",
        "variables": [ { "symbol": "$f$", "meaning": "frequency", "unit": "$\\\\text{Hz}$" } ],
        "purposeExamTip": "REQUIRED — how it is applied in board problem-solving, plus one common trap/mistake to watch for",
        "subject": "${subject}",
        "topic": "${topic}",
        "subtopicTag": "a finer free-text tag within the topic (e.g. 'Capacitance'), or null",
        "dimensionless": false
      }
    3. For formulas: "variables" MUST cover EVERY symbol appearing in formulaLatex (except the defined symbol itself and known constants like \\pi), each with meaning and unit.
    4. All math/units MUST be valid LaTeX AND wrapped in $ delimiters (e.g. "$V = IR$", never bare "V = IR") — the renderer only typesets delimited expressions; anything else displays as literal source text to the student. Use standard engineering values; DO NOT round standard constants. ZERO HALLUCINATION — only well-established, board-relevant content.
    5. "topic" must be EXACTLY "${topic}" and "subject" EXACTLY "${subject}".
    ${exclusionDirective}
    VARIANCE [Seed: ${seed}]: cover distinct, non-duplicate entries.`;

    const rows = await callAI(prompt, true, { task: 'author', system: REFERENCE_SYSTEM, temperature: 0.3 });
    return Array.isArray(rows) ? rows : [];
};

// Up to 6 cards per request; a larger count runs as several requests in turn,
// each told what the earlier ones wrote, so nothing repeats.
const CARD_BATCH = 6;
export const generateReferenceCardsAI = async (kind, subject, topic, count = 6, existingNames = [], specificFocus = null, onProgress) => {
    const out = [];
    const seen = new Set((existingNames || []).map((n) => String(n).toLowerCase().trim()));
    const batches = Math.ceil(count / CARD_BATCH);
    for (let b = 0; b < batches && out.length < count; b += 1) {
        const want = Math.min(CARD_BATCH, count - out.length);
        onProgress?.(b + 1, batches);
        const rows = await generateReferenceCardBatch(kind, subject, topic, want, [...(existingNames || []), ...out.map((r) => r.name)], specificFocus);
        for (const row of rows) {
            const key = String(row?.name || '').toLowerCase().trim();
            if (key && seen.has(key)) continue;
            seen.add(key);
            out.push(row);
        }
    }
    return out.slice(0, count);
};

// `images`: data URLs ("data:image/png;base64,...") or File/Blob objects.
// The extraction hook used to pass the File itself, which this function then
// tried to .map() and crashed, so image extraction never worked.
export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read the image."));
    reader.readAsDataURL(file);
});

// A phone photo is 3-8 MB; as base64 in the request it went over the server's
// 2 MB limit. Scaled to 1600 px on the long side as JPEG it is a few hundred
// KB and still sharp enough to read printed math.
export const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** The image as a data URL, scaled down to MAX_IMAGE_EDGE (or as-is when the browser can't scale it). */
export async function shrinkImage(file) {
    try {
        if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return await fileToDataUrl(file);
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { bitmap.close?.(); return await fileToDataUrl(file); }
        ctx.fillStyle = '#fff'; // transparent PNG areas would turn black in JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    } catch {
        return fileToDataUrl(file);
    }
}

export const generateQuestionsFromImages = async (images, subject, subtopic, count = 3) => {
    const list = Array.isArray(images) ? images : [images];
    const dataUrls = await Promise.all(list.map((img) => (typeof img === 'string' ? img : shrinkImage(img))));
    const imageParts = dataUrls.map((url) => {
        const [head, data] = String(url).split(',');
        const mimeType = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
        return { inlineData: { data, mimeType } };
    });

    const prompt = `Read the text, math, and diagrams in these images. Extract the key principles and write EXACTLY ${count} multiple-choice REE board exam items based STRICTLY on the contents of these images. If the images already contain board-style questions, transcribe them faithfully (with a worked solution) instead of inventing new ones.
    Subject: ${subject}.
    ${getStrictRules(subject, subtopic)}`;

    try {
        const response = await callAITask('vision', [prompt, ...imageParts], { system: BOARD_EXAM_SYSTEM, json: true, temperature: 0.1 });
        return sanitizeGeneratedBatch(asItems(parseAiJson(response.text)));
    } catch (error) {
        console.error("AI Vision Error:", error);
        throw new Error(error?.message ? `Couldn't read the image: ${error.message}` : "Couldn't read the image.", { cause: error });
    }
};

// ── Admin question generator ───────────────────────────────────────────────
// One batch of planBatches() (services/aiPrompts), on the accurate "author"
// chain. Returns { items, meta } where meta says which model answered.
export const generateBoardQuestionBatch = async ({ subject, topic, focus, batch, avoid, notes, topics = liveTopicsFor(subject) }) => {
    const prompt = buildQuestionPrompt({ subject, topic, topics, focus, batch, avoid, notes });
    const response = await callAITask('author', prompt, { system: BOARD_EXAM_SYSTEM, json: true, temperature: 0.4 });
    const items = sanitizeGeneratedBatch(asItems(parseAiJson(response.text)));
    return {
        items,
        meta: { model: response.model, provider: response.provider, providerLabel: response.providerLabel, latencyMs: response.latencyMs },
    };
};

// Second opinion on generated items: another model solves each without the
// key. Returns the questions with a `check` field (see applyVerification).
export const verifyQuestions = async (questions) => {
    if (!questions.length) return questions;
    const response = await callAITask('verify', buildVerifyPrompt(questions), { system: VERIFY_SYSTEM, json: true, temperature: 0 });
    return applyVerification(questions, asItems(parseAiJson(response.text)))
        .map((q) => ({ ...q, check: { ...q.check, model: response.model } }));
};
