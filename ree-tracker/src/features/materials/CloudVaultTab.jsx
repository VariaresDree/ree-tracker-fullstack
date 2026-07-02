// src/features/materials/CloudVaultTab.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useFileManager } from './useFileManager';
import { Button, Modal } from '../../components/ui';
import { FolderOpen, FileText, Pencil, Scissors, X, Download, TriangleAlert } from '../../components/ui/icons';

export default function CloudVaultTab({ currentUser, isAdmin, onViewMaterial }) {
  const [sortBy, setSortBy] = useState('name');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [uploadMode, setUploadMode] = useState('local');
  const [newMaterial, setNewMaterial] = useState({ name: '', url: '', type: 'pdf' });
  const [editingItem, setEditingItem] = useState({ id: null, type: null, newName: '' });
  const [clipboard, setClipboard] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: null, name: '' });

  const {
    folders, materials, currentFolderId, breadcrumbs, isUploading, dragOverFolderId,
    navigateToFolder, navigateToBreadcrumb, createFolder, uploadAndCommitMaterial, addMaterialRecord,
    deleteItem, renameItem, moveItem,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop
  } = useFileManager(currentUser, isAdmin);

  const handleCut = (item, type, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setClipboard({ id: item.id, type, name: item.name, oldParentId: item.parentId || 'root' });
    toast.success(`Cut "${item.name}". Use "Paste Here" to move.`);
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

  const confirmDelete = (id, type, name) => {
    if (!isAdmin) return;
    setDeleteModal({ isOpen: true, id, type, name });
  };

  const executeDeleteClick = async () => {
    if (!isAdmin) return;
    await deleteItem(deleteModal.id, deleteModal.type === 'folder');
    toast.success(`Deleted successfully.`);
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
    await renameItem(editingItem.id, editingItem.type, editingItem.newName.trim());
    setEditingItem({ id: null, type: null, newName: '' });
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') executeRenameClick(e);
    if (e.key === 'Escape') setEditingItem({ id: null, type: null, newName: '' });
  };

  const visibleFolders = folders
    .filter(f => (f.parentId || 'root') === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const visibleMaterials = materials
    .filter(m => (m.folderId || 'root') === currentFolderId)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="animate-in fade-in flex flex-col gap-6">
      {!isAdmin && (
        <div className="bg-reeBlue/10 border border-reeBlue/30 text-reeBlue p-3 rounded-xl text-xs font-bold uppercase tracking-widest text-center">
            Viewing Global Vault in Read-Only Mode
        </div>
      )}

      {clipboard && isAdmin && (
        <div className="bg-reeBlue/10 border border-reeBlue/30 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 animate-in slide-in-from-top-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            {clipboard.type === 'folder'
              ? <FolderOpen size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
              : <FileText size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />}
            <span className="text-textMain font-medium">Moving <span className="font-bold text-[var(--accent)]">"{clipboard.name}"</span></span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setClipboard(null)}>Cancel</Button>
            <Button size="sm" onClick={handlePaste} disabled={clipboard.id === currentFolderId}>
              Paste here
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border2 pb-6 gap-4">
        <div>
          <h2 className="text-display text-2xl tracking-tight text-textMain">Cloud Vault</h2>
          <div className="flex items-center gap-2 mt-3 font-mono text-xs text-muted2 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <button onClick={() => navigateToBreadcrumb(idx)} onDragOver={(e) => handleDragOver(e, crumb.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, crumb.id)} className={`px-2 py-1 rounded transition-colors cursor-pointer ${idx === breadcrumbs.length - 1 ? 'text-reeBlue font-bold bg-reeBlue/10' : 'hover:bg-surface2 hover:text-textMain'} ${dragOverFolderId === crumb.id ? 'bg-reeBlue/30 border border-reeBlue shadow-lg scale-105' : 'border border-transparent'}`}>
                  {crumb.name}
                </button>
                {idx < breadcrumbs.length - 1 && <span className="select-none">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="appearance-none bg-surface2 border border-border2 text-muted hover:text-textMain px-4 py-2.5 rounded-lg text-xs font-bold outline-none focus:border-reeBlue cursor-pointer transition-colors">
            <option value="name">Sort Files: A-Z</option>
            <option value="date">Sort Files: Recent</option>
          </select>
          {isAdmin && (
            <>
              <button onClick={() => setIsCreatingFolder(true)} className="px-4 py-2.5 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"><span>+</span> Folder</button>
              <button onClick={() => setIsAddingMaterial(true)} className="px-5 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center gap-2"><span>+</span> Import Media</button>
            </>
          )}
        </div>
      </div>

      {isCreatingFolder && isAdmin && (
        <div className="p-5 bg-surface border border-reeBlue/40 rounded-xl flex flex-col sm:flex-row gap-3 items-center shadow-lg animate-in fade-in slide-in-from-top-2">
          <FolderOpen size={20} strokeWidth={1.75} aria-hidden="true" className="hidden sm:block text-[var(--accent)]" />
          <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter new subfolder name..." className="flex-1 w-full bg-bg border border-border2 text-sm text-textMain px-4 py-2.5 rounded-lg outline-none focus:border-reeBlue transition-colors" />
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleCreateFolderClick} className="flex-1 sm:flex-none px-6 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">Create</button>
            <button onClick={() => setIsCreatingFolder(false)} className="flex-1 sm:flex-none px-4 py-2.5 bg-surface2 hover:bg-surface3 text-muted border border-border2 font-bold rounded-lg text-xs cursor-pointer transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {isAddingMaterial && isAdmin && (
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col gap-5 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-4 border-b border-border2 pb-3">
            <button onClick={() => setUploadMode('local')} className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 cursor-pointer transition-colors ${uploadMode === 'local' ? 'border-reeBlue text-reeBlue' : 'border-transparent text-muted hover:text-muted2'}`}>💻 Direct Media Upload</button>
            <button onClick={() => setUploadMode('link')} className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 cursor-pointer transition-colors ${uploadMode === 'link' ? 'border-reeCyan text-reeCyan' : 'border-transparent text-muted hover:text-muted2'}`}>🔗 Cloud URL (YouTube/Drive)</button>
          </div>
          
          {uploadMode === 'local' ? (
            <div className="border-2 border-dashed border-border2 rounded-xl p-8 text-center hover:bg-surface2 transition-colors relative cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx,image/*,audio/*,video/*" onChange={handleLocalFileUpload} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait" />
              <div className="text-sm font-bold text-muted2 flex flex-col items-center gap-3">
                {isUploading ? (
                  <><span className="telemetry-spinner border-reeBlue border-t-transparent"></span> Uplinking media to cloud matrix...</>
                ) : (
                  <><span className="text-3xl opacity-50">📥</span><span>Click or Drop to scan local storage for PDF, Image, Video, or Audio</span></>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Media Display Title</label>
                <input value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="e.g. AC Circuits Lecture" className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Target Web Vector (URL)</label>
                <input value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} placeholder="Paste YouTube link or Google Drive Shareable Link..." className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan transition-colors" />
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-2 border-t border-border2 pt-4">
            <button onClick={() => setIsAddingMaterial(false)} className="px-5 py-2.5 bg-surface2 hover:bg-surface3 text-textMain border border-border2 rounded-lg text-xs font-bold cursor-pointer transition-colors">Cancel</button>
            {uploadMode === 'link' && (
                <button onClick={handleAddMaterialClick} disabled={!newMaterial.url || isUploading} className="px-6 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-lg text-xs disabled:opacity-40 cursor-pointer transition-colors shadow-md">Commit Media</button>
            )}
          </div>
        </div>
      )}

      {visibleFolders.length === 0 && visibleMaterials.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center gap-3 animate-in fade-in">
          <div className="text-4xl opacity-50">📭</div>
          <div className="text-sm font-bold text-muted2">This directory is empty.</div>
          {isAdmin && <div className="text-xs text-muted">Create a folder or import media to build your matrix.</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleFolders.map(f => {
            const isDropTarget = dragOverFolderId === f.id;
            return (
              <div
                key={f.id}
                draggable={isAdmin ? "true" : "false"}
                onDragStart={(e) => handleDragStart(e, f, 'folder')}
                onDragOver={(e) => handleDragOver(e, f.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, f.id)}
                onClick={() => navigateToFolder(f.id, f.name)}
                className={`p-4 rounded-xl transition-all cursor-pointer flex justify-between items-start group shadow-sm min-h-[72px] h-auto ${
                  isDropTarget
                    ? 'bg-reeBlue/20 border-2 border-reeBlue shadow-lg scale-105 z-10'
                    : 'bg-surface border border-border2 hover:border-reeBlue/40 hover:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-3 overflow-hidden flex-1 pointer-events-none">
                  <FolderOpen size={24} strokeWidth={1.5} aria-hidden="true" className="opacity-90 group-hover:scale-110 transition-transform text-[var(--accent)] shrink-0" />
                  {editingItem.id === f.id && editingItem.type === 'folder' ? (
                    <input autoFocus value={editingItem.newName} onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })} onBlur={executeRenameClick} onKeyDown={handleRenameKeyDown} onClick={(e) => e.stopPropagation()} className="bg-bg border border-reeBlue text-sm text-textMain px-2 py-1 rounded outline-none w-full font-bold pointer-events-auto" />
                  ) : (
                    <span className="font-bold text-sm text-textMain break-words leading-relaxed pt-0.5">{f.name}</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-2 shrink-0 bg-surface2/80 backdrop-blur rounded p-1">
                    {!(editingItem.id === f.id && editingItem.type === 'folder') && (
                      <button onClick={(e) => initiateRename(f, 'folder', e)} aria-label="Rename folder" className="p-1.5 text-muted hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] rounded transition-colors cursor-pointer"><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    )}
                    <button onClick={(e) => handleCut(f, 'folder', e)} aria-label="Cut folder to move" className="p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded transition-colors cursor-pointer"><Scissors size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete(f.id, 'folder', f.name); }} aria-label="Delete folder" className="p-1.5 text-muted hover:text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] rounded transition-colors cursor-pointer"><X size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                  </div>
                )}
              </div>
            );
          })}
          {visibleMaterials.map(m => (
            <div
              key={m.id}
              draggable={isAdmin ? "true" : "false"}
              onDragStart={(e) => handleDragStart(e, m, 'material')}
              className="p-5 bg-surface border border-border2 rounded-xl flex flex-col justify-between h-auto min-h-[150px] hover:border-reeCyan/40 group shadow-sm transition-colors cursor-grab active:cursor-grabbing"
            >
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 bg-bg border border-border2 text-[11px] font-mono rounded uppercase font-bold tracking-wider ${m.type === 'video' ? 'text-reeRed' : m.type === 'audio' ? 'text-reePurple' : m.type === 'image' ? 'text-reeAmber' : 'text-reeCyan'}`}>
                    {m.type}
                </span>
                {isAdmin && (
                  <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-surface2/80 backdrop-blur rounded p-1 -mt-1 -mr-1">
                    {!(editingItem.id === m.id && editingItem.type === 'material') && (
                      <button onClick={(e) => initiateRename(m, 'material', e)} aria-label="Rename file" className="p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded transition-colors cursor-pointer"><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    )}
                    <button onClick={(e) => handleCut(m, 'material', e)} aria-label="Cut file to move" className="p-1.5 text-muted hover:text-[var(--accent-signal)] hover:bg-[color-mix(in_srgb,var(--accent-signal)_10%,transparent)] rounded transition-colors cursor-pointer"><Scissors size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); confirmDelete(m.id, 'material', m.name); }} aria-label="Delete file" className="p-1.5 text-muted hover:text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] rounded transition-colors cursor-pointer"><X size={14} strokeWidth={1.75} aria-hidden="true" /></button>
                  </div>
                )}
              </div>
              {editingItem.id === m.id && editingItem.type === 'material' ? (
                <input autoFocus value={editingItem.newName} onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })} onBlur={executeRenameClick} onKeyDown={handleRenameKeyDown} className="bg-bg border border-reeCyan text-sm text-textMain px-2 py-1 rounded outline-none w-full mt-3 font-bold flex-1" />
              ) : (
                <div className="font-bold text-sm text-textMain mt-3 leading-relaxed flex-1 pointer-events-none break-words">{m.name}</div>
              )}
              <div className="flex gap-2 mt-4 pt-4 border-t border-border2/50">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => onViewMaterial(m)}>
                  View
                </Button>
                {m.type !== 'video' && (
                    <Button as="a" size="icon" variant="secondary" href={m.url} download={m.name} target="_blank" rel="noopener noreferrer" aria-label="Download file">
                      <Download size={16} strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                )}
              </div>
            </div>
          ))}
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
        <p className="text-sm text-muted2 leading-relaxed">This can't be undone.</p>
      </Modal>
    </div>
  );
}