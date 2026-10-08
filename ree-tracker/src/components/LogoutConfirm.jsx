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
  const answers = useStore((st) => st.syncQueue?.length || 0);
  // Finished sessions, offline mock exams, outside scores…: not answers.
  const others = useStore((st) => st.pendingWrites?.length || 0);
  const unsynced = answers + others;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const what = answers > 0 && others > 0
    ? `${plural(answers, 'answer', 'answers')} and ${plural(others, 'other change', 'other changes')} haven’t`
    : answers > 0
      ? `${plural(answers, 'answer hasn’t', 'answers haven’t')}`
      : `${plural(others, 'change hasn’t', 'changes haven’t')}`;

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
          {what} synced yet. Logging out now discards {unsynced === 1 ? 'it' : 'them'} — reconnect and let them sync first.
        </p>
      ) : (
        <p className="text-sm text-muted2">You’ll need to sign in again to continue.</p>
      )}
    </Modal>
  );
}
