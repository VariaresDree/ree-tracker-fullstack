import { useState, useEffect } from 'react';
import { 
  fetchPaginatedQuestions, fetchServerStats, deleteQuestionFromBank, 
  updateQuestionInBank, fetchVaultMetadata, resyncVaultMetadata 
} from '../../services/dbQueries';
import toast from 'react-hot-toast';

const PAGE_SIZE = 30;

const loadFirstPage = (subject, subtopic, sortOrder) => Promise.all([
  fetchServerStats(),
  fetchVaultMetadata(),
  fetchPaginatedQuestions(null, subject, subtopic, PAGE_SIZE, sortOrder),
]);

export const useVaultGrid = (filterSubject, filterSubtopic) => {
  const [questions, setQuestions] = useState([]);
  const [serverStats, setServerStats] = useState({ total: 0, math: 0, esas: 0, ee: 0 });
  const [vaultMetadata, setVaultMetadata] = useState({});
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingVault, setIsFetchingVault] = useState(true);
  // The filters the grid's rows were loaded for. A change of filters shows
  // the loader until its rows arrive, without a reset in the effect.
  const queryKey = `${filterSubject}|${filterSubtopic}|${sortOrder}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  // Admin review defaults to newest-ingested first. 'oldest' and 'random' are
  // also available via the grid's sort toggle.
  const [sortOrder, setSortOrder] = useState('recent');

  const applyFirstPage = ([stats, meta, qData], key) => {
    setServerStats(stats);
    setVaultMetadata(meta || {});
    setQuestions(qData.items);
    setLastDoc(qData.nextOffset);
    setHasMore(qData.items.length === PAGE_SIZE);
    setLoadedKey(key);
  };

  const initializeVault = async (reset = false) => {
    try {
      setIsFetchingVault(true);
      if (reset) {
        setQuestions([]);
        setLastDoc(null);
        setHasMore(true);
      }
      applyFirstPage(await loadFirstPage(filterSubject, filterSubtopic, sortOrder), queryKey);
    } catch (error) {
      toast.error(`Couldn't load questions: ${error.message}`);
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
    } catch {
      toast.error('Failed to fetch more items.');
    }
    setIsLoadingMore(false);
  };

  // New filters: load their first page. State is set only in the request's
  // callbacks; until they land the grid shows its loader (loadedKey).
  useEffect(() => {
    let live = true;
    const key = `${filterSubject}|${filterSubtopic}|${sortOrder}`;
    loadFirstPage(filterSubject, filterSubtopic, sortOrder).then(
      (page) => { if (live) { applyFirstPage(page, key); setIsFetchingVault(false); } },
      (error) => { if (live) { toast.error(`Couldn't load questions: ${error.message}`); setLoadedKey(key); setIsFetchingVault(false); } },
    );
    return () => { live = false; };
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
    isFetchingVault: isFetchingVault || loadedKey !== queryKey, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit,
    initializeVault, sortOrder, setSortOrder
  };
};