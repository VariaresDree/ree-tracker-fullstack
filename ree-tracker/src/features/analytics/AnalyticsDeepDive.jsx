import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchAnalyticsDeep } from '../../services/dbQueries';
import { CalibrationCurve } from './CalibrationCurve';

// 'YYYY-MM-DD' (Manila-keyed by the server) → 'Jul 3' without a timezone
// round-trip: new Date('YYYY-MM-DD') is UTC midnight and re-localizing can
// shift the label a day. Format from the string parts instead.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (isoDate) => {
  const [, m, d] = String(isoDate).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${d}` : isoDate;
};
// Zero-fill a trailing window of Manila days so "Last 14 days" is a real
// calendar window, not "the last 14 ACTIVE days".
const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const lastManilaDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(MANILA_FMT.format(new Date(Date.now() - i * 86400000)));
  return days;
};

const VERDICT_STYLE = {
  PASSED: { border: 'border-reeGreen/30 bg-reeGreen/5', text: 'text-reeGreen' },
  'CONDITIONAL PASS': { border: 'border-reeAmber/30 bg-reeAmber/5', text: 'text-reeAmber' },
  FAILED: { border: 'border-reeRed/30 bg-reeRed/5', text: 'text-reeRed' },
};

function StatCard({ label, value, sub, color = 'text-textMain' }) {
  return (
    <div className="p-4 bg-surface border border-border2/50 rounded-xl">
      <div className="text-[11px] font-black text-muted uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted2 mt-0.5">{sub}</div>}
    </div>
  );
}

function BarChart({ items, valueKey, labelKey, maxVal, color = 'bg-reeBlue' }) {
  if (!items?.length) return <div className="text-xs text-muted2 p-4">Answer questions to populate this metric.</div>;
  const max = maxVal || Math.max(...items.map(i => i[valueKey]));
  return (
    <div className="flex flex-col gap-2">
      {items.slice(0, 12).map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-20 sm:w-40 text-[11px] text-muted2 font-bold truncate text-right">{item[labelKey]}</div>
          <div className="flex-1 h-5 bg-surface2/50 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%` }}></div>
          </div>
          <div className="w-12 text-xs font-bold text-textMain text-right">{item[valueKey]}{valueKey === 'accuracy' ? '%' : ''}</div>
        </div>
      ))}
    </div>
  );
}

const TYPE_MAP = { time: 'time-analysis', confidence: 'confidence-calibration', subjects: 'subject-radar', study: 'study-time', scores: 'score-progression' };

export default function AnalyticsDeepDive() {
  const [activeTab, setActiveTab] = useState('time');
  const [data, setData] = useState({});
  // Per-endpoint status ('loading' | 'loaded' | 'error'). The old cache check
  // was `if (data[type]) return` — a failed/offline fetch stored nothing, so
  // the tab silently refetched forever and an error looked identical to
  // "no data yet". Now failures are distinct and get an explicit retry UI.
  const [status, setStatus] = useState({});
  // Ref mirror so the guard reads the latest status WITHOUT `status` being a
  // dep of loadData — otherwise every setStatus makes a new loadData identity,
  // the effect re-runs, and a terminal 'error' (not caught by the guard) would
  // refetch in a tight loop, defeating the Retry UI it was meant to add.
  const statusRef = useRef(status);
  statusRef.current = status;

  const loadData = useCallback(async (type, force = false) => {
    const st = statusRef.current[type];
    // Auto-load skips anything already loaded, in-flight, OR errored — only the
    // explicit Retry button (force=true) re-attempts a failed endpoint.
    if (!force && (st === 'loaded' || st === 'loading' || st === 'error')) return;
    setStatus(prev => ({ ...prev, [type]: 'loading' }));
    try {
      const result = await fetchAnalyticsDeep(type);
      // safeApiRequest resolves null on offline/timeout — that's a failure,
      // not an empty dataset (real empties are `{items: []}`).
      if (result == null) throw new Error('unreachable');
      setData(prev => ({ ...prev, [type]: result }));
      setStatus(prev => ({ ...prev, [type]: 'loaded' }));
    } catch (err) {
      setStatus(prev => ({ ...prev, [type]: 'error' }));
    }
  }, []);

  useEffect(() => {
    loadData(TYPE_MAP[activeTab]);
  }, [activeTab, loadData]);

  const activeType = TYPE_MAP[activeTab];
  const loading = status[activeType] === 'loading';
  const loadFailed = status[activeType] === 'error';

  const tabs = [
    { id: 'time', label: 'Time Analysis', icon: '⏱️' },
    { id: 'confidence', label: 'Confidence', icon: '🎯' },
    { id: 'subjects', label: 'Subject Radar', icon: '📊' },
    { id: 'study', label: 'Study Time', icon: '📅' },
    { id: 'scores', label: 'Score History', icon: '📈' }
  ];

  const timeData = data['time-analysis']?.items || [];
  const confData = data['confidence-calibration']?.items || [];
  const subjectData = data['subject-radar']?.items || [];
  const studyData = data['study-time']?.daily || [];
  const scoreData = data['score-progression']?.items || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-reeBlue/10 border border-reeBlue/50 text-reeBlue shadow-sm'
                : 'bg-surface2/30 border border-border2/50 text-muted hover:text-textMain hover:border-border2'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="telemetry-spinner inline-block mr-2"></span>
          <span className="text-muted2 text-sm font-mono uppercase tracking-widest">Loading Analytics...</span>
        </div>
      )}

      {!loading && loadFailed && (
        <div className="bg-surface border border-border2/60 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="text-sm text-muted2">Couldn't reach the analytics service — check your connection.</div>
          <button
            onClick={() => loadData(activeType, true)}
            className="px-4 py-2 rounded-lg text-[0.7rem] font-black uppercase tracking-wider bg-reeBlue/10 border border-reeBlue/50 text-reeBlue hover:bg-reeBlue/20 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadFailed && activeTab === 'time' && (
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
            <span>⏱️</span> Average Time per Question by Subtopic
          </h3>
          <BarChart
            items={timeData.map(d => ({ ...d, avgTimeSec: Math.round(d.avgTimeMs / 1000) }))}
            valueKey="avgTimeSec"
            labelKey="subtopic"
            color="bg-reeCyan"
          />
        </div>
      )}

      {!loading && !loadFailed && activeTab === 'confidence' && (
        <div className="flex flex-col gap-6">
          {confData.length > 0 && <CalibrationCurve buckets={confData} />}
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-6 flex items-center gap-2">
            <span>🎯</span> Confidence Calibration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {confData.map(item => {
              const calibrated = item.confidence === 'LOW' ? item.accuracy < 50 : item.confidence === 'HIGH' ? item.accuracy >= 70 : true;
              return (
                <div key={item.confidence} className={`p-5 rounded-xl border-2 text-center ${calibrated ? 'border-reeGreen/30 bg-reeGreen/5' : 'border-reeRed/30 bg-reeRed/5'}`}>
                  <div className="text-xs font-black uppercase tracking-widest text-muted mb-2">{item.confidence} Confidence</div>
                  <div className={`text-3xl font-black ${calibrated ? 'text-reeGreen' : 'text-reeRed'}`}>{item.accuracy}%</div>
                  <div className="text-[11px] text-muted2 mt-1">{item.correct}/{item.total} correct</div>
                  <div className={`text-[11px] font-bold mt-2 uppercase tracking-wider ${calibrated ? 'text-reeGreen' : 'text-reeRed'}`}>
                    {calibrated ? 'Well Calibrated' : 'Miscalibrated'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {!loading && !loadFailed && activeTab === 'subjects' && (
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
            <span>📊</span> Accuracy by Subject
          </h3>
          <BarChart items={subjectData} valueKey="accuracy" labelKey="subject" maxVal={100} color="bg-reeGreen" />
        </div>
      )}

      {!loading && !loadFailed && activeTab === 'study' && (() => {
        // Zero-filled true 14-day Manila window (the server keys days in
        // Manila too) — a skipped day shows as an empty bar, not a gap.
        const byDate = Object.fromEntries(studyData.map(d => [d.date, d]));
        const window14 = lastManilaDays(14).map(date => ({
          date,
          shortDate: shortDay(date),
          minutes: Math.round((byDate[date]?.totalSecs || 0) / 60),
          sessions: byDate[date]?.sessions || 0,
        }));
        const activeDays = window14.filter(d => d.minutes > 0).length;
        const totalSecsAll = studyData.reduce((a, d) => a + d.totalSecs, 0);
        const window14Secs = window14.reduce((a, d) => a + d.minutes * 60, 0);
        return (
          <div className="bg-surface border border-border2/60 rounded-xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
              <span>📅</span> Daily Study Time
            </h3>
            {studyData.length === 0 ? (
              <div className="text-xs text-muted2 p-4">Complete a review or simulator session to track study time.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatCard label="Active Days (last 14)" value={`${activeDays} / 14`} color="text-reeBlue" />
                  <StatCard
                    label="Time (last 14 days)"
                    value={window14Secs >= 3600 ? `${(window14Secs / 3600).toFixed(1)}h` : `${Math.round(window14Secs / 60)}min`}
                    sub={`All time: ${Math.round(totalSecsAll / 3600)}h`}
                    color="text-reeGreen"
                  />
                  <StatCard
                    label="Avg per Active Day"
                    value={activeDays > 0 ? `${Math.round(window14Secs / 60 / activeDays)}min` : '—'}
                    color="text-reeCyan"
                  />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="text-[11px] font-black text-muted uppercase tracking-widest">Last 14 days (minutes)</div>
                  <BarChart items={window14} valueKey="minutes" labelKey="shortDate" color="bg-reeBlue" />
                </div>
              </>
            )}
          </div>
        );
      })()}

      {!loading && !loadFailed && activeTab === 'scores' && (() => {
        const trend = scoreData.map((exam, idx) => ({
          ...exam,
          idx,
          label: new Date(exam.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }),
        }));
        return (
          <div className="bg-surface border border-border2/60 rounded-xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
              <span>📈</span> Exam Score Progression
            </h3>
            {scoreData.length === 0 ? (
              <div className="text-xs text-muted2 p-4">Complete a board simulator exam to track score progression.</div>
            ) : (
              <>
                {trend.length >= 2 && (
                  <div className="h-56 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip
                          contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'var(--text-muted)' }}
                          formatter={(value, _name, { payload }) => [`${value}% (${payload.score}/${payload.totalQuestions})`, payload.targetSubject]}
                        />
                        {/* The board pass mark — the only line that matters. */}
                        <ReferenceLine y={70} stroke="var(--accent-success)" strokeDasharray="4 4" label={{ value: 'Pass 70%', position: 'insideTopRight', fontSize: 10, fill: 'var(--accent-success)' }} />
                        <Line type="monotone" dataKey="pct" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {[...trend].reverse().map((exam) => {
                    const style = VERDICT_STYLE[exam.verdict] || VERDICT_STYLE.FAILED;
                    return (
                      <div key={exam.idx} className={`p-4 rounded-xl border flex items-center justify-between ${style.border}`}>
                        <div>
                          <div className="text-sm font-bold text-textMain">{exam.targetSubject}</div>
                          <div className="text-[11px] text-muted2">{exam.label} · {exam.verdict}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-black ${style.text}`}>{exam.pct}%</div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{exam.score} / {exam.totalQuestions} items</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
