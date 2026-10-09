// src/components/OfflineStatusBadge.jsx
// Compact connectivity + offline-readiness indicator for the app shell. Shows:
//   • online / offline state,
//   • how many items are cached for offline sessions (and their freshness),
//   • a count of unsynced attempts / deferred writes still waiting to upload,
//   • a one-tap "Download" to (re)build the offline pack.
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflinePack } from '../hooks/useOfflinePack';
import { useStore } from '../store/useStore';
import SyncIssues from './SyncIssues';

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
    const issues = useStore((s) => s.deadLetters?.length || 0);

    const pending = (syncQueue?.length || 0) + (pendingWrites?.length || 0);
    const total = meta?.total || 0;
    const ready = total > 0;

    // The same words for the collapsed rail and the full badge. The rail's state
    // lived only in a hover title, which a screen reader never got.
    const summary = `${isOnline ? 'Online' : 'Offline'} · ${ready ? `${total} questions saved for offline` : 'no offline pack'}${pending ? ` · ${pending} waiting to sync` : ''}${issues ? ` · ${issues} sync issue${issues === 1 ? '' : 's'}` : ''}`;

    if (collapsed) {
        return (
            <div
                title={summary}
                className="w-10 h-10 mx-auto rounded-xl border border-border2 bg-surface2 flex items-center justify-center relative"
            >
                {/* Only the connection is announced as it changes; the counts
                    are there to read, not called out on every answer. */}
                <span className="sr-only" role="status">{isOnline ? 'Online' : 'Offline'}</span>
                <span className="sr-only">{summary.replace(/^(Online|Offline) · /, '')}</span>
                <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-reeGreen' : 'bg-reeAmber'} ${!isOnline ? 'animate-pulse' : ''}`} />
                {pending > 0 && (
                    <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-reeAmber text-[10px] font-bold text-bg flex items-center justify-center">
                        {pending > 99 ? '99+' : pending}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border2 bg-surface2/40 px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" role="status">
                    <span aria-hidden="true" className={`w-2 h-2 rounded-full ${isOnline ? 'bg-reeGreen' : 'bg-reeAmber animate-pulse'}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-textMain">
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                {pending > 0 && (
                    <span className="text-xs font-semibold text-reeAmber-text" title="Answers and changes waiting to upload">
                        {pending} waiting to sync
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted2 truncate">
                    {ready ? `${total} saved for offline · ${relTime(meta?.fetchedAt)}` : 'No offline pack yet'}
                </span>
                <button
                    onClick={refresh}
                    disabled={!isOnline || isRefreshing}
                    title={isOnline ? 'Download / refresh offline questions' : 'Connect to download'}
                    // Measured 64x23px at 360px — below the 44x44 touch minimum.
                    // pointer-coarse only (same pattern as the shared Button
                    // primitive's `icon` size) so this compact status strip
                    // doesn't visually bloat on desktop mouse use, but still
                    // clears the target size on the touch devices this actually
                    // matters for.
                    className={`shrink-0 px-2.5 py-1 pointer-coarse:px-4 pointer-coarse:min-h-11 rounded-lg border text-xs font-semibold transition-all ${
                        !isOnline || isRefreshing
                            ? 'opacity-40 cursor-not-allowed border-border2 text-muted'
                            : 'cursor-pointer border-reeBlue/40 text-reeBlue-text hover:bg-reeBlue/10'
                    }`}
                >
                    {isRefreshing ? 'Syncing…' : ready ? 'Refresh' : 'Download'}
                </button>
            </div>

            <SyncIssues />
        </div>
    );
}
