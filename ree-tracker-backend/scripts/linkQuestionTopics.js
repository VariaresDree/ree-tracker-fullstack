#!/usr/bin/env node
/*
 * Link untagged questions (Question.topicId IS NULL) to EXISTING Topic rows.
 *
 * Usage:
 *   node scripts/linkQuestionTopics.js          # dry run: report only, no writes
 *   node scripts/linkQuestionTopics.js --apply  # write
 *
 * Why: most of the bank predates the Topic table (questions from 2026-06-17 to
 * 07-18; the TOS editor created topics from 07-18), and the Library's AI
 * ingestion later offered a stale hardcoded topic list. Untagged questions
 * still count in analytics by name, but topic-targeted Smart Drill and CAT
 * draw only tagged items, so they never get served there.
 *
 * Rules:
 *   - Exact normKey / alias match WITHIN the question's canonical subject
 *     ('Math' → 'Mathematics'), through topicResolver's buildResolverIndex /
 *     resolveInIndex. No cross-subject fallback, active topics only.
 *   - NEVER creates a topic. Labels that match nothing are reported; an admin
 *     re-tags those questions (Library → vault edit) or adds the topic in the
 *     TOS manager, then re-runs this.
 *   - A linked question's subtopic is rewritten to the topic's canonical name,
 *     as createLiveQuestion does for new questions. The report lists every such
 *     rewrite (production on 2026-10-03 had none: all labels matched exactly).
 *
 * Idempotent: only rows still at topicId NULL are touched, so a re-run links
 * nothing it already linked. Historical QuestionAttempt rows are not rewritten;
 * analytics attribute through the Question→Topic join.
 *
 * NOTE for ops: after --apply, run `npm run backfill:mastery` so
 * UserTopicPerformance.topicId follows the newly linked questions.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { buildResolverIndex, resolveInIndex } = require('../src/services/topicResolver');

function parseArgs(argv) {
    return { apply: argv.slice(2).includes('--apply') };
}

/**
 * Pure: split distinct untagged (subject, subtopic, count) groups into links to
 * existing topics and unmatched labels (largest first).
 */
function planTopicLinks(index, groups) {
    const links = [];
    const unmatched = [];
    for (const g of groups) {
        const topic = resolveInIndex(index, g.subject, g.subtopic, { crossSubject: false });
        if (topic) {
            links.push({ ...g, topicId: topic.id, topicName: topic.name, renamed: topic.name !== g.subtopic });
        } else {
            unmatched.push(g);
        }
    }
    unmatched.sort((a, b) => b.count - a.count);
    return { links, unmatched };
}

const sum = (rows) => rows.reduce((s, r) => s + r.count, 0);

async function main() {
    const { apply } = parseArgs(process.argv);
    const t0 = Date.now();
    console.log(`[linkQuestionTopics] start  mode=${apply ? 'APPLY' : 'dry-run'}`);

    const topics = await prisma.topic.findMany({ where: { active: true } });
    const index = buildResolverIndex(topics);

    // Raw stored subject spellings, so each updateMany WHERE hits exactly the
    // rows of its group.
    const groups = (await prisma.question.groupBy({
        by: ['subject', 'subtopic'],
        where: { topicId: null },
        _count: { id: true },
    })).map((g) => ({ subject: g.subject, subtopic: g.subtopic, count: g._count.id }));

    const { links, unmatched } = planTopicLinks(index, groups);
    const renames = links.filter((l) => l.renamed);

    console.log(`[linkQuestionTopics] ${topics.length} active topic(s); ${sum(groups)} untagged question(s) in ${groups.length} label group(s)`);
    console.log(`[linkQuestionTopics] link: ${sum(links)} question(s) across ${links.length} group(s) to existing topics`);
    for (const l of links) {
        console.log(`  + [${l.subject}] "${l.subtopic}" -> ${l.topicId}${l.renamed ? ` (label becomes "${l.topicName}")` : ''}  ${l.count} question(s)`);
    }
    if (renames.length) {
        console.log(`[linkQuestionTopics] ${renames.length} group(s) get the canonical topic name as their label`);
    }
    if (unmatched.length) {
        console.warn(`[linkQuestionTopics] UNMATCHED: ${sum(unmatched)} question(s) in ${unmatched.length} group(s) match no existing topic and stay untagged (no topic is created):`);
        for (const g of unmatched) console.warn(`  ! [${g.subject}] "${g.subtopic}"  ${g.count} question(s)`);
    }

    if (!apply) {
        console.log('[linkQuestionTopics] dry run — nothing written. Re-run with --apply, then `npm run backfill:mastery`.');
    } else if (links.length) {
        const results = await prisma.$transaction(links.map((l) => prisma.question.updateMany({
            where: { subject: l.subject, subtopic: l.subtopic, topicId: null },
            data: { topicId: l.topicId, subtopic: l.topicName },
        })));
        const written = results.reduce((s, r) => s + r.count, 0);
        console.log(`[linkQuestionTopics] linked ${written} question(s). Next: \`npm run backfill:mastery\` so UserTopicPerformance.topicId follows.`);
    } else {
        console.log('[linkQuestionTopics] nothing to link.');
    }

    console.log(`[linkQuestionTopics] done in ${Date.now() - t0}ms`);
}

// Pure planner exported for unit tests; only auto-run when invoked directly.
module.exports = { planTopicLinks, parseArgs };

if (require.main === module) {
    main()
        .catch((err) => {
            console.error('[linkQuestionTopics] failed', err);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
