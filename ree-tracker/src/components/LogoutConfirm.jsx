// src/components/LogoutConfirm.jsx
//
// The "Log out?" confirm, shared by the phone account menu and Account.
// Logging out clears this device's state, unsynced answers included (store
// resetStore), so it says how many would be lost instead of promising safety.
import { useStore } from '../store/useStore';
import useSignOut from '../hooks/useSignOut';
import { Button, Modal } from './ui';

export default function LogoutConfirm({ open, onClose }) {
  const signOut = useSignOut();
  const unsynced = useStore((st) => (st.syncQueue?.length || 0) + (st.pendingWrites?.length || 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log out?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onClose(); signOut(); }}>Log out</Button>
        </>
      }
    >
      {unsynced > 0 ? (
        <p className="text-sm text-textMain">
          {unsynced} {unsynced === 1 ? 'answer hasn’t' : 'answers haven’t'} synced yet. Logging out now discards {unsynced === 1 ? 'it' : 'them'} — reconnect and let them sync first.
        </p>
      ) : (
        <p className="text-sm text-muted2">You’ll need to sign in again to continue.</p>
      )}
    </Modal>
  );
}
