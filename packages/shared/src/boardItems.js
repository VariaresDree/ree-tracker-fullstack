// How many of a paper's 100 items PRC gives each topic, from its table of
// specifications for the REE board (file "2024-40 Annex A"; 25/30/45 by subject).
//
// PRC counts some topics together, so a count belongs to a group. PRC doesn't
// itemize every topic the app keeps. Four of those are placed with the nearest
// group, which is our call and not PRC's: Plane and Solid Geometry with Analytic
// Geometry, Engineering Mechanics with Physics, Electrical Transient Analysis
// with Electric Circuits 1, Power System Protection with Power System Analysis.
// The rest (`UNITEMIZED`) have no count.
//
// This is the default. Admin › Syllabus can replace it (SystemConfig.boardBlueprint,
// by topic id), because PRC changes its table. The functions below take the
// groups to use, as `resolveBlueprint` gives them, and fall back to this table.

'use strict';

const BOARD_GROUPS = Object.freeze({
    Mathematics: [
        { items: 5, topics: ['Algebra', 'Complex Numbers'] },
        { items: 5, topics: ['Trigonometry'] },
        { items: 5, topics: ['Analytic Geometry', 'Plane Geometry', 'Solid Geometry'] },
        { items: 5, topics: ['Probability & Statistics'] },
        { items: 15, topics: ['Calculus 1'] },
        { items: 15, topics: ['Calculus 2'] },
        { items: 20, topics: ['Engineering Data Analytics'] },
        { items: 15, topics: ['Differential Equations'] },
        { items: 15, topics: ['Numerical Methods & Analysis'] },
    ],
    ESAS: [
        { items: 5, topics: ['Chemistry for Engineers'] },
        { items: 15, topics: ['Physics for Engineers', 'Engineering Mechanics'] },
        { items: 15, topics: ['Computer Programming', 'Microprocessor Systems and Logic Circuits'] },
        { items: 5, topics: ['Material Science', 'Environmental Science & Engineering'] },
        { items: 5, topics: ['Fluid Mechanics'] },
        { items: 5, topics: ['Fundamentals of Deformable Bodies'] },
        { items: 5, topics: ['Basic Thermodynamics'] },
        { items: 20, topics: ['EE Laws, Codes, & Professional Ethics', 'Basic Occupational Safety & Health', 'Electrical Standards & Practices'] },
        { items: 15, topics: ['Engineering Economics'] },
        { items: 10, topics: ['Technopreneurship & Project Management'] },
    ],
    EE: [
        { items: 10, topics: ['Electromagnetism'] },
        { items: 10, topics: ['Electric Circuits 1', 'Electrical Transient Analysis'] },
        { items: 10, topics: ['Electric Circuits 2'] },
        { items: 5, topics: ['Fundamentals of Electronic Communications', 'Electronics 1 and 2'] },
        { items: 5, topics: ['Electrical Apparatus & Devices', 'Industrial Electronics'] },
        { items: 5, topics: ['Electrical Machinery 1'] },
        { items: 10, topics: ['Electrical Machinery 2'] },
        { items: 10, topics: ['Instrumentation & Control', 'Feedback Control Systems'] },
        { items: 10, topics: ['Electrical System & Illumination Design'] },
        { items: 5, topics: ['Power Plant Engineering', 'Distribution Systems & Substation Design'] },
        { items: 20, topics: ['Power System Analysis', 'Power System Protection'] },
    ],
});

const UNITEMIZED = Object.freeze({
    Mathematics: ['Advanced Engineering Mathematics', 'Math in the Modern World', 'Vector Analysis'],
    ESAS: ['Quantities/units/constants (ESAS)', 'Research Methods'],
    EE: ['Quantities/units/constants (EE)'],
});

/**
 * A topic's board count, or null when PRC doesn't itemize it.
 * @returns {{ items: number, sharedWith: string[] } | null} sharedWith: the other topics in its count
 */
function boardItemsFor(subject, topicName, blueprint) {
    const group = ((blueprint || BOARD_GROUPS)[subject] || []).find((g) => g.topics.includes(topicName));
    if (!group) return null;
    return { items: group.items, sharedWith: group.topics.filter((t) => t !== topicName) };
}

/** `count` items across the subject's groups, in proportion, always summing to `count`. */
function boardItemSplit(subject, count, blueprint) {
    const groups = (blueprint || BOARD_GROUPS)[subject] || [];
    const total = groups.reduce((sum, g) => sum + g.items, 0);
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (total === 0) return [];
    const exact = groups.map((g) => (n * g.items) / total);
    const out = exact.map(Math.floor);
    let left = n - out.reduce((a, b) => a + b, 0);
    exact
        .map((x, i) => ({ i, rest: x - Math.floor(x), items: groups[i].items }))
        .sort((a, b) => (b.rest - a.rest) || (b.items - a.items) || (a.i - b.i))
        .forEach(({ i }) => { if (left > 0) { out[i] += 1; left -= 1; } });
    return out;
}

/**
 * A subject's paper by PRC's topic counts. Each group draws its share from its
 * own topics; whatever a thin group can't supply, and any shortfall, comes from
 * the rest of the pool, so a paper stays full however the bank stands. Topics
 * with no count only ever fill.
 *
 * @param {Array<{ subtopic?: string }>} pool
 * @param {(list: Array, n: number) => Array} pick the caller's own sampling, seeded or not
 * @param {Record<string, Array<{ items: number, topics: string[] }>>} [blueprint] the groups to use
 */
function boardWeightedPick(pool, subject, count, pick, blueprint) {
    const groups = (blueprint || BOARD_GROUPS)[subject];
    if (!groups) return pick(pool, count);
    const split = boardItemSplit(subject, count, blueprint);
    const taken = new Set();
    groups.forEach((group, i) => {
        if (!(split[i] > 0)) return; // no share, or every count in the subject at 0
        const names = new Set(group.topics);
        for (const q of pick(pool.filter((item) => names.has(item?.subtopic)), split[i])) taken.add(q);
    });
    const short = count - taken.size;
    if (short > 0) {
        for (const q of pick(pool.filter((item) => !taken.has(item)), short)) taken.add(q);
    }
    return [...taken];
}

/**
 * The saved blueprint (or PRC's table, when `stored` is null) against today's
 * topics. Stored by topic id, so a rename follows; a retired topic drops out, and
 * a group left with no topics goes with it. A topic in no group has no count.
 *
 * @param {Record<string, Array<{ items: number, topicIds: string[] }>> | null} stored
 * @param {Array<{ id: string, subject: string, name: string }>} topics the active topics
 * @returns {{ custom: boolean, groups: object, unitemized: object }}
 */
function resolveBlueprint(stored, topics) {
    const groups = {};
    const unitemized = {};
    for (const subject of Object.keys(BOARD_GROUPS)) {
        const own = (topics || []).filter((t) => t.subject === subject);
        const byId = new Map(own.map((t) => [t.id, t]));
        const byName = new Map(own.map((t) => [t.name, t]));
        const rows = stored
            ? (stored[subject] || []).map((g) => ({ items: g.items, topics: g.topicIds.map((id) => byId.get(id)) }))
            : BOARD_GROUPS[subject].map((g) => ({ items: g.items, topics: g.topics.map((name) => byName.get(name)) }));
        const kept = rows.map((g) => ({ items: g.items, topics: g.topics.filter(Boolean) })).filter((g) => g.topics.length > 0);
        groups[subject] = kept.map((g) => ({ items: g.items, topics: g.topics.map((t) => t.name), topicIds: g.topics.map((t) => t.id) }));
        const counted = new Set(kept.flatMap((g) => g.topics.map((t) => t.id)));
        unitemized[subject] = own.filter((t) => !counted.has(t.id)).map((t) => ({ id: t.id, name: t.name }));
    }
    return { custom: !!stored, groups, unitemized };
}

/** Why a blueprint can't be saved against today's topics, in a sentence, or null. */
function blueprintError(stored, topics) {
    const byId = new Map((topics || []).map((t) => [t.id, t]));
    const seen = new Set();
    for (const [subject, list] of Object.entries(stored || {})) {
        for (const group of list) {
            for (const id of group.topicIds) {
                const topic = byId.get(id);
                if (!topic) return 'A topic in this setup has been retired. Reload and try again.';
                if (topic.subject !== subject) return `${topic.name} belongs to ${topic.subject}, not ${subject}.`;
                if (seen.has(id)) return `${topic.name} is counted twice.`;
                seen.add(id);
            }
        }
    }
    return null;
}

/** A learner's own counts, { subject: { topic: n } }, as groups: one per topic with a count. */
function ownBlueprint(counts) {
    return Object.fromEntries(Object.keys(BOARD_GROUPS).map((subject) => [
        subject,
        Object.entries(counts?.[subject] || {}).filter(([, n]) => n > 0).map(([topic, items]) => ({ items, topics: [topic] })),
    ]));
}

/** The board's groups as a starting point for a learner's own: a shared count split evenly. */
function ownCountsFromBoard(blueprint) {
    return Object.fromEntries(Object.entries(blueprint || BOARD_GROUPS).map(([subject, groups]) => {
        const counts = {};
        for (const g of groups) {
            g.topics.forEach((topic, i) => { counts[topic] = Math.floor(g.items / g.topics.length) + (i < g.items % g.topics.length ? 1 : 0); });
        }
        return [subject, counts];
    }));
}

module.exports = { BOARD_GROUPS, UNITEMIZED, boardItemsFor, boardItemSplit, boardWeightedPick, resolveBlueprint, blueprintError, ownBlueprint, ownCountsFromBoard };
