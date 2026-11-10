// src/features/my-files/MyFilesTab.jsx
//
// Library › My files: PDFs, images, text and audio on this device, never uploaded.
// They survive a restart and open offline. An open file is in ?file=<id>, so Back
// closes it. Handouts saved for offline live here too. Folders are on the device
// too: the open one is in ?dir=<id>, Back goes up, and a file whose folder is gone
// shows at the top level.
import React, { Suspense, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FileDrop from '../../components/FileDrop';
import { Button, Card, EmptyState, FormField, IconChip, Input, Modal, StatusPill } from '../../components/ui';
import { CircleAlert, Clock, Download, FileAudio, FileImage, FileText, FileType, FolderInput, FolderOpen, Lock, Pencil, Plus, Search, Trash2 } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fileKind, getDeviceFileBlob, MAX_FILE_BYTES } from '../../services/deviceFiles';
import { formatBytes } from '../../utils/bytes';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import { lazy } from '../../utils/lazyWithRetry';
import { byName } from '../materials/sortNames';
import { addFile, addFolder, moveItems, removeFile, removeFolder, renameFile, renameFolder, useMyFiles } from './filesStore';
import LocalFileViewer from './LocalFileViewer';

const MoveSheet = lazy(() => import('../materials/MoveSheet'));
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

const ACCEPT = '.pdf,image/*,audio/*,text/*,.txt,.md,.csv';
const KIND = {
  pdf: { label: 'PDF', icon: FileText },
  image: { label: 'Image', icon: FileImage },
  audio: { label: 'Audio', icon: FileAudio },
  text: { label: 'Text', icon: FileType },
};
const dateOf = (at) => new Date(at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' });

function FileRow({ file, uid, where, onOpen, onRename, onMove, onDelete }) {
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
        {where && <p className="text-xs text-muted2 [overflow-wrap:anywhere]">{where}</p>}
        {file.source?.kind === 'handout' && <div className="mt-1"><StatusPill tone="neutral" dot={false}>Saved handout</StatusPill></div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={() => onOpen(file)} aria-label={`Open ${file.name}`}>Open</Button>
        <Button size="icon" variant="ghost" aria-label={`Rename ${file.name}`} title="Rename" onClick={() => onRename(file)}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Move ${file.name}`} title="Move" onClick={() => onMove(file)}>
          <FolderInput size={15} strokeWidth={1.75} aria-hidden="true" />
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

function FolderRow({ folder, count, onOpen, onRename, onMove, onDelete }) {
  return (
    <Card as="li" padding="sm" className="flex flex-wrap items-center gap-3 min-w-0">
      <IconChip icon={FolderOpen} tone="accent" size="sm" />
      <button type="button" onClick={() => onOpen(folder)} aria-label={`Open folder ${folder.name}`} className="flex-1 min-w-[10rem] text-left cursor-pointer rounded-[var(--radius-sm)] pointer-coarse:min-h-11">
        <span className="block text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{folder.name}</span>
        <span className="block text-xs text-muted2 tabular-nums">{plural(count, 'file')}</span>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" aria-label={`Rename folder ${folder.name}`} title="Rename" onClick={() => onRename(folder)}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Move folder ${folder.name}`} title="Move" onClick={() => onMove(folder)}>
          <FolderInput size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Delete folder ${folder.name}`} title="Delete" onClick={() => onDelete(folder)}>
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
  const { files, folders, loaded } = useMyFiles(uid);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [actionError, setActionError] = useState(null);
  // { folder?: the one renamed; parentId: where a new one goes } while naming a folder.
  const [naming, setNaming] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [moving, setMoving] = useState(null);

  const byId = new Map(folders.map((f) => [f.id, f]));
  const placeOf = (item) => (byId.has(item) ? item : 'root');
  const urlDir = params.get('dir');
  const dir = urlDir && byId.has(urlDir) ? urlDir : 'root';
  const pathOf = (id) => {
    const names = [];
    const seen = new Set();
    for (let f = byId.get(id); f && !seen.has(f.id); f = byId.get(f.parentId)) {
      seen.add(f.id);
      names.unshift(f);
    }
    return names;
  };
  const crumbs = [{ id: 'root', name: 'My files' }, ...pathOf(dir)];
  const goTo = (id) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (id === 'root') next.delete('dir');
    else next.set('dir', id);
    return next;
  });
  const filesUnder = (id) => {
    const ids = new Set([id]);
    for (let grew = true; grew;) {
      grew = false;
      for (const f of folders) if (ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; }
    }
    return files.filter((f) => ids.has(placeOf(f.folderId))).length;
  };

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
        await addFile(uid, file, { name: file.name, kind, folderId: dir === 'root' ? null : dir });
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

  const startFolder = (folder = null) => { setNaming({ folder, parentId: dir === 'root' ? null : dir }); setFolderName(folder?.name || ''); setActionError(null); };
  const saveFolder = async () => {
    try {
      if (naming.folder) await renameFolder(uid, naming.folder.id, folderName.trim());
      else await addFolder(uid, folderName.trim(), naming.parentId);
      setNaming(null);
    } catch (err) {
      setActionError(err.message);
    }
  };
  const confirmDeleteFolder = async () => {
    await removeFolder(uid, deletingFolder.id);
    setDeletingFolder(null);
  };
  const finishMove = async (target) => {
    try {
      await moveItems(uid, [moving], target);
      setMoving(null);
    } catch (err) {
      setProblems([err.message]);
      setMoving(null);
    }
  };

  const q = query.trim().toLowerCase();
  const matches = (item) => item.name.toLowerCase().includes(q);
  const shownFolders = folders.filter((f) => (q ? matches(f) : placeOf(f.parentId) === dir)).sort(byName);
  const shown = q ? files.filter(matches) : files.filter((f) => placeOf(f.folderId) === dir);
  const whereOf = (f) => (q && byId.has(f.folderId) ? pathOf(f.folderId).map((x) => x.name).join(' / ') : null);
  const deletingParent = deletingFolder ? byId.get(deletingFolder.parentId)?.name || 'My files' : '';
  const total = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div>
        <h2 className="sr-only">My files</h2>
        <p className="text-sm text-muted2">Your own PDFs, images, notes and audio, ready offline. They stay on this device.</p>
      </div>

      {crumbs.length > 1 && (
        <nav aria-label="Folder path" className="flex items-center gap-1 flex-wrap text-xs text-muted2 font-mono">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === crumbs.length - 1
                ? <span aria-current="page" className="px-2 py-1 text-[var(--accent-text)] font-bold [overflow-wrap:anywhere]">{c.name}</span>
                : <button type="button" onClick={() => goTo(c.id)} className="px-2 py-1 pointer-coarse:min-h-11 rounded-[var(--radius-sm)] hover:bg-surface2 hover:text-textMain cursor-pointer [overflow-wrap:anywhere]">{c.name}</button>}
            </React.Fragment>
          ))}
        </nav>
      )}

      {loaded && (
        <div>
          <Button size="sm" variant="secondary" onClick={() => startFolder()}>
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" /> New folder
          </Button>
        </div>
      )}

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

      {shownFolders.length > 0 && (
        <ul aria-label="Folders" className="flex flex-col gap-2 min-w-0">
          {shownFolders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} count={filesUnder(folder.id)} onOpen={(f) => { setQuery(''); goTo(f.id); }} onRename={startFolder} onMove={(f) => setMoving({ id: f.id, type: 'folder' })} onDelete={setDeletingFolder} />
          ))}
        </ul>
      )}
      {shown.length > 0 ? (
        <ul aria-label="Your files" className="flex flex-col gap-2 min-w-0">
          {shown.map((file) => <FileRow key={file.id} file={file} uid={uid} where={whereOf(file)} onOpen={openFile} onRename={startRename} onMove={(f) => setMoving({ id: f.id, type: 'file', folderId: placeOf(f.folderId) })} onDelete={setDeleting} />)}
        </ul>
      ) : loaded && shownFolders.length === 0 && (q
        ? <EmptyState compact icon={Search} title="Nothing matches" description={`No file or folder has “${query.trim()}” in its name.`} />
        : dir !== 'root'
          ? <EmptyState compact icon={FolderOpen} title="This folder is empty" description="Add a file below, or move one here." />
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

      {moving && (
        <Suspense fallback={null}>
          <MoveSheet
            folders={folders}
            rootLabel="My files (top level)"
            exclude={moving.type === 'folder' ? new Set([moving.id]) : undefined}
            count={1}
            current={moving.type === 'folder' ? placeOf(byId.get(moving.id)?.parentId) : moving.folderId}
            onMove={finishMove}
            onClose={() => setMoving(null)}
          />
        </Suspense>
      )}

      <Modal
        open={!!naming}
        onClose={() => setNaming(null)}
        title={naming?.folder ? 'Rename this folder' : 'New folder'}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setNaming(null)}>Cancel</Button>
            <Button disabled={!folderName.trim()} onClick={saveFolder}>{naming?.folder ? 'Save' : 'Create'}</Button>
          </>
        )}
      >
        <FormField label="Folder name" error={actionError || undefined}>
          <Input value={folderName} maxLength={120} autoComplete="off" onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && folderName.trim()) saveFolder(); }} />
        </FormField>
      </Modal>

      <Modal
        open={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        title="Delete this folder?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeletingFolder(null)}>Keep it</Button>
            <Button tone="danger" onClick={confirmDeleteFolder}>Delete folder</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 [overflow-wrap:anywhere]">
          {deletingFolder?.name} goes, but no file is deleted: what’s in it moves up to {deletingParent}.
        </p>
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
