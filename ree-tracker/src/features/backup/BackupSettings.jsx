// src/features/backup/BackupSettings.jsx
//
// Account › Your data: one file holding your device files, quizzes and account records,
// and a way back from it. A restore shows what it would do first, adds only what's
// missing, and never brings back graded answers.
import { useEffect, useState } from 'react';
import FileDrop from '../../components/FileDrop';
import { Button, Card, FormField, Input, StatusPill } from '../../components/ui';
import { CircleAlert, Download, Lock } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { refreshFiles } from '../my-files/filesStore';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import { formatBytes } from '../../utils/bytes';
import { fetchAccountExport, planAccountRestore, runAccountRestore } from './accountRestore';
import { backupFileName, buildBackup, measureBackup, openBackup, previewDevice, restoreDevice, unlockBackup } from './backupFile';

const dateOf = (iso) => new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const Problem = ({ children }) => (
  <p role="alert" className="text-sm flex items-start gap-1.5 [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
    <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5" /> {children}
  </p>
);

function BackUp({ uid, email }) {
  const [measure, setMeasure] = useState(null);
  const [includeHandouts, setIncludeHandouts] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [repeat, setRepeat] = useState('');
  const [progress, setProgress] = useState(null);
  const [problem, setProblem] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => { measureBackup(uid).then(setMeasure); }, [uid]);

  const mismatch = passphrase && repeat && passphrase !== repeat;
  const ready = !passphrase || passphrase === repeat;
  const run = async () => {
    setProblem(null);
    setDone(null);
    setProgress('Starting…');
    try {
      let account = null;
      let accountNote = null;
      setProgress('Asking the server for your records…');
      try {
        account = await fetchAccountExport();
      } catch (err) {
        accountNote = err?.message === '[OFFLINE]' || err?.message === '[TIMEOUT]'
          ? 'The server couldn’t be reached, so this backup has only what’s on this device.'
          : `Your account records aren’t in this one: ${err?.message}`;
      }
      const blob = await buildBackup(uid, { email, passphrase, includeHandouts, account, onProgress: setProgress });
      const name = backupFileName();
      downloadBlob(blob, name);
      setDone({ name, size: blob.size, accountNote, encrypted: !!passphrase });
    } catch (err) {
      setProblem(err?.message || 'The backup couldn’t be made.');
    } finally {
      setProgress(null);
    }
  };

  if (!canDownloadFiles()) {
    return <p className="text-sm text-muted2">The Android app can’t save files yet. To make a backup, open this page in a browser.</p>;
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {measure && (
        <ul aria-label="What goes in a backup" className="text-sm text-muted2 flex flex-col gap-0.5">
          <li>Your account records: notes, ticks, plans, scores and answers</li>
          <li className="tabular-nums">{plural(measure.ownCount, 'file')} from My files ({formatBytes(measure.ownBytes)})</li>
          <li className="tabular-nums">{plural(measure.quizCount, 'imported quiz').replace('quizs', 'quizzes')} ({formatBytes(measure.quizBytes)})</li>
          <li>Your settings and favourites</li>
        </ul>
      )}
      {measure?.handoutCount > 0 && (
        <label className="flex items-start gap-2.5 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={includeHandouts} onChange={(e) => setIncludeHandouts(e.target.checked)} />
          <span className="tabular-nums">
            Include saved handouts ({plural(measure.handoutCount, 'handout')}, {formatBytes(measure.handoutBytes)})
            <span className="block text-xs text-muted2">You can save them again while you’re online, so they’re left out unless you ask.</span>
          </span>
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Passphrase (optional)" hint="Encrypts the file. If you lose it, nobody can open this backup, including us.">
          <Input type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        </FormField>
        {passphrase && (
          <FormField label="Passphrase again" error={mismatch ? 'These don’t match.' : undefined}>
            <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </FormField>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!!progress || !ready} loading={!!progress} onClick={run}>
          <Download size={15} strokeWidth={1.75} aria-hidden="true" /> Download a backup
        </Button>
        {progress && <p role="status" className="text-sm text-muted2">{progress}</p>}
      </div>
      {problem && <Problem>{problem}</Problem>}
      {done && (
        <div role="status" className="flex flex-col gap-1 text-sm text-muted2 [overflow-wrap:anywhere]">
          <p>Saved {done.name} ({formatBytes(done.size)}){done.encrypted ? ', with your passphrase' : ''}. Keep it somewhere other than this device.</p>
          {done.accountNote && <p>{done.accountNote}</p>}
          {!done.encrypted && <p>It isn’t encrypted, so anyone who gets the file can read it.</p>}
        </div>
      )}
    </div>
  );
}

function Restore({ uid }) {
  const [state, setState] = useState({ step: 'idle' });
  const [passphrase, setPassphrase] = useState('');

  const reset = () => { setState({ step: 'idle' }); setPassphrase(''); };

  const prepare = async (opened, phrase) => {
    const handle = await unlockBackup(opened, phrase);
    const device = await previewDevice(uid, handle);
    const sameAccount = handle.index.uid === uid;
    let plan = null;
    let accountProblem = null;
    if (handle.index.hasAccount && sameAccount) {
      try {
        const [backup, current] = await Promise.all([handle.readAccount(), fetchAccountExport()]);
        plan = planAccountRestore(backup, current);
      } catch (err) {
        accountProblem = err?.message === '[OFFLINE]' || err?.message === '[TIMEOUT]'
          ? 'Your records can’t be compared while you’re offline, so only what’s on this device would come back. Try again when you’re connected for the rest.'
          : `Your records can’t be restored just now: ${err?.message}`;
      }
    }
    setState({ step: 'preview', handle, device, plan, sameAccount, accountProblem });
  };

  const pick = async ([file]) => {
    if (!file) return;
    setPassphrase('');
    setState({ step: 'reading' });
    try {
      const opened = await openBackup(file);
      if (opened.manifest.encrypted) setState({ step: 'locked', opened });
      else await prepare(opened, '');
    } catch (err) {
      setState({ step: 'idle', problem: err?.message || 'That file couldn’t be read.' });
    }
  };
  const unlock = async (e) => {
    e.preventDefault();
    const { opened } = state;
    setState({ step: 'unlocking', opened });
    try {
      await prepare(opened, passphrase);
    } catch (err) {
      if (err?.code === 'wrong-passphrase') setState({ step: 'locked', opened, problem: err.message });
      else setState({ step: 'idle', problem: err?.message || 'That file couldn’t be read.' });
    }
  };
  const go = async () => {
    const { handle, plan } = state;
    setState({ step: 'working', progress: 'Starting…' });
    const onProgress = (progress) => setState({ step: 'working', progress });
    try {
      const device = await restoreDevice(uid, handle, { onProgress });
      await refreshFiles(uid);
      const account = plan?.ops.length ? await runAccountRestore(plan.ops, { onProgress }) : null;
      setState({ step: 'done', device, account });
    } catch (err) {
      setState({ step: 'idle', problem: `${err?.message || 'The restore stopped.'} Anything already restored stays, and running it again picks up the rest.` });
    }
  };

  const { step } = state;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {(step === 'idle' || step === 'reading') && (
        <>
          <FileDrop compact label="Choose a backup file or drag it here" title="Restore from a backup" hint={step === 'reading' ? 'Reading…' : 'Choose a .reebak file. You’ll see what it holds before anything changes.'} accept=".reebak" onFiles={pick} />
          {state.problem && <Problem>{state.problem}</Problem>}
        </>
      )}

      {(step === 'locked' || step === 'unlocking') && (
        <form onSubmit={unlock} className="flex flex-col gap-3">
          <FormField label="This backup’s passphrase" error={state.problem || undefined}>
            <Input type="password" autoComplete="off" autoFocus value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </FormField>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button type="submit" disabled={!passphrase || step === 'unlocking'} loading={step === 'unlocking'}><Lock size={14} strokeWidth={1.75} aria-hidden="true" /> Open</Button>
          </div>
        </form>
      )}

      {step === 'preview' && (
        <Card padding="sm" className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-textMain">Made {dateOf(state.handle.index.createdAt)}</p>
            {state.sameAccount ? <StatusPill tone="success">Your account</StatusPill> : <StatusPill tone="amber">Another account</StatusPill>}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-eyebrow">On this device</p>
            <ul className="text-sm text-muted2 tabular-nums flex flex-col gap-0.5">
              <li>{plural(state.device.newFiles.length, 'file')} to add{state.device.filesHere ? `, ${state.device.filesHere} already here` : ''}</li>
              <li>{plural(state.device.newQuizzes.length, 'quiz').replace('quizs', 'quizzes')} to add{state.device.quizzesHere ? `, ${state.device.quizzesHere} already here` : ''}</li>
            </ul>
          </div>
          {state.plan && (
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-eyebrow">Your records</p>
              {state.plan.kinds.length === 0 ? <p className="text-sm text-muted2">Nothing of this kind in the file.</p> : (
                <ul aria-label="Your records" className="text-sm text-muted2 tabular-nums flex flex-col gap-0.5">
                  {state.plan.kinds.map((k) => <li key={k.key}>{k.label}: {k.add} to add{k.already ? `, ${k.already} already here` : ''}</li>)}
                </ul>
              )}
            </div>
          )}
          {!state.sameAccount && <p className="text-sm text-muted2">It’s from {state.handle.index.email || 'another account'}, so only its files and quizzes can come onto this device. Its records stay on that account.</p>}
          {state.accountProblem && <p className="text-sm text-muted2">{state.accountProblem}</p>}
          <p className="text-sm text-muted2">Only what’s missing is added. Nothing here is overwritten, so anything newer stays as it is.</p>
          <p className="text-sm text-muted2">Answers, ratings and streaks are in the file for you to keep, but they’re never restored: only the server grades answers.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button onClick={go} disabled={state.device.newFiles.length + state.handle.index.quizzes.length + (state.plan?.ops.length || 0) === 0}>Restore</Button>
          </div>
        </Card>
      )}

      {step === 'working' && <p role="status" className="text-sm text-muted2">{state.progress}</p>}

      {step === 'done' && (
        <div role="status" className="flex flex-col gap-1.5 text-sm text-muted2 min-w-0">
          <p className="font-medium text-textMain">Restored {plural(state.device.files, 'file')} and {plural(state.device.quizzes, 'quiz').replace('quizs', 'quizzes')}{state.account ? `, and ${plural(state.account.added, 'record')}` : ''}.</p>
          {state.account?.stopped && <p>The connection dropped, so some records didn’t come back. Run the restore again to add the rest.</p>}
          {state.account?.failed.length > 0 && (
            <div>
              <p>{plural(state.account.failed.length, 'record')} couldn’t be added:</p>
              <ul className="list-disc pl-5">
                {state.account.failed.slice(0, 5).map((f, i) => <li key={i} className="[overflow-wrap:anywhere]">{f.kind}: {f.reason}</li>)}
              </ul>
            </div>
          )}
          <div><Button variant="secondary" onClick={reset}>Done</Button></div>
        </div>
      )}
    </div>
  );
}

export default function BackupSettings() {
  const { currentUser } = useAuth() || {};
  const uid = currentUser?.uid;
  const email = currentUser?.email || null;
  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="flex flex-col gap-2 min-w-0">
        <p className="text-sm font-medium text-textMain">Download a backup</p>
        <p className="text-xs text-muted2">One file with what’s on this device and your account’s records. It’s the real safety net, since a browser can clear its storage. Do it now and then.</p>
        <BackUp uid={uid} email={email} />
      </div>
      <div className="border-t border-border2/60 pt-5 flex flex-col gap-2 min-w-0">
        <p className="text-sm font-medium text-textMain">Restore</p>
        <Restore uid={uid} />
      </div>
    </div>
  );
}
