// src/components/MockBoardAnalytics.jsx
import { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fetchMockHistory, hideExamSession } from '../services/dbQueries';
import { purgeSimulationLedger, dropLegacyLedger } from '../services/simulationLedger';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { isPassingVerdict } from '@ree/shared';
import { SkeletonChart } from './SkeletonLoaders';
import { Panel, DataTable, StatusPill, Button, Modal } from './ui';
import { BarChart3, RefreshCw, Trash2, ShieldAlert } from './ui/icons';
import OutsideScoresPanel from '../features/exams/OutsideScoresPanel';

// Mock history is SERVER-authoritative (GET /api/analytics/deep/mock-history):
// every Board Simulator and battle sitting, graded on the server from its own
// recorded attempts. It used to live in a device-local IndexedDB ledger —
// per-device, lost with a cleared browser — which is now emptied once the
// server copy has loaded.
//
// Module-level so a remount (route change) paints instantly — keyed by uid,
// because an unkeyed cache showed the previous account's ledger to the next
// user who signed in during the same tab session.
let CACHED = { uid: null, rows: null };
const cachedFor = (uid) => (uid && CACHED.uid === uid ? CACHED.rows : null);

const TONE = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const verdictLabel = (v) =>
  v === 'PASSED' ? 'Passed' : v === 'CONDITIONAL PASS' ? 'Conditional' : v === 'FAILED' ? 'Failed' : v || '—';
const KIND_LABEL = { 'full-board': 'Full PRC board', subject: 'PRC subject', blended: 'Full blended', custom: 'Custom drill', battle: 'Battle' };
// The headline number is the PRC general weighted average when the sitting has
// a subject breakdown, else the raw share correct.
const headline = (r) => Math.round(r.generalAverage ?? r.score ?? 0);

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/30 p-3.5">
      <div className="text-eyebrow">{label}</div>
      <div className="text-2xl text-display tabular-nums mt-1" style={tone ? { color: TONE[tone] } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default function MockBoardAnalytics() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState(cachedFor(currentUser?.uid) || []);
  const [loading, setLoading] = useState(!cachedFor(currentUser?.uid));
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  const loadHistory = async (forceSync = false) => {
    if (!currentUser?.uid) return;
    if (!forceSync && cachedFor(currentUser.uid)) {
      setHistory(cachedFor(currentUser.uid));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMockHistory(20);
      CACHED = { uid: currentUser.uid, rows: data };
      setHistory(data);
      // The server holds every sitting now; retire this device's old ledger.
      purgeSimulationLedger(currentUser.uid).catch(() => {});
      dropLegacyLedger().catch(() => {});
      if (forceSync) toast.success('History refreshed.');
    } catch (error) {
      console.error('Fetch failed:', error);
      toast.error('Could not load your mock history.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [currentUser]);

  const requestDelete = (id, name) => setDeleteModal({ isOpen: true, id, name });

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    try {
      await hideExamSession(id);
      const updated = history.filter((h) => h.id !== id);
      CACHED = { uid: currentUser.uid, rows: updated };
      setHistory(updated);
      toast.success(`Removed the ${name} sitting from history.`);
    } catch {
      toast.error('Could not update the history. Try again.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const chartData = [...history].reverse().map((run, index) => ({
    name: `Run ${index + 1}`,
    date: new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: headline(run),
    // `?? null`, not `|| null`: a 0% subject is a real score, not a gap.
    math: run.subjectScores?.Mathematics ?? null,
    esas: run.subjectScores?.ESAS ?? null,
    ee: run.subjectScores?.EE ?? null,
    verdict: run.verdict,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface/95 backdrop-blur-md border border-border2 p-3.5 rounded-lg shadow-xl text-xs z-50">
          <p className="font-semibold text-textMain mb-2 border-b border-border2 pb-2">
            {data.name} <span className="text-muted font-normal ml-2">{data.date}</span>
          </p>
          <p className="font-semibold mb-1" style={{ color: data.overall >= 70 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            Overall: {data.overall}%
          </p>
          {data.math != null && <p className="text-reeCyan-text">Math: {data.math}%</p>}
          {data.esas != null && <p className="text-reePurple-text">ESAS: {data.esas}%</p>}
          {data.ee != null && <p className="text-reeAmber-text">EE: {data.ee}%</p>}
        </div>
      );
    }
    return null;
  };

  const totalRuns = history.length;
  const avgScore = totalRuns > 0 ? Math.round(history.reduce((a, c) => a + headline(c), 0) / totalRuns) : 0;
  const passCount = history.filter((h) => isPassingVerdict(h.verdict)).length;
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      sortAccessor: (r) => new Date(r.date).getTime(),
      render: (r) => (
        <span className="text-muted2 whitespace-nowrap">
          {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
      ),
    },
    { key: 'type', label: 'Type', render: (r) => KIND_LABEL[r.kind] || (r.isPrcStandard ? 'PRC standard' : 'Mock board') },
    {
      key: 'subject',
      label: 'Subject',
      render: (r) => (r.targetSubject && !['blended', 'BLENDED'].includes(r.targetSubject) ? r.targetSubject : 'All subjects'),
    },
    { key: 'items', label: 'Items', align: 'right', render: (r) => r.totalQuestions },
    {
      key: 'score',
      label: 'Score',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => headline(r),
      render: (r) => (
        <span className="font-semibold" style={{ color: isPassingVerdict(r.verdict) ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
          {headline(r)}%
        </span>
      ),
    },
    { key: 'verdict', label: 'Verdict', render: (r) => <StatusPill status={r.verdict}>{verdictLabel(r.verdict)}</StatusPill> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); requestDelete(r.id, new Date(r.date).toLocaleDateString()); }}
          aria-label="Remove from history"
          className="text-muted hover:text-[var(--accent-danger)] transition-colors p-1 rounded-md hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] touch-target inline-flex items-center justify-center"
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Trajectory: mini-stats + chart */}
      <Panel
        icon={BarChart3}
        eyebrow="Mock boards"
        title="Mock score trend"
        action={
          <Button variant="secondary" size="sm" onClick={() => loadHistory(true)}>
            <RefreshCw size={14} strokeWidth={1.75} /> Sync
          </Button>
        }
        bodyClassName="flex flex-col gap-5"
      >
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Sittings" value={totalRuns} />
          <MiniStat label="Avg score" value={`${avgScore}%`} tone={avgScore >= 70 ? 'success' : 'amber'} />
          <MiniStat label="Pass rate" value={`${passRate}%`} tone={passRate >= 70 ? 'success' : 'danger'} />
        </div>

        {loading ? (
          <div className="h-[320px] flex items-center justify-center"><SkeletonChart /></div>
        ) : chartData.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-muted2 text-sm border-2 border-dashed border-border rounded-xl text-center px-6">
            No mock boards yet. Finish one to plot your scores.
          </div>
        ) : (
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--text-main) 5%, transparent)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} iconType="circle" />
                <ReferenceLine
                  y={70}
                  stroke="var(--accent-danger)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ position: 'insideTopRight', value: '70% pass line', fill: 'var(--accent-danger)', fontSize: 10, fontWeight: 600 }}
                />
                <Bar dataKey="overall" name="Overall" barSize={38} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.overall >= 70 ? 'rgba(52, 211, 153, 0.18)' : 'rgba(255, 77, 109, 0.18)'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="math" name="Math" stroke="var(--color-reeCyan)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="esas" name="ESAS" stroke="var(--color-reePurple)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="ee" name="EE" stroke="var(--color-reeAmber)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Ledger table */}
      <Panel
        icon={BarChart3}
        eyebrow="History"
        title="Past sittings"
        action={<span className="text-[11px] text-muted2 tabular-nums">{history.length} sitting{history.length === 1 ? '' : 's'}</span>}
        bodyClassName="max-h-[520px] overflow-y-auto custom-scrollbar"
      >
        {loading ? (
          <div className="py-8"><SkeletonChart /></div>
        ) : (
          <DataTable
            columns={columns}
            rows={history}
            rowKey={(r) => r.id}
            initialSort={{ key: 'date', dir: 'desc' }}
            emptyMessage="No sittings yet. Finish a mock board or battle to see it here."
          />
        )}
      </Panel>

      {/* Scores from outside the app, beside (never inside) the in-app ones. */}
      <OutsideScoresPanel inAppAverage={totalRuns > 0 ? avgScore : null} inAppCount={totalRuns} />

      <Modal
        open={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
        title="Remove from history?"
        icon={ShieldAlert}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Remove the <strong className="text-textMain">{deleteModal.name}</strong> sitting from this history? Its answers still count toward your analytics.
        </p>
      </Modal>
    </div>
  );
}
