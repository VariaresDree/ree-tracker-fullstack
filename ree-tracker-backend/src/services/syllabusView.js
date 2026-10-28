// The syllabus checklist as the learner sees it: every active TOS topic, in
// board order, with their ticks, dates and note, plus what the app already
// knows about the topic from their answers (for the automatic Drilled tick).
//
// Pure, so the merge is testable without a database. The route gathers the
// four inputs in parallel and hands them here.

'use strict';

const { normalizeSubject, SYLLABUS_SUBJECTS, isAutoDrilled } = require('@ree/shared');
const { resolveInIndex } = require('./topicResolver');
const { effectiveMastery } = require('./masteryView');

const SUBJECT_ORDER = new Map(SYLLABUS_SUBJECTS.map((s, i) => [s, i]));

/**
 * Answers per topic id. Performance rows written since the taxonomy carry
 * topicId; older rows only a topic NAME, matched through the resolver index
 * (canonical names and aliases) within their subject first. Several rows can
 * land on one topic (a renamed label and its new id): attempts add up, and the
 * best stored mastery stands.
 */
function performanceByTopic(performance, index, now = new Date()) {
    const out = new Map();
    for (const p of performance || []) {
        const topicId = p.topicId || resolveInIndex(index, p.subject, p.topic)?.id;
        if (!topicId) continue;
        const prev = out.get(topicId) || { attempts: 0, pMastery: null, masteryEffective: null };
        const mastery = p.pMastery == null ? prev.pMastery : Math.max(prev.pMastery ?? 0, p.pMastery);
        // Each row decays on its own clock before the best is kept.
        const decayed = p.pMastery == null ? null : effectiveMastery(p, now).masteryEffective;
        const effective = decayed == null ? prev.masteryEffective : Math.max(prev.masteryEffective ?? 0, decayed);
        out.set(topicId, { attempts: prev.attempts + (Number(p.attempts) || 0), pMastery: mastery, masteryEffective: effective });
    }
    return out;
}

/**
 * @param {{ topics, progress, performance, index, now? }} input
 *   topics: active Topic rows; progress: the learner's SyllabusProgress rows;
 *   performance: their UserTopicPerformance rows; index: buildResolverIndex(topics)
 * @returns {Array<object>} one row per topic, Mathematics → ESAS → EE, then TOS order
 */
function buildSyllabusRows({ topics, progress, performance, index, now = new Date() }) {
    const ticks = new Map((progress || []).map((p) => [p.topicId, p]));
    const answered = performanceByTopic(performance, index, now);
    return (topics || [])
        .map((t) => ({ ...t, subject: normalizeSubject(t.subject) }))
        .filter((t) => SUBJECT_ORDER.has(t.subject))
        .sort((a, b) => (SUBJECT_ORDER.get(a.subject) - SUBJECT_ORDER.get(b.subject))
            || ((a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            || a.name.localeCompare(b.name))
        .map((t) => {
            const mine = ticks.get(t.id);
            const perf = answered.get(t.id) || { attempts: 0, pMastery: null, masteryEffective: null };
            return {
                topicId: t.id,
                subject: t.subject,
                name: t.name,
                sortOrder: t.sortOrder ?? 0,
                read: !!mine?.read,
                watched: !!mine?.watched,
                drilled: !!mine?.drilled,
                autoDrilled: isAutoDrilled(perf),
                attempts: perf.attempts,
                startedOn: mine?.startedOn ?? null,
                finishedOn: mine?.finishedOn ?? null,
                note: mine?.note ?? null,
                // The learner's own rating, and the decayed mastery it is set against.
                confidence: mine?.confidence ?? null,
                dread: mine?.dread ?? null,
                highYield: !!t.highYield,
                masteryEffective: perf.masteryEffective,
            };
        });
}

module.exports = { buildSyllabusRows, performanceByTopic };
