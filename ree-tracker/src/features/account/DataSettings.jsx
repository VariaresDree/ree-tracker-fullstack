// src/features/account/DataSettings.jsx
//
// Your data: delete all analytics, behind a confirm (it can't be undone). It
// used to sit inside the dashboard's "Daily targets → Config" panel, next to
// the Save button.
//
// "Reset today's counts" is gone: today's counts are the answers recorded
// today, so the next sync put the server's numbers straight back and the
// button never did anything lasting.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { forgetDashboardStats } from '../../services/analyticsSync';
import { purgeApiCache } from '../../services/apiCache';
import { Button, Modal } from '../../components/ui';
import { Trash2, ShieldAlert } from '../../components/ui/icons';

export default function DataSettings() {
  const { purgeAnalytics, unsynced } = useStore(
    useShallow((s) => ({
      purgeAnalytics: s.purgeAnalytics,
      unsynced: (s.syncQueue?.length || 0) + (s.pendingWrites?.length || 0),
    })),
  );
  const [confirm, setConfirm] = useState(false);
  const [purging, setPurging] = useState(false);

  const deleteAnalytics = async () => {
    setPurging(true);
    const toastId = toast.loading('Deleting your analytics…');
    try {
      await purgeAnalytics();
      // Today and Progress paint from the last dashboard payload, and the
      // service worker keeps copies of the analytics responses for cold
      // starts. Both still held the deleted numbers until the next refetch.
      forgetDashboardStats();
      await purgeApiCache();
      setConfirm(false);
      toast.success('Analytics deleted.', { id: toastId });
    } catch {
      toast.error('Couldn’t delete — try again.', { id: toastId });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-textMain">Delete all analytics</p>
          <p className="text-xs text-muted2">Permanently deletes your topic mastery, ability rating, readiness trend, confidence data, study time and history. Your exam plan stays.</p>
        </div>
        <Button size="sm" tone="danger" variant="secondary" onClick={() => setConfirm(true)}>
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Delete all analytics
        </Button>
      </div>

      <Modal
        open={confirm}
        onClose={() => { if (!purging) setConfirm(false); }}
        closeOnBackdrop={!purging}
        title="Delete all analytics?"
        icon={ShieldAlert}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={purging} onClick={() => setConfirm(false)}>Cancel</Button>
            <Button tone="danger" size="sm" loading={purging} onClick={deleteAnalytics}>Delete analytics</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">This permanently deletes your topic mastery, ability rating, readiness trend, confidence data, study time and history. It can’t be undone. Your exam date and daily target are kept.</p>
        {unsynced > 0 && (
          <p className="text-sm text-textMain mt-3">
            {unsynced === 1 ? '1 change on this device hasn’t' : `${unsynced} changes on this device haven’t`} synced yet. {unsynced === 1 ? 'It is' : 'They are'} discarded too.
          </p>
        )}
      </Modal>
    </div>
  );
}
