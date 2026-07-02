// src/features/vault/BookmarkVaultTab.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchBookmarks, removeBookmark, updateBookmarkCache } from '../../services/dbQueries'; 
import * as geminiApi from '../../services/geminiApi'; 
import SmartText from '../../components/SmartText';           
import LatexRenderer from '../../components/LatexRenderer';

export default function BookmarkVaultTab({ currentUser, isOnline }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState(null); 
  const [showSolutionFor, setShowSolutionFor] = useState({});         
  
  const [aiResponses, setAiResponses] = useState({});
  const [isAiLoading, setIsAiLoading] = useState({});
  const [showAiFor, setShowAiFor] = useState({});

  useEffect(() => {
    if (currentUser) {
      loadBookmarks();
    }
  }, [currentUser]);

  const loadBookmarks = async () => {
    setIsLoadingBookmarks(true);
    try {
      const data = await fetchBookmarks(currentUser.uid);
      setBookmarks(data);
    } catch (error) {
      toast.error("Failed to decrypt bookmark data.");
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  const handleRemoveBookmark = async (itemId) => {
    try {
      await removeBookmark(currentUser.uid, itemId);
      setBookmarks(prev => prev.filter(item => item.id !== itemId));
      toast.success("Bookmark purged from vault.");
    } catch (error) {
      toast.error("Failed to remove bookmark.");
    }
  };

  const toggleBookmarkExpand = (itemId) => {
    setExpandedBookmarkId(prev => prev === itemId ? null : itemId);
  };

  const toggleSolutionVisibility = (itemId) => {
    setShowSolutionFor(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // --- OFFLINE-RESILIENT CACHE ENGINE ---
  const handleFetchAIBookmark = async (item, forceRefresh = false) => {
    const cachedData = aiResponses[item.id] || item.cachedAiExplanation || item.fixedExplanation;

    // 1. If we have a local cache and aren't forcing a refresh, just toggle visibility
    if (!forceRefresh && cachedData) {
        if (!aiResponses[item.id]) setAiResponses(prev => ({ ...prev, [item.id]: cachedData }));
        setShowAiFor(prev => ({ ...prev, [item.id]: !prev[item.id] }));
        return;
    }

    // 2. Offline Lockout (Only triggers if NO cache exists)
    if (!isOnline && !cachedData) {
        toast.error("You're offline and this explanation hasn't been saved yet.");
        return;
    }

    setIsAiLoading(prev => ({ ...prev, [item.id]: true }));
    setShowAiFor(prev => ({ ...prev, [item.id]: true }));
    
    try {
        let responseText = "";
        if (typeof geminiApi.generateDeepExplanation === 'function') {
            responseText = await geminiApi.generateDeepExplanation(item.content || item.question, item.answer, item.options);
        } else if (typeof geminiApi.generateExplanation === 'function') {
            responseText = await geminiApi.generateExplanation(item.content || item.question, item.answer);
        } else {
            responseText = `**AI Derivation Engine Error.** Function not found.`;
        }
        
        // Save to Firebase so it's permanently available offline next time
        await updateBookmarkCache(currentUser.uid, item.id, responseText);
        
        setBookmarks(prev => prev.map(b => b.id === item.id ? { ...b, cachedAiExplanation: responseText } : b));
        setAiResponses(prev => ({ ...prev, [item.id]: responseText }));
    } catch (error) {
        toast.error("Couldn't generate the explanation. Check your connection.");
        setShowAiFor(prev => ({ ...prev, [item.id]: false }));
    } finally {
        setIsAiLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6">
      <div className="border-b border-border2 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-textMain tracking-tight">Bookmark Vault <span className="text-reeAmber">🔐</span></h2>
          <p className="text-muted2 mt-1 text-sm">Encrypted storage for critical blind spots and high-probability board questions.</p>
        </div>
        <span className="px-4 py-2 bg-surface2 border border-border2 rounded-lg text-xs font-bold font-mono text-muted">
          {bookmarks.length} Encrypted Items
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {isLoadingBookmarks ? (
            <div className="p-12 border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center justify-center bg-surface/50 text-center">
              <span className="telemetry-spinner mb-4"></span>
              <span className="text-sm font-bold text-muted font-mono uppercase tracking-widest">Decrypting Vault Data...</span>
            </div>
        ) : bookmarks.length === 0 ? (
           <div className="p-12 border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center justify-center bg-surface/50 text-center">
              <span className="text-4xl mb-4 opacity-50">🗄️</span>
              <h3 className="text-lg font-bold text-textMain mb-2">Vault is Empty</h3>
              <p className="text-sm text-muted">You haven't bookmarked any flashcards or items during Active Review.</p>
           </div>
        ) : (
          bookmarks.map(item => {
            const isExpanded = expandedBookmarkId === item.id;
            const isSolutionVisible = showSolutionFor[item.id];
            const isAiVisible = showAiFor[item.id];
            
            // CALCULATE OFFLINE ACCESSIBILITY
            const hasCache = aiResponses[item.id] || item.cachedAiExplanation || item.fixedExplanation;
            const isOfflineLocked = !isOnline && !hasCache;

            return (
              <div key={item.id} className="p-5 bg-surface border border-border2 rounded-xl flex flex-col hover:border-reeAmber/40 transition-colors shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${item.type === 'Question' || !item.type ? 'bg-reeCyan/10 text-reeCyan border-reeCyan/30' : 'bg-reePurple/10 text-reePurple border-reePurple/30'}`}>
                        {item.type || 'Question'}
                      </span>
                      <span className="text-[11px] text-muted font-bold uppercase tracking-widest border-l border-border2 pl-2 truncate max-w-[120px] sm:max-w-none">
                        {item.subject || 'General'}
                      </span>
                      <span className="text-[11px] text-muted2 font-mono uppercase tracking-widest ml-auto md:ml-0 md:border-l md:border-border2 md:pl-2 shrink-0">
                        Saved: {new Date(item.bookmarkedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {!isExpanded && (
                      <div className="text-sm font-bold text-textMain leading-relaxed line-clamp-2 md:line-clamp-none pr-4 overflow-hidden pointer-events-none math-scroll-mobile">
                        <SmartText text={item.question || item.content} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                    <button onClick={() => toggleBookmarkExpand(item.id)} className={`flex-1 md:flex-none px-6 py-2.5 border rounded-lg text-xs font-bold transition-colors cursor-pointer ${isExpanded ? 'bg-surface3 border-border2 text-textMain' : 'bg-surface2 hover:bg-surface3 text-textMain border-border2'}`}>
                      {isExpanded ? '✕ Close Viewer' : 'Review Data'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveBookmark(item.id); }} className="px-4 py-2.5 bg-bg border border-border2 text-muted hover:text-reeRed hover:border-reeRed/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center" title="Purge from Vault">
                      ✕
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-border2/50 animate-in fade-in slide-in-from-top-2">
                    <div className="text-sm md:text-base text-textMain font-medium leading-relaxed mb-6 bg-bg p-5 rounded-xl border border-border2/50 overflow-x-auto math-scroll-mobile shadow-inner">
                      <SmartText text={item.content || item.question} />
                    </div>

                    {item.options && item.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {item.options.map((opt, idx) => {
                          const isCorrect = opt === item.answer;
                          return (
                            <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-center transition-colors ${isCorrect ? 'bg-reeGreen/10 border-reeGreen/40 text-reeGreen shadow-[0_0_10px_rgba(34,197,94,0.05)]' : 'bg-surface2 border-border2 text-textMain'}`}>
                              <div className="flex justify-between items-center w-full mb-3 border-b border-border2/50 pb-2">
                                 <span className={`text-[11px] uppercase tracking-widest font-black ${isCorrect ? 'text-reeGreen' : 'text-muted2'}`}>
                                   {isCorrect ? '✓ Correct Answer' : '✕ Distractor'}
                                 </span>
                              </div>
                              <div className="text-sm font-medium overflow-x-auto math-scroll-mobile no-scrollbar">
                                <LatexRenderer content={opt} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mb-2">
                      {(item.fixedExplanation || item.answer) && (
                        <button onClick={() => toggleSolutionVisibility(item.id)} className={`flex-1 py-3 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer ${isSolutionVisible ? 'bg-reeCyan/10 border-reeCyan/50 text-reeCyan' : 'bg-surface2 hover:bg-surface3 border-border2 text-textMain'}`}>
                          {isSolutionVisible ? 'Hide Official Solution' : '💡 Show Official Solution'}
                        </button>
                      )}
                      
                      {/* DYNAMIC OFFLINE/ONLINE BUTTON */}
                      <button 
                          onClick={() => handleFetchAIBookmark(item)} 
                          disabled={isOfflineLocked || isAiLoading[item.id]}
                          className={`flex-1 py-3 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm 
                            ${isOfflineLocked 
                                ? 'bg-bg border-border2 text-muted opacity-50 cursor-not-allowed' 
                                : isAiVisible 
                                    ? 'bg-reePurple/10 border-reePurple/50 text-reePurple' 
                                    : !isOnline && hasCache
                                        ? 'bg-reePurple/5 hover:bg-reePurple/10 border-reePurple/30 text-reePurple cursor-pointer'
                                        : 'bg-surface2 hover:bg-surface3 border-border2 text-reePurple cursor-pointer'
                            }`}
                      >
                          {isAiLoading[item.id] ? (
                              <><span className="telemetry-spinner !w-3 !h-3"></span> Loading…</>
                          ) : isAiVisible ? (
                              'Hide AI explanation'
                          ) : !isOnline && hasCache ? (
                              'View saved AI explanation (offline)'
                          ) : (
                              'Explain with AI'
                          )}
                      </button>
                    </div>

                    {isSolutionVisible && (
                      <div className="p-5 bg-surface border border-reeCyan/30 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="text-eyebrow mb-3 border-b border-reeCyan/20 pb-2" style={{ color: 'var(--accent-signal)' }}>Solution</div>
                        <div className="text-sm text-textMain leading-relaxed overflow-x-auto math-scroll-mobile p-4 bg-reeCyan/5 border border-reeCyan/10 rounded-lg">
                          {item.fixedExplanation ? (
                            <LatexRenderer content={item.fixedExplanation} />
                          ) : (
                            <span className="text-muted italic flex items-center gap-2">No detailed explanation provided. Correct answer is: <strong className="text-textMain"><LatexRenderer content={item.answer} /></strong></span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RENDERS CACHE EVEN IF OFFLINE */}
                    {isAiVisible && (aiResponses[item.id] || item.cachedAiExplanation || item.fixedExplanation) && (
                      <div className="p-5 bg-surface border border-reePurple/30 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                         <div className="flex justify-between items-center mb-3 border-b border-reePurple/20 pb-2">
                             <div className="flex items-center gap-2">
                                 <span className="text-[11px] font-bold text-reePurple uppercase tracking-widest">Deep AI Analysis</span>
                                 {!isOnline && <span className="text-[11px] bg-reePurple/10 text-reePurple px-2 py-0.5 rounded border border-reePurple/20 font-bold uppercase tracking-widest">Offline Cache</span>}
                             </div>
                             <button onClick={() => handleFetchAIBookmark(item, true)} disabled={isAiLoading[item.id] || !isOnline} className="text-reePurple hover:bg-reePurple/10 px-2 py-1 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">🔄 Regenerate</button>
                         </div>
                         <div className="text-sm text-textMain leading-relaxed overflow-x-auto math-scroll-mobile p-4 bg-reePurple/5 border border-reePurple/10 rounded-lg">
                             <LatexRenderer content={aiResponses[item.id] || item.cachedAiExplanation || item.fixedExplanation} />
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}