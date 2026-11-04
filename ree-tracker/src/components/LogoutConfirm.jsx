// src/components/LogoutConfirm.jsx
//
// The "Log out?" confirm, shared by the phone account menu and Account.
// Logging out clears this device's state, unsynced answers included (store
// resetStore), so it says how many would be lost instead of promising safety.
import { useState } from 'react';
import { useStore } from '../store/useStore';
import useSignOut from '../hooks/useSignOut';
import { Button, Modal } from './ui';

export default function LogoutConfirm({ open, onClose }) {
  const signOut = useSignOut();
  const [removeFiles, setRemoveFiles] = useState(false);
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
          <Button onClick={() => { onClose(); signOut({ removeDeviceFiles: removeFiles }); }}>Log out</Button>
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
      <label className="mt-4 flex items-start gap-2.5 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={removeFiles} onChange={(e) => setRemoveFiles(e.target.checked)} />
        <span>
          Also remove my files and imported quizzes from this device
          <span className="block text-xs text-muted2">Otherwise they stay here for when you sign back in. On a shared device, tick this.</span>
        </span>
      </label>
    </Modal>
  );
}
