// src/features/materials/useFileManager.js
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../config/firebaseDb';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import { apiRequest } from '../../services/dbQueries';

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
        const data = await apiRequest('/api/materials');
        if (data && data.success) {
            setFolders(data.folders || []);
            setMaterials(data.materials || []);
        }
    } catch (error) {
      if (!error.message?.includes('[OFFLINE]')) {
        console.error("PostgreSQL read failure:", error);
        toast.error("Failed to load files.");
      }
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

  // --- CRUD OPERATIONS (PostgreSQL Stubs) ---
  const createFolder = async (name) => toast.error("Database route pending construction.");
  const addMaterialRecord = async (materialData) => toast.error("Database route pending construction.");
  const deleteItem = async (id, isFolder) => toast.error("Database route pending construction.");
  const renameItem = async (id, isFolder, newName) => toast.error("Database route pending construction.");
  const moveItem = async (itemId, itemType, targetFolderId) => toast.error("Database route pending construction.");

  // --- UNIFIED UPLOAD WITH COMPRESSION ---
  const uploadAndCommitMaterial = async (file, customTitle) => {
    if (!file) return;

    if (file.type.includes('video')) {
        toast.error("Video uploads are restricted. Please use YouTube or Drive links instead.");
        return;
    }

    setIsUploading(true);
    let fileToUpload = file;

    if (file.type.includes('image')) {
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
          
          // Phase 3: We will send this payload to the PostgreSQL backend
          const payload = { 
              name: cleanTitle.trim(), 
              url: downloadURL, 
              folderId: currentFolderId, 
              storagePath: uploadTask.snapshot.ref.fullPath,
          };
          
          toast.success(`✅ Uploaded to Storage: ${cleanTitle}`);
        } catch (error) {
          toast.error("Failed to commit media metadata.");
        } finally {
          setIsUploading(false);
        }
      }
    );
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