// src/components/HeatmapChart.jsx
import React, { useState, useMemo } from 'react';
import { toDisplaySubject, masteryBand, boardPaceSeconds } from '@ree/shared';
import { useStore } from '../store/useStore';
import { Panel } from './ui';
import { Flame, Timer, Target } from './ui/icons';

const normKey = (s) => String(s || '').trim().toLowerCase();

const VIEW_MODES = ['mastery', 'accuracy', 'speed'];
const VIEW_LABEL = { mastery: 'Mastery', accuracy: 'Accuracy', speed: 'Speed' };
const VIEW_ICON = { mastery: Target, accuracy: Flame, speed: Timer };
const MASTERY_STYLE = {
  mastered: { bg: 'bg-reeGreen/10 border-reeGreen/40', text: 'text-reeGreen-text' },
  // Cyan, between mastered (green) and developing (amber). It was Tailwind's
  // raw green-400: no theme token, and 1.9:1 as text on the light theme.
  proficient: { bg: 'bg-reeCyan/10 border-reeCyan/30', text: 'text-reeCyan-text' },
  developing: { bg: 'bg-reeAmber/10 border-reeAmber/30', text: 'text-reeAmber-text' },
  novice: { bg: 'bg-reeRed/10 border-reeRed/40', text: 'text-reeRed-text' },
};

// `onDrillTopic(topic, subject)` makes each tile a button that starts a
// targeted drill on that topic.
function HeatmapChart({ stats, onDrillTopic }) {
  const [activeTab, setActiveTab] = useState('Mathematics');
  // BKT P(mastery) is the headline signal (roadmap 3.5) — default view.
  const [viewMode, setViewMode] = useState('mastery');

  // Narrow selector, not `useStore()`. Zustand v5 compares the whole state
  // object with Object.is and every set() produces a new one, so subscribing to
  // the root re-rendered this component on EVERY recordAttempt, syncStatus flip
  // and syncQueue push — and this one sits on Progress › Topics.
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = dynamicTOS || {};
  const microTopics = stats?.microTopics || {};

  // Case/whitespace-insensitive index so a stored subtopic still matches its TOS
  // label instead of silently rendering an empty tile.
  const microByNorm = useMemo(() => {
    const m = {};
    for (const [k, v] of Object.entries(microTopics)) m[normKey(k)] = v;
    return m;
  }, [microTopics]);

  // Memoized so it doesn't re-map + re-sort the whole TOS on every render —
  // the viewMode toggle doesn't affect this list at all.
  const displayedTopics = useMemo(
    () =>
      (safeTOS[activeTab] || [])
        .map((topicName) => ({
          name: topicName,
          data: microByNorm[normKey(topicName)] || { attempts: 0, correct: 0, totalTime: 0, mastery: null, masteryN: 0 },
        }))
        .sort((a, b) => b.data.attempts - a.data.attempts),
    [safeTOS, activeTab, microByNorm],
  );

  // The board's own pace for the subject (Mathematics 180 s, ESAS 144 s, EE
  // 216 s). It read 144 s for Mathematics, ESAS's pace, so a Math topic at a
  // comfortable 2:50 per item was flagged as a speed risk.
  const targetLimit = boardPaceSeconds(activeTab) ?? 144;
  const title =
    viewMode === 'accuracy' ? 'Accuracy by subtopic'
    : viewMode === 'speed' ? `Speed vs ${targetLimit}s limit`
    : 'Mastery by subtopic';

  return (
    <Panel
      icon={VIEW_ICON[viewMode]}
      eyebrow="Topic mastery"
      title={title}
      className="h-full"
      bodyClassName="flex flex-col gap-3 min-h-0"
      action={
        <div className="flex gap-1 shrink-0" role="group" aria-label="Heatmap metric">
          {VIEW_MODES.map((mode) => {
            const on = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={on}
                className={`text-[0.7rem] px-2.5 py-1.5 rounded-lg border cursor-pointer font-medium transition-colors touch-target inline-flex items-center justify-center ${
                  on
                    ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]'
                    : 'border-border bg-surface2 hover:bg-surface3 text-muted'
                }`}
              >
                {VIEW_LABEL[mode]}
              </button>
            );
          })}
        </div>
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
                  ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]'
                  : 'bg-surface2/40 border-border text-muted hover:text-textMain'
              }`}
            >
              {toDisplaySubject(subj)}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 flex flex-col gap-2 min-h-0 stagger-fade-in">
        {displayedTopics.map((item) => {
          const hasData = item.data.attempts > 0;
          const pct = hasData ? Math.round((item.data.correct / item.data.attempts) * 100) : 0;
          // Average over ONLY the attempts that had plausible timing (corrupt
          // 0ms/inflated rows are excluded server-side), not all attempts —
          // otherwise the average is diluted toward zero.
          const timedCount = item.data.timedAttempts || 0;
          const avgTime = timedCount > 0 ? Math.round(item.data.totalTime / 1000 / timedCount) : 0;
          // BKT P(mastery): server-authoritative, null until first observation.
          // The tile shows the EFFECTIVE value — decayed for the days since the
          // topic was last practised — and flags a topic whose band has slipped.
          const storedMastery = item.data.mastery;
          const masteryVal = item.data.masteryEffective ?? storedMastery;
          const masteryHasData = (item.data.masteryN || 0) > 0 && masteryVal != null;

          let bgClass = 'bg-bg/60 border-border opacity-50';
          let textClass = 'text-muted';
          let metricDisplay = '—';
          let subLabel = 'No data yet';

          if (viewMode === 'mastery') {
            if (masteryHasData) {
              metricDisplay = `${Math.round(masteryVal * 100)}%`;
              // The shared BKT bands (@ree/shared MASTERY_BANDS).
              const band = masteryBand(masteryVal);
              const styled = MASTERY_STYLE[band.key];
              bgClass = styled.bg; textClass = styled.text; subLabel = band.label;
              const storedBand = masteryBand(storedMastery);
              if (storedBand && storedBand.key !== band.key) {
                const days = item.data.daysSincePractice;
                subLabel = `${band.label} · fading${days ? ` (${days}d)` : ''}`;
              }
            }
          } else if (hasData) {
            if (viewMode === 'accuracy') {
              metricDisplay = `${pct}%`;
              subLabel = `${item.data.correct} / ${item.data.attempts} correct`;
              if (pct >= 85) { bgClass = 'bg-reeGreen/10 border-reeGreen/40'; textClass = 'text-reeGreen-text'; }
              else if (pct >= 70) { bgClass = MASTERY_STYLE.proficient.bg; textClass = MASTERY_STYLE.proficient.text; }
              else if (pct >= 50) { bgClass = 'bg-reeAmber/10 border-reeAmber/30'; textClass = 'text-reeAmber-text'; }
              else { bgClass = 'bg-reeRed/10 border-reeRed/40'; textClass = 'text-reeRed-text'; }
            } else if (!item.data.totalTime) {
              // Attempts exist but no plausible timing rows (legacy corrupted
              // data is filtered out server-side) — don't fake "0s optimal".
              metricDisplay = '—';
              subLabel = 'No timing data yet';
              bgClass = 'bg-bg/60 border-border';
              textClass = 'text-muted';
            } else {
              metricDisplay = `${avgTime}s`;
              if (avgTime > targetLimit + 30) { bgClass = 'bg-reeRed/10 border-reeRed/40'; textClass = 'text-reeRed-text'; subLabel = 'Critical risk'; }
              else if (avgTime > targetLimit) { bgClass = 'bg-reeAmber/10 border-reeAmber/30'; textClass = 'text-reeAmber-text'; subLabel = 'Borderline'; }
              else { bgClass = 'bg-reeGreen/10 border-reeGreen/40'; textClass = 'text-reeGreen-text'; subLabel = 'Optimal speed'; }
            }
          }

          const tileActive = viewMode === 'mastery' ? masteryHasData : hasData;

          const tileBody = (
            <>
              <div className="flex flex-col min-w-0 pr-4">
                <div className={`text-sm font-semibold truncate ${tileActive ? 'text-textMain' : 'text-muted'}`} title={item.name}>
                  {item.name}
                </div>
                <div className={`text-[11px] uppercase tracking-wider mt-0.5 font-medium ${textClass}`}>{subLabel}</div>
              </div>
              <div className={`text-2xl text-display tabular-nums shrink-0 ${textClass}`}>{metricDisplay}</div>
            </>
          );
          const tileClass = `p-3.5 rounded-xl border flex justify-between items-center transition-all shrink-0 ${bgClass}`;

          return onDrillTopic ? (
            <button
              key={item.name}
              type="button"
              onClick={() => onDrillTopic(item.name, activeTab)}
              aria-label={`Drill ${item.name}: ${subLabel}, ${metricDisplay}`}
              className={`${tileClass} w-full text-left cursor-pointer hover:brightness-110`}
            >
              {tileBody}
            </button>
          ) : (
            <div key={item.name} className={tileClass}>{tileBody}</div>
          );
        })}
      </div>
    </Panel>
  );
}

export default React.memo(HeatmapChart);
