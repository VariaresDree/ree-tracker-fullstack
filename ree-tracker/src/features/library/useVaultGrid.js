import { useState, useEffect } from 'react';
import { 
  fetchPaginatedQuestions, fetchServerStats, deleteQuestionFromBank, 
  updateQuestionInBank, fetchVaultMetadata, resyncVaultMetadata 
} from '../../services/dbQueries';
import toast from 'react-hot-toast';

const PAGE_SIZE = 30;

export const useVaultGrid = (filterSubject, filterSubtopic) => {
  const [questions, setQuestions] = useState([]);
  const [serverStats, setServerStats] = useState({ total: 0, math: 0, esas: 0, ee: 0 });
  const [vaultMetadata, setVaultMetadata] = useState({});
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingVault, setIsFetchingVault] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  // Admin review defaults to newest-ingested first. 'oldest' and 'random' are
  // also available via the grid's sort toggle.
  const [sortOrder, setSortOrder] = useState('recent');

  const initializeVault = async (reset = false) => {
    try {
      setIsFetchingVault(true);
      if (reset) {
        setQuestions([]);
        setLastDoc(null);
        setHasMore(true);
      }
      const [stats, meta, qData] = await Promise.all([
          fetchServerStats(),
          fetchVaultMetadata(),
          fetchPaginatedQuestions(null, filterSubject, filterSubtopic, PAGE_SIZE, sortOrder)
      ]);
      setServerStats(stats);
      setVaultMetadata(meta || {});
      setQuestions(qData.items);
      setLastDoc(qData.nextOffset);
      setHasMore(qData.items.length === PAGE_SIZE);
    } catch (error) {
      toast.error(`Vault Error: ${error.message}`);
    } finally {
      setIsFetchingVault(false);
    }
  };

  const loadMoreQuestions = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { items, nextOffset } = await fetchPaginatedQuestions(lastDoc, filterSubject, filterSubtopic, PAGE_SIZE, sortOrder);
      setQuestions(prev => [...prev, ...items]);
      setLastDoc(nextOffset);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (error) {
      toast.error('Failed to fetch more items.');
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    initializeVault(true);
  }, [filterSubject, filterSubtopic, sortOrder]);

  // Confirmation lives in VaultDataGrid's Modal — this just executes.
  const handleDelete = async (id) => {
    try {
      await deleteQuestionFromBank(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setServerStats(prev => ({ ...prev, total: prev.total - 1 }));
      toast.success('Question deleted.');
      fetchVaultMetadata().then(meta => setVaultMetadata(meta || {}));
    } catch (error) { toast.error(`Delete failed: ${error.message}`); }
  };

  const handleUpdateSubmit = async (updatedQ) => {
    try {
      await updateQuestionInBank(updatedQ.id, updatedQ);
      setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
      toast.success('Question updated successfully.');
      setEditingQ(null);
    } catch (err) { toast.error(`Update failed: ${err.message}`); }
  };

  return {
    questions, serverStats, vaultMetadata, resyncVaultMetadata,
    isFetchingVault, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit,
    initializeVault, sortOrder, setSortOrder
  };
};