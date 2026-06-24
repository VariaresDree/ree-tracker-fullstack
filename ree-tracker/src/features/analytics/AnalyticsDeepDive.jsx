import React, { useState, useEffect, useCallback } from 'react';
import { fetchAnalyticsDeep } from '../../services/dbQueries';
import { CalibrationCurve } from './CalibrationCurve';

function StatCard({ label, value, sub, color = 'text-textMain' }) {
  return (
    <div className="p-4 bg-surface border border-border2/50 rounded-xl">
      <div className="text-[0.6rem] font-black text-muted uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[0.65rem] text-muted2 mt-0.5">{sub}</div>}
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
          <div className="w-20 sm:w-40 text-[0.65rem] text-muted2 font-bold truncate text-right">{item[labelKey]}</div>
          <div className="flex-1 h-5 bg-surface2/50 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%` }}></div>
          </div>
          <div className="w-12 text-xs font-bold text-textMain text-right">{item[valueKey]}{valueKey === 'accuracy' ? '%' : ''}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDeepDive() {
  const [activeTab, setActiveTab] = useState('time');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (type) => {
    if (data[type]) return;
    setLoading(true);
    try {
      const result = await fetchAnalyticsDeep(type);
      setData(prev => ({ ...prev, [type]: result }));
    } catch (err) {
      // Analytics fetch failed silently — tab will show empty state
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    const typeMap = { time: 'time-analysis', confidence: 'confidence-calibration', subjects: 'subject-radar', study: 'study-time', scores: 'score-progression' };
    loadData(typeMap[activeTab]);
  }, [activeTab, loadData]);

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

      {!loading && activeTab === 'time' && (
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

      {!loading && activeTab === 'confidence' && (
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
                  <div className="text-[0.65rem] text-muted2 mt-1">{item.correct}/{item.total} correct</div>
                  <div className={`text-[0.6rem] font-bold mt-2 uppercase tracking-wider ${calibrated ? 'text-reeGreen' : 'text-reeRed'}`}>
                    {calibrated ? 'Well Calibrated' : 'Miscalibrated'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {!loading && activeTab === 'subjects' && (
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
            <span>📊</span> Accuracy by Subject
          </h3>
          <BarChart items={subjectData} valueKey="accuracy" labelKey="subject" maxVal={100} color="bg-reeGreen" />
        </div>
      )}

      {!loading && activeTab === 'study' && (
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
            <span>📅</span> Daily Study Time
          </h3>
          {studyData.length === 0 ? (
            <div className="text-xs text-muted2 p-4">Complete a review or simulator session to track study time.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard label="Total Study Days" value={studyData.length} color="text-reeBlue" />
              <StatCard label="Total Study Time" value={`${Math.round(studyData.reduce((a, d) => a + d.totalSecs, 0) / 3600)}h`} color="text-reeGreen" />
              <StatCard label="Avg per Day" value={`${Math.round(studyData.reduce((a, d) => a + d.totalSecs, 0) / studyData.length / 60)}min`} color="text-reeCyan" />
            </div>
          )}
          {studyData.length > 0 && (
            <div className="mt-4">
              <BarChart
                items={studyData.slice(-14).map(d => ({ ...d, minutes: Math.round(d.totalSecs / 60) }))}
                valueKey="minutes"
                labelKey="date"
                color="bg-reeBlue"
              />
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'scores' && (
        <div className="bg-surface border border-border2/60 rounded-xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2">
            <span>📈</span> Exam Score Progression
          </h3>
          {scoreData.length === 0 ? (
            <div className="text-xs text-muted2 p-4">Complete a board simulator exam to track score progression.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {scoreData.map((exam, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${exam.verdict === 'PASSED' ? 'border-reeGreen/30 bg-reeGreen/5' : exam.verdict === 'CONDITIONAL PASS' ? 'border-reeAmber/30 bg-reeAmber/5' : 'border-reeRed/30 bg-reeRed/5'}`}>
                  <div>
                    <div className="text-sm font-bold text-textMain">{exam.targetSubject}</div>
                    <div className="text-[0.65rem] text-muted2">{new Date(exam.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black ${exam.verdict === 'PASSED' ? 'text-reeGreen' : exam.verdict === 'CONDITIONAL PASS' ? 'text-reeAmber' : 'text-reeRed'}`}>{exam.score}%</div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">{exam.totalQuestions} items</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
