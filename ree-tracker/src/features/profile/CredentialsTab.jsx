// src/features/profile/CredentialsTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { generateCertificate } from '../../utils/certificateEngine';
import { fetchReadinessScore } from '../../services/dbQueries';

export default function CredentialsTab({ currentUser, stats }) {
  const currentTheta = stats?.irt?.theta || 0;
  // Certificate unlock uses the SAME composite readiness the Dashboard KPI
  // shows (/api/readiness: coverage + accuracy + θ + consistency + blind
  // spots). The old pure-θ formula here could disagree with the dashboard —
  // it remains only as the offline fallback until the fetch resolves.
  const [readiness, setReadiness] = useState(null);
  useEffect(() => {
    fetchReadinessScore().then((r) => { if (r) setReadiness(r); }).catch(() => {});
  }, []);
  const thetaFallback = useMemo(() => Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100))), [currentTheta]);
  const readinessScore = readiness?.score ?? thetaFallback;

  const handleIssueCertificate = () => {
    if (readinessScore < 70) {
        toast.error("Access Denied: Required Readiness Score is 70%.");
        return;
    }
    toast.loading("Generating Secure Certificate...", { duration: 1500 });
    setTimeout(() => generateCertificate(currentUser, readinessScore), 1500);
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="p-8 bg-surface border border-border2 rounded-xl shadow-xl flex flex-col sm:flex-row gap-8 items-center sm:items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-reePurple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className={`w-32 h-32 shrink-0 rounded-2xl flex items-center justify-center text-5xl shadow-inner border-4 relative z-10 ${readinessScore >= 70 ? 'bg-reePurple/20 border-reePurple text-reePurple shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'bg-surface2 border-border2 text-muted grayscale'}`}>
                📜
            </div>
            
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left relative z-10">
                <div className="text-[11px] text-reePurple font-bold uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-2">
                    {readinessScore >= 70 ? <><span className="w-2 h-2 bg-reePurple rounded-full animate-pulse"></span> Unlocked</> : <><span className="w-2 h-2 bg-reeRed rounded-full"></span> Locked (Requires 70% Readiness)</>}
                </div>
                <h3 className="text-2xl font-black text-textMain tracking-tight mb-2">Certificate of Operational Readiness</h3>
                <p className="text-sm text-muted2 leading-relaxed mb-6">
                    An officially formatted, verifiable digital document confirming your statistical probability of passing the actual licensure examination based on deep telemetry.
                </p>
                
                <button
                    onClick={handleIssueCertificate}
                    disabled={readinessScore < 70}
                    className={`py-3 px-8 rounded-[var(--radius-default)] text-xs font-bold uppercase tracking-wider transition-all self-center sm:self-start shadow-md cursor-pointer ${readinessScore >= 70 ? 'bg-[var(--accent)] hover:brightness-110 text-white elevate-glow' : 'bg-surface2 text-muted border border-border2 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    {readinessScore >= 70 ? 'Download certificate (PDF)' : 'Requires 70% readiness'}
                </button>
            </div>
        </div>
    </div>
  );
}