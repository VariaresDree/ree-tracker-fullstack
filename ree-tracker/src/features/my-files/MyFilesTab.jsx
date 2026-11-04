// src/features/my-files/MyFilesTab.jsx
//
// Library › My files: PDFs, images, text and audio on this device, never uploaded.
// They survive a restart and open offline. An open file is in ?file=<id>, so Back
// closes it. Handouts saved for offline live here too.
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FileDrop from '../../components/FileDrop';
import { Button, Card, EmptyState, FormField, IconChip, Input, Modal, StatusPill } from '../../components/ui';
import { CircleAlert, Clock, Download, FileAudio, FileImage, FileText, FileType, Lock, Pencil, Search, Trash2 } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fileKind, getDeviceFileBlob, MAX_FILE_BYTES } from '../../services/deviceFiles';
import { formatBytes } from '../../utils/bytes';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import { addFile, removeFile, renameFile, useMyFiles } from './filesStore';
import LocalFileViewer from './LocalFileViewer';

const ACCEPT = '.pdf,image/*,audio/*,text/*,.txt,.md,.csv';
const KIND = {
  pdf: { label: 'PDF', icon: FileText },
  image: { label: 'Image', icon: FileImage },
  audio: { label: 'Audio', icon: FileAudio },
  text: { label: 'Text', icon: FileType },
};
const dateOf = (at) => new Date(at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' });

function FileRow({ file, uid, onOpen, onRename, onDelete }) {
  const kind = KIND[file.kind] || KIND.text;
  const save = async () => {
    const blob = await getDeviceFileBlob(uid, file.id);
    if (blob) await downloadBlob(blob, file.name);
  };
  return (
    <Card as="li" padding="sm" className="flex flex-wrap items-center gap-3 min-w-0">
      <IconChip icon={kind.icon} tone="muted" size="sm" />
      <div className="flex-1 min-w-[10rem]">
        <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{file.name}</p>
        <p className="text-xs text-muted2 tabular-nums">{kind.label} · {formatBytes(file.size)} · {dateOf(file.addedAt)}</p>
        {file.source?.kind === 'handout' && <div className="mt-1"><StatusPill tone="neutral" dot={false}>Saved handout</StatusPill></div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={() => onOpen(file)} aria-label={`Open ${file.name}`}>Open</Button>
        <Button size="icon" variant="ghost" aria-label={`Rename ${file.name}`} title="Rename" onClick={() => onRename(file)}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        {canDownloadFiles() && (
          <Button size="icon" variant="ghost" aria-label={`Save ${file.name} outside the app`} title="Save outside the app" onClick={save}>
            <Download size={15} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
        <Button size="icon" variant="ghost" aria-label={`Delete ${file.name}`} title="Delete" onClick={() => onDelete(file)}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

export default function MyFilesTab() {
  const uid = useAuth()?.currentUser?.uid;
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { files, loaded } = useMyFiles(uid);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState(null);

  const openId = params.get('file');
  const open = files.find((f) => f.id === openId) || null;
  const openFile = (file) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('file', file.id);
    return next;
  }, { state: { fileViewer: true } });
  const closeFile = () => {
    if (location.state?.fileViewer) navigate(-1);
    else setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('file');
      return next;
    }, { replace: true });
  };

  const add = (picked) => {
    setProblems([]);
    picked.forEach(async (file) => {
      const kind = fileKind(file);
      if (!kind) {
        setProblems((list) => [...list, `${file.name} can’t be opened here. Add a PDF, image, text or audio file.`]);
        return;
      }
      setBusy((n) => n + 1);
      try {
        await addFile(uid, file, { name: file.name, kind });
      } catch (err) {
        setProblems((list) => [...list, `${file.name}: ${err.message}`]);
      } finally {
        setBusy((n) => n - 1);
      }
    });
  };

  const startRename = (file) => { setRenaming(file); setNewName(file.name); setActionError(null); };
  const saveName = async () => {
    try {
      await renameFile(uid, renaming.id, newName.trim());
      setRenaming(null);
    } catch (err) {
      setActionError(err.message);
    }
  };
  const confirmDelete = async () => {
    await removeFile(uid, deleting.id);
    setDeleting(null);
  };

  const q = query.trim().toLowerCase();
  const shown = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  const total = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div>
        <h2 className="sr-only">My files</h2>
        <p className="text-sm text-muted2">Your own PDFs, images, notes and audio, ready offline. They stay on this device.</p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormField label="Search your files" className="flex-1 min-w-[12rem]">
            {(field) => (
              <div className="relative">
                <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <Input {...field} className="pl-9" value={query} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
          </FormField>
          <p className="text-xs text-muted2 tabular-nums">
            {files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(total)} · <Link to="/account#offline" className="inline-flex items-center pointer-coarse:min-h-11 pointer-coarse:min-w-11 underline">Storage</Link>
          </p>
        </div>
      )}

      {busy > 0 && (
        <p role="status" className="text-sm text-muted2 flex items-center gap-1.5">
          <Clock size={14} strokeWidth={1.75} aria-hidden="true" /> Saving {busy === 1 ? 'a file' : `${busy} files`}…
        </p>
      )}
      {problems.map((problem) => (
        <p key={problem} role="alert" className="text-sm flex items-start gap-1.5 [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
          <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5" /> {problem}
        </p>
      ))}

      {shown.length > 0 ? (
        <ul aria-label="Your files" className="flex flex-col gap-2 min-w-0">
          {shown.map((file) => <FileRow key={file.id} file={file} uid={uid} onOpen={openFile} onRename={startRename} onDelete={setDeleting} />)}
        </ul>
      ) : loaded && (q
        ? <EmptyState compact icon={Search} title="Nothing matches" description={`No file has “${query.trim()}” in its name.`} />
        : <EmptyState compact icon={FileText} title="No files yet" description="Add a file below, or save a handout for offline from Handouts." />)}

      <FileDrop
        label="Choose files or drag them here"
        title="Drop files here, or tap to browse"
        hint={`PDF, image, text or audio, up to ${formatBytes(MAX_FILE_BYTES)} each.`}
        accept={ACCEPT}
        compact={files.length > 0}
        onFiles={add}
      />

      <div className="flex items-start gap-2.5 rounded-[var(--radius-default)] border border-border2 bg-surface2/40 p-3.5">
        <Lock size={15} strokeWidth={1.75} className="shrink-0 mt-0.5 text-muted2" aria-hidden="true" />
        <p className="text-xs text-muted2 leading-relaxed">
          Saved only on this device and never uploaded. Clearing this browser’s data removes them, and they won’t appear on your other devices.
        </p>
      </div>

      {open && (
        <Modal open fullscreen closeOnBackdrop={false} onClose={closeFile} title={open.name}>
          <LocalFileViewer uid={uid} file={open} />
        </Modal>
      )}

      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename this file"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button disabled={!newName.trim()} onClick={saveName}>Save</Button>
          </>
        )}
      >
        <FormField label="Name" error={actionError || undefined}>
          <Input value={newName} maxLength={200} autoComplete="off" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) saveName(); }} />
        </FormField>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this file?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button tone="danger" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 [overflow-wrap:anywhere]">
          {deleting?.name} goes from this device.{deleting?.source?.kind === 'handout' ? ' You can save the handout again while you’re online.' : ' There’s no other copy here, so keep the original if you’ll need it.'}
        </p>
      </Modal>
    </div>
  );
}
