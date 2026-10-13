// Which answer keys a learner may not read yet. A battle's questions stay
// closed to its own players until the battle closes: a player who has already
// submitted (or just has the question ids) could otherwise call
// POST /api/exams/grade or bookmark a question and read the key while the
// others are still answering. The sitting review and the mistakes list keep
// the same rule (services/sittingReview.js, routes/mistakeRoutes.js).
//
// Only battles the learner is in count. A battle that never started (no
// timing) is treated as open.
const prisma = require('../config/db');
const { battleTiming } = require('../utils/battleLogic');

/**
 * The ids, out of `questionIds`, whose key `userId` may not see now.
 * @returns {Promise<Set<string>>}
 */
async function lockedQuestionIds(userId, questionIds, now = Date.now()) {
    const wanted = new Set((questionIds || []).filter(Boolean));
    const locked = new Set();
    if (!userId || wanted.size === 0) return locked;
    const rows = await prisma.battleParticipant.findMany({
        where: { userId, battle: { status: { not: 'COMPLETED' } } },
        select: { battle: { select: { id: true, questions: true, startedAt: true, timeLimitSecs: true, createdAt: true } } },
    });
    for (const { battle } of rows) {
        if (!battle || battleTiming(battle, now)?.closed) continue;
        const qs = Array.isArray(battle.questions) ? battle.questions : [];
        for (const q of qs) {
            const id = q && typeof q === 'object' ? q.id : q;
            if (wanted.has(id)) locked.add(id);
        }
    }
    return locked;
}

module.exports = { lockedQuestionIds };
