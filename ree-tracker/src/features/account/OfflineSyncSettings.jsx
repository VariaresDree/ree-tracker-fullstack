// src/features/account/OfflineSyncSettings.jsx
//
// Offline & sync: the offline question pack (download / refresh, sync issues),
// the cloud-backup status, and "Restore from cloud backup". The pack control
// used to live only in the sidebar, and the backup card in Profile → Settings.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { syncDashboardStats } from '../../services/analyticsSync';
import OfflineStatusBadge from '../../components/OfflineStatusBadge';
import { Button, Modal, StatusPill } from '../../components/ui';
import { Cloud } from '../../components/ui/icons';

const STATUS = {
  synced: { tone: 'success', label: 'Backed up', detail: 'All progress is backed up.' },
  syncing: { tone: 'signal', label: 'Syncing…', detail: 'Sending your latest answers…' },
  offline_queued: { tone: 'amber', label: 'Waiting to sync', detail: 'Will sync when you reconnect.' },
};

export default function OfflineSyncSettings() {
  const { currentUser } = useAuth();
  const syncStatus = useStore((s) => s.syncStatus);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const status = STATUS[syncStatus] || { tone: 'danger', label: 'Sync error', detail: 'Retrying automatically.' };

  const restore = async () => {
    setConfirmRestore(false);
    const toastId = toast.loading('Bringing in your cloud progress…');
    try {
      const restored = await syncDashboardStats(currentUser.uid);
      if (restored) toast.success('Cloud progress merged into this device.', { id: toastId });
      else toast.error('No cloud backup found for this account.', { id: toastId });
    } catch {
      toast.error('Couldn’t reach the cloud backup — try again when you’re online.', { id: toastId });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-textMain mb-1">Offline question pack</p>
        <p className="text-xs text-muted2 mb-3">Questions saved on this device so you can practise without a connection.</p>
        <OfflineStatusBadge />
      </div>

      <div className="border-t border-border2/60 pt-5 flex flex-col gap-3">
        <p className="text-sm font-medium text-textMain flex items-center gap-2">
          <Cloud size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-signal)]" /> Cloud backup
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="text-xs text-muted2">{status.detail}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setConfirmRestore(true)} className="self-start -ml-2 text-muted hover:text-textMain">
          Merge from cloud backup…
        </Button>
      </div>

      <Modal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        icon={Cloud}
        title="Merge your cloud progress?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRestore(false)}>Cancel</Button>
            <Button onClick={restore}>Merge</Button>
          </>
        }
      >
        {/* It merges (syncDashboardStats → mergeServerIntoStats): the copy said
            it replaced the device's progress, which it never did. */}
        <p className="text-sm text-muted2">Your progress saved in the cloud is merged into this device. Answers on this device that haven’t synced yet are kept.</p>
      </Modal>
    </div>
  );
}
