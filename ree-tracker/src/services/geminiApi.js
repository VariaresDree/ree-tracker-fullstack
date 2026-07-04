import { apiRequest } from './dbQueries';
import { TOS } from '../config/constants';
import { sanitizeGeneratedBatch } from '../utils/sanitizeOptions';

const cleanJsonPayload = (text) => {
    let clean = text.trim();
    const bt3 = String.fromCharCode(96, 96, 96);
    if (clean.startsWith(bt3 + "json")) clean = clean.slice(7);
    else if (clean.startsWith(bt3)) clean = clean.slice(3);
    if (clean.endsWith(bt3)) clean = clean.slice(0, -3);
    return clean.trim();
};

// Gemini generation regularly takes 15-40s server-side. The default 12s
// apiRequest timeout aborted healthy AI calls with [OFFLINE] AND tripped the
// 30s circuit breaker, blocking every other request. AI calls get a 90s
// budget; the abort of a long-timeout call is scoped to NOT trip the breaker.
const AI_TIMEOUT_MS = 90_000;

async function callAI(prompt, isJson = false, config = {}) {
    if (!navigator.onLine) {
        throw new Error("Cannot connect to AI while offline.");
    }

    const response = await apiRequest('/api/ai/generate', 'POST', {
        contents: prompt,
        config: { temperature: isJson ? 0.1 : 0.7, ...config }
    }, { timeoutMs: AI_TIMEOUT_MS });

    if (isJson) {
        const cleanText = cleanJsonPayload(response.text);
        return JSON.parse(cleanText);
    }
    return response.text;
}

const getStrictRules = (subject, targetSubtopic) => {
    const availableSubtopics = TOS[subject] ? TOS[subject].join(', ') : 'General';

    const subtopicRule = targetSubtopic && targetSubtopic !== 'All' && targetSubtopic !== 'General'
        ? `3. The "subtopic" field MUST be EXACTLY "${targetSubtopic}". Do NOT use any other category name.`
        : `3. Categorize "subtopic" STRICTLY as one of the following exact strings: [${availableSubtopics}].`;

    return `
    CRITICAL RULES:
    1. Return ONLY a raw JSON array of objects. Do not use markdown blocks like \`\`\`json.
    2. Categorize "type" as either "calculation" or "conceptual".
    ${subtopicRule}
    4. The "answer" field MUST contain the EXACT full string value of the correct option.
    5. Evaluate the cognitive load of the question. Assign a "difficulty" rating: 1 (Foundational/Easy), 2 (Core/Medium), or 3 (Complex/Hard).
    6. Format ALL mathematical formulas and variables using standard Markdown LaTeX (e.g., $V = I \\times R$).
    7. Provide a "fixedExplanation" for EVERY question detailing the step-by-step mathematical derivation in Markdown LaTeX.
    8. ZERO-HALLUCINATION POLICY: When extracting data from technical charts (especially logarithmic graphs, X/R ratios, or PEC tables), you MUST explicitly state the exact plotted intersection in the explanation. DO NOT round standard engineering constants. If a chart intersection is 37, return 37, not 40.
    9. OPTION FORMATTING: Each string in "options" — and the "answer" — MUST contain ONLY the choice's content. NEVER prefix a choice with an enumerator label such as "A.", "B)", "(C)", or "D:". The interface renders the A/B/C/D labels automatically; a baked-in label is a formatting error that renders as a duplicate ("A. A. ...").

    JSON SCHEMA:
    [
      {
        "text": "Detailed question string containing LaTeX formatting.",
        "options": ["First choice text (no letter prefix)", "Second choice text", "Third choice text", "Fourth choice text"],
        "answer": "EXACT string matching the correct option",
        "type": "conceptual or calculation",
        "difficulty": 1,
        "subtopic": "${targetSubtopic && targetSubtopic !== 'All' && targetSubtopic !== 'General' ? targetSubtopic : 'Must exactly match target'}",
        "fixedExplanation": "A highly detailed, step-by-step mathematical derivation."
      }
    ]`;
};

export const generateQuestionsAI = async (subject, subtopic, useWeb = false, count = 5, recentContext = []) => {
    const randomSeed = Math.floor(Math.random() * 10000);

    const exclusionDirective = recentContext.length > 0
        ? `\nCRITICAL ANTI-LOOP DIRECTIVE: You MUST NOT generate questions that are structurally or conceptually identical to these recent outputs:\n${recentContext.map((q, i) => `${i+1}. ${q}`).join('\n')}\n`
        : '';

    const prompt = `You are an elite examiner writing questions for the Philippine Registered Electrical Engineer (REE) Board Exam.
    Generate EXACTLY ${count} multiple-choice questions for the subject: ${subject}. Target Focus: ${subtopic}.

    ${getStrictRules(subject, subtopic)}
    ${exclusionDirective}

    VARIANCE REQUIREMENT [Seed: ${randomSeed}]:
    You must generate entirely distinct structural problems. Alter circuit parameters, change numerical vectors, vary component loads, or approach definitions from distinct engineering angles. Never return identical text strings or formula values from previous processing blocks.

    ${useWeb ? 'Utilize current real-world engineering data where applicable.' : ''}`;

    try {
        return sanitizeGeneratedBatch(await callAI(prompt, true));
    } catch (error) {
        console.error("AI Generation pipeline connection failed:", error);
        return [];
    }
};

export const generateMasterExplanation = async (questionObj, isRetry = false) => {
    const retryContext = isRetry ? `CRITICAL WARNING: Your previous attempt produced broken LaTeX. Use standard Markdown tables. DO NOT mix **bold** inside LaTeX math tags. Ensure $ delimiters are perfectly balanced.` : '';

    const prompt = `Act as an expert Engineering Tutor. A student is reviewing the following question:
        Question: ${questionObj.text}
        Correct Answer: ${questionObj.answer}
        Options Available: ${questionObj.options ? questionObj.options.join(', ') : 'N/A'}

        Provide a "Master Explanation" with standard Markdown formatting and $$...$$ or $...$ for math.
        ${retryContext}

        1. **Step-by-Step Derivation:** How to arrive at the correct answer.
        2. **Option Analysis:** Briefly debunk distractors.`;

    try {
        return await callAI(prompt, false);
    } catch (error) {
        console.error("AI Explanation Error:", error);
        return "Explanation engine currently overloaded. Refer to offline matrix formulas.";
    }
};

export const generateBoardReadinessReport = async (stats, readinessScore, weakTopics) => {
    const prompt = `
        You are an elite AI Coach for the Philippine Registered Electrical Engineer (REE) Board Exam.
        Analyze this student profile for the upcoming REE exam:

        - Calculated Readiness: ${readinessScore}%
        - IRT Theta Level: ${stats?.irt?.theta || 0}
        - Study Streak: ${stats?.globalStreak || 0} days
        - Critical Weak Areas: ${weakTopics?.join(', ') || 'None registered yet'}
        - Confidence Matrix:
           * Solid Mastery: ${stats?.matrix?.hc || 0}
           * Dangerous Blind Spots: ${stats?.matrix?.hw || 0}
           * Imposter Syndrome: ${stats?.matrix?.lc || 0}
           * Weak Foundations: ${stats?.matrix?.lw || 0}

        Provide a short, 3-sentence diagnostic tactical direction. Be direct, authoritative, and motivating. Address blind spots if they exist. Do not use large markdown headers.
    `;

    try {
        return await callAI(prompt, false);
    } catch (error) {
        return "Failed to generate dynamic tactical diagnostics. Please try again later.";
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
        return sanitizeGeneratedBatch(await callAI(prompt, true));
    } catch (error) {
        console.error("AI Text Extraction pipeline failed:", error);
        throw error;
    }
};

export const generateQuestionsFromImages = async (base64Images, subject, subtopic, count = 3) => {
    const imageParts = base64Images.map(base64Data => ({
        inlineData: {
            data: base64Data.split(',')[1],
            mimeType: "image/jpeg"
        }
    }));

    const prompt = `You are an elite examiner writing questions for the Philippine Registered Electrical Engineer (REE) Board Exam.
    Read the text, math, and diagrams in these images. Extract key principles and generate EXACTLY ${count} multiple-choice questions based STRICTLY on the contents of these images.
    Subject: ${subject}.
    ${getStrictRules(subject, subtopic)}`;

    try {
        const response = await apiRequest('/api/ai/generate', 'POST', {
            contents: [prompt, ...imageParts],
            config: { temperature: 0.1 }
        }, { timeoutMs: AI_TIMEOUT_MS });

        const cleanJson = cleanJsonPayload(response.text);
        return sanitizeGeneratedBatch(JSON.parse(cleanJson));
    } catch (error) {
        console.error("Gemini Vision API Error:", error);
        throw new Error("Failed to process module images via AI Vision.");
    }
};

export const generateDeepExplanation = async (questionText, correctAnswer, options = []) => {
    const prompt = `Act as an elite engineering and mathematics tutor. Analyze the following question and provide a deep, step-by-step derivation of the solution.

    Question: ${questionText}
    Correct Answer: ${correctAnswer || "Not provided"}
    ${options && options.length > 0 ? `Options: ${options.join(' | ')}` : ""}

    FORMATTING RULES:
    - Use standard Markdown.
    - Enclose ALL mathematical formulas, numbers, and variables in LaTeX wrappers ($ for inline, $$ for block).
    - Step 1: Explain the core concept/principle.
    - Step 2: Show the exact mathematical derivation or logical deduction.
    - Step 3: Briefly explain why the distractors are incorrect (if options are provided).`;

    try {
        return await callAI(prompt, false);
    } catch (error) {
        console.error("Gemini API Error in Bookmark Vault:", error);
        throw new Error("Failed to generate AI derivation.");
    }
};
