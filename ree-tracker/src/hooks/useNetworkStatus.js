// src/hooks/useNetworkStatus.js
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useNetworkStatus() {
    // Initialize with the current browser state
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const flushQueueToCloud = useStore((s) => s.flushQueueToCloud);
    const flushPendingWrites = useStore((s) => s.flushPendingWrites);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Drain per-attempt telemetry AND deferred session summaries / offline
            // mock-exam batches the moment connectivity returns.
            flushQueueToCloud();
            flushPendingWrites();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [flushQueueToCloud, flushPendingWrites]);

    return isOnline;
}