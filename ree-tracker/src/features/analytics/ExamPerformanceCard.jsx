import React, { useMemo } from 'react';

export default function ExamPerformanceCard({ stats }) {
  const theta = stats?.irt?.theta || 0;
  const totalAnswered = stats?.totalAnswered || 0;
  const totalCorrect = stats?.totalCorrect || 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const readiness = useMemo(() => Math.min(100, Math.max(0, Math.round(((theta + 3) / 6) * 100))), [theta]);

  const readinessColor = readiness >= 70 ? 'text-reeGreen' : readiness >= 50 ? 'text-reeAmber' : 'text-reeRed';
  const barColor = readiness >= 70 ? 'bg-reeGreen shadow-[0_0_12px_rgba(34,197,94,0.6)]' : readiness >= 50 ? 'bg-reeAmber shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-reeRed';
  const glowBorder = readiness >= 70 ? 'border-reeGreen/20' : readiness >= 50 ? 'border-reeAmber/20' : 'border-reeRed/20';

  return (
    <div className={`p-6 bg-surface/80 backdrop-blur-sm border rounded-2xl transition-all hover-glow ${glowBorder}`}>
      <h3 className="text-xs font-black text-textMain uppercase tracking-widest mb-4">
        Board Readiness
      </h3>

      <div className="flex items-end gap-6 mb-4">
        <div>
          <span className={`text-5xl font-black tracking-tighter ${readinessColor}`}>
            {readiness}%
          </span>
          <div className="text-[11px] text-muted font-bold uppercase tracking-widest mt-1">/ 70% passing</div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between text-[11px] font-black text-muted uppercase tracking-widest">
            <span>IRT Ability (θ)</span>
            <span className="text-reeCyan">{theta.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-black text-muted uppercase tracking-widest">
            <span>Accuracy</span>
            <span className="text-textMain">{accuracy}% <span className="text-muted font-normal">({totalCorrect}/{totalAnswered})</span></span>
          </div>
        </div>
      </div>

      <div className="w-full h-2 bg-surface3/50 rounded-full overflow-hidden border border-border2/50 shadow-inner">
        <div className={`h-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${readiness}%` }} />
      </div>
    </div>
  );
}
