// src/features/library/VaultDataGrid.jsx
import { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LatexRenderer from '../../components/LatexRenderer';
import { useStore } from '../../store/useStore';
import { fetchFlaggedQuestions } from '../../services/dbQueries';
import { Button, Modal, FormField, Select, Input, Badge, StatusPill, EmptyState } from '../../components/ui';
import { Calculator, Brain, Pencil, X, Check, Shield, TriangleAlert, Search } from '../../components/ui/icons';
import QuestionEditModal from './QuestionEditModal';

export default function VaultDataGrid({
  filteredQuestions,
  filterSubject, setFilterSubject,
  filterSubtopic, setFilterSubtopic,
  handleDelete,
  isFetchingVault,
  hasMore, isLoadingMore, loadMoreQuestions,
  editingQ, setEditingQ, handleUpdateSubmit,
  saveState = { saving: false, error: '' }, closeEditor = () => setEditingQ(null),
  search = '', setSearch = () => {},
  isAdmin,
  sortOrder = 'recent', setSortOrder = () => {}
}) {

  const SORT_OPTIONS = [
    { key: 'recent', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'random', label: 'Random' },
  ];

  // 🚀 Replaced static import with dynamicTOS from your store
  const dynamicTOS = useStore((s) => s.dynamicTOS);

  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);
  const [adminFlaggedQs, setAdminFlaggedQs] = useState([]);
  const [isFetchingFlagged, setIsFetchingFlagged] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // The search box searches once typing pauses.
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => { if (searchDraft.trim() !== search) setSearch(searchDraft.trim()); }, 350);
    return () => clearTimeout(t);
  }, [searchDraft, search, setSearch]);

  // --- VIRTUALIZATION SETUP ---
  const parentRef = useRef(null);

  useEffect(() => {
    if (showOnlyFlagged) {
        const loadFlagged = async () => {
            setIsFetchingFlagged(true);
            try {
                const data = await fetchFlaggedQuestions(filterSubject, filterSubtopic);
                setAdminFlaggedQs(data);
            } catch (err) {
                console.error("Failed to load flagged questions:", err);
            }
            setIsFetchingFlagged(false);
        };
        loadFlagged();
    }
  }, [showOnlyFlagged, filterSubject, filterSubtopic]);

  const interceptSubmit = async (updatedQ) => {
    const saved = await handleUpdateSubmit(updatedQ);
    if (saved === false) return;
    if (showOnlyFlagged) {
        if (!updatedQ.isFlagged) {
            setAdminFlaggedQs(prev => prev.filter(q => q.id !== updatedQ.id));
        } else {
            setAdminFlaggedQs(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
        }
    }
  };

  const interceptDelete = (id) => {
    handleDelete(id);
    if (showOnlyFlagged) {
        setAdminFlaggedQs(prev => prev.filter(q => q.id !== id));
    }
  };

  const finalQuestions = showOnlyFlagged ? adminFlaggedQs : filteredQuestions;
  const displayLoading = isFetchingVault || isFetchingFlagged;

  const rowVirtualizer = useVirtualizer({
    count: finalQuestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">

      {/* Filters & flagged toggle */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 bg-surface border border-border p-4 rounded-[var(--radius-lg)] shadow-sm sm:items-end">
        {isAdmin && !showOnlyFlagged && (
          <FormField label="Search" hint="Words in the question, or its ID" className="flex-[2] min-w-[14rem]">
            <Input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="e.g. multiplexer, or 201494a1-…"
            />
          </FormField>
        )}
        <FormField label="Subject" className="flex-1">
          <Select
            value={filterSubject}
            onChange={(e) => { setFilterSubject(e.target.value); setFilterSubtopic('All'); }}
          >
            <option value="All">All subjects</option>
            {dynamicTOS && Object.keys(dynamicTOS).map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Topic" className="flex-1">
          <Select
            value={filterSubtopic}
            onChange={(e) => setFilterSubtopic(e.target.value)}
            disabled={filterSubject === 'All'}
          >
            <option value="All">All topics</option>
            {filterSubject !== 'All' && (dynamicTOS?.[filterSubject] || []).map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </Select>
        </FormField>

        {isAdmin && (
            <Button
                variant={showOnlyFlagged ? 'outline' : 'secondary'}
                tone={showOnlyFlagged ? 'amber' : undefined}
                onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
                aria-pressed={showOnlyFlagged}
            >
                <Shield size={14} strokeWidth={1.75} aria-hidden="true" />
                {showOnlyFlagged ? 'Showing reported only' : 'Show reported only'}
            </Button>
        )}
      </div>

      {/* Sort control — newest-ingested first by default so freshly generated
          items are easy to review. Hidden in flagged-only mode (that view is
          always newest-first via its own endpoint). */}
      {!showOnlyFlagged && (
        <div className="flex items-center gap-1.5 -mt-2">
          <span className="text-[0.6rem] font-bold text-muted2 uppercase tracking-widest mr-1">Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortOrder(opt.key)}
              className={`px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                sortOrder === opt.key
                  ? 'bg-reeBlue/10 border-reeBlue/50 text-reeBlue-text shadow-sm'
                  : 'bg-bg border-border2 text-muted hover:text-textMain hover:border-reeBlue/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* --- VIRTUALIZED SCROLL CONTAINER --- */}
      <div
        ref={parentRef}
        className="max-h-[800px] overflow-y-auto custom-scrollbar pr-2 w-full"
      >
        {displayLoading ? (
            <div className="py-16 flex flex-col items-center justify-center border border-border bg-surface2/50 rounded-[var(--radius-lg)] text-[var(--accent-signal)]">
                <span className="telemetry-spinner !w-8 !h-8 mb-4 border-t-transparent"></span>
                <span className="text-eyebrow animate-pulse" style={{ color: 'var(--accent-signal)' }}>Loading…</span>
            </div>
        ) : finalQuestions.length === 0 ? (
          <div className="border-2 border-dashed border-border2 rounded-[var(--radius-lg)] p-4">
            <EmptyState
              compact
              icon={Search}
              title={showOnlyFlagged ? 'No reported questions' : 'No questions found'}
              description={showOnlyFlagged ? 'Nothing has been reported in this subject.' : search ? `Nothing matches “${search}” here. Check the ID, or clear the subject and topic filters.` : 'Try a different subject or topic filter.'}
            />
          </div>
        ) : (
          <div
            style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const q = finalQuestions[virtualRow.index];

                let diff = q.type === 'calculation' ? 'MEDIUM' : 'EASY';
                if (typeof q.difficulty === 'string' && q.difficulty.trim() !== '') {
                    diff = q.difficulty.toUpperCase();
                } else if (typeof q.difficulty === 'number') {
                    diff = q.difficulty > 2 ? 'HARD' : (q.difficulty > 1 ? 'MEDIUM' : 'EASY');
                }

                const TypeIcon = q.type === 'conceptual' ? Brain : Calculator;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: '12px'
                    }}
                  >
                    <div
                      className="p-4 bg-surface border rounded-[var(--radius-lg)] shadow-sm transition-colors flex items-start gap-4 relative group focus-within:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                      style={q.isFlagged
                        ? { borderColor: 'color-mix(in srgb, var(--color-reeAmber) 50%, transparent)', background: 'color-mix(in srgb, var(--color-reeAmber) 5%, var(--bg-surface))' }
                        : undefined}
                    >

                      <div className="shrink-0 pt-1 text-muted opacity-70">
                          <TypeIcon size={22} strokeWidth={1.5} aria-hidden="true" />
                      </div>

                      <div className="flex-1 flex flex-col min-w-0 pr-12">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge tone="signal">{q.subject}</Badge>
                              <span className="text-xs font-bold text-textMain truncate">{q.subtopic || 'Uncategorized'}</span>
                              <StatusPill dot={false} tone={diff === 'HARD' ? 'danger' : diff === 'MEDIUM' ? 'amber' : 'success'}>{diff.toLowerCase()}</StatusPill>

                              {q.fixedExplanation && (
                                  <Badge tone="neutral" className="hidden sm:inline-flex">offline solution</Badge>
                              )}

                              {q.isFlagged && (
                                  <StatusPill tone="danger">Reported</StatusPill>
                              )}
                          </div>

                          <div className="text-sm text-textMain leading-relaxed math-scroll-mobile min-w-0">
                              <LatexRenderer content={q.text} />
                          </div>
                      </div>

                      {isAdmin && (
                          <div className="absolute top-4 right-4 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">

                              {q.isFlagged && (
                                  <Button size="icon" variant="ghost" tone="success" onClick={() => interceptSubmit({ ...q, isFlagged: false })} aria-label="Resolve report" className="text-muted">
                                      <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                                  </Button>
                              )}

                              <Button size="icon" variant="ghost" onClick={() => setEditingQ(q)} aria-label="Edit question" className="text-muted hover:text-textMain">
                                  <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                              </Button>
                              <Button size="icon" variant="ghost" tone="danger" onClick={() => setPendingDeleteId(q.id)} aria-label="Delete question" className="text-muted">
                                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                              </Button>
                          </div>
                      )}
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>

      {hasMore && !displayLoading && !showOnlyFlagged && (
        <Button variant="secondary" fullWidth size="lg" className="mt-2" onClick={loadMoreQuestions} loading={isLoadingMore} disabled={isLoadingMore}>
          Load more
        </Button>
      )}

      {/* Delete confirmation */}
      <Modal
        open={pendingDeleteId != null}
        onClose={() => setPendingDeleteId(null)}
        tone="danger"
        icon={TriangleAlert}
        title="Delete this question?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
            <Button tone="danger" onClick={() => { interceptDelete(pendingDeleteId); setPendingDeleteId(null); }}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">It will be removed from the question bank for everyone. This can't be undone.</p>
      </Modal>

      <QuestionEditModal
        question={editingQ}
        onChange={setEditingQ}
        onClose={closeEditor}
        onSave={interceptSubmit}
        saving={saveState.saving}
        error={saveState.error}
      />
    </div>
  );
}
