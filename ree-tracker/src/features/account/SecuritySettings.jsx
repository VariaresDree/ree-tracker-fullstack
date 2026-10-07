// src/features/account/SecuritySettings.jsx
//
// Sign-in and security: reset or change the password (the app had neither),
// log out, and delete the account (moved from Profile's "Danger zone").
import { useState } from 'react';
import toast from 'react-hot-toast';
import { deleteUser } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { deleteAccount } from '../../services/dbQueries';
import { purgeSimulationLedger } from '../../services/simulationLedger';
import { Button, FormField, Input, Modal } from '../../components/ui';
import { TriangleAlert, LogOut } from '../../components/ui/icons';
import LogoutConfirm from '../../components/LogoutConfirm';

const MIN_PASSWORD = 6; // Firebase's own minimum

const passwordError = (err) => {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'That current password isn’t right.';
  if (code === 'auth/weak-password') return `Use at least ${MIN_PASSWORD} characters.`;
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes and try again.';
  if (code === 'auth/network-request-failed') return 'You’re offline. Reconnect and try again.';
  return 'Couldn’t change your password — try again.';
};

export default function SecuritySettings() {
  const { currentUser, resetPassword, changePassword } = useAuth();
  const resetStore = useStore((s) => s.resetStore);

  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [formError, setFormError] = useState('');
  const [changing, setChanging] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const sendReset = async () => {
    if (!currentUser?.email) return;
    setSending(true);
    try {
      await resetPassword(currentUser.email);
      toast.success(`Reset link sent to ${currentUser.email}.`);
    } catch {
      toast.error('Couldn’t send the reset email — try again.');
    } finally {
      setSending(false);
    }
  };

  const submitChange = async (e) => {
    e.preventDefault();
    if (form.next.length < MIN_PASSWORD) return setFormError(`Use at least ${MIN_PASSWORD} characters.`);
    if (form.next !== form.confirm) return setFormError('The new passwords don’t match.');
    setFormError('');
    setChanging(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed.');
    } catch (err) {
      setFormError(passwordError(err));
    } finally {
      setChanging(false);
    }
  };

  const deleteForever = async () => {
    if (deleteText !== 'DELETE') return;
    const toastId = toast.loading('Deleting your account…');
    try {
      // The server row first: wiping the sign-in on a failed purge would
      // orphan the data with no way back in to retry.
      await deleteAccount();
      const uid = currentUser.uid;
      await deleteUser(currentUser);
      try { await purgeSimulationLedger(uid); } catch { /* device-only, best-effort */ }
      await resetStore();
      toast.success('Account deleted.', { id: toastId });
    } catch (err) {
      toast.error(
        err?.code === 'auth/requires-recent-login'
          ? 'For security, log out and back in before deleting your account.'
          : 'Couldn’t delete your account — try again.',
        { id: toastId },
      );
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-textMain">Forgot your password?</p>
          <p className="text-xs text-muted2">We’ll email a reset link to {currentUser?.email || 'your address'}.</p>
        </div>
        <Button size="sm" variant="secondary" loading={sending} disabled={sending || !currentUser?.email} onClick={sendReset}>
          Send a reset email
        </Button>
      </div>

      <form onSubmit={submitChange} noValidate className="flex flex-col gap-4 border-t border-border2/60 pt-5">
        <p className="text-sm font-medium text-textMain">Change password</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Current password">
            <Input type="password" autoComplete="current-password" {...field('current')} />
          </FormField>
          <FormField label="New password">
            <Input type="password" autoComplete="new-password" {...field('next')} />
          </FormField>
          <FormField label="Confirm new password" error={formError || undefined}>
            <Input type="password" autoComplete="new-password" {...field('confirm')} />
          </FormField>
        </div>
        <Button type="submit" size="sm" loading={changing} disabled={changing || !form.current || !form.next} className="self-start">
          Change password
        </Button>
      </form>

      <div className="flex flex-wrap gap-3 border-t border-border2/60 pt-5">
        <Button variant="secondary" onClick={() => setConfirmLogout(true)}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" /> Log out
        </Button>
        <Button tone="danger" variant="secondary" onClick={() => setConfirmDelete(true)}>
          Delete account…
        </Button>
      </div>

      <LogoutConfirm open={confirmLogout} onClose={() => setConfirmLogout(false)} />

      <Modal
        open={confirmDelete}
        onClose={() => { setConfirmDelete(false); setDeleteText(''); }}
        tone="danger"
        icon={TriangleAlert}
        title="Delete account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfirmDelete(false); setDeleteText(''); }}>Cancel</Button>
            <Button tone="danger" disabled={deleteText !== 'DELETE'} onClick={deleteForever}>Delete permanently</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 mb-4">This can’t be undone. Your answers, mock boards and analytics will be permanently erased.</p>
        <FormField label='Type "DELETE" to confirm'>
          <Input type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" />
        </FormField>
      </Modal>
    </div>
  );
}
