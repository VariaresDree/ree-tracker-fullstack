// src/features/reference/useReferenceCards.js
// Data source for the reference flashcard vault. LIVE cards come from
// /api/reference-cards and are mirrored to IndexedDB by fetchReferenceCards
// (dbQueries), so after one online fetch the vault renders offline; the
// [OFFLINE] sentinel path serves the cache transparently. Sources ride along
// for the card-back citation line. Admin surfaces (pending queue, debt) fetch
// separately in ReferenceAdminV2 — they are online-only by design.
//
// 2026-11-18: the copy kept on this device shows at once, and the server's
// replaces it when it lands. The tab used to wait for the server on every first
// open, which on a sleeping free-tier server meant a long spinner on a phone.
import { useState, useEffect, useCallback } from 'react';
import { fetchReferenceCards, fetchReferenceSources } from '../../services/dbQueries';
import { getReferenceCardsCache } from '../../services/offlinePack';

// Formula cards are formulas and constants. The server no longer sends concept
// cards, but a copy cached on this device before that change may hold some.
export const LEARNER_KINDS = ['formula', 'constant'];
export const learnerCards = (items) => (Array.isArray(items) ? items.filter((c) => LEARNER_KINDS.includes(c?.kind)) : []);

export function useReferenceCards() {
    const [cards, setCards] = useState([]);
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [tick, setTick] = useState(0);

    // Manual retry — event-handler context, so the loading flip is legit here;
    // the effect below re-runs off the tick and only sets state in callbacks.
    const reload = useCallback(() => {
        setLoading(true);
        setLoadError(false);
        setTick((t) => t + 1);
    }, []);

    useEffect(() => {
        let ignore = false;
        let landed = false;
        if (tick === 0) {
            getReferenceCardsCache()
                .then((kept) => {
                    if (ignore || landed || !kept?.items?.length) return;
                    setCards(learnerCards(kept.items));
                    setLoading(false);
                })
                .catch(() => {});
        }
        // Serves the IDB cache transparently when offline; an offline user with
        // no cache yet gets [] (the tab renders its empty state).
        // Try again reads the server again; a remount (a tab switch) uses the kept read.
        fetchReferenceCards({ fresh: tick > 0 })
            .then((items) => { landed = true; if (!ignore) { setCards(learnerCards(items)); setLoadError(false); } })
            .catch(() => { if (!ignore) setLoadError(true); }) // online but failed — keep what we had
            .finally(() => { if (!ignore) setLoading(false); });
        // Sources are decorative (citation line) — fine without them offline.
        fetchReferenceSources()
            .then((s) => { if (!ignore) setSources(s); })
            .catch(() => {});
        return () => { ignore = true; };
    }, [tick]);

    return { cards, sources, loading, loadError, reload };
}
