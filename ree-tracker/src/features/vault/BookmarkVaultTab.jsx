// src/features/vault/BookmarkVaultTab.jsx
//
// Library › Bookmarks: the questions saved while practising, with their
// answers and explanations, and a way to practise them.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui';
import { Play } from '../../components/ui/icons';
import { bookmarksPreset, launchPractice } from '../active-recall/presets';
import { fetchBookmarks, removeBookmark } from '../../services/dbQueries';
import SmartText from '../../components/SmartText';
import LatexRenderer from '../../components/LatexRenderer';
import SolutionPanel from '../quiz/SolutionPanel';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { explanationKey } from '../../services/aiExplanations';

// A bookmarks session draws up to this many of the saved questions.
const PRACTICE_COUNT = 20;

export default function BookmarkVaultTab({ currentUser, isOnline }) {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState(null);
  // AI explanations, saved on this device per question (shared with Practice
  // and the mock review). This tab used to show the official solution under a
  // "Deep AI Analysis" label whenever no AI one had been made.
  const ai = useAiExplanation(currentUser?.uid);

  useEffect(() => {
    if (currentUser) {
      loadBookmarks();
    }
  }, [currentUser]);

  const loadBookmarks = async () => {
    setIsLoadingBookmarks(true);
    try {
      const data = await fetchBookmarks({ limit: 100 });
      setBookmarks(data);
    } catch {
      toast.error("Couldn't load your bookmarks.");
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  const handleRemoveBookmark = async (itemId) => {
    try {
      await removeBookmark(currentUser.uid, itemId);
      setBookmarks(prev => prev.filter(item => item.id !== itemId));
      toast.success("Bookmark removed.");
    } catch {
      toast.error("Failed to remove bookmark.");
    }
  };

  const toggleBookmarkExpand = (itemId) => {
    setExpandedBookmarkId(prev => prev === itemId ? null : itemId);
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6">
      <div className="border-b border-border2 pb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-textMain tracking-tight">Bookmarks</h2>
          <p className="text-muted2 mt-1 text-sm">
            Questions you saved while practising. Open one to see its answer, or practise them as a session.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted2 tabular-nums">{bookmarks.length} saved</span>
          <Button
            size="sm"
            onClick={() => launchPractice(navigate, bookmarksPreset(Math.min(PRACTICE_COUNT, bookmarks.length)))}
            disabled={bookmarks.length === 0 || !isOnline}
            title={isOnline ? undefined : 'Needs a connection'}
          >
            <Play size={14} strokeWidth={2} aria-hidden="true" /> Practise bookmarks
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoadingBookmarks ? (
            <div className="p-12 border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center justify-center bg-surface/50 text-center">
              <span className="telemetry-spinner mb-4"></span>
              <span className="text-sm font-bold text-muted font-mono uppercase tracking-widest">Loading bookmarks…</span>
            </div>
        ) : bookmarks.length === 0 ? (
           <div className="p-12 border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center justify-center bg-surface/50 text-center">
              <h3 className="text-lg font-bold text-textMain mb-2">No bookmarks yet</h3>
              <p className="text-sm text-muted">Tap the bookmark icon on a question in Practice to save it here.</p>
           </div>
        ) : (
          bookmarks.map(item => {
            const isExpanded = expandedBookmarkId === item.id;
            return (
              <div key={item.id} className="p-5 bg-surface border border-border2 rounded-xl flex flex-col hover:border-reeAmber/40 transition-colors shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${item.type === 'Question' || !item.type ? 'bg-reeCyan/10 text-reeCyan-text border-reeCyan/30' : 'bg-reePurple/10 text-reePurple-text border-reePurple/30'}`}>
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
                      {isExpanded ? 'Hide question' : 'Show question'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveBookmark(item.id); }} className="touch-target px-4 py-2.5 bg-bg border border-border2 text-muted hover:text-reeRed-text hover:border-reeRed/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center" title="Remove bookmark" aria-label="Remove bookmark">
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
                            <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-center transition-colors ${isCorrect ? 'bg-reeGreen/10 border-reeGreen/40 text-reeGreen-text shadow-[0_0_10px_rgba(34,197,94,0.05)]' : 'bg-surface2 border-border2 text-textMain'}`}>
                              <div className="flex justify-between items-center w-full mb-3 border-b border-border2/50 pb-2">
                                 <span className={`text-[11px] uppercase tracking-widest font-black ${isCorrect ? 'text-reeGreen-text' : 'text-muted2'}`}>
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

                    <SolutionPanel
                      key={explanationKey(item)}
                      question={item}
                      isOnline={isOnline}
                      aiText={ai.textFor(item)}
                      aiLoading={ai.isLoading(item)}
                      onExplain={(force) => ai.explain(item, { force })}
                      showAnswer
                    />
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