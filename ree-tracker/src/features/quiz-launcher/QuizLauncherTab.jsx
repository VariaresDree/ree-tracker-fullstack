// src/features/quiz-launcher/QuizLauncherTab.jsx
//
// Library › Imported quizzes: your quiz files, saved on this device, each taken as
// practice or as an exam. A malformed file is an EXPECTED outcome for a third-party
// format, not an app bug, so it gets an inline message rather than the error
// boundary. Starting opens a sheet in ?quiz=<id>, so Back closes it.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, EmptyState, IconChip, Modal } from '../../components/ui';
import { CheckCircle2, CircleAlert, Clock, Download, FileText, Lock, Play, Trash2 } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import QuizFilePicker from './QuizFilePicker';
import QuizSetupSheet from './QuizSetupSheet';
import { buildRun, runProgress } from './quizRun';
import { addQuizFiles, dismissQuizError, refreshQuizzes, removeQuiz, useQuizSession } from './quizSession';
import { saveRun } from './quizStore';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function scoreLine(attempts = []) {
  if (attempts.length === 0) return null;
  const last = attempts[attempts.length - 1];
  const best = Math.max(...attempts.map((a) => a.pct));
  return attempts.length === 1 ? `Scored ${last.pct}%` : `Last ${last.pct}% · Best ${best}%`;
}

function QuizRow({ entry, onStart, onResume, onDelete }) {
  if (entry.status === 'parsing') {
    return (
      <Card as="li" padding="sm" className="flex items-center gap-3">
        <IconChip icon={FileText} tone="muted" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-textMain truncate" title={entry.fileName}>{entry.fileName}</p>
          <p className="text-xs text-muted2 flex items-center gap-1.5"><Clock size={12} strokeWidth={1.75} aria-hidden="true" /> Reading…</p>
        </div>
      </Card>
    );
  }
  if (entry.status === 'error') {
    return (
      <Card as="li" padding="sm" className="flex items-center gap-3">
        <IconChip icon={FileText} tone="muted" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-textMain truncate" title={entry.fileName}>{entry.fileName}</p>
          <p className="text-xs flex items-center gap-1.5 [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
            <CircleAlert size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0" /> {entry.error}
          </p>
        </div>
        <Button size="icon" variant="ghost" aria-label={`Remove ${entry.fileName}`} onClick={() => dismissQuizError(entry.id)}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </Card>
    );
  }

  const { loadedCount, skippedCount } = entry.result.meta;
  const unfinished = entry.run && !entry.run.finished ? runProgress(entry.run) : null;
  const scores = scoreLine(entry.attempts);
  return (
    <Card as="li" padding="sm" className="flex flex-wrap items-center gap-3">
      <IconChip icon={FileText} tone="muted" size="sm" />
      <div className="flex-1 min-w-[10rem]">
        <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{entry.fileName}</p>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent-success)' }}>
          <CheckCircle2 size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          {plural(loadedCount, 'question')} loaded{skippedCount > 0 && `, ${skippedCount} skipped`}
        </p>
        {scores && <p className="text-xs text-muted2 tabular-nums">{scores}</p>}
        {unfinished && <p className="text-xs text-muted2 tabular-nums">Unfinished: {unfinished.answered} of {unfinished.total} answered</p>}
        {entry.onlyInMemory && <p className="text-xs text-muted2">This browser isn’t saving files, so this one goes when you close the tab.</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {unfinished && <Button size="sm" onClick={() => onResume(entry)}><Play size={13} strokeWidth={1.75} aria-hidden="true" /> Resume</Button>}
        <Button size="sm" variant={unfinished ? 'secondary' : 'primary'} onClick={() => onStart(entry)} aria-label={`Start ${entry.fileName}`}>
          {!unfinished && <Play size={13} strokeWidth={1.75} aria-hidden="true" />} {unfinished ? 'Start over' : 'Start'}
        </Button>
        {canDownloadFiles() && entry.file && (
          <Button size="icon" variant="ghost" aria-label={`Save ${entry.fileName} as a file`} title="Save as a file" onClick={() => downloadBlob(entry.file, entry.fileName)}>
            <Download size={15} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
        <Button size="icon" variant="ghost" aria-label={`Delete ${entry.fileName}`} title="Delete" onClick={() => onDelete(entry)}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

// `shared` is the quizzes everyone can download. It's a slot, from Library, because
// that part talks to the server and nothing in this folder may.
export default function QuizLauncherTab({ shared = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuth()?.currentUser?.uid;
  const { entries, loaded } = useQuizSession();
  const [params, setParams] = useSearchParams();
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { refreshQuizzes(uid); }, [uid]);

  const openId = params.get('quiz');
  const open = entries.find((e) => e.id === openId && e.status === 'ready') || null;
  const withoutSheet = (prev) => {
    const next = new URLSearchParams(prev);
    next.delete('quiz');
    return next;
  };
  const openSheet = (entry) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('quiz', entry.id);
    return next;
  }, { state: { quizSheet: true } });
  const closeSheet = () => {
    if (location.state?.quizSheet) navigate(-1);
    else setParams(withoutSheet, { replace: true });
  };

  const runPage = (entry) => navigate(`/library/quiz?id=${encodeURIComponent(entry.id)}`);
  const start = async (setup) => {
    await saveRun(uid, open.id, buildRun(open.result.questions, setup));
    runPage(open);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        {/* The tab already says "Imported quizzes"; the heading stays for
            screen readers' heading list. */}
        <h2 className="sr-only">Imported quizzes</h2>
        <p className="text-sm text-muted2">
          Your own quiz files, saved on this device. Take each one as practice or as an exam.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p id="loaded-quiz-files" className="text-eyebrow">Your quizzes</p>
          <ul aria-labelledby="loaded-quiz-files" className="flex flex-col gap-2">
            {entries.map((entry) => (
              <QuizRow key={entry.id} entry={entry} onStart={openSheet} onResume={runPage} onDelete={setDeleting} />
            ))}
          </ul>
        </div>
      ) : loaded && (
        <EmptyState compact icon={FileText} title="No quizzes yet" description="Add a .quiz or .caq file and it stays here, ready to take offline." />
      )}

      {shared}

      <QuizFilePicker compact={entries.length > 0} onFilesSelected={(files) => addQuizFiles(uid, files)} />

      {/* Persistent, unmissable: not a tooltip a user could miss before starting. */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-default)] border border-border2 bg-surface2/40 p-3.5">
        <Lock size={15} strokeWidth={1.75} className="shrink-0 mt-0.5 text-muted2" aria-hidden="true" />
        <p className="text-xs text-muted2 leading-relaxed">
          Saved only on this device. Files you add are never uploaded, and scores here don't affect
          your progress, streak or readiness. Clearing this browser's data removes them.
        </p>
      </div>

      {open && <QuizSetupSheet quiz={open} onClose={closeSheet} onStart={start} />}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this quiz?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button tone="danger" onClick={() => { removeQuiz(uid, deleting.id); setDeleting(null); }}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 [overflow-wrap:anywhere]">{deleting?.fileName} and its scores go from this device. You can add the file again if you still have it.</p>
      </Modal>
    </div>
  );
}
