// src/features/board-simulator/SimulatorDiagnostics.jsx
import React from 'react';

export default function SimulatorDiagnostics({ session, formatTime, setCurrentIndex }) {
  const { diagnostics, battleId } = session;
  if (!diagnostics) return null;

  // UI Safety: Map the raw verdict string to a UI color if the backend didn't provide one
  const safeVerdictColor = diagnostics.verdictColor || (
      diagnostics.verdict === 'PASSED' ? 'text-reeGreen' :
      diagnostics.verdict === 'CONDITIONAL PASS' ? 'text-reeAmber' :
      'text-reeRed'
  );

  return (
    <div className="flex flex-col gap-6 mb-4 animate-in fade-in pt-4">
      
      {/* Hero Banner */}
      <div className="p-8 bg-surface border border-border2 rounded-2xl text-center shadow-2xl relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${safeVerdictColor.replace('text-', 'bg-')}`}></div>
        <div className="text-[0.65rem] font-black uppercase tracking-widest text-muted mb-2">Terminal Diagnostics Report</div>
        <div className={`text-7xl font-black mb-2 tracking-tighter ${safeVerdictColor}`}>{diagnostics.overallScore || 0}%</div>
        <div className={`text-xl font-black tracking-widest mb-8 uppercase ${safeVerdictColor}`}>{diagnostics.verdict || 'FAILED'}</div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <div className="bg-bg border border-border2 px-5 py-3 rounded-xl flex flex-col items-center min-w-[120px]">
            <span className="text-[0.6rem] uppercase tracking-widest font-bold text-muted mb-1">Hit Rate</span>
            <span className="font-mono text-lg font-black text-textMain">{diagnostics.correctCount || 0} / {diagnostics.totalCount || 0}</span>
          </div>
          <div className="bg-bg border border-border2 px-5 py-3 rounded-xl flex flex-col items-center min-w-[120px]">
            <span className="text-[0.6rem] uppercase tracking-widest font-bold text-muted mb-1">Time Used</span>
            <span className="font-mono text-lg font-black text-textMain">{formatTime(diagnostics.timeTaken || 0)}</span>
          </div>
        </div>
      </div>

      {/* Subject Breakdown (For Blended Mocks) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(diagnostics.subjTracker || {}).map(([subject, data]) => {
              if (!data || data.total === 0) return null;
              const acc = Math.round((data.correct / data.total) * 100);
              return (
                  <div key={subject} className="p-5 bg-surface border border-border2 rounded-xl flex flex-col items-center text-center shadow-sm">
                      <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest mb-2">{subject}</span>
                      <span className={`text-3xl font-black ${acc >= 70 ? 'text-reeGreen' : acc >= 50 ? 'text-reeAmber' : 'text-reeRed'}`}>{acc}%</span>
                      <span className="text-[0.65rem] text-muted2 font-mono mt-1">{data.correct} / {data.total}</span>
                  </div>
              );
          })}
      </div>

      {/* Tactical Matrices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="p-6 bg-surface border border-reeAmber/30 rounded-xl shadow-sm">
          <h4 className="text-[0.65rem] font-bold text-reeAmber uppercase tracking-widest mb-2 flex items-center gap-2">
            <span>⏱️</span> Chrono-Anomalies ({diagnostics.timeSinks?.length || 0})
          </h4>
          <p className="text-xs text-muted2 mb-4 leading-relaxed">Items that consumed over 3 minutes of resolution time.</p>
          <div className="flex flex-wrap gap-2">
            {!diagnostics.timeSinks || diagnostics.timeSinks.length === 0 ? <span className="text-xs font-mono text-muted">Optimal velocity maintained.</span> :
              diagnostics.timeSinks.map(ts => (
                <button key={ts.idx} onClick={() => setCurrentIndex(ts.idx)} className="px-3 py-1.5 bg-bg border border-reeAmber/30 text-reeAmber rounded-md text-xs font-bold font-mono hover:bg-reeAmber/10 cursor-pointer transition-colors shadow-sm">
                  Item {ts.idx + 1} <span className="opacity-60 ml-1">({formatTime(ts.time)})</span>
                </button>
              ))}
          </div>
        </div>

        <div className="p-6 bg-surface border border-reeRed/30 rounded-xl shadow-sm">
          <h4 className="text-[0.65rem] font-bold text-reeRed uppercase tracking-widest mb-2 flex items-center gap-2">
            <span>🚨</span> Critical Blind Spots ({diagnostics.blindSpots?.length || 0})
          </h4>
          <p className="text-xs text-muted2 mb-4 leading-relaxed">Items marked "High Confidence" that evaluated as Incorrect.</p>
          <div className="flex flex-wrap gap-2">
            {!diagnostics.blindSpots || diagnostics.blindSpots.length === 0 ? <span className="text-xs font-mono text-muted">No false confidence detected.</span> :
              diagnostics.blindSpots.map(idx => (
                <button key={idx} onClick={() => setCurrentIndex(idx)} className="px-3 py-1.5 bg-bg border border-reeRed/30 text-reeRed rounded-md text-xs font-bold font-mono hover:bg-reeRed/10 cursor-pointer transition-colors shadow-sm">
                  Review Item {idx + 1}
                </button>
              ))}
          </div>
        </div>

      </div>

      {/* EXPLICIT TERMINAL FOOTER ACTIONS */}
      <div className="mt-8 border-t border-border2 pt-6 flex justify-end">
          {battleId ? (
              <button 
                  onClick={() => window.location.href = `/battle/${battleId}`} 
                  className="px-8 py-4 bg-reeRed hover:bg-red-600 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-colors cursor-pointer shadow-lg w-full md:w-auto text-center"
              >
                  Return to Battle Lobby
              </button>
          ) : (
              <button 
                  onClick={() => window.location.href = '/arena'} 
                  className="px-8 py-4 bg-reeBlue hover:bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-colors cursor-pointer shadow-lg w-full md:w-auto text-center"
              >
                  Terminate Simulation & Exit
              </button>
          )}
      </div>

    </div>
  );
}