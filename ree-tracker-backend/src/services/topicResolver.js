// src/services/topicResolver.js
// Resolution + sync helpers for the Topic taxonomy (Phase 3.3).
//
// The taxonomy is canonical PRC TOS rows in the Topic table; legacy/curriculum
// labels live in each row's `aliases`. Everything that needs to attach a
// subtopic string to a real topic (telemetry rollups, question ingestion, the
// migration backfill) resolves through here, so the matching rules exist in
// exactly one place.
const prisma = require('../config/db');
const { normalizeSubject } = require('../utils/subject');

// Same normalization the client heatmap uses (HeatmapChart normKey) — keep the
// two in lockstep or a label can match on one side and miss on the other.
const normKey = (s) => String(s || '').trim().toLowerCase();

/**
 * Pure: build a subject-scoped lookup index from Topic rows.
 * index[canonicalSubject][key] = topic row, where key is the topic's normKey
 * or any of its alias normKeys. Two passes so a canonical name can never be
 * shadowed by another topic's alias, regardless of row order.
 *
 * @param {Array<{subject, name, normKey?, aliases?, active?}>} rows
 */
function buildResolverIndex(rows) {
    const index = Object.create(null);
    const bucketFor = (t) => {
        const subj = normalizeSubject(t.subject);
        return (index[subj] ||= Object.create(null));
    };
    const live = (rows || []).filter((t) => t && t.active !== false);
    for (const t of live) {
        const k = t.normKey || normKey(t.name);
        if (k) bucketFor(t)[k] = t;
    }
    for (const t of live) {
        const bucket = bucketFor(t);
        for (const alias of t.aliases || []) {
            const k = normKey(alias);
            if (k && !(k in bucket)) bucket[k] = t;
        }
    }
    return index;
}

// TTL cache: telemetry hits the resolver on every attempt batch; the taxonomy
// changes only on admin edits (which invalidate explicitly) or migration.
const TTL_MS = 5 * 60 * 1000;
let cache = { index: null, at: 0 };

async function getResolverIndex() {
    if (cache.index && Date.now() - cache.at < TTL_MS) return cache.index;
    try {
        const rows = await prisma.topic.findMany({ where: { active: true } });
        cache = { index: buildResolverIndex(rows), at: Date.now() };
    } catch {
        // DB hiccup: serve the stale index if we have one; resolution is an
        // enrichment, never worth failing a telemetry write over.
        if (!cache.index) return Object.create(null);
    }
    return cache.index;
}

function invalidateTopicCache() {
    cache = { index: null, at: 0 };
}

/**
 * Pure: resolve a (subject, subtopic-string) pair against a built index.
 * Falls back to a cross-subject scan so an attempt with a mislabeled or
 * 'General' subject still finds its topic when the label is unambiguous.
 */
function resolveInIndex(index, subject, subtopic) {
    const k = normKey(subtopic);
    if (!k) return null;
    const hit = index[normalizeSubject(subject)]?.[k];
    if (hit) return hit;
    for (const bucket of Object.values(index)) {
        if (bucket[k]) return bucket[k];
    }
    return null;
}

// DB-backed resolve through the TTL-cached index.
async function resolveTopic(subject, subtopic) {
    return resolveInIndex(await getResolverIndex(), subject, subtopic);
}

/**
 * Pure: diff the TOS-manager payload ({ subject: [names] }) against existing
 * Topic rows. Per subject present in the payload: names not in the table are
 * created (curated), existing rows are re-ordered/renamed/reactivated to match
 * the list, and rows missing from the list are deactivated (never deleted —
 * questions keep their FK and history stays attributable).
 *
 * @param {Array} existingRows - all Topic rows for the subjects being synced
 * @param {Object} incoming   - { subjectLabel: [topicName, ...] }
 * @returns {{creates: Array, updates: Array, deactivateIds: Array}}
 */
function diffTaxonomySync(existingRows, incoming) {
    const creates = [];
    const updates = [];
    const deactivateIds = [];

    const bySubject = new Map();
    for (const t of existingRows || []) {
        const subj = normalizeSubject(t.subject);
        if (!bySubject.has(subj)) bySubject.set(subj, new Map());
        bySubject.get(subj).set(t.normKey || normKey(t.name), t);
    }

    for (const [subjectLabel, names] of Object.entries(incoming || {})) {
        if (!Array.isArray(names)) continue;
        const subj = normalizeSubject(subjectLabel);
        const existing = bySubject.get(subj) || new Map();
        const seen = new Set();

        const clean = names
            .map((n) => String(n || '').trim().slice(0, 160))
            .filter(Boolean)
            .slice(0, 200);

        clean.forEach((name, i) => {
            const k = normKey(name);
            if (!k || seen.has(k)) return; // ignore dupes within the payload
            seen.add(k);
            const row = existing.get(k);
            if (!row) {
                creates.push({ subject: subj, name, normKey: k, sortOrder: i, curated: true });
            } else if (row.name !== name || row.sortOrder !== i || row.active === false) {
                updates.push({ id: row.id, name, sortOrder: i, active: true });
            }
        });

        for (const [k, row] of existing) {
            if (!seen.has(k) && row.active !== false) deactivateIds.push(row.id);
        }
    }

    return { creates, updates, deactivateIds };
}

module.exports = { normKey, buildResolverIndex, resolveInIndex, resolveTopic, invalidateTopicCache, diffTaxonomySync };
