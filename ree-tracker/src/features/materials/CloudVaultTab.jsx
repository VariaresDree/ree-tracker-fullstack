// src/features/materials/CloudVaultTab.jsx
//
// Library › Handouts: folders and files (PDFs, images, video, audio, links).
// Learners browse, search and open; admins also organise. A failed load shows
// an error with Try again and offline says so — both used to read "This folder
// is empty" — and the first load has a skeleton.
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useFileManager } from './useFileManager';
import { Button, Card, EmptyState, FormField, Grid, Input, Modal, Select, Skeleton } from '../../components/ui';
import { FolderOpen, FileText, FileUp, Pencil, Plus, Scissors, X, ExternalLink, Search, TriangleAlert, CloudOff } from '../../components/ui/icons';
import { readRecentHandouts, rememberHandout } from './recentHandouts';

// Actions on a tile: in view on a phone, on hover or keyboard focus otherwise.
const TILE_ACTIONS = 'flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity bg-surface2/80 backdrop-blur rounded-[var(--radius-sm)] p-1';
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export default function CloudVaultTab({ currentUser, isAdmin, onViewMaterial, openMaterialId = null }) {
  const [sortBy, setSortBy] = useState('name');
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search).trim().toLowerCase();
  const uid = currentUser?.uid;
  const [recentIds, setRecentIds] = useState(() => readRecentHandouts(uid));
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [uploadMode, setUploadMode] = useState('local');
  const [newMaterial, setNewMaterial] = useState({ name: '', url: '', type: 'pdf' });
  const [editingItem, setEditingItem] = useState({ id: null, type: null, newName: '' });
  const [clipboard, setClipboard] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: null, name: '' });

  const {
    folders, materials, currentFolderId, breadcrumbs, isLoading, loadError, reload, isUploading, dragOverFolderId,
    navigateToFolder, navigateToBreadcrumb, revealFolder, createFolder, uploadAndCommitMaterial, addMaterialRecord,
    deleteItem, renameItem, moveItem,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop
  } = useFileManager(currentUser, isAdmin);

  // A handout named in the URL (a reload, a shared link) opens once the list
  // has it.
  useEffect(() => {
    if (!openMaterialId) return;
    const m = materials.find((x) => String(x.id) === String(openMaterialId));
    if (m) {
      onViewMaterial(m);
      if ((m.folderId || 'root') !== currentFolderId) revealFolder(m.folderId || 'root');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMaterialId, materials]);

  const openFile = (m) => {
    setRecentIds(rememberHandout(uid, m.id));
    onViewMaterial(m);
  };

  // A folder's parent chain as "Machines / Transformers", for a search result.
  const folderPath = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    return (id) => {
      const names = [];
      const seen = new Set();
      for (let f = byId.get(id); f && !seen.has(f.id); f = byId.get(f.parentId)) {
        seen.add(f.id);
        names.unshift(f.name);
      }
      return names.join(' / ');
    };
  }, [folders]);

  const recentFiles = recentIds.map((id) => materials.find((m) => m.id === id)).filter(Boolean);

  const handleCut = (item, type, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setClipboard({ id: item.id, type, name: item.name, oldParentId: item.parentId || 'root' });
    toast.success(`Cut "${item.name}". Open the folder to move it to and choose Paste here.`);
  };

  const handlePaste = async () => {
    if (!clipboard || !isAdmin) return;
    await moveItem(clipboard.id, clipboard.type, currentFolderId);
    setClipboard(null);
  };

  const handleLocalFileUpload = async (e) => {
    if (!isAdmin) return;
    const file = e.target.files[0];
    if (!file) return;

    await uploadAndCommitMaterial(file, newMaterial.name);
    setNewMaterial({ name: '', url: '', type: 'pdf' });
    setIsAddingMaterial(false);
  };

  const handleCreateFolderClick = async () => {
    if (!isAdmin || !newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleAddMaterialClick = async () => {
    if (!isAdmin || !newMaterial.name || !newMaterial.url) return;
    let targetUrl = newMaterial.url;
    let targetType = newMaterial.type;

    if (uploadMode === 'link') {
        if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
            targetType = 'video';
        } else if (targetUrl.includes('drive.google.com/file/d/')) {
            targetUrl = targetUrl.replace('/view', '/preview');
        }
    }

    await addMaterialRecord({ name: newMaterial.name.trim(), url: targetUrl, type: targetType });
    setNewMaterial({ name: '', url: '', type: 'pdf' });
    setIsAddingMaterial(false);
  };

  // Deleting a folder now genuinely cascades its whole subtree (server-side
  // FK, see materialRoutes), so the confirmation should say so — counted
  // client-side from the already-fetched flat lists, same shape the backend
  // walks. Materials-only deletes have nothing to count.
  const countSubtree = (folderId) => {
    const folderIds = new Set([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of folders) {
        if (f.parentId && folderIds.has(f.parentId) && !folderIds.has(f.id)) {
          folderIds.add(f.id);
          grew = true;
        }
      }
    }
    const nestedFolders = folderIds.size - 1;
    const containedMaterials = materials.filter((m) => folderIds.has(m.folderId || 'root')).length;
    return { nestedFolders, containedMaterials };
  };

  const confirmDelete = (id, type, name) => {
    if (!isAdmin) return;
    setDeleteModal({ isOpen: true, id, type, name, ...(type === 'folder' ? countSubtree(id) : {}) });
  };

  const executeDeleteClick = async () => {
    if (!isAdmin) return;
    await deleteItem(deleteModal.id, deleteModal.type === 'folder');
    setDeleteModal({ isOpen: false, id: null, type: null, name: '' });
  };

  const initiateRename = (item, type, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setEditingItem({ id: item.id, type, newName: item.name });
  };

  const executeRenameClick = async (e) => {
    if (e) e.stopPropagation();
    if (!isAdmin || !editingItem.id || !editingItem.newName.trim()) {
      setEditingItem({ id: null, type: null, newName: '' });
      return;
    }
    await renameItem(editingItem.id, editingItem.type === 'folder', editingItem.newName.trim());
    setEditingItem({ id: null, type: null, newName: '' });
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') executeRenameClick(e);
    if (e.key === 'Escape') setEditingItem({ id: null, type: null, newName: '' });
  };

  // A search looks in every folder; otherwise, what's in this one.
  const matches = (item) => item.name.toLowerCase().includes(query);
  const visibleFolders = folders
    .filter(f => (query ? matches(f) : (f.parentId || 'root') === currentFolderId))
    .sort((a, b) => a.name.localeCompare(b.name));

  const visibleMaterials = materials
    .filter(m => (query ? matches(m) : (m.folderId || 'root') === currentFolderId))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="animate-in fade-in flex flex-col gap-6">
      {clipboard && isAdmin && (
        <div className="bg-reeBlue/10 border border-reeBlue/30 p-3 rounded-[var(--radius-lg)] flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm min-w-0">
            {clipboard.type === 'folder'
              ? <FolderOpen size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" />
              : <FileText size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" />}
            <span className="text-textMain font-medium min-w-0 [overflow-wrap:anywhere]">Moving <span className="font-bold text-[var(--accent-text)]">"{clipboard.name}"</span></span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setClipboard(null)}>Cancel</Button>
            <Button size="sm" onClick={handlePaste} disabled={clipboard.id === currentFolderId}>
              Paste here
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-end border-b border-border2 pb-6 gap-4">
        <div className="min-w-0 flex-1 basis-72">
          {/* The tab already says "Handouts"; the heading stays for screen
              readers' heading list. */}
          <h2 className="sr-only">Handouts</h2>
          <p className="text-sm text-muted2">
            {isAdmin
              ? 'Upload and organize handouts. Reviewers can open them but not change them.'
              : 'Open a folder, then tap a file to read it.'}
          </p>
          <div className="flex items-center gap-2 mt-3 font-mono text-xs text-muted2 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <button onClick={() => navigateToBreadcrumb(idx)} onDragOver={(e) => handleDragOver(e, crumb.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, crumb.id)} className={`inline-flex items-center px-2 py-1 pointer-coarse:min-h-11 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${idx === breadcrumbs.length - 1 ? 'text-reeBlue-text font-bold bg-reeBlue/10' : 'hover:bg-surface2 hover:text-textMain'} ${dragOverFolderId === crumb.id ? 'bg-reeBlue/30 border border-reeBlue shadow-lg scale-105' : 'border border-transparent'}`}>
                  {crumb.name}
                </button>
                {idx < breadcrumbs.length - 1 && <span className="select-none">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <FormField label="Search" className="w-full sm:w-56">
            <div className="relative">
              <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titles and folders" className="!pl-9" aria-label="Search handouts" />
            </div>
          </FormField>
          <FormField label="Sort files" className="w-40">
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Name (A–Z)</option>
              <option value="date">Newest first</option>
            </Select>
          </FormField>
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setIsCreatingFolder(true)}><Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Folder</Button>
              <Button onClick={() => setIsAddingMaterial(true)}><Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Add a file or link</Button>
            </>
          )}
        </div>
      </div>

      {isCreatingFolder && isAdmin && (
        <Card
          padding="md"
          className="flex flex-col sm:flex-row gap-3 items-center shadow-lg animate-in fade-in slide-in-from-top-2"
          style={{ borderColor: 'color-mix(in srgb, var(--color-reeBlue) 40%, transparent)' }}
        >
          <FolderOpen size={20} strokeWidth={1.75} aria-hidden="true" className="hidden sm:block text-[var(--accent-text)]" />
          <Input autoFocus aria-label="New folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolderClick(); }} placeholder="Folder name" className="flex-1" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button className="flex-1 sm:flex-none" onClick={handleCreateFolderClick} disabled={!newFolderName.trim()}>Create</Button>
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isAddingMaterial && isAdmin && (
        <Card padding="md" className="flex flex-col gap-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Add from">
            <Button size="sm" variant={uploadMode === 'local' ? 'outline' : 'ghost'} aria-pressed={uploadMode === 'local'} onClick={() => setUploadMode('local')}>Upload a file</Button>
            <Button size="sm" variant={uploadMode === 'link' ? 'outline' : 'ghost'} aria-pressed={uploadMode === 'link'} onClick={() => setUploadMode('link')}>Link (YouTube or Google Drive)</Button>
          </div>


          {uploadMode === 'local' ? (
            <div className="border-2 border-dashed border-border2 rounded-[var(--radius-default)] p-8 text-center hover:bg-surface2 transition-colors relative cursor-pointer">
              <input type="file" aria-label="Choose a file to upload" accept=".pdf,.doc,.docx,image/*,audio/*" onChange={handleLocalFileUpload} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait" />
              <div className="text-sm text-muted2 flex flex-col items-center gap-3" aria-live="polite">
                {isUploading ? (
                  <><span className="telemetry-spinner border-reeBlue border-t-transparent" aria-hidden="true"></span> Uploading…</>
                ) : (
                  <><FileUp size={28} strokeWidth={1.5} aria-hidden="true" className="text-muted" /><span>Choose or drop a file: PDF, Word, image or audio. For video, add a YouTube or Drive link.</span></>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <FormField label="Title">
                <Input value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="e.g. AC circuits lecture" />
              </FormField>
              <FormField label="Link" hint="A YouTube link, or a Google Drive link shared with anyone who has it.">
                <Input type="url" value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} placeholder="https://" />
              </FormField>
            </div>
          )}
          
          <div className="flex flex-wrap justify-end gap-3 mt-2 border-t border-border2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddingMaterial(false)}>Cancel</Button>
            {uploadMode === 'link' && (
                <Button onClick={handleAddMaterialClick} disabled={!newMaterial.name || !newMaterial.url || isUploading}>Add link</Button>
            )}
          </div>
        </Card>
      )}

      {isLoading && folders.length === 0 && materials.length === 0 ? (
        <Grid kind="cards" role="status" className="@5xl:grid-cols-4">
          <span className="sr-only">Loading the handouts…</span>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-[var(--radius-lg)]" />)}
        </Grid>
      ) : loadError && folders.length === 0 && materials.length === 0 ? (
        loadError === 'offline' ? (
          <EmptyState
            icon={CloudOff}
            title="Handouts need a connection"
            description="Reconnect to browse them."
            action={<Button variant="secondary" onClick={reload}>Try again</Button>}
          />
        ) : (
          <EmptyState
            icon={TriangleAlert}
            title="Couldn't load the handouts"
            description="Something went wrong on our side or the connection dropped."
            action={<Button onClick={reload}>Try again</Button>}
          />
        )
      ) : query && visibleFolders.length === 0 && visibleMaterials.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches"
          description={`No handout or folder has "${search.trim()}" in its name.`}
          action={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>}
        />
      ) : visibleFolders.length === 0 && visibleMaterials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="This folder is empty"
          description={isAdmin ? 'Create a folder or add a file to start.' : 'Nothing has been added here yet.'}
        />
      ) : (
        <div className="flex flex-col gap-6">
        {!query && currentFolderId === 'root' && recentFiles.length > 0 && (
          <section aria-label="Recently opened" className="flex flex-col gap-2">
            <p className="text-eyebrow">Recently opened</p>
            <div className="flex gap-2 flex-wrap">
              {recentFiles.map((m) => (
                <Button key={m.id} size="sm" variant="secondary" aria-label={`Open ${m.name}`} onClick={() => openFile(m)} className="max-w-full">
                  <FileText size={14} strokeWidth={1.75} aria-hidden="true" /> <span className="truncate">{m.name}</span>
                </Button>
              ))}
            </div>
          </section>
        )}
        {visibleFolders.length > 0 && (
        <section aria-label="Folders" className="flex flex-col gap-2">
        <p className="text-eyebrow">Folders · {visibleFolders.length}</p>
        <Grid kind="cards" className="@5xl:grid-cols-4">
          {visibleFolders.map(f => {
            const isDropTarget = dragOverFolderId === f.id;
            const inside = countSubtree(f.id).containedMaterials;
            return (
              // A choice card like the rest of the app's. A folder a file is
              // dragged over takes an accent ring (it was a fixed blue border
              // that also scaled the tile up).
              <Card
                key={f.id}
                variant="interactive"
                padding="sm"
                draggable={isAdmin ? "true" : "false"}
                onDragStart={(e) => handleDragStart(e, f, 'folder')}
                onDragOver={(e) => handleDragOver(e, f.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, f.id)}
                onClick={() => navigateToFolder(f.id, f.name)}
                className={`cursor-pointer flex justify-between items-start group min-h-[72px] ${
                  isDropTarget ? 'ring-2 ring-[color-mix(in_srgb,var(--accent)_70%,transparent)]' : ''
                }`}
              >
                <div className="flex items-start gap-3 overflow-hidden flex-1 min-w-0 pointer-events-none">
                  <FolderOpen size={24} strokeWidth={1.5} aria-hidden="true" className="opacity-90 group-hover:scale-110 transition-transform text-[var(--accent-text)] shrink-0" />
                  {editingItem.id === f.id && editingItem.type === 'folder' ? (
                    <input autoFocus value={editingItem.newName} onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })} onBlur={executeRenameClick} onKeyDown={handleRenameKeyDown} onClick={(e) => e.stopPropagation()} className="bg-bg border border-reeBlue text-sm text-textMain px-2 py-1 rounded-[var(--radius-sm)] w-full font-bold pointer-events-auto" />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      title={f.name}
                      aria-label={`Open folder ${f.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
                      }}
                      className="pointer-events-auto text-left font-bold text-sm text-textMain line-clamp-2 [overflow-wrap:anywhere] leading-relaxed pt-0.5 rounded-[var(--radius-sm)] cursor-pointer"
                    >
                      {f.name}
                      <span className="block font-normal text-xs text-muted2">{plural(inside, 'file')}</span>
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className={`${TILE_ACTIONS} ml-2 shrink-0`}>
                    {!(editingItem.id === f.id && editingItem.type === 'folder') && (
                      <button onClick={(e) => initiateRename(f, 'folder', e)} aria-label="Rename folder" className="touch-target p-1.5 text-muted hover:text-[var(--accent-text)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    )}
                    <button onClick={(e) => handleCut(f, 'folder', e)} aria-label="Cut folder to move" className="touch-target p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><Scissors size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete(f.id, 'folder', f.name); }} aria-label="Delete folder" className="touch-target p-1.5 text-muted hover:text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><X size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                  </div>
                )}
              </Card>
            );
          })}
        </Grid>
        </section>
        )}
        {visibleMaterials.length > 0 && (
        <section aria-label="Files" className="flex flex-col gap-2">
        <p className="text-eyebrow">Files · {visibleMaterials.length}</p>
        <Grid kind="cards" className="@5xl:grid-cols-4">
          {visibleMaterials.map(m => (
            <Card
              key={m.id}
              variant="interactive"
              padding="md"
              draggable={isAdmin ? "true" : "false"}
              onDragStart={(e) => handleDragStart(e, m, 'material')}
              onClick={() => { if (editingItem.id !== m.id) openFile(m); }}
              className="flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 bg-bg border border-border2 text-micro font-mono rounded-[var(--radius-sm)] uppercase font-bold tracking-wider ${m.type === 'video' ? 'text-reeRed-text' : m.type === 'audio' ? 'text-reePurple-text' : m.type === 'image' ? 'text-reeAmber-text' : 'text-reeCyan-text'}`}>
                    {m.type}
                </span>
                {isAdmin && (
                  <div className={`${TILE_ACTIONS} -mt-1 -mr-1`}>
                    {!(editingItem.id === m.id && editingItem.type === 'material') && (
                      <button onClick={(e) => initiateRename(m, 'material', e)} aria-label="Rename file" className="touch-target p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    )}
                    <button onClick={(e) => handleCut(m, 'material', e)} aria-label="Cut file to move" className="touch-target p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><Scissors size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete(m.id, 'material', m.name); }} aria-label="Delete file" className="touch-target p-1.5 text-muted hover:text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"><X size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                  </div>
                )}
              </div>
              {editingItem.id === m.id && editingItem.type === 'material' ? (
                <input autoFocus value={editingItem.newName} onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })} onBlur={executeRenameClick} onKeyDown={handleRenameKeyDown} onClick={(e) => e.stopPropagation()} className="bg-bg border border-reeCyan text-sm text-textMain px-2 py-1 rounded-[var(--radius-sm)] w-full mt-3 font-bold flex-1" />
              ) : (
                <div title={m.name} className="font-bold text-sm text-textMain mt-3 leading-relaxed flex-1 min-w-0 line-clamp-2 [overflow-wrap:anywhere]">{m.name}</div>
              )}
              {query && m.folderId && <p className="text-xs text-muted2 mt-1 [overflow-wrap:anywhere]">{folderPath(m.folderId)}</p>}
              <div className="flex gap-2 mt-4 pt-4 border-t border-border2/50">
                <Button size="sm" variant="secondary" className="flex-1" onClick={(e) => { e.stopPropagation(); openFile(m); }} aria-label={`View ${m.name}`}>
                  View
                </Button>
                {m.type !== 'video' && (
                    <Button as="a" size="icon" variant="secondary" href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.name} in a new tab`} onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                )}
              </div>
            </Card>
          ))}
        </Grid>
        </section>
        )}
        </div>
      )}

      <Modal
        open={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, type: null, name: '' })}
        tone="danger"
        icon={TriangleAlert}
        title={`Delete "${deleteModal.name}"?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, id: null, type: null, name: '' })}>Cancel</Button>
            <Button tone="danger" onClick={executeDeleteClick}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          {deleteModal.type === 'folder' && (deleteModal.nestedFolders > 0 || deleteModal.containedMaterials > 0)
            ? `This deletes ${deleteModal.nestedFolders > 0 ? `${deleteModal.nestedFolders} nested folder${deleteModal.nestedFolders === 1 ? '' : 's'}` : ''}${deleteModal.nestedFolders > 0 && deleteModal.containedMaterials > 0 ? ' and ' : ''}${deleteModal.containedMaterials > 0 ? `${deleteModal.containedMaterials} file${deleteModal.containedMaterials === 1 ? '' : 's'}` : ''} inside it too. This can't be undone.`
            : "This can't be undone."}
        </p>
      </Modal>
    </div>
  );
}