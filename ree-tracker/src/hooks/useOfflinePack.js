// src/hooks/useOfflinePack.js
// Keeps the on-device question pack fresh and exposes its state to the UI. On
// mount (when online) it silently builds/refreshes the pack if it's missing or
// stale, so a user who later goes offline already has questions cached. Also
// exposes a manual refresh for the "Download" control in the status badge.
import { useState, useEffect, useCallback, useRef } from 'react';
import { refreshOfflinePack } from '../services/dbQueries';
import { getOfflinePackMeta } from '../services/offlinePack';

export function useOfflinePack() {
    const [meta, setMeta] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const didAutoBuild = useRef(false);

    const reloadMeta = useCallback(async () => {
        setMeta(await getOfflinePackMeta());
    }, []);

    const refresh = useCallback(async () => {
        if (!navigator.onLine || isRefreshing) return;
        setIsRefreshing(true);
        try {
            setMeta(await refreshOfflinePack());
        } catch {
            await reloadMeta();
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, reloadMeta]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const m = await getOfflinePackMeta();
            if (cancelled) return;
            setMeta(m);
            // Auto-build once per mount when online and the pack is empty/stale.
            if (!didAutoBuild.current && navigator.onLine && (!m.exists || m.stale)) {
                didAutoBuild.current = true;
                refresh();
            }
        })();
        return () => { cancelled = true; };
    }, [refresh]);

    return { meta, isRefreshing, refresh, reloadMeta };
}
