// src/features/library/LibraryOverview.jsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
    updateDynamicTOS, 
    fetchQuarantineQueue, 
    approveQuarantinedQuestion, 
    deleteQuestionFromBank 
} from '../../services/dbQueries';
import FocusTrap from '../../components/FocusTrap';
import LatexRenderer from '../../components/LatexRenderer'; 
import toast from 'react-hot-toast';

export default function LibraryOverview({ serverStats, vaultMetadata, resyncVaultMetadata, manualMode, setManualMode }) {
  
  // 🚀 Reads dynamicTOS and the setter securely from the global store
  const { isAdmin, dynamicTOS, setDynamicTOS } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- TOS MANAGER STATE ---
  const [showTOSManager, setShowTOSManager] = useState(false);
  const [editTOS, setEditTOS] = useState(null);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [targetSubject, setTargetSubject] = useState('Mathematics');
  const [isSavingTOS, setIsSavingTOS] = useState(false);

  // --- QUARANTINE STATE ---
  const [showQuarantineQueue, setShowQuarantineQueue] = useState(false);
  const [quarantineItems, setQuarantineItems] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // --- QUARANTINE HANDLERS ---
  const openQuarantineQueue = async () => {
      setShowQuarantineQueue(true);
      setIsLoadingQueue(true);
      try {
          const items = await fetchQuarantineQueue();
          setQuarantineItems(items);
      } catch (err) {
          toast.error("Failed to access Quarantine Sector.");
      }
      setIsLoadingQueue(false);
  };

  const handleApproveQuarantinedItem = async (item) => {
      try {
          await approveQuarantinedQuestion(item.id, item.subject, item.subtopic);
          setQuarantineItems(prev => prev.filter(q => q.id !== item.id));
          toast.success("Anomaly Verified & Deployed to Active Vault.");
          resyncVaultMetadata(); 
      } catch (err) {
          toast.error("Verification protocol failed.");
      }
  };

  const handleRejectQuarantinedItem = async (id) => {
      try {
          await deleteQuestionFromBank(id);
          setQuarantineItems(prev => prev.filter(q => q.id !== id));
          toast.success("Hallucination purged from matrix.");
      } catch (err) {
          toast.error("Purge protocol failed.");
      }
  };

  const handleResync = async () => {
    setIsSyncing(true);
    try {
      await resyncVaultMetadata();
      toast.success("Matrix tally resynchronized.");
    } catch (err) {
      toast.error("Failed to resync vault.");
    }
    setIsSyncing(false);
  };

  // --- TOS MANAGER HANDLERS ---
  const openTOSManager = () => {
      setEditTOS(JSON.parse(JSON.stringify(dynamicTOS))); 
      setShowTOSManager(true);
  };

  const handleAddSubtopic = () => {
      if (!newSubtopic.trim()) return;
      if (editTOS[targetSubject].includes(newSubtopic.trim())) {
          toast.error(`${newSubtopic} already exists in ${targetSubject}.`);
          return;
      }
      setEditTOS(prev => ({
          ...prev,
          [targetSubject]: [...prev[targetSubject], newSubtopic.trim()].sort()
      }));
      setNewSubtopic('');
      toast.success(`Staged: ${newSubtopic.trim()}`);
  };

  const handleRemoveSubtopic = (subject, subtopicToRemove) => {
      setEditTOS(prev => ({
          ...prev,
          [subject]: prev[subject].filter(sub => sub !== subtopicToRemove)
      }));
  };

  const saveTOSChanges = async () => {
      setIsSavingTOS(true);
      try {
          await updateDynamicTOS(editTOS);
          setDynamicTOS(editTOS); // Updates global UI immediately without reload
          setShowTOSManager(false);
          toast.success("System TOS Matrix updated successfully.");
      } catch (error) {
          toast.error("Failed to push TOS changes to cloud.");
      }
      setIsSavingTOS(false);
  };

  return (
    <div className="bg-surface border border-border2 rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-border2 pb-4 flex-wrap gap-4">
        <h3 className="text-lg font-black text-textMain uppercase tracking-widest flex items-center gap-2">
          <span className="text-reePurple">🗄️</span> Global Vault Matrix
        </h3>
        <div className="flex flex-wrap gap-3 z-10">
          {isAdmin && (
              <>
                  <button onClick={openQuarantineQueue} className="px-4 py-2 bg-reeAmber/10 hover:bg-reeAmber/20 text-reeAmber border border-reeAmber/30 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.1)] flex items-center gap-2">
                      <span>🛡️</span> Quarantine Queue
                  </button>
                  <button onClick={openTOSManager} className="px-4 py-2 bg-reeCyan/10 hover:bg-reeCyan/20 text-reeCyan border border-reeCyan/30 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)] flex items-center gap-2">
                      <span>⚙️</span> Configure TOS
                  </button>
              </>
          )}
          <button onClick={handleResync} disabled={isSyncing} className="px-4 py-2 bg-surface2 hover:bg-surface3 border border-border2 text-xs font-bold text-muted rounded-lg transition-colors cursor-pointer disabled:opacity-50">
            {isSyncing ? 'Syncing...' : '🔄 Resync Tally'}
          </button>
          <button type="button" onClick={() => setManualMode(!manualMode)} className="px-4 py-2 bg-surface2 hover:bg-surface3 border border-border2 text-xs font-bold text-textMain rounded-lg transition-colors cursor-pointer">
            {manualMode ? '← Return to Automated Ingestion' : '+ Manual Entry Terminal'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-bg border border-border2 rounded-xl text-center">
          <div className="text-3xl font-black text-textMain">{serverStats?.total || 0}</div>
          <div className="text-[0.65rem] uppercase tracking-widest text-muted mt-1 font-bold">Total Items</div>
        </div>
        <div className="p-4 bg-bg border border-reeCyan/20 rounded-xl text-center shadow-[0_0_15px_rgba(6,182,212,0.05)]">
          <div className="text-3xl font-black text-reeCyan">{serverStats?.math || 0}</div>
          <div className="text-[0.65rem] uppercase tracking-widest text-muted mt-1 font-bold">Math Track</div>
        </div>
        <div className="p-4 bg-bg border border-reePurple/20 rounded-xl text-center shadow-[0_0_15px_rgba(139,92,246,0.05)]">
          <div className="text-3xl font-black text-reePurple">{serverStats?.esas || 0}</div>
          <div className="text-[0.65rem] uppercase tracking-widest text-muted mt-1 font-bold">ESAS Track</div>
        </div>
        <div className="p-4 bg-bg border border-reeAmber/20 rounded-xl text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <div className="text-3xl font-black text-reeAmber">{serverStats?.ee || 0}</div>
          <div className="text-[0.65rem] uppercase tracking-widest text-muted mt-1 font-bold">EE Track</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 animate-in fade-in">
        {['Mathematics', 'ESAS', 'EE'].map(s => {
          const trackColor = s === 'Mathematics' ? 'text-reeCyan' : s === 'ESAS' ? 'text-reePurple' : 'text-reeAmber';
          const trackBorder = s === 'Mathematics' ? 'border-reeCyan/20' : s === 'ESAS' ? 'border-reePurple/20' : 'border-reeAmber/20';
          const safeSubj = s === 'Mathematics' ? 'Math' : s;

          return (
            <div key={s} className={`p-5 bg-surface2 border rounded-xl flex flex-col h-[280px] ${trackBorder}`}>
              <div className="border-b border-border2 pb-3 mb-3 shrink-0">
                <div className={`text-sm font-black uppercase tracking-widest ${trackColor}`}>{s}</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                {/* 🚀 FIXED: Maps directly over the dynamic store array */}
                {(dynamicTOS[s] || []).map(sub => {
                  const count = vaultMetadata ? vaultMetadata[`${safeSubj}_${sub}`] || 0 : 0;
                  return (
                    <div key={sub} className="flex justify-between items-center text-xs group shrink-0">
                      <span className={`truncate pr-3 transition-colors ${count > 0 ? 'text-textMain font-medium' : 'text-muted2 opacity-50'}`} title={sub}>{sub}</span>
                      <span className={`font-mono text-[0.65rem] px-2 py-0.5 rounded border ${count > 0 ? (s === 'Mathematics' ? 'bg-reeCyan/10 border-reeCyan/30 text-reeCyan font-bold' : s === 'ESAS' ? 'bg-reePurple/10 border-reePurple/30 text-reePurple font-bold' : 'bg-reeAmber/10 border-reeAmber/30 text-reeAmber font-bold') : 'bg-bg border-border2 text-muted2 opacity-30'}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- TOS MANAGER MODAL --- */}
      {showTOSManager && editTOS && (
          <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
              <FocusTrap active={showTOSManager}>
                  <div className="bg-surface border border-reeCyan/40 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                      
                      <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
                          <h3 className="text-xl font-black text-textMain flex items-center gap-2">
                              <span className="text-reeCyan">⚙️</span> System TOS Configuration
                          </h3>
                          <button onClick={() => setShowTOSManager(false)} className="text-muted hover:text-reeRed text-sm font-bold transition-colors cursor-pointer">✕ Close</button>
                      </div>

                      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-bg">
                          <p className="text-sm text-muted2 mb-6">
                              Add or remove specific engineering subtopics. Changes here will instantly rewrite the AI generation parameters and dashboard matrices globally.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 border border-reeCyan/30 bg-reeCyan/5 rounded-xl">
                              <select 
                                  value={targetSubject} 
                                  onChange={(e) => setTargetSubject(e.target.value)} 
                                  className="bg-surface border border-border2 text-textMain p-2.5 rounded-lg text-sm font-bold outline-none focus:border-reeCyan cursor-pointer sm:w-1/3"
                              >
                                  {Object.keys(editTOS).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input 
                                  type="text" 
                                  value={newSubtopic} 
                                  onChange={(e) => setNewSubtopic(e.target.value)} 
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
                                  placeholder="e.g. Vector Analysis" 
                                  className="flex-1 bg-surface border border-border2 text-textMain p-2.5 rounded-lg text-sm outline-none focus:border-reeCyan shadow-inner"
                              />
                              <button 
                                  onClick={handleAddSubtopic} 
                                  disabled={!newSubtopic.trim()}
                                  className="px-6 py-2.5 bg-reeCyan hover:bg-cyan-500 text-bg font-black rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                              >
                                  Inject
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {Object.keys(editTOS).map(subject => (
                                  <div key={subject} className="bg-surface border border-border2 rounded-xl p-4 flex flex-col max-h-[350px]">
                                      <h4 className="text-xs font-black uppercase tracking-widest mb-3 pb-2 border-b border-border2 text-textMain shrink-0">{subject}</h4>
                                      <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
                                          {editTOS[subject].map(sub => (
                                              <div key={sub} className="flex justify-between items-center bg-bg border border-border2 p-2 rounded-lg group hover:border-reeRed/30 transition-colors shrink-0">
                                                  <span className="text-[0.65rem] font-bold text-muted2 truncate pr-2" title={sub}>{sub}</span>
                                                  <button 
                                                      onClick={() => handleRemoveSubtopic(subject, sub)} 
                                                      className="text-muted hover:text-reeRed text-[0.6rem] font-black px-1.5 py-0.5 rounded transition-colors opacity-50 group-hover:opacity-100 cursor-pointer"
                                                      title="Remove Subtopic"
                                                  >
                                                      ✕
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="p-5 border-t border-border2 bg-surface2/50 flex justify-end gap-3 shrink-0">
                          <button onClick={() => setShowTOSManager(false)} className="px-5 py-2.5 bg-surface hover:bg-surface3 border border-border2 text-textMain text-xs font-bold rounded-xl transition-colors cursor-pointer">
                              Discard Changes
                          </button>
                          <button onClick={saveTOSChanges} disabled={isSavingTOS} className="px-6 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50">
                              {isSavingTOS ? <><span className="telemetry-spinner !w-3 !h-3"></span> Writing to Core...</> : 'Deploy Matrix Updates'}
                          </button>
                      </div>

                  </div>
              </FocusTrap>
          </div>
      )}

      {/* --- QUARANTINE QUEUE MODAL --- */}
      {showQuarantineQueue && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <FocusTrap active={showQuarantineQueue}>
                <div className="bg-surface border border-reeAmber/40 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-black text-textMain flex items-center gap-2">
                            <span className="text-reeAmber">🛡️</span> AI Quarantine Queue
                        </h3>
                        <button onClick={() => setShowQuarantineQueue(false)} className="text-muted hover:text-reeRed text-sm font-bold transition-colors cursor-pointer">✕ Close</button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-bg">
                        {isLoadingQueue ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="telemetry-spinner"></span>
                                <span className="ml-3 text-muted font-mono text-sm">Scanning anomalies...</span>
                            </div>
                        ) : quarantineItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted2 border border-dashed border-border2 rounded-xl p-10">
                                <span className="text-4xl mb-3">✨</span>
                                <span className="font-bold uppercase tracking-widest text-sm">Sector Clear</span>
                                <span className="text-xs mt-2 text-center max-w-sm">No pending AI hallucinations detected. The global matrix is stable.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {quarantineItems.map((q) => (
                                    <div key={q.id} className="bg-surface border border-reeAmber/30 rounded-xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4 border-b border-border2 pb-3">
                                            <div>
                                                <span className="text-[0.6rem] font-black uppercase tracking-widest text-reeAmber bg-reeAmber/10 px-2 py-1 rounded border border-reeAmber/20">Pending Review</span>
                                                <div className="text-[0.65rem] text-muted font-bold mt-2 uppercase tracking-widest">{q.subject} • {q.subtopic}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRejectQuarantinedItem(q.id)} className="px-4 py-2 bg-reeRed/10 hover:bg-reeRed/20 text-reeRed border border-reeRed/30 text-xs font-bold rounded-lg transition-colors cursor-pointer">Purge</button>
                                                <button onClick={() => handleApproveQuarantinedItem(q)} className="px-4 py-2 bg-reeGreen/10 hover:bg-reeGreen/20 text-reeGreen border border-reeGreen/30 text-xs font-bold rounded-lg transition-colors cursor-pointer">Verify & Deploy</button>
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm text-textMain mb-4">
                                            <LatexRenderer content={q.content || q.text || q.question || "No content available."} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options && q.options.map((opt, i) => (
                                                <div key={i} className={`p-3 rounded-lg text-xs font-mono border ${opt === q.answer ? 'bg-reeGreen/10 border-reeGreen/30 text-reeGreen font-bold' : 'bg-bg border-border2 text-muted2'}`}>
                                                    {String.fromCharCode(65 + i)}. <LatexRenderer content={opt} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </FocusTrap>
        </div>
      )}
    </div>
  );
}