// src/hooks/useReferenceData.js
// Single source of truth for the reference library shown in the Materials Hub.
// Merges the bundled offline SEED (EE_CONSTANTS + OFFLINE_FORMULAS) with
// admin-managed DB rows, deduped by natural key (DB wins). The DB fetch is
// cached to IndexedDB (see dbQueries), so admin additions still render offline.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { EE_CONSTANTS } from '../config/knowledgeBase';
import { OFFLINE_FORMULAS } from '../config/formulaSeed';
import { canonicalizeTopicLabels } from '../config/legacyTopicAliases';
import { fetchConstants, fetchFormulas } from '../services/dbQueries';

const constKey = (c) => `${(c.category || '').trim().toLowerCase()}|||${(c.name || '').trim().toLowerCase()}`;
const formulaKey = (f) => `${(f.subject || '').trim().toLowerCase()}|||${(f.title || '').trim().toLowerCase()}`;

// Bundled seed flattened to the shared shape (a `subject` on every formula, and
// a `_seed` marker so the admin UI can show what's read-only baseline vs DB).
// Subtopic tags are canonicalized to PRC TOS names so the Reference Hub's
// topic filter (fed by the Topic taxonomy since Phase 3.3) still matches
// formulas tagged with pre-migration curriculum labels.
const bundledConstants = EE_CONSTANTS.map((c) => ({ ...c, _seed: true }));
const bundledFormulas = Object.entries(OFFLINE_FORMULAS).flatMap(([subject, arr]) =>
    arr.map((f) => ({ ...f, subject, subtopics: canonicalizeTopicLabels(f.subtopics), _seed: true })),
);

export function useReferenceData() {
    const [dbConstants, setDbConstants] = useState([]);
    const [dbFormulas, setDbFormulas] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [c, f] = await Promise.all([fetchConstants(), fetchFormulas()]);
            setDbConstants(Array.isArray(c) ? c : []);
            setDbFormulas(Array.isArray(f) ? f : []);
        } catch {
            // Offline with no cache yet, or transient error — bundled seed still shows.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const mergedConstants = useMemo(() => {
        const keys = new Set(dbConstants.map(constKey));
        return [
            ...dbConstants.map((c) => ({ ...c, _seed: false })),
            ...bundledConstants.filter((c) => !keys.has(constKey(c))),
        ];
    }, [dbConstants]);

    const mergedFormulas = useMemo(() => {
        const keys = new Set(dbFormulas.map(formulaKey));
        return [
            ...dbFormulas.map((f) => ({ ...f, _seed: false, subtopics: canonicalizeTopicLabels(f.subtopics) })),
            ...bundledFormulas.filter((f) => !keys.has(formulaKey(f))),
        ];
    }, [dbFormulas]);

    return {
        loading,
        reload,
        dbConstants,
        dbFormulas,
        mergedConstants,
        mergedFormulas,
        bundledConstants,
        bundledFormulas,
    };
}
