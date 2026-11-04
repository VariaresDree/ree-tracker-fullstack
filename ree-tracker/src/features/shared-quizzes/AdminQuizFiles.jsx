// src/features/shared-quizzes/AdminQuizFiles.jsx
//
// Admin > Handouts > Quiz files: what every learner can download in Library >
// Imported quizzes. Each file is read here first, so what it holds shows before
// anything uploads. Bad records are the file's, not the app's: they're counted.
import { useEffect, useRef, useState } from 'react';
import { CANONICAL_SUBJECTS } from '@ree/shared';
import { Button, Card, EmptyState, FormField, Input, Modal, Select, Skeleton, Textarea } from '../../components/ui';
import { FileText, Pencil, RefreshCw, Trash2, X } from '../../components/ui/icons';
import { parseCaqArchive } from '../quiz-launcher/caqParser';
import QuizFilePicker from '../quiz-launcher/QuizFilePicker';
import { deleteQuizFile, listQuizFiles, plainError, replaceQuizFile, updateQuizFile, uploadQuizFile } from './quizFilesApi';
import { countLine, formatSize } from './sharedState';

const MAX_BYTES = 5 * 1024 * 1024;
const TOO_BIG = 'Quiz files can be up to 5 MB.';
const nameOf = (fileName) => fileName.replace(/\.[^.]+$/, '');
const byName = (a, b) => a.name.localeCompare(b.name);

/** The file's own numbers, or why it can't go up. */
async function readQuiz(file) {
  if (file.size > MAX_BYTES) throw new Error(TOO_BIG);
  const { meta } = await parseCaqArchive(await file.arrayBuffer());
  if (!meta.loadedCount) throw new Error('No questions could be read from this file.');
  return { questionCount: meta.loadedCount, skippedCount: meta.skippedCount || 0 };
}

function SubjectField({ value, onChange }) {
  return (
    <FormField label="Subject">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">General</option>
        {CANONICAL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
    </FormField>
  );
}

function StagedFile({ item, onChange, onRemove }) {
  return (
    <Card as="li" padding="sm" className="flex flex-col gap-3 min-w-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-textMain [overflow-wrap:anywhere]">{item.file.name}</p>
          {item.status === 'reading' && <p className="text-xs text-muted2">Reading…</p>}
          {item.counts && <p className="text-xs" style={{ color: 'var(--accent-success)' }}>{countLine(item.counts.questionCount, item.counts.skippedCount)}</p>}
          {item.error && <p role="alert" className="text-xs [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>{item.error}</p>}
        </div>
        <Button size="icon" variant="ghost" aria-label={`Remove ${item.file.name}`} onClick={onRemove}>
          <X size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      {item.counts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Name"><Input value={item.name} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} /></FormField>
          <SubjectField value={item.subject} onChange={(subject) => onChange({ subject })} />
          <FormField label="Description (optional)" className="sm:col-span-2">
            <Input value={item.description} maxLength={300} onChange={(e) => onChange({ description: e.target.value })} />
          </FormField>
        </div>
      )}
    </Card>
  );
}

function EditDialog({ file, onClose, onSaved }) {
  const [form, setForm] = useState({ name: file.name, subject: file.subject || '', description: file.description || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateQuizFile(file.id, { name: form.name, subject: form.subject || null, description: form.description }));
    } catch (err) {
      setError(plainError(err));
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit quiz file"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving || !form.name.trim()} onClick={save}>Save</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3">
        <FormField label="Name" error={error}><Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
        <SubjectField value={form.subject} onChange={(subject) => setForm({ ...form, subject })} />
        <FormField label="Description (optional)">
          <Textarea rows={2} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function AdminQuizFiles() {
  const [list, setList] = useState({ status: 'loading', files: [] });
  const [staged, setStaged] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [working, setWorking] = useState(false);
  const replaceInput = useRef(null);
  const replaceTarget = useRef(null);
  const nextKey = useRef(0);

  useEffect(() => {
    let live = true;
    listQuizFiles().then(
      (files) => { if (live) setList({ status: 'ready', files }); },
      (err) => { if (live) setList({ status: 'error', files: [], error: plainError(err) }); },
    );
    return () => { live = false; };
  }, []);

  const putInList = (item) => setList((l) => ({ ...l, files: [...l.files.filter((f) => f.id !== item.id), item].sort(byName) }));
  const patchStaged = (key, patch) => setStaged((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const stage = (files) => files.forEach(async (file) => {
    const key = nextKey.current++;
    setStaged((all) => [...all, { key, file, status: 'reading', name: nameOf(file.name), subject: '', description: '' }]);
    try {
      patchStaged(key, { status: 'ready', counts: await readQuiz(file) });
    } catch (err) {
      patchStaged(key, { status: 'bad', error: err?.message || "This doesn't look like a valid quiz file." });
    }
  });

  const ready = staged.filter((s) => s.status === 'ready' && s.name.trim());
  const uploadAll = async () => {
    setUploading(true);
    for (const item of ready) {
      patchStaged(item.key, { error: null });
      try {
        putInList(await uploadQuizFile({
          name: item.name,
          fileName: item.file.name,
          subject: item.subject,
          description: item.description,
          ...item.counts,
        }, item.file));
        setStaged((all) => all.filter((s) => s.key !== item.key));
      } catch (err) {
        patchStaged(item.key, { error: plainError(err) });
      }
    }
    setUploading(false);
  };

  const pickReplacement = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !replaceTarget.current) return;
    setActionError(null);
    const target = replaceTarget.current;
    try {
      if (!/\.(quiz|caq)$/i.test(file.name)) throw new Error(`${file.name} isn’t a quiz file.`);
      setReplacing({ target, file, counts: await readQuiz(file) });
    } catch (err) {
      setReplacing({ target, file, error: err?.message || "This doesn't look like a valid quiz file." });
    }
  };
  const confirmReplace = async () => {
    setWorking(true);
    setActionError(null);
    try {
      putInList(await replaceQuizFile(replacing.target.id, { fileName: replacing.file.name, ...replacing.counts }, replacing.file));
      setReplacing(null);
    } catch (err) {
      setActionError(plainError(err));
    } finally {
      setWorking(false);
    }
  };
  const confirmDelete = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await deleteQuizFile(deleting.id);
      setList((l) => ({ ...l, files: l.files.filter((f) => f.id !== deleting.id) }));
      setDeleting(null);
    } catch (err) {
      setActionError(plainError(err));
    } finally {
      setWorking(false);
    }
  };
  const closeDialogs = () => { setDeleting(null); setReplacing(null); setActionError(null); };

  const total = list.files.reduce((sum, f) => sum + f.sizeBytes, 0);

  return (
    <section aria-labelledby="admin-quiz-files" className="flex flex-col gap-4 min-w-0">
      <div>
        <h2 id="admin-quiz-files" className="text-h3 text-textMain">Quiz files</h2>
        <p className="text-sm text-muted2">Every learner can download these in Library › Imported quizzes. Scores on them never count toward progress.</p>
      </div>

      <QuizFilePicker compact onFilesSelected={stage} />

      {staged.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul aria-label="Files to upload" className="flex flex-col gap-2">
            {staged.map((item) => (
              <StagedFile
                key={item.key}
                item={item}
                onChange={(patch) => patchStaged(item.key, patch)}
                onRemove={() => setStaged((all) => all.filter((s) => s.key !== item.key))}
              />
            ))}
          </ul>
          <div>
            <Button loading={uploading} disabled={uploading || ready.length === 0} onClick={uploadAll}>
              Upload {ready.length === 1 ? 'file' : `${ready.length} files`}
            </Button>
          </div>
        </div>
      )}

      {list.status === 'loading' && <Skeleton className="h-20" />}
      {list.status === 'error' && <p role="alert" className="text-sm" style={{ color: 'var(--accent-danger)' }}>{list.error}</p>}
      {list.status === 'ready' && list.files.length === 0 && staged.length === 0 && (
        <EmptyState compact icon={FileText} title="No quiz files shared yet" description="Add a .quiz or .caq file above. You’ll see what it holds before it uploads." />
      )}
      {list.files.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id="shared-quiz-list" className="text-eyebrow tabular-nums">{list.files.length} shared · {formatSize(total)} in the database</p>
          <ul aria-labelledby="shared-quiz-list" className="flex flex-col gap-2">
            {list.files.map((file) => (
              <Card as="li" padding="sm" key={file.id} className="flex flex-wrap items-center gap-2 min-w-0">
                <div className="flex-1 min-w-[10rem]">
                  <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{file.name}</p>
                  <p className="text-xs text-muted2 tabular-nums">{file.subject || 'General'} · {countLine(file.questionCount, file.skippedCount)} · {formatSize(file.sizeBytes)}</p>
                  {file.description && <p className="text-xs text-muted2 [overflow-wrap:anywhere]">{file.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" title="Edit" aria-label={`Edit ${file.name}`} onClick={() => setEditing(file)}>
                    <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Replace the file" aria-label={`Replace the file for ${file.name}`} onClick={() => { replaceTarget.current = file; replaceInput.current?.click(); }}>
                    <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" aria-label={`Delete ${file.name}`} onClick={() => setDeleting(file)}>
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        </div>
      )}

      <input ref={replaceInput} type="file" accept=".quiz,.caq" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={pickReplacement} />

      {editing && (
        <EditDialog file={editing} onClose={() => setEditing(null)} onSaved={(item) => { putInList(item); setEditing(null); }} />
      )}

      <Modal
        open={!!replacing}
        onClose={closeDialogs}
        title="Replace this file?"
        footer={(
          <>
            <Button variant="secondary" onClick={closeDialogs}>Cancel</Button>
            <Button loading={working} disabled={working || !replacing?.counts} onClick={confirmReplace}>Replace</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-muted2 [overflow-wrap:anywhere]">
          {replacing?.counts ? (
            <>
              <p><span className="text-textMain font-medium">{replacing.file.name}</span> holds {countLine(replacing.counts.questionCount, replacing.counts.skippedCount)}.</p>
              <p>It stays as {replacing.target.name}. Anyone who downloaded the old one sees Update available.</p>
            </>
          ) : <p role="alert" style={{ color: 'var(--accent-danger)' }}>{replacing?.error}</p>}
          {actionError && <p role="alert" style={{ color: 'var(--accent-danger)' }}>{actionError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={closeDialogs}
        title="Delete this quiz file?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={closeDialogs}>Keep it</Button>
            <Button tone="danger" loading={working} disabled={working} onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-muted2 [overflow-wrap:anywhere]">
          <p>{deleting?.name} stops being available to download. Anyone who already downloaded it keeps their copy.</p>
          {actionError && <p role="alert" style={{ color: 'var(--accent-danger)' }}>{actionError}</p>}
        </div>
      </Modal>
    </section>
  );
}
