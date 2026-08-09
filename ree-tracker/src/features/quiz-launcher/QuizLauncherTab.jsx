// src/features/quiz-launcher/QuizLauncherTab.jsx
// Materials Hub entry point for the offline CAQ Quiz Launcher. Owns the list
// of files the user has picked, parses each independently (so one bad file
// in a batch doesn't block the rest), and hands a ready one to CaqRunner —
// selecting several files runs them one at a time, per-topic, rather than
// merging them into a single mixed exam.
//
// State here is plain component state, never src/store — this whole feature
// is a sandbox. Parse failures are handled explicitly per-entry rather than
// relying on the wrapping ErrorBoundary: a malformed file is an EXPECTED
// outcome for a third-party format, not an app bug, and deserves an inline
// "try another file" message rather than the boundary's generic crash UI.
import { useCallback, useState } from 'react';
import { Button } from '../../components/ui';
import { FileText, Play, Trash2, Clock, CircleAlert, CheckCircle2 } from '../../components/ui/icons';
import QuizFilePicker from './QuizFilePicker';
import CaqRunner from './CaqRunner';
import { parseCaqArchive } from './caqParser';

let nextEntryId = 0;

export default function QuizLauncherTab() {
  const [entries, setEntries] = useState([]); // { id, fileName, status: 'parsing'|'ready'|'error', result, error }
  const [activeEntryId, setActiveEntryId] = useState(null);

  const handleFilesSelected = useCallback((files) => {
    const newEntries = files.map((file) => ({ id: nextEntryId++, fileName: file.name, status: 'parsing', file, result: null, error: null }));
    setEntries((prev) => [...prev, ...newEntries]);

    newEntries.forEach(async (entry) => {
      try {
        const buffer = await entry.file.arrayBuffer();
        const result = await parseCaqArchive(buffer);
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: 'ready', result } : e)));
      } catch (err) {
        setEntries((prev) => prev.map((e) => (
          e.id === entry.id ? { ...e, status: 'error', error: err?.message || "This doesn't look like a valid quiz file." } : e
        )));
      }
    });
  }, []);

  const removeEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const activeEntry = entries.find((e) => e.id === activeEntryId) || null;

  if (activeEntry?.status === 'ready') {
    return (
      <CaqRunner
        fileName={activeEntry.fileName}
        questions={activeEntry.result.questions}
        warnings={activeEntry.result.warnings}
        onExit={() => setActiveEntryId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-display text-2xl text-textMain tracking-tight">Quiz Launcher</h2>
        <p className="text-sm text-muted2 mt-1">
          Import your own quiz files and run them as a practice exam — entirely offline, entirely on
          this device.
        </p>
      </div>

      <QuizFilePicker onFilesSelected={handleFilesSelected} />

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow">Loaded files</p>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-lg)] p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] shrink-0 bg-surface2 text-muted2">
                <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-textMain truncate" title={entry.fileName}>{entry.fileName}</p>
                {entry.status === 'parsing' && (
                  <p className="text-xs text-muted2 flex items-center gap-1.5"><Clock size={12} strokeWidth={1.75} aria-hidden="true" /> Reading…</p>
                )}
                {entry.status === 'ready' && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent-success)' }}>
                    <CheckCircle2 size={12} strokeWidth={1.75} aria-hidden="true" />
                    {entry.result.meta.loadedCount} question{entry.result.meta.loadedCount === 1 ? '' : 's'} loaded
                    {entry.result.meta.skippedCount > 0 && `, ${entry.result.meta.skippedCount} skipped`}
                  </p>
                )}
                {entry.status === 'error' && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent-danger)' }}>
                    <CircleAlert size={12} strokeWidth={1.75} aria-hidden="true" /> {entry.error}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {entry.status === 'ready' && (
                  <Button size="sm" variant="primary" onClick={() => setActiveEntryId(entry.id)}>
                    <Play size={13} strokeWidth={1.75} aria-hidden="true" /> Start
                  </Button>
                )}
                <Button size="icon" variant="ghost" aria-label={`Remove ${entry.fileName}`} onClick={() => removeEntry(entry.id)}>
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
