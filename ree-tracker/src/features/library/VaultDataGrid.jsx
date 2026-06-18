// src/features/library/VaultDataGrid.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LatexRenderer from '../../components/LatexRenderer';
import FocusTrap from '../../components/FocusTrap';
import { useStore } from '../../store/useStore';
import { fetchFlaggedQuestions } from '../../services/dbQueries'; 

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

  // --- VIRTUALIZATION SETUP ---
  const parentRef = useRef(null);

  const availableSubtopics = useMemo(() => {
    if (!dynamicTOS) return [];
    if (filterSubject === 'All') {
        return [...new Set(Object.values(dynamicTOS).flat())].sort();
    }
    return dynamicTOS[filterSubject] ? [...dynamicTOS[filterSubject]].sort() : [];
  }, [filterSubject, dynamicTOS]); 

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
                console.error("Failed to load flagged matrix:", err);
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
      
      {/* Filters & Flagged Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface border border-border2 p-4 rounded-xl shadow-sm">
        <select 
          value={filterSubject} 
          onChange={(e) => { setFilterSubject(e.target.value); setFilterSubtopic('All'); }}
          className="flex-1 bg-bg border border-border2 text-textMain px-4 py-2.5 rounded-lg text-sm font-bold outline-none focus:border-reeBlue transition-colors cursor-pointer"
        >
          <option value="All">All Subjects</option>
          {dynamicTOS && Object.keys(dynamicTOS).map(subj => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>
        
        <select 
          value={filterSubtopic}
          onChange={(e) => setFilterSubtopic(e.target.value)}
          disabled={filterSubject === 'All'}
          className="flex-1 bg-bg border border-border2 text-textMain px-4 py-2.5 rounded-lg text-sm outline-none focus:border-reeBlue transition-colors cursor-pointer disabled:opacity-50"
        >
          <option value="All">All Subtopics</option>
          {filterSubject !== 'All' && (dynamicTOS?.[filterSubject] || []).map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        {isAdmin && (
            <button 
                onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
                className={`px-4 py-2.5 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                    showOnlyFlagged 
                    ? 'bg-reeAmber/10 border-reeAmber/50 text-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'bg-bg border-border2 text-muted hover:text-textMain hover:border-reeBlue/50'
                }`}
            >
                {showOnlyFlagged ? '⚠️ Flagged Rows Only' : '🛡️ All Vault Entries'}
            </button>
        )}
      </div>

      {/* --- VIRTUALIZED SCROLL CONTAINER --- */}
      <div 
        ref={parentRef} 
        className="max-h-[800px] overflow-y-auto custom-scrollbar pr-2 w-full"
      >
        {displayLoading ? (
            <div className="py-16 flex flex-col items-center justify-center border border-border2 bg-surface2/50 rounded-xl">
                <span className="telemetry-spinner !w-8 !h-8 mb-4 border-reeCyan border-t-transparent"></span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest font-mono text-reeCyan animate-pulse">Syncing Matrix...</span>
            </div>
        ) : finalQuestions.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-sm font-mono">
            {showOnlyFlagged ? "No flagged items detected in this sector. Matrix clear." : "No active matrix entries found for this sector."}
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
                
                const subjStyle = q.subject === 'Mathematics' ? 'bg-reeBlue/10 text-reeBlue' : q.subject === 'ESAS' ? 'bg-reePurple/10 text-reePurple' : 'bg-reeCyan/10 text-reeCyan';
                
                let diff = q.type === 'calculation' ? 'MEDIUM' : 'EASY';
                if (typeof q.difficulty === 'string' && q.difficulty.trim() !== '') {
                    diff = q.difficulty.toUpperCase();
                } else if (typeof q.difficulty === 'number') {
                    diff = q.difficulty > 2 ? 'HARD' : (q.difficulty > 1 ? 'MEDIUM' : 'EASY');
                }

                const diffStyle = diff === 'HARD' ? 'border-reeRed/30 text-reeRed' : diff === 'MEDIUM' ? 'border-reeAmber/30 text-reeAmber' : 'border-reeGreen/30 text-reeGreen';
                const icon = q.type === 'conceptual' ? '🧠' : '🧮';

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
                    <div className={`p-4 bg-surface border rounded-xl shadow-sm transition-colors flex items-start gap-4 relative group ${q.isFlagged ? 'border-reeAmber/50 bg-reeAmber/5 hover:border-reeAmber' : 'border-border2 hover:border-reeBlue/30'}`}>
                      
                      <div className="shrink-0 pt-1 text-2xl opacity-60 mix-blend-luminosity">
                          {icon}
                      </div>
                      
                      <div className="flex-1 flex flex-col min-w-0 pr-12">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase tracking-widest ${subjStyle}`}>{q.subject}</span>
                              <span className="text-xs font-bold text-textMain truncate">{q.subtopic || 'Uncategorized'}</span>
                              <span className="text-muted2 text-[0.5rem]">•</span>
                              <span className={`px-2 py-0.5 rounded border text-[0.6rem] font-bold uppercase tracking-widest ${diffStyle}`}>{diff}</span>
                              
                              {q.fixedExplanation && (
                                  <span className="px-2 py-0.5 rounded border border-reeCyan/30 text-reeCyan text-[0.6rem] font-bold uppercase tracking-widest hidden sm:inline">
                                      OFFLINE READY
                                  </span>
                              )}

                              {q.isFlagged && (
                                  <span className="px-2 py-0.5 rounded border border-reeAmber/50 bg-reeAmber/20 text-reeAmber text-[0.6rem] font-bold uppercase tracking-widest shadow-sm animate-pulse">
                                      ⚠️ Error Reported
                                  </span>
                              )}
                          </div>
                          
                          <div className="text-sm text-textMain leading-relaxed">
                              <LatexRenderer content={q.text} />
                          </div>
                      </div>

                      {isAdmin && (
                          <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              
                              {q.isFlagged && (
                                  <button 
                                      onClick={() => interceptSubmit({ ...q, isFlagged: false })} 
                                      className="p-2 sm:p-1.5 text-textMain sm:text-muted hover:text-reeGreen bg-surface3 sm:bg-transparent hover:bg-reeGreen/10 rounded-md transition-colors text-xs cursor-pointer shadow-sm sm:shadow-none" 
                                      title="Resolve & Unflag"
                                  >
                                      ✅
                                  </button>
                              )}
                              
                              <button 
                                  onClick={() => setEditingQ(q)} 
                                  className="p-2 sm:p-1.5 text-textMain sm:text-muted hover:text-reeBlue bg-surface3 sm:bg-transparent hover:bg-reeBlue/10 rounded-md transition-colors text-xs cursor-pointer shadow-sm sm:shadow-none" 
                                  title="Edit Entry"
                              >
                                  ✏️
                              </button>
                              <button 
                                  onClick={() => { if(window.confirm('Purge this entry from the global matrix?')) interceptDelete(q.id); }} 
                                  className="p-2 sm:p-1.5 text-textMain sm:text-muted hover:text-reeRed bg-surface3 sm:bg-transparent hover:bg-reeRed/10 rounded-md transition-colors text-xs cursor-pointer shadow-sm sm:shadow-none" 
                                  title="Delete Entry"
                              >
                                  ✕
                              </button>
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
        <button 
            onClick={loadMoreQuestions} 
            disabled={isLoadingMore} 
            className="w-full py-4 mt-2 bg-surface border border-border2 hover:border-reeBlue/50 text-textMain font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 shadow-sm hover:shadow-md"
        >
          {isLoadingMore ? <><span className="telemetry-spinner !w-4 !h-4"></span> Connecting to Matrix...</> : '↓ Load Additional Telemetry'}
        </button>
      )}

      {/* WIDE EDIT MODAL OVERLAY */}
      {editingQ && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <FocusTrap active={true}>
            <div className="bg-surface border border-border2 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col relative overflow-hidden">
              
              <div className="flex justify-between items-center p-5 sm:p-6 border-b border-border2 bg-surface2/50 shrink-0">
                <h3 className="text-lg sm:text-xl font-black text-textMain flex items-center gap-2 tracking-tight">
                  <span>✏️</span> Edit Matrix Data
                </h3>
                <button 
                  onClick={() => setEditingQ(null)} 
                  className="text-muted hover:text-textMain text-sm font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-5 sm:p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Configuration Track</label>
                    <select 
                      value={editingQ.subject || 'EE'} 
                      onChange={e => setEditingQ({...editingQ, subject: e.target.value})} 
                      className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue cursor-pointer transition-colors shadow-inner"
                    >
                      {dynamicTOS && Object.keys(dynamicTOS).map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Target Matrix Topic</label>
                    <select 
                      value={editingQ.subtopic || ''} 
                      onChange={e => setEditingQ({...editingQ, subtopic: e.target.value})} 
                      className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue cursor-pointer transition-colors shadow-inner"
                    >
                      <option value="">Select Subtopic...</option>
                      {dynamicTOS && dynamicTOS[editingQ.subject || 'EE']?.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Question Type</label>
                    <select 
                      value={editingQ.type || 'calculation'} 
                      onChange={e => setEditingQ({...editingQ, type: e.target.value})} 
                      className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue cursor-pointer transition-colors shadow-inner"
                    >
                      <option value="calculation">🧮 Calculation (Heavy Math)</option>
                      <option value="conceptual">🧠 Conceptual (Theory)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Difficulty Metric</label>
                    <select 
                      value={typeof editingQ.difficulty === 'number' ? String(editingQ.difficulty) : (editingQ.difficulty || '2')} 
                      onChange={e => setEditingQ({...editingQ, difficulty: e.target.value})} 
                      className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeBlue cursor-pointer transition-colors shadow-inner"
                    >
                      <option value="1">1 - Foundation (Easy)</option>
                      <option value="2">2 - Core Evaluation (Medium)</option>
                      <option value="3">3 - Advanced (Hard)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Question Content Text</label>
                  <textarea 
                    value={editingQ.text} 
                    onChange={e => setEditingQ({...editingQ, text: e.target.value})} 
                    className="w-full bg-bg border border-border2 text-textMain p-4 rounded-lg text-sm outline-none min-h-[100px] leading-relaxed custom-scrollbar focus:border-reeBlue transition-colors shadow-inner" 
                    placeholder="Input calculation problem variables cleanly..." 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] font-bold text-reeGreen uppercase tracking-widest">Verified Correct Answer</label>
                  <input 
                    value={editingQ.answer || ''} 
                    onChange={e => handleEditAnswerChange(e.target.value)} 
                    className="w-full bg-bg border border-reeGreen/40 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeGreen transition-colors shadow-[inset_0_0_10px_rgba(34,197,94,0.05)]" 
                    placeholder="The absolute correct value or statement" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] font-bold text-reeRed uppercase tracking-widest">Distractors (Wrong Options)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {editDistractors.map((distVal, idx) => (
                      <input 
                        key={idx}
                        value={distVal} 
                        onChange={e => handleEditDistractorChange(idx, e.target.value)} 
                        className="w-full bg-bg border border-reeRed/20 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeRed/60 transition-colors shadow-inner" 
                        placeholder={`Distractor Option ${idx + 1}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] font-bold text-reeCyan uppercase tracking-widest flex items-center gap-1.5">
                    <span>💾</span> Hardcoded Offline Solution / Explanation
                  </label>
                  <textarea 
                    value={editingQ.fixedExplanation || ''} 
                    onChange={e => setEditingQ({...editingQ, fixedExplanation: e.target.value})} 
                    className="w-full bg-bg border border-border2 text-textMain p-4 rounded-lg text-sm outline-none min-h-[100px] leading-relaxed custom-scrollbar focus:border-reeCyan transition-colors shadow-inner" 
                    placeholder="Provide step-by-step math derivation..." 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 sm:p-6 border-t border-border2 bg-surface2/50 shrink-0">
                <button 
                  onClick={() => setEditingQ(null)} 
                  className="px-6 py-2.5 bg-surface hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => interceptSubmit({ ...editingQ, isFlagged: false })} 
                  className="px-8 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                >
                  Save Changes
                </button>
              </div>

            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}