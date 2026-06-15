// src/features/materials/useFileManager.js
import { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../../config/firebaseDb';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression'; // CRITICAL FIX: Image Compression Engine
import toast from 'react-hot-toast';

export const useFileManager = (currentUser, isAdmin) => {
  const [folders, setFolders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'Review Materials' }]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const fetchContents = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fSnap = await getDocs(collection(db, "folders"));
      setFolders(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const mSnap = await getDocs(collection(db, "materials"));
      setMaterials(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Storage read failure:", error);
      toast.error("Failed to load files.");
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // --- NAVIGATION ROUTING ---
  const navigateToFolder = (folderId, folderName) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index) => {
    const newPath = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  // --- CRUD OPERATIONS ---
  const createFolder = async (name) => {
    try {
      const payload = { name, parentId: currentFolderId, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "folders"), payload);
      setFolders(prev => [...prev, { id: docRef.id, ...payload }]);
      toast.success(`Folder "${name}" created.`);
    } catch (error) {
      toast.error("Failed to create folder.");
    }
  };

  // NEW: Unified One-Click Upload & Commit Function with Compression
  const uploadAndCommitMaterial = async (file, customTitle) => {
    if (!file) return;

    // CRITICAL FIX 1: Block Raw Video Uploads
    if (file.type.includes('video')) {
        toast.error("Video uploads are restricted to save cloud bandwidth. Please use YouTube or Drive links instead.");
        return;
    }

    setIsUploading(true);
    let fileToUpload = file;
    let fileType = 'doc';

    if (file.type.includes('pdf')) fileType = 'pdf';
    else if (file.type.includes('audio')) fileType = 'audio';
    else if (file.type.includes('image')) {
        fileType = 'image';
        // CRITICAL FIX 2: Client-Side Image Compression
        try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
            fileToUpload = await imageCompression(file, options);
        } catch (err) {
            console.warn("Compression failed, using original.", err);
        }
    }

    const cleanTitle = customTitle || fileToUpload.name.split('.')[0];
    const storageRef = ref(storage, `board_materials/${currentUser.uid}/${Date.now()}_${fileToUpload.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on('state_changed', 
      () => {}, // Tracking progress if necessary
      (error) => {
        console.error("Storage upload failed:", error);
        toast.error(`Upload failed: ${error.message}`);
        setIsUploading(false);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const payload = { 
              name: cleanTitle.trim(), 
              url: downloadURL, 
              type: fileType, 
              folderId: currentFolderId, 
              storagePath: uploadTask.snapshot.ref.fullPath,
              createdAt: new Date().toISOString() 
          };
          
          const docRef = await addDoc(collection(db, "materials"), payload);
          setMaterials(prev => [...prev, { id: docRef.id, ...payload }]);
          
          toast.success(`✅ Synced: ${cleanTitle}`);
        } catch (dbError) {
          toast.error("Failed to commit media metadata.");
          console.error(dbError);
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  // Preserved for External Links (YouTube, GDrive)
  const addMaterialRecord = async (materialData) => {
    try {
      const payload = { ...materialData, folderId: currentFolderId, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "materials"), payload);
      setMaterials(prev => [...prev, { id: docRef.id, ...payload }]);
      toast.success("Media imported.");
    } catch (error) {
      toast.error("Failed to import media.");
    }
  };

  const deleteItem = async (id, isFolder) => {
    try {
      if (isFolder) {
        await deleteDoc(doc(db, "folders", id));
        setFolders(prev => prev.filter(f => f.id !== id));
        setMaterials(prev => prev.filter(m => m.folderId !== id));
      } else {
        await deleteDoc(doc(db, "materials", id));
        setMaterials(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      toast.error("Delete failed.");
    }
  };

  const renameItem = async (id, isFolder, newName) => {
    try {
      const collectionName = isFolder ? 'folders' : 'materials';
      await updateDoc(doc(db, collectionName, id), { name: newName });
      if (isFolder) {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      } else {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
      }
      toast.success("Renamed.");
    } catch (error) {
      toast.error("Rename failed.");
    }
  };

  const moveItem = async (itemId, itemType, targetFolderId) => {
    if (itemId === targetFolderId) return;
    try {
      const collectionName = itemType === 'folder' ? 'folders' : 'materials';
      await updateDoc(doc(db, collectionName, itemId), { parentId: targetFolderId, folderId: targetFolderId });
      
      if (itemType === 'folder') {
        setFolders(prev => prev.map(f => f.id === itemId ? { ...f, parentId: targetFolderId } : f));
      } else {
        setMaterials(prev => prev.map(m => m.id === itemId ? { ...m, folderId: targetFolderId } : m));
      }
      toast.success(`Moved to ${targetFolderId === 'root' ? 'root' : 'folder'}.`);
    } catch (error) {
      toast.error("Failed to move item.");
    }
  };

  // --- DRAG AND DROP PHYSICS ---
  const handleDragStart = (e, item, type) => {
    if (!isAdmin) return;
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('itemType', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (!isAdmin) return;
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== targetId) setDragOverFolderId(targetId);
  };

  const handleDragLeave = () => {
    if (isAdmin) setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    if (!isAdmin) return;
    setDragOverFolderId(null);
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType');
    if (itemId && itemType) {
      await moveItem(itemId, itemType, targetFolderId);
    }
  };

  return {
    folders, materials, currentFolderId, breadcrumbs, isLoading, isUploading, dragOverFolderId,
    navigateToFolder, navigateToBreadcrumb, createFolder, uploadAndCommitMaterial, addMaterialRecord,
    deleteItem, renameItem, moveItem,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop
  };
};