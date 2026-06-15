// src/components/TelemetrySync.jsx
import React from 'react';
import { useStore } from '../store/useStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function TelemetrySync() {
    const { syncStatus, stats } = useStore();
    const isOnline = useNetworkStatus();

    const formatTime = (ts) => {
        if (!ts) return 'Pending...';
        return new Date(ts).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    };

    return (
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-reeBlue/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex flex-col relative z-10">
                <span className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-reeBlue"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                    Autonomous Sync Engine
                </span>
                <span className="text-[0.65rem] text-muted2 font-mono uppercase tracking-widest mt-1">
                    {!isOnline ? 'Offline Storage Mode Active' : `Last Cloud Sync: ${formatTime(stats?.cloudTimestamp)}`}
                </span>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-xs uppercase tracking-wider transition-colors relative z-10 ${
                !isOnline ? 'bg-reeRed/10 border-reeRed/30 text-reeRed' : 
                syncStatus === 'syncing' ? 'bg-reeAmber/10 border-reeAmber/30 text-reeAmber animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 
                syncStatus === 'error' ? 'bg-reeRed/10 border-reeRed/30 text-reeRed' : 
                'bg-reeGreen/10 border-reeGreen/30 text-reeGreen shadow-[0_0_15px_rgba(34,197,94,0.05)]'
            }`}>
                {!isOnline ? (
                    <><span>🔴</span> Disconnected</>
                ) : syncStatus === 'syncing' ? (
                    <><span className="telemetry-spinner !w-3 !h-3 border-reeAmber border-t-transparent"></span> Syncing...</>
                ) : syncStatus === 'error' ? (
                    <><span>⚠️</span> Sync Error</>
                ) : (
                    <><span>🟢</span> Systems Synced</>
                )}
            </div>
        </div>
    );
}