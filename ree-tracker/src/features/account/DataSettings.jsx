// src/features/account/DataSettings.jsx
//
// Your data: reset today's counts, or delete all analytics. Both used to sit
// inside the dashboard's "Daily targets → Config" panel, next to the Save
// button. Each asks first; deleting analytics can't be undone.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { Button, Modal } from '../../components/ui';
import { RefreshCw, Trash2, ShieldAlert } from '../../components/ui/icons';

export default function DataSettings() {
  const { resetDailyQuotas, purgeAnalytics } = useStore(
    useShallow((s) => ({ resetDailyQuotas: s.resetDailyQuotas, purgeAnalytics: s.purgeAnalytics })),
  );
  const [confirm, setConfirm] = useState(null); // 'reset' | 'purge' | null
  const [purging, setPurging] = useState(false);

  const resetToday = () => {
    resetDailyQuotas();
    toast.success('Today’s counts reset.');
    setConfirm(null);
  };

  const deleteAnalytics = async () => {
    setPurging(true);
    const toastId = toast.loading('Deleting your analytics…');
    try {
      await purgeAnalytics();
      setConfirm(null);
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
          <p className="text-sm font-medium text-textMain">Reset today’s counts</p>
          <p className="text-xs text-muted2">Sets today’s Mathematics, ESAS and EE counts back to 0. Your streak and history stay.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setConfirm('reset')}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Reset today
        </Button>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap border-t border-border2/60 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-textMain">Delete all analytics</p>
          <p className="text-xs text-muted2">Permanently deletes your topic mastery, ability rating, readiness trend, confidence data, study time and history.</p>
        </div>
        <Button size="sm" tone="danger" variant="secondary" onClick={() => setConfirm('purge')}>
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Delete all analytics
        </Button>
      </div>

      <Modal
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title="Reset today’s counts?"
        icon={RefreshCw}
        tone="amber"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button size="sm" onClick={resetToday}>Reset</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">Today’s counts go back to 0. Your streak and history are unaffected.</p>
      </Modal>

      <Modal
        open={confirm === 'purge'}
        onClose={() => { if (!purging) setConfirm(null); }}
        closeOnBackdrop={!purging}
        title="Delete all analytics?"
        icon={ShieldAlert}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={purging} onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={purging} onClick={deleteAnalytics}>Delete analytics</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">This permanently deletes your topic mastery, ability rating, readiness trend, confidence data, study time and history. It can’t be undone.</p>
      </Modal>
    </div>
  );
}
