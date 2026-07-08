// src/components/MissionControl.jsx
import React, { useState, useEffect } from 'react';
import { useTelemetrySlice } from '../store/slices';
import toast from 'react-hot-toast';
import { Panel, Button, Skeleton, Modal, ProgressIndicator } from './ui';
import { ClipboardList, Settings2, RefreshCw, Trash2 } from './ui/icons';

// `stats` comes from the PARENT (Dashboard's merged activeStats — local
// optimistic + server-canonical). Reading the raw store here served stale
// tallies that only refreshed after a full sync round-trip, which is why the
// daily targets seemed to move only after Board Simulator runs.
export default function MissionControl({ stats, onPurgeRequest }) {
  const { resetDailyQuotas, saveExamConfig } = useTelemetrySlice();

  const [isEditing, setIsEditing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editDate, setEditDate] = useState(stats?.examDate || '2026-04-15');
  const [editGoal, setEditGoal] = useState(stats?.dailyTarget || 50);

  useEffect(() => {
    if (stats?.examDate) setEditDate(stats.examDate);
    if (stats?.dailyTarget) setEditGoal(stats.dailyTarget);
  }, [stats?.examDate, stats?.dailyTarget]);

  if (!stats) {
    return <Skeleton className="w-full h-40 rounded-[var(--radius-lg)]" />;
  }

  const totalGoal = stats?.dailyTarget || 50;
  const mathGoal = Math.floor(totalGoal * 0.25);
  const esasGoal = Math.floor(totalGoal * 0.3);
  const eeGoal = totalGoal - mathGoal - esasGoal;

  const currentMath = stats?.dailyMath || 0;
  const currentESAS = stats?.dailyESAS || 0;
  const currentEE = stats?.dailyEE || 0;
  const totalCompleted = currentMath + currentESAS + currentEE;

  const QUOTAS = [
    { label: 'Mathematics', cur: currentMath, goal: mathGoal, color: 'var(--color-reeCyan)' },
    { label: 'ESAS', cur: currentESAS, goal: esasGoal, color: 'var(--color-reeAmber)' },
    { label: 'EE Professional', cur: currentEE, goal: eeGoal, color: 'var(--color-reePurple)' },
  ];

  const handleSaveConfig = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveExamConfig({ examDate: editDate, dailyTarget: Number(editGoal) });
      toast.success('Settings saved.');
      setIsEditing(false);
    } catch (error) {
      const offline = error?.message === '[OFFLINE]';
      toast.error(offline ? 'Backend unreachable — try again when online.' : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDailyReset = () => {
    resetDailyQuotas();
    toast.success("Today's targets reset.");
    setShowResetModal(false);
  };

  return (
    <>
      <Panel
        icon={ClipboardList}
        eyebrow="Today"
        title="Daily targets"
        bodyClassName="flex flex-col gap-5"
        action={
          <Button variant={isEditing ? 'primary' : 'secondary'} size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Settings2 size={14} strokeWidth={1.75} /> Config
          </Button>
        }
      >
        {isEditing && (
          <div
            className="p-5 bg-surface2/40 rounded-xl flex flex-col gap-5 animate-in slide-in-from-top-2"
            style={{ border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }}
          >
            <div className="flex flex-wrap gap-5">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-2">Target board date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="bg-bg border border-border text-textMain p-2.5 rounded-md text-sm outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-2">Daily quota target</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  className="bg-bg border border-border text-textMain p-2.5 rounded-md text-sm outline-none focus:border-[var(--accent)] w-32 transition-colors"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowResetModal(true)}>
                  <RefreshCw size={14} strokeWidth={1.75} /> Reset today
                </Button>
                <Button variant="ghost" size="sm" onClick={onPurgeRequest} className="text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)]">
                  <Trash2 size={14} strokeWidth={1.75} /> Purge analytics
                </Button>
              </div>
              <Button variant="primary" size="sm" onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end border-b border-border pb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted max-w-[60%] leading-relaxed">
            Weighted to the board exam distribution
          </span>
          <div className="text-right">
            <div className="text-3xl text-display tabular-nums leading-none text-textMain">{totalCompleted}</div>
            <div className="text-[11px] text-muted2 mt-1">/ {totalGoal} today</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUOTAS.map((q) => (
            <div key={q.label} className="rounded-xl border border-border bg-surface2/30 p-4">
              <div className="flex justify-between items-center mb-3 gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider truncate" style={{ color: q.color }}>
                  {q.label}
                </span>
                <span className="text-[11px] text-muted2 tabular-nums shrink-0">
                  {q.cur} / {q.goal}
                </span>
              </div>
              <ProgressIndicator value={q.cur} max={q.goal || 1} color={q.color} ariaLabel={`${q.label}: ${q.cur} of ${q.goal}`} />
            </div>
          ))}
        </div>
      </Panel>

      {/* Uses the shared Modal primitive — one dialog contract with role="dialog",
          aria-modal, labelledby, Escape-to-close, backdrop, and body scroll lock,
          instead of a hand-rolled overlay that had none of those. */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset today's targets?"
        icon={RefreshCw}
        tone="amber"
        size="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={executeDailyReset}>Reset</Button>
          </div>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          This reverts today's Math, ESAS, and EE counts to 0. Your streak and deep analytics are unaffected.
        </p>
      </Modal>
    </>
  );
}
