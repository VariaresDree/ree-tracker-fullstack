// scripts/stripOptionPrefixes.js
// One-time backfill: strip baked-in answer-choice labels ("A.", "b)", "(C)",
// "D:") from existing Question.options and Question.answer so the quiz UI stops
// rendering duplicate letters ("A. A. ..."). Idempotent — safe to re-run.
//
// Usage:
//   node scripts/stripOptionPrefixes.js         # apply changes
//   node scripts/stripOptionPrefixes.js --dry   # report only, no writes
//
// Run against the same DATABASE_URL the backend uses (Render/Supabase).

const prisma = require('../src/config/db');
const { sanitizeOptions, stripChoicePrefix } = require('../src/utils/sanitizeOptions');

(async () => {
    const dry = process.argv.includes('--dry');
    const questions = await prisma.question.findMany({
        select: { id: true, options: true, answer: true },
    });

    let changed = 0;
    for (const q of questions) {
        const newOptions = sanitizeOptions(q.options);
        const newAnswer = stripChoicePrefix(q.answer);
        const optionsChanged = JSON.stringify(newOptions) !== JSON.stringify(q.options);
        const answerChanged = newAnswer !== q.answer;

        if (optionsChanged || answerChanged) {
            changed++;
            if (!dry) {
                await prisma.question.update({
                    where: { id: q.id },
                    data: { options: newOptions, answer: newAnswer },
                });
            }
        }
    }

    console.log(`${dry ? '[DRY RUN] ' : ''}Sanitized ${changed} / ${questions.length} questions.`);
    await prisma.$disconnect();
    process.exit(0);
})().catch(async (err) => {
    console.error('Backfill failed:', err);
    try { await prisma.$disconnect(); } catch (_) { /* noop */ }
    process.exit(1);
});
