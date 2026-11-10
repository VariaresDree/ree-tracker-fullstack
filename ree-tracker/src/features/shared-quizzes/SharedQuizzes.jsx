// src/features/shared-quizzes/SharedQuizzes.jsx
//
// Library > Imported quizzes > Shared quizzes: what the admin has shared, by subject.
// Download keeps a copy on this device, in the same list as files you added, so
// from then on it works offline and its scores stay here too. A changed file shows
// Update available. Nothing shared yet, or an older server, shows nothing at all.
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button, Card, Grid, StatusPill } from '../../components/ui';
import { Download, Play, RefreshCw } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import { addDownloadedQuiz, useQuizSession } from '../quiz-launcher/quizSession';
import { downloadQuizFile, lastQuizFiles, listQuizFiles, plainError } from './quizFilesApi';
import { bySubject, countLine, deviceFileName, formatSize, sharedState } from './sharedState';

export function SharedTile({ file, entries, onStart, where }) {
  const uid = useAuth()?.currentUser?.uid;
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const { kind, entry } = sharedState(file, entries);

  const run = async (what, work) => {
    setBusy(what);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(plainError(err));
    } finally {
      setBusy(null);
    }
  };
  const keep = () => run('keep', async () => {
    const buffer = await downloadQuizFile(file.id);
    await addDownloadedQuiz(uid, {
      buffer,
      fileName: deviceFileName(file),
      shared: { id: file.id, checksum: file.checksum },
      replaces: kind === 'update' ? entry.id : undefined,
    });
  });
  const saveFile = () => run('save', async () => {
    const blob = kind === 'saved' && entry.file ? entry.file : new Blob([await downloadQuizFile(file.id)]);
    await downloadBlob(blob, deviceFileName(file));
  });

  return (
    <Card as="li" padding="sm" className="flex flex-col gap-3 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{file.name}</p>
        {file.description && <p className="text-xs text-muted2 mt-0.5 [overflow-wrap:anywhere]">{file.description}</p>}
        <p className="text-xs text-muted2 mt-1 tabular-nums">{countLine(file.questionCount)} · {formatSize(file.sizeBytes)}</p>
        {where && <p className="text-xs text-muted2 mt-0.5 [overflow-wrap:anywhere]">{where}</p>}
      </div>
      {kind !== 'new' && (
        <div>
          {kind === 'saved'
            ? <StatusPill tone="success">On this device</StatusPill>
            : <StatusPill tone="amber">Update available</StatusPill>}
        </div>
      )}
      {error && <p role="alert" className="text-xs [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>{error}</p>}
      <div className="flex items-center gap-1.5">
        {kind === 'saved' && (
          <Button size="sm" onClick={() => onStart(entry.id)} aria-label={`Start ${file.name}`}>
            <Play size={13} strokeWidth={1.75} aria-hidden="true" /> Start
          </Button>
        )}
        {kind === 'update' && (
          <Button size="sm" loading={busy === 'keep'} disabled={!!busy} onClick={keep} aria-label={`Update ${file.name}`}>
            <RefreshCw size={13} strokeWidth={1.75} aria-hidden="true" /> Update
          </Button>
        )}
        {kind === 'new' && (
          <Button size="sm" loading={busy === 'keep'} disabled={!!busy} onClick={keep} aria-label={`Download ${file.name}`}>
            <Download size={13} strokeWidth={1.75} aria-hidden="true" /> Download
          </Button>
        )}
        {canDownloadFiles() && (
          <Button size="sm" variant="ghost" className="ml-auto" disabled={!!busy} aria-label={`Save ${file.name} as a file`} onClick={saveFile}>Save file</Button>
        )}
      </div>
    </Card>
  );
}

export default function SharedQuizzes() {
  const location = useLocation();
  const [, setParams] = useSearchParams();
  const { entries } = useQuizSession();
  const [state, setState] = useState(() => {
    const files = lastQuizFiles();
    return files ? { status: 'ready', files } : { status: 'loading', files: [] };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    listQuizFiles().then(
      (files) => { if (live) setState({ status: 'ready', files }); },
      (err) => {
        if (!live || lastQuizFiles()) return;
        if (err?.status === 404) setState({ status: 'ready', files: [] });
        else setState({ status: err?.message === '[OFFLINE]' ? 'offline' : 'error', files: [], error: plainError(err) });
      },
    );
    return () => { live = false; };
  }, [attempt]);

  const start = (id) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('quiz', id);
    return next;
  }, { state: { ...location.state, quizSheet: true } });

  if (state.status === 'loading' || (state.status === 'ready' && state.files.length === 0)) return null;
  if (state.status === 'offline') {
    return <p className="text-sm text-muted2">Shared quizzes need a connection. Any you’ve downloaded are above.</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted2 min-w-0">Shared quizzes didn’t load. {state.error}</p>
        <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </div>
    );
  }

  return (
    <section aria-labelledby="shared-quizzes" className="flex flex-col gap-3 min-w-0">
      <div>
        <h3 id="shared-quizzes" className="text-h3 text-textMain">Shared quizzes</h3>
        <p className="text-sm text-muted2">Download one and it stays on this device, ready offline.</p>
      </div>
      {bySubject(state.files).map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p id={`shared-${group.label}`} className="text-eyebrow">{group.label}</p>
          <Grid kind="cards" as="ul" aria-labelledby={`shared-${group.label}`}>
            {group.files.map((file) => <SharedTile key={file.id} file={file} entries={entries} onStart={start} />)}
          </Grid>
        </div>
      ))}
    </section>
  );
}
