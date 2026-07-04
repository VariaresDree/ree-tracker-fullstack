// src/components/OfflineStatusBadge.jsx
// Compact connectivity + offline-readiness indicator for the app shell. Shows:
//   • online / offline state,
//   • how many items are cached for offline sessions (and their freshness),
//   • a count of unsynced attempts / deferred writes still waiting to upload,
//   • a one-tap "Download" to (re)build the offline pack.
import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflinePack } from '../hooks/useOfflinePack';
import { useStore } from '../store/useStore';

const relTime = (ts) => {
    if (!ts) return 'never';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export default function OfflineStatusBadge({ collapsed = false }) {
    const isOnline = useNetworkStatus();
    const { meta, isRefreshing, refresh } = useOfflinePack();
    const syncQueue = useStore((s) => s.syncQueue);
    const pendingWrites = useStore((s) => s.pendingWrites);

    const pending = (syncQueue?.length || 0) + (pendingWrites?.length || 0);
    const total = meta?.total || 0;
    const ready = total > 0;

    if (collapsed) {
        return (
            <div
                title={`${isOnline ? 'Online' : 'Offline'} · ${ready ? `${total} cached` : 'no offline pack'}${pending ? ` · ${pending} pending` : ''}`}
                className="w-10 h-10 mx-auto rounded-xl border border-border2 bg-surface2 flex items-center justify-center relative"
            >
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-reeGreen' : 'bg-reeAmber'} ${!isOnline ? 'animate-pulse' : ''}`} />
                {pending > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-reeAmber text-[9px] font-black text-bg flex items-center justify-center">
                        {pending > 99 ? '99+' : pending}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border2 bg-surface2/40 px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-reeGreen' : 'bg-reeAmber animate-pulse'}`} />
                    <span className="text-[0.65rem] font-black uppercase tracking-widest text-textMain">
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                {pending > 0 && (
                    <span className="text-[0.6rem] font-bold text-reeAmber uppercase tracking-wider" title="Attempts / summaries waiting to upload">
                        {pending} pending
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-[0.6rem] font-medium text-muted2 truncate">
                    {ready ? `${total} items cached · ${relTime(meta?.fetchedAt)}` : 'No offline pack yet'}
                </span>
                <button
                    onClick={refresh}
                    disabled={!isOnline || isRefreshing}
                    title={isOnline ? 'Download / refresh offline questions' : 'Connect to download'}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-[0.55rem] font-black uppercase tracking-wider transition-all ${
                        !isOnline || isRefreshing
                            ? 'opacity-40 cursor-not-allowed border-border2 text-muted'
                            : 'cursor-pointer border-reeBlue/40 text-reeBlue hover:bg-reeBlue/10'
                    }`}
                >
                    {isRefreshing ? 'Syncing…' : ready ? 'Refresh' : 'Download'}
                </button>
            </div>
        </div>
    );
}
