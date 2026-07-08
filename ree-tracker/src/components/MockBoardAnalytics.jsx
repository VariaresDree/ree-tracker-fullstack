// src/components/MockBoardAnalytics.jsx
import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fetchSimulationLedger, deleteSimulationRecord } from '../services/dbQueries';
import FocusTrap from './FocusTrap';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonChart } from './SkeletonLoaders';
import { Panel, DataTable, StatusPill, Button, Card } from './ui';
import { BarChart3, RefreshCw, Trash2, ShieldAlert } from './ui/icons';

let CACHED_HISTORY = null;

const TONE = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber)', danger: 'var(--accent-danger)' };
const verdictLabel = (v) =>
  v === 'PASSED' ? 'Passed' : v === 'CONDITIONAL PASS' ? 'Conditional' : v === 'FAILED' ? 'Failed' : v || '—';

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/30 p-3.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="text-2xl text-display tabular-nums mt-1" style={tone ? { color: TONE[tone] } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default function MockBoardAnalytics() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState(CACHED_HISTORY || []);
  const [loading, setLoading] = useState(!CACHED_HISTORY);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  const loadHistory = async (forceSync = false) => {
    if (!currentUser?.uid) return;
    if (!forceSync && CACHED_HISTORY) {
      setHistory(CACHED_HISTORY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSimulationLedger(currentUser.uid, 20);
      CACHED_HISTORY = data;
      setHistory(data);
      if (forceSync) toast.success('Ledger synced.');
    } catch (error) {
      console.error('Fetch failed:', error);
      toast.error('Failed to sync ledger.');
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
      await deleteSimulationRecord(currentUser.uid, id);
      const updated = history.filter((h) => h.id !== id);
      CACHED_HISTORY = updated;
      setHistory(updated);
      toast.success(`Deleted "${name}".`);
    } catch (error) {
      toast.error(error.message || 'Delete failed.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const chartData = [...history].reverse().map((run, index) => ({
    name: `Run ${index + 1}`,
    date: new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: run.score,
    math: run.subjectScores?.Math || null,
    esas: run.subjectScores?.ESAS || null,
    ee: run.subjectScores?.EE || null,
    verdict: run.verdict,
    config: run.config,
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
          {data.math && <p className="text-reeCyan">Math: {data.math}%</p>}
          {data.esas && <p className="text-reePurple">ESAS: {data.esas}%</p>}
          {data.ee && <p className="text-reeAmber">EE: {data.ee}%</p>}
        </div>
      );
    }
    return null;
  };

  const totalRuns = history.length;
  const avgScore = totalRuns > 0 ? Math.round(history.reduce((a, c) => a + c.score, 0) / totalRuns) : 0;
  const passCount = history.filter((h) => h.verdict === 'PASSED' || h.verdict === 'CONDITIONAL PASS').length;
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
    { key: 'type', label: 'Type', render: (r) => (r.isPrcStandard ? 'PRC standard' : 'Custom drill') },
    {
      key: 'subject',
      label: 'Subject',
      render: (r) => (r.targetSubject && r.targetSubject !== 'blended' ? r.targetSubject : 'Full matrix'),
    },
    { key: 'items', label: 'Items', align: 'right', render: (r) => r.totalQs || r.config?.count || 100 },
    {
      key: 'score',
      label: 'Score',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.score,
      render: (r) => (
        <span className="font-semibold" style={{ color: r.score >= 70 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
          {r.score}%
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
          aria-label="Delete record"
          className="text-muted hover:text-[var(--accent-danger)] transition-colors p-1 rounded-md hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)]"
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
        eyebrow="Board simulations"
        title="Pre-board trajectory"
        action={
          <Button variant="secondary" size="sm" onClick={() => loadHistory(true)}>
            <RefreshCw size={14} strokeWidth={1.75} /> Sync
          </Button>
        }
        bodyClassName="flex flex-col gap-5"
      >
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Simulations" value={totalRuns} />
          <MiniStat label="Avg score" value={`${avgScore}%`} tone={avgScore >= 70 ? 'success' : 'amber'} />
          <MiniStat label="Pass rate" value={`${passRate}%`} tone={passRate >= 70 ? 'success' : 'danger'} />
        </div>

        {loading ? (
          <div className="h-[320px] flex items-center justify-center"><SkeletonChart /></div>
        ) : chartData.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-muted2 text-sm border-2 border-dashed border-border rounded-xl text-center px-6">
            No simulations yet. Complete a board simulation to plot your trajectory.
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
        title="Simulation ledger"
        action={<span className="text-[11px] text-muted2 tabular-nums">{history.length} records</span>}
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
            emptyMessage="Ledger is empty. Complete a board simulation to see it here."
          />
        )}
      </Panel>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={deleteModal.isOpen}>
            <Card elevated className="modal-entrance p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--accent-danger)' }}>
                <ShieldAlert size={18} strokeWidth={2} /> Delete this record?
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                Delete the simulation from <strong className="text-textMain">{deleteModal.name}</strong>? This can't be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" size="sm" data-close-modal onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
              </div>
            </Card>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
