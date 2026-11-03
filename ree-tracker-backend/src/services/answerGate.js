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

// The question ids of the battles in `rows` that haven't closed.
function openIdsIn(battles, now) {
    const open = new Set();
    for (const battle of battles) {
        if (!battle || battleTiming(battle, now)?.closed) continue;
        const qs = Array.isArray(battle.questions) ? battle.questions : [];
        for (const q of qs) {
            const id = q && typeof q === 'object' ? q.id : q;
            if (id) open.add(id);
        }
    }
    return open;
}

/**
 * Every question id in a battle `userId` is still in (one not yet closed).
 * Pickers that hand out items with their key (Practice's adaptive set) leave
 * these out, so a player can't draw a live battle's question mid-battle.
 * @returns {Promise<Set<string>>}
 */
async function openBattleQuestionIds(userId, now = Date.now()) {
    if (!userId) return new Set();
    const rows = await prisma.battleParticipant.findMany({
        where: { userId, battle: { status: { not: 'COMPLETED' } } },
        select: { battle: { select: { id: true, questions: true, startedAt: true, timeLimitSecs: true, createdAt: true } } },
    });
    return openIdsIn(rows.map((r) => r.battle), now);
}

/** Every question id in any battle still open, for changes that would upset one. */
async function allOpenBattleQuestionIds(now = Date.now()) {
    const battles = await prisma.battle.findMany({
        where: { status: { not: 'COMPLETED' } },
        select: { id: true, questions: true, startedAt: true, timeLimitSecs: true, createdAt: true },
    });
    return openIdsIn(battles, now);
}

/**
 * The ids, out of `questionIds`, whose key `userId` may not see now.
 * @returns {Promise<Set<string>>}
 */
async function lockedQuestionIds(userId, questionIds, now = Date.now()) {
    const wanted = new Set((questionIds || []).filter(Boolean));
    if (!userId || wanted.size === 0) return new Set();
    const open = await openBattleQuestionIds(userId, now);
    return new Set([...wanted].filter((id) => open.has(id)));
}

module.exports = { allOpenBattleQuestionIds, lockedQuestionIds, openBattleQuestionIds };
