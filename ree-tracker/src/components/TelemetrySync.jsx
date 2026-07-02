// src/components/TelemetrySync.jsx
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { StatusPill } from './ui';
import { RefreshCw } from './ui/icons';

export default function TelemetrySync() {
    const syncStatus = useStore((state) => state.syncStatus);
    const syncQueue = useStore((state) => state.syncQueue);
    const flushQueueToCloud = useStore((state) => state.flushQueueToCloud);
    const stats = useStore((state) => state.stats);
    const isOnline = useNetworkStatus();

    // Safety-net flush every 15s. The queue length is read via getState()
    // inside the tick — putting `syncQueue` in the dep array tore the
    // interval down and recreated it on every recorded answer.
    useEffect(() => {
        const syncInterval = setInterval(() => {
            if (isOnline && useStore.getState().syncQueue.length > 0) {
                flushQueueToCloud();
            }
        }, 15000);

        return () => clearInterval(syncInterval);
    }, [isOnline, flushQueueToCloud]);

    // Emergency Flush Hook: Triggers immediately if connectivity shifts from offline to online
    useEffect(() => {
        if (isOnline && syncQueue.length > 0) {
            flushQueueToCloud();
        }
    }, [isOnline]);

    const formatTime = (ts) => {
        if (!ts) return 'Awaiting initial telemetry trace...';
        return new Date(ts).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-reeBlue/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex flex-col relative z-10">
                <span className="text-sm font-semibold text-textMain flex items-center gap-2 mb-1">
                    <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-signal)]" />
                    Sync
                </span>
                <span className="text-[11px] text-muted2 font-mono mt-1">
                    {!isOnline
                        ? `Offline — ${syncQueue.length} answer${syncQueue.length === 1 ? '' : 's'} waiting to sync`
                        : `Last backed up: ${formatTime(stats?.cloudTimestamp)}`}
                </span>
            </div>

            <span role="status" aria-live="polite" className="relative z-10">
                {!isOnline ? (
                    <StatusPill tone="danger">Offline — changes saved locally</StatusPill>
                ) : syncStatus === 'syncing' ? (
                    <StatusPill tone="amber">Syncing…</StatusPill>
                ) : syncQueue.length > 0 ? (
                    <StatusPill tone="amber">Waiting to sync ({syncQueue.length})</StatusPill>
                ) : (
                    <StatusPill tone="success">Backed up</StatusPill>
                )}
            </span>
        </div>
    );
}