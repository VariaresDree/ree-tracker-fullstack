// src/features/library/VaultDataGrid.jsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LatexRenderer from '../../components/LatexRenderer';
import { useStore } from '../../store/useStore';
import { fetchFlaggedQuestions } from '../../services/dbQueries';
import { Button, Modal, FormField, Select, Input, Textarea, Badge, StatusPill, EmptyState } from '../../components/ui';
import { Calculator, Brain, Pencil, X, Check, Shield, TriangleAlert, Search } from '../../components/ui/icons';

export default function VaultDataGrid({
  questions = [],
  filteredQuestions,
  filterSubject, setFilterSubject,
  filterSubtopic, setFilterSubtopic,
  handleDelete,
  isFetchingVault,
  hasMore, isLoadingMore, loadMoreQuestions,
  editingQ, setEditingQ, handleUpdateSubmit,
  isAdmin
}) {

  // 🚀 Replaced static import with dynamicTOS from your store
  const { dynamicTOS } = useStore();

  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);
  const [adminFlaggedQs, setAdminFlaggedQs] = useState([]);
  const [isFetchingFlagged, setIsFetchingFlagged] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // --- VIRTUALIZATION SETUP ---
  const parentRef = useRef(null);

  const editDistractors = useMemo(() => {
    if (!editingQ || !editingQ.options) return ['', '', ''];
    const dists = editingQ.options.filter(opt => opt !== editingQ.answer);
    while (dists.length < 3) dists.push('');
    return [dists[0], dists[1], dists[2]];
  }, [editingQ?.options, editingQ?.answer]);

  const handleEditAnswerChange = (val) => {
    setEditingQ({ ...editingQ, answer: val, options: [val, ...editDistractors] });
  };

  const handleEditDistractorChange = (index, val) => {
    const newDists = [...editDistractors];
    newDists[index] = val;
    setEditingQ({ ...editingQ, options: [editingQ.answer || '', ...newDists] });
  };

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

  const interceptSubmit = (updatedQ) => {
    handleUpdateSubmit(updatedQ);
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
      <div className="flex flex-col sm:flex-row gap-4 bg-surface border border-border p-4 rounded-[var(--radius-lg)] shadow-sm sm:items-end">
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
              description={showOnlyFlagged ? 'Nothing has been reported in this subject.' : 'Try a different subject or topic filter.'}
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

                          <div className="text-sm text-textMain leading-relaxed">
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
        <p className="text-sm text-muted2">It will be removed from the vault for everyone. This can't be undone.</p>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editingQ}
        onClose={() => setEditingQ(null)}
        size="xl"
        icon={Pencil}
        title="Edit question"
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingQ(null)}>Cancel</Button>
            <Button onClick={() => interceptSubmit({ ...editingQ, isFlagged: false })}>Save changes</Button>
          </>
        }
      >
        {editingQ && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Subject">
                <Select
                  value={editingQ.subject || 'EE'}
                  onChange={e => setEditingQ({ ...editingQ, subject: e.target.value })}
                >
                  {dynamicTOS && Object.keys(dynamicTOS).map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Topic">
                <Select
                  value={editingQ.subtopic || ''}
                  onChange={e => setEditingQ({ ...editingQ, subtopic: e.target.value })}
                >
                  <option value="">Select a topic…</option>
                  {dynamicTOS && dynamicTOS[editingQ.subject || 'EE']?.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Question type">
                <Select
                  value={editingQ.type || 'calculation'}
                  onChange={e => setEditingQ({ ...editingQ, type: e.target.value })}
                >
                  <option value="calculation">Calculation (heavy math)</option>
                  <option value="conceptual">Conceptual (theory)</option>
                </Select>
              </FormField>
              <FormField label="Difficulty">
                <Select
                  value={typeof editingQ.difficulty === 'number' ? String(editingQ.difficulty) : (editingQ.difficulty || '2')}
                  onChange={e => setEditingQ({ ...editingQ, difficulty: e.target.value })}
                >
                  <option value="1">1 — Foundation (easy)</option>
                  <option value="2">2 — Core (medium)</option>
                  <option value="3">3 — Advanced (hard)</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Question text">
              <Textarea
                value={editingQ.text}
                onChange={e => setEditingQ({ ...editingQ, text: e.target.value })}
                className="min-h-[100px] leading-relaxed custom-scrollbar"
                placeholder="Write the full question…"
              />
            </FormField>

            <FormField label="Correct answer">
              <Input
                value={editingQ.answer || ''}
                onChange={e => handleEditAnswerChange(e.target.value)}
                placeholder="The exact correct value or statement"
                style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}
              />
            </FormField>

            <FormField label="Wrong options (distractors)">
              {({ id }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {editDistractors.map((distVal, idx) => (
                    <Input
                      key={idx}
                      id={idx === 0 ? id : undefined}
                      value={distVal}
                      onChange={e => handleEditDistractorChange(idx, e.target.value)}
                      placeholder={`Wrong option ${idx + 1}`}
                      aria-label={`Wrong option ${idx + 1}`}
                      style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)' }}
                    />
                  ))}
                </div>
              )}
            </FormField>

            <FormField label="Solution / explanation" hint="Shown as the offline solution after answering.">
              <Textarea
                value={editingQ.fixedExplanation || ''}
                onChange={e => setEditingQ({ ...editingQ, fixedExplanation: e.target.value })}
                className="min-h-[100px] leading-relaxed custom-scrollbar"
                placeholder="Step-by-step derivation…"
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
