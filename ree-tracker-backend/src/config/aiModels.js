// Which model answers which AI feature.
//
// Every AI call used to walk one Gemini list that started at the biggest
// model, 45 seconds per attempt, so the three-sentence board report waited on
// the same chain as a 10-question generation. Each feature now names a TASK,
// and each task has its own ordered chain of `provider:model` entries, its own
// timeouts and its own output budget:
//
//   fast tasks (learner-facing)   small/quick open models first, short budgets
//   accurate tasks (admin)        the strongest open reasoning model first
//   vision                        multimodal models only
//
// Open-weight models run on free-tier OpenAI-compatible hosts (Groq, Cerebras,
// OpenRouter); Gemini stays as the backup at the end of every chain and as the
// first choice for images. A provider without its API key is skipped, so with
// only GEMINI_API_KEY set the app behaves as before, just routed per feature.
//
// Each provider's own model list is checked at boot and every 6 hours
// (services/ai/modelCatalog), and an id it doesn't offer is skipped, so a
// retired model or a free route that went away costs nothing.
//
// Providers rename and retire models often (on 2026-10-13 nine of the ids
// first written here were already gone), so the backups past each chain's
// first choices are written as picks rather than exact ids:
//
//   provider:@pick:kw1|kw2|kw3
//
// takes, for each keyword in order, the shortest id in that provider's current
// model list containing it, up to PICK_MAX models. On OpenRouter only free
// models qualify (PROVIDERS.openrouter.freeOnly). Embedding, speech, guard and
// image-generation models never qualify (PICK_EXCLUDE).
//
// Override any chain without a redeploy: AI_CHAIN_<TASK> (e.g. AI_CHAIN_REPORT)
// as a comma-separated list of `provider:model`. MODEL_TIERS (legacy) still
// replaces the Gemini entries of the `general` chain.

const PROVIDERS = {
    groq: {
        label: 'Groq',
        kind: 'openai',
        baseUrl: 'https://api.groq.com/openai/v1',
        envKey: 'GROQ_API_KEY',
        vision: false,
    },
    cerebras: {
        label: 'Cerebras',
        kind: 'openai',
        baseUrl: 'https://api.cerebras.ai/v1',
        envKey: 'CEREBRAS_API_KEY',
        vision: false,
    },
    openrouter: {
        label: 'OpenRouter',
        kind: 'openai',
        baseUrl: 'https://openrouter.ai/api/v1',
        envKey: 'OPENROUTER_API_KEY',
        vision: false,
        // Paid routes would bill the account; the app only uses free ones.
        freeOnly: true,
    },
    gemini: {
        label: 'Google Gemini',
        kind: 'gemini',
        envKey: 'GEMINI_API_KEY',
        vision: true,
    },
};

// Models that accept images, by `provider:model`. Gemini's are all multimodal.
const VISION_MODELS = new Set([
    'groq:meta-llama/llama-4-scout-17b-16e-instruct',
]);

// Models that aren't chat models, never chosen by a pick.
const PICK_EXCLUDE = /(embed|tts|audio|whisper|transcribe|guard|imagen|-image|veo|live|computer-use|robotics|aqa|learnlm|compound|playai|orpheus)/i;
const PICK_MAX = 2;

// Gemini IDs, lightest first and strongest first. The pro model only has a
// small free quota, so it sits behind the newest flash.
const GEMINI_FAST = ['gemini:gemini-3.1-flash-lite', 'gemini:gemini-2.5-flash-lite', 'gemini:gemini-2.5-flash'];
const GEMINI_STRONG = ['gemini:gemini-3.5-flash', 'gemini:@pick:gemini-3.1-pro|gemini-3-pro|gemini-2.5-pro', 'gemini:gemini-2.5-flash'];

// Backups picked from each provider's live list (see the note at the top).
const GROQ_FAST_ALT = 'groq:@pick:llama-3.3-70b|llama-4-scout|llama-4-maverick|qwen3-32b';
const GROQ_ALT = 'groq:@pick:llama-3.3-70b|qwen3-32b|kimi-k2|llama-4-maverick';
const OR_FAST = 'openrouter:@pick:gpt-oss-20b|gpt-oss-120b|llama-3.3-70b|gemma-3-27b|mistral-small';
const OR_GENERAL = 'openrouter:@pick:gpt-oss-120b|deepseek-chat|deepseek-v3|qwen3-235b|llama-3.3-70b';
const OR_REASONING = 'openrouter:@pick:gpt-oss-120b|deepseek-r1|qwen3-235b|deepseek-chat|kimi-k2';

const TASKS = {
    // Progress › AI board report: three sentences. Speed is the whole point.
    report: {
        label: 'AI board report',
        audience: 'learner',
        tier: 'fast',
        perModelTimeoutMs: 12_000,
        budgetMs: 30_000,
        maxTokens: 500,
        temperature: 0.5,
        reasoningEffort: 'low',
        chain: [
            'groq:openai/gpt-oss-20b',
            GROQ_FAST_ALT,
            'cerebras:gpt-oss-120b',
            OR_FAST,
            ...GEMINI_FAST,
        ],
    },
    // "Explain with AI" on any question: a worked solution, so it needs to be
    // right, but a learner is waiting on it.
    explain: {
        label: 'Explain with AI',
        audience: 'learner',
        tier: 'fast',
        perModelTimeoutMs: 25_000,
        budgetMs: 50_000,
        maxTokens: 2_500,
        temperature: 0.3,
        reasoningEffort: 'medium',
        chain: [
            'groq:openai/gpt-oss-120b',
            'cerebras:gpt-oss-120b',
            GROQ_ALT,
            OR_GENERAL,
            'gemini:gemini-2.5-flash',
            'gemini:gemini-2.5-flash-lite',
        ],
    },
    // On-the-fly AI questions in Practice and the mock board (learner waits).
    practice: {
        label: 'AI practice questions',
        audience: 'learner',
        tier: 'fast',
        json: true,
        perModelTimeoutMs: 30_000,
        budgetMs: 60_000,
        maxTokens: 6_000,
        temperature: 0.7,
        reasoningEffort: 'low',
        chain: [
            'groq:openai/gpt-oss-120b',
            'cerebras:gpt-oss-120b',
            GROQ_ALT,
            OR_GENERAL,
            'gemini:gemini-2.5-flash',
            'gemini:gemini-2.5-flash-lite',
        ],
    },
    // Admin: questions, formulas, constants and concepts for the shared bank.
    // Accuracy over speed; everything still passes human review.
    author: {
        label: 'Admin content generation',
        audience: 'admin',
        tier: 'accurate',
        json: true,
        perModelTimeoutMs: 75_000,
        budgetMs: 110_000,
        maxTokens: 12_000,
        temperature: 0.4,
        reasoningEffort: 'high',
        chain: [
            'groq:openai/gpt-oss-120b',
            'cerebras:gpt-oss-120b',
            OR_REASONING,
            ...GEMINI_STRONG,
        ],
    },
    // Admin: an independent second solve of generated questions. A different
    // model family first, so the checker doesn't share the author's blind spots.
    verify: {
        label: 'Answer double-check',
        audience: 'admin',
        tier: 'accurate',
        json: true,
        perModelTimeoutMs: 60_000,
        budgetMs: 100_000,
        maxTokens: 8_000,
        temperature: 0,
        reasoningEffort: 'high',
        chain: [
            'gemini:gemini-3.5-flash',
            'gemini:gemini-2.5-flash',
            'cerebras:gpt-oss-120b',
            'groq:openai/gpt-oss-120b',
            'openrouter:@pick:deepseek-r1|qwen3-235b|gpt-oss-120b',
        ],
    },
    // Admin: questions read out of a photo or scanned page.
    vision: {
        label: 'Image extraction',
        audience: 'admin',
        tier: 'accurate',
        json: true,
        vision: true,
        perModelTimeoutMs: 75_000,
        budgetMs: 110_000,
        maxTokens: 10_000,
        temperature: 0.1,
        chain: [
            'gemini:gemini-3.5-flash',
            'gemini:gemini-2.5-flash',
            'groq:@pick:llama-4-scout|llama-4-maverick',
            'openrouter:@pick:gemma-3-27b|qwen2.5-vl|llama-4|mistral-small',
        ],
    },
    // Old clients that send no task.
    general: {
        label: 'Other AI requests',
        audience: 'learner',
        tier: 'fast',
        perModelTimeoutMs: 30_000,
        budgetMs: 60_000,
        maxTokens: 6_000,
        temperature: 0.5,
        reasoningEffort: 'medium',
        chain: [
            'groq:openai/gpt-oss-120b',
            'cerebras:gpt-oss-120b',
            'gemini:gemini-2.5-flash',
            'gemini:gemini-2.5-flash-lite',
        ],
    },
};

const TASK_IDS = Object.keys(TASKS);

/**
 * "groq:openai/gpt-oss-20b" → { id, provider, model }. The model may contain ':'.
 * "groq:@pick:a|b" → { id, provider, model, pick: ['a', 'b'] }, resolved
 * against the provider's model list by modelCatalog.resolveChain.
 */
function parseEntry(entry) {
    const raw = String(entry || '').trim();
    const i = raw.indexOf(':');
    if (i <= 0) return null;
    const provider = raw.slice(0, i).trim();
    const model = raw.slice(i + 1).trim();
    if (!PROVIDERS[provider] || !model) return null;
    if (model.startsWith('@pick:')) {
        const pick = model.slice('@pick:'.length).split('|').map((k) => k.trim()).filter(Boolean);
        if (!pick.length) return null;
        return { id: `${provider}:${model}`, provider, model, pick };
    }
    return { id: `${provider}:${model}`, provider, model };
}

function chainFor(taskId, env = process.env) {
    const task = TASKS[taskId] || TASKS.general;
    const name = TASKS[taskId] ? taskId : 'general';
    const override = env[`AI_CHAIN_${name.toUpperCase()}`];
    let entries = override ? override.split(',') : task.chain;
    if (!override && name === 'general' && env.MODEL_TIERS) {
        const legacy = env.MODEL_TIERS.split(',').map((m) => m.trim()).filter(Boolean).map((m) => `gemini:${m}`);
        entries = [...task.chain.filter((e) => !e.startsWith('gemini:')), ...legacy];
    }
    const seen = new Set();
    return entries.map(parseEntry).filter((e) => {
        if (!e || seen.has(e.id)) return false;
        // A pick is checked for image input when it resolves.
        if (task.vision && !e.pick && !(PROVIDERS[e.provider].vision || VISION_MODELS.has(e.id))) return false;
        seen.add(e.id);
        return true;
    });
}

const isProviderConfigured = (provider, env = process.env) => !!env[PROVIDERS[provider]?.envKey];

// Kept for the startup log and older callers: the Gemini IDs in use anywhere.
const MODEL_TIERS = [...new Set(TASK_IDS.flatMap((t) => chainFor(t))
    .filter((e) => e.provider === 'gemini' && !e.pick).map((e) => e.model))];

module.exports = {
    PROVIDERS,
    TASKS,
    TASK_IDS,
    VISION_MODELS,
    PICK_EXCLUDE,
    PICK_MAX,
    parseEntry,
    chainFor,
    isProviderConfigured,
    MODEL_TIERS,
    DEFAULT_MODEL_TIERS: MODEL_TIERS,
};
