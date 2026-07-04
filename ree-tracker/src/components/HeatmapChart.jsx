// src/components/HeatmapChart.jsx
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Panel } from './ui';
import { Flame, Timer } from './ui/icons';

const normKey = (s) => String(s || '').trim().toLowerCase();

function HeatmapChart({ stats }) {
  const [activeTab, setActiveTab] = useState('Mathematics');
  const [viewMode, setViewMode] = useState('accuracy');

  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};
  const microTopics = stats?.microTopics || {};

  // Case/whitespace-insensitive index so a stored subtopic still matches its TOS
  // label instead of silently rendering an empty tile.
  const microByNorm = useMemo(() => {
    const m = {};
    for (const [k, v] of Object.entries(microTopics)) m[normKey(k)] = v;
    return m;
  }, [microTopics]);

  const displayedTopics = (safeTOS[activeTab] || [])
    .map((topicName) => ({
      name: topicName,
      data: microByNorm[normKey(topicName)] || { attempts: 0, correct: 0, totalTime: 0 },
    }))
    .sort((a, b) => b.data.attempts - a.data.attempts);

  const targetLimit = activeTab === 'EE' ? 216 : 144;

  return (
    <Panel
      icon={viewMode === 'accuracy' ? Flame : Timer}
      eyebrow="Topic mastery"
      title={viewMode === 'accuracy' ? 'Accuracy by subtopic' : `Speed vs ${targetLimit}s limit`}
      className="h-full"
      bodyClassName="flex flex-col gap-3 min-h-0"
      action={
        <button
          onClick={() => setViewMode(viewMode === 'accuracy' ? 'speed' : 'accuracy')}
          className="text-[0.7rem] px-3 py-1.5 rounded-lg border border-border bg-surface2 hover:bg-surface3 text-textMain cursor-pointer font-medium transition-colors shrink-0"
        >
          {viewMode === 'accuracy' ? 'Speed' : 'Accuracy'}
        </button>
      }
    >
      <div className="flex gap-2 shrink-0" role="tablist" aria-label="Subject">
        {['Mathematics', 'ESAS', 'EE'].map((subj) => {
          const on = activeTab === subj;
          return (
            <button
              key={subj}
              role="tab"
              aria-selected={on}
              onClick={() => setActiveTab(subj)}
              className={`flex-1 py-2 rounded-lg text-[0.7rem] font-medium tracking-wide transition-colors border cursor-pointer ${
                on
                  ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent)]'
                  : 'bg-surface2/40 border-border text-muted hover:text-textMain'
              }`}
            >
              {subj === 'Mathematics' ? 'Math' : subj}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 flex flex-col gap-2 min-h-0 stagger-fade-in">
        {displayedTopics.map((item, idx) => {
          const hasData = item.data.attempts > 0;
          const pct = hasData ? Math.round((item.data.correct / item.data.attempts) * 100) : 0;
          // Average over ONLY the attempts that had plausible timing (corrupt
          // 0ms/inflated rows are excluded server-side), not all attempts —
          // otherwise the average is diluted toward zero.
          const timedCount = item.data.timedAttempts || 0;
          const avgTime = timedCount > 0 ? Math.round(item.data.totalTime / 1000 / timedCount) : 0;

          let bgClass = 'bg-bg/60 border-border opacity-50';
          let textClass = 'text-muted';
          let metricDisplay = '—';
          let subLabel = 'No data yet';

          if (hasData) {
            if (viewMode === 'accuracy') {
              metricDisplay = `${pct}%`;
              subLabel = `${item.data.correct} / ${item.data.attempts} correct`;
              if (pct >= 85) { bgClass = 'bg-reeGreen/10 border-reeGreen/40'; textClass = 'text-reeGreen'; }
              else if (pct >= 70) { bgClass = 'bg-green-400/10 border-green-400/30'; textClass = 'text-green-400'; }
              else if (pct >= 50) { bgClass = 'bg-reeAmber/10 border-reeAmber/30'; textClass = 'text-reeAmber'; }
              else { bgClass = 'bg-reeRed/10 border-reeRed/40'; textClass = 'text-reeRed'; }
            } else if (!item.data.totalTime) {
              // Attempts exist but no plausible timing rows (legacy corrupted
              // data is filtered out server-side) — don't fake "0s optimal".
              metricDisplay = '—';
              subLabel = 'No timing data yet';
              bgClass = 'bg-bg/60 border-border';
              textClass = 'text-muted';
            } else {
              metricDisplay = `${avgTime}s`;
              if (avgTime > targetLimit + 30) { bgClass = 'bg-reeRed/10 border-reeRed/40'; textClass = 'text-reeRed'; subLabel = 'Critical risk'; }
              else if (avgTime > targetLimit) { bgClass = 'bg-reeAmber/10 border-reeAmber/30'; textClass = 'text-reeAmber'; subLabel = 'Borderline'; }
              else { bgClass = 'bg-reeGreen/10 border-reeGreen/40'; textClass = 'text-reeGreen'; subLabel = 'Optimal speed'; }
            }
          }

          return (
            <div key={idx} className={`p-3.5 rounded-xl border flex justify-between items-center transition-all shrink-0 ${bgClass}`}>
              <div className="flex flex-col min-w-0 pr-4">
                <div className={`text-sm font-semibold truncate ${hasData ? 'text-textMain' : 'text-muted'}`} title={item.name}>
                  {item.name}
                </div>
                <div className={`text-[11px] uppercase tracking-wider mt-0.5 font-medium ${textClass}`}>{subLabel}</div>
              </div>
              <div className={`text-2xl text-display tabular-nums shrink-0 ${textClass}`}>{metricDisplay}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default React.memo(HeatmapChart);
