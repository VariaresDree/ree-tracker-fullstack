import { useState, useEffect } from 'react';
import { 
  fetchPaginatedQuestions, fetchServerStats, deleteQuestionFromBank, 
  updateQuestionInBank, fetchVaultMetadata, resyncVaultMetadata 
} from '../../services/dbQueries';
import toast from 'react-hot-toast';

const PAGE_SIZE = 30;

const loadFirstPage = (subject, subtopic, sortOrder, search) => Promise.all([
  fetchServerStats(),
  fetchVaultMetadata(),
  fetchPaginatedQuestions(null, subject, subtopic, PAGE_SIZE, sortOrder, search),
]);

// `search`: a question's id or words in its text (admins; the server ignores
// it for anyone else). Searching lists by newest or oldest, never random.
export const useVaultGrid = (filterSubject, filterSubtopic, search = '') => {
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
  // The filters the grid's rows were loaded for. A change of filters shows
  // the loader until its rows arrive, without a reset in the effect.
  const [saveState, setSaveState] = useState({ saving: false, error: '' });
  const sort = search && sortOrder === 'random' ? 'recent' : sortOrder;
  const queryKey = `${filterSubject}|${filterSubtopic}|${sort}|${search}`;
  const [loadedKey, setLoadedKey] = useState(null);

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
      applyFirstPage(await loadFirstPage(filterSubject, filterSubtopic, sort, search), queryKey);
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
      const { items, nextOffset } = await fetchPaginatedQuestions(lastDoc, filterSubject, filterSubtopic, PAGE_SIZE, sort, search);
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
    const key = `${filterSubject}|${filterSubtopic}|${sort}|${search}`;
    loadFirstPage(filterSubject, filterSubtopic, sort, search).then(
      (page) => { if (live) { applyFirstPage(page, key); setIsFetchingVault(false); } },
      (error) => {
        if (!live) return;
        toast.error(`Couldn't load questions: ${error.message}`);
        // The previous filters' rows would read as these filters' results.
        setQuestions([]);
        setLastDoc(null);
        setHasMore(false);
        setLoadedKey(key);
        setIsFetchingVault(false);
      },
    );
    return () => { live = false; };
  }, [filterSubject, filterSubtopic, sort, search]);

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

  // The editor stays open on a failed save, with the server's reason in it.
  const handleUpdateSubmit = async (updatedQ) => {
    setSaveState({ saving: true, error: '' });
    try {
      await updateQuestionInBank(updatedQ.id, updatedQ);
      setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
      toast.success('Question saved.');
      setEditingQ(null);
      setSaveState({ saving: false, error: '' });
      return true;
    } catch (err) {
      setSaveState({ saving: false, error: `Couldn't save: ${err.message}` });
      // Resolving a report saves from the row, with no editor to show it.
      if (!editingQ) toast.error(`Couldn't save: ${err.message}`);
      return false;
    }
  };

  const closeEditor = () => { setEditingQ(null); setSaveState({ saving: false, error: '' }); };

  return {
    questions, serverStats, vaultMetadata, resyncVaultMetadata,
    isFetchingVault: isFetchingVault || loadedKey !== queryKey, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit, saveState, closeEditor,
    initializeVault, sortOrder, setSortOrder
  };
};