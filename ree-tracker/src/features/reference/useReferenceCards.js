// src/features/reference/useReferenceCards.js
// Data source for the reference flashcard vault. LIVE cards come from
// /api/reference-cards and are mirrored to IndexedDB by fetchReferenceCards
// (dbQueries), so after one online fetch the vault renders offline; the
// [OFFLINE] sentinel path serves the cache transparently. Sources ride along
// for the card-back citation line. Admin surfaces (pending queue, debt) fetch
// separately in ReferenceAdminV2 — they are online-only by design.
import { useState, useEffect, useCallback } from 'react';
import { fetchReferenceCards, fetchReferenceSources } from '../../services/dbQueries';

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
        // Serves the IDB cache transparently when offline; an offline user with
        // no cache yet gets [] (the tab renders its empty state).
        fetchReferenceCards()
            .then((items) => { if (!ignore) { setCards(Array.isArray(items) ? items : []); setLoadError(false); } })
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
