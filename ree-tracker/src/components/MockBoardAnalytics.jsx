// src/components/MockBoardAnalytics.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fetchMockHistory, hideExamSession } from '../services/dbQueries';
import { cachedMockHistory, rememberMockHistory } from '../services/mockHistoryCache';
import { purgeSimulationLedger, dropLegacyLedger } from '../services/simulationLedger';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { isPassingVerdict, VERDICT } from '@ree/shared';
import { sittingKindLabel } from '../features/board-simulator/profiles';
import { SkeletonChart } from './SkeletonLoaders';
import { Panel, DataTable, StatusPill, Button, Modal, EmptyState } from './ui';
import { BarChart3, RefreshCw, Trash2, ShieldAlert, CloudOff } from './ui/icons';
import OutsideScoresPanel from '../features/exams/OutsideScoresPanel';

// Mock history is SERVER-authoritative (GET /api/analytics/deep/mock-history):
// every Board Simulator and battle sitting, graded on the server from its own
// recorded attempts. It used to live in a device-local IndexedDB ledger —
// per-device, lost with a cleared browser — which is now emptied once the
// server copy has loaded.
//
// The last list paints at once on a remount (services/mockHistoryCache, keyed
// by account) while the fresh one loads.
const cachedFor = cachedMockHistory;

const TONE = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const verdictLabel = (v) =>
  v === 'PASSED' ? 'Passed' : v === 'CONDITIONAL PASS' ? 'Conditional' : v === 'FAILED' ? 'Failed' : v || '—';
// The headline is the PRC general weighted average when the sitting has a
// subject breakdown, else the raw share correct — to one decimal, the way the
// results screen shows it. Rounded to a whole number, a 69.6 read "70%" beside
// a Failed pill.
const headline = (r) => (typeof r.generalAverage === 'number' ? r.generalAverage : (r.score ?? 0));
const fmtHeadline = (r) => `${typeof r.generalAverage === 'number' ? r.generalAverage.toFixed(1) : Math.round(r.score ?? 0)}%`;
// Coloured by the verdict, never by "≥ 70" alone: a 72 with a subject under
// the floor is a conditional pass, not green.
const VERDICT_TONE_KEY = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const toneOf = (verdict) => VERDICT_TONE_KEY[verdict] || 'danger';
const TONE_TEXT = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const barFill = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber)', danger: 'var(--accent-danger)' };
const toneText = (verdict) => TONE_TEXT[toneOf(verdict)];
const kindLabel = (r) => sittingKindLabel(r.kind) || (r.isPrcStandard ? 'One subject (PRC clock)' : 'Mock board');

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

  // An error is not an empty history: it says so and offers Try again.
  const [loadError, setLoadError] = useState(false);

  // Always asks the server. The cached rows only paint the screen while it
  // does: this used to return the cache on every visit, so a sitting finished
  // a minute ago — the results screen sends you here — wasn't listed.
  const loadHistory = async (forceSync = false) => {
    if (!currentUser?.uid) return;
    const cached = cachedFor(currentUser.uid);
    if (cached) setHistory(cached);
    setLoading(!cached);
    try {
      const data = await fetchMockHistory(20);
      rememberMockHistory(currentUser.uid, data);
      setHistory(data);
      setLoadError(false);
      // The server holds every sitting now; retire this device's old ledger.
      purgeSimulationLedger(currentUser.uid).catch(() => {});
      dropLegacyLedger().catch(() => {});
      if (forceSync) toast.success('History refreshed.');
    } catch {
      if (!cached) setLoadError(true);
      else if (forceSync) toast.error('Couldn’t refresh — showing the last list on this device.');
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); }, [currentUser?.uid]);

  const requestDelete = (id, name) => setDeleteModal({ isOpen: true, id, name });

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    try {
      await hideExamSession(id);
      const updated = history.filter((h) => h.id !== id);
      rememberMockHistory(currentUser.uid, updated);
      setHistory(updated);
      toast.success(`Removed the ${name} sitting from history.`);
    } catch {
      toast.error('Could not update the history. Try again.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const chartData = [...history].reverse().map((run, index) => ({
    // Dated, so the trend reads as a timeline ("Oct 3"), not "Run 7".
    name: `${new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${history.filter((h) => new Date(h.date).toDateString() === new Date(run.date).toDateString()).length > 1 ? ` (${index + 1})` : ''}`,
    date: new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    kind: kindLabel(run),
    overall: Math.round(headline(run) * 10) / 10,
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
            {data.date} <span className="text-muted font-normal ml-2">{data.kind}</span>
          </p>
          <p className="font-semibold mb-1" style={{ color: toneText(data.verdict) }}>
            Overall: {data.overall}% · {verdictLabel(data.verdict)}
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
  const avgScore = totalRuns > 0 ? Math.round((history.reduce((a, c) => a + headline(c), 0) / totalRuns) * 10) / 10 : 0;
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
    { key: 'type', label: 'Type', render: (r) => kindLabel(r) },
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
        <span className="font-semibold tabular-nums" style={{ color: toneText(r.verdict) }}>
          {fmtHeadline(r)}
        </span>
      ),
    },
    { key: 'verdict', label: 'Verdict', render: (r) => <StatusPill status={r.verdict}>{verdictLabel(r.verdict)}</StatusPill> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          {/* Every item of the sitting, your answers beside the key. */}
          <Button as={Link} to={`/exams/sittings/${encodeURIComponent(r.id)}`} size="sm" variant="ghost" aria-label={`Review the ${new Date(r.date).toLocaleDateString()} sitting`}>
            Review
          </Button>
          <Button
            size="icon"
            variant="ghost"
            tone="danger"
            onClick={(e) => { e.stopPropagation(); requestDelete(r.id, new Date(r.date).toLocaleDateString()); }}
            aria-label="Remove from history"
            className="text-muted"
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </span>
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
        {/* Over the latest 20 sittings, which is what the list holds. */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Sittings (last 20)" value={totalRuns} />
          <MiniStat label="Average" value={`${avgScore}%`} tone={avgScore >= 70 ? 'success' : 'amber'} />
          <MiniStat label="Passed" value={`${passCount} of ${totalRuns}`} tone={passRate >= 70 ? 'success' : 'danger'} />
        </div>

        {loading ? (
          <div className="h-[320px] flex items-center justify-center"><SkeletonChart /></div>
        ) : loadError ? (
          <EmptyState
            compact
            icon={CloudOff}
            title="Couldn’t load your mock history"
            description="Check your connection and try again."
            action={<Button size="sm" onClick={() => loadHistory()}>Try again</Button>}
          />
        ) : chartData.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-muted2 text-sm border-2 border-dashed border-border rounded-xl text-center px-6">
            No mock boards yet. Finish one to plot your scores.
          </div>
        ) : (
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={8} interval="preserveStartEnd" minTickGap={12} />
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
                {/* maxBarSize, not a fixed size: twenty 38px bars overflowed a phone. */}
                <Bar dataKey="overall" name="Overall" maxBarSize={38} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`color-mix(in srgb, ${barFill[toneOf(entry.verdict)]} 22%, transparent)`}
                    />
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
        ) : loadError ? (
          <p className="text-sm text-muted2 py-4">Your sittings will show here once they load.</p>
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
      <OutsideScoresPanel inAppAverage={totalRuns > 0 ? Math.round(avgScore) : null} inAppCount={totalRuns} />

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
