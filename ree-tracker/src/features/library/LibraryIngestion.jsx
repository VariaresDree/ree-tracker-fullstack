// src/features/library/LibraryIngestion.jsx
import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import FocusTrap from '../../components/FocusTrap';
import { TOS } from '../../config/constants'; // 🚀 FIXED: Importing our optimized constants file

export default function LibraryIngestion({ 
  genSubject, setGenSubject, genSubtopic, setGenSubtopic, 
  genLoading, genStatus, parsingPdf, isOnline, selectedPdf, 
  isDragging, handleDragOver, handleDragLeave, handleDrop,
  generatedQuestions, showQAModal, setShowQAModal, isCommitting,
  handleGenerate, handlePdfSelect, executePdfExtraction,
  removeQuestion, handleCommitToMatrix
}) {
  // 🚀 FIXED: Removed the dynamicTOS Zustand fetch that was causing the crash
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
        
        {/* LEFT PANEL: AI Ingestion Processor */}
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-base font-bold text-textMain flex items-center gap-2 mb-1">
              <span className="text-reeAmber">✨</span> AI Text Ingestion Processor
            </h3>
            <p className="text-xs text-muted2 mb-5">Command the generative engine to forge questions targeted to the updated TOS list below.</p>
            <div className="flex flex-col gap-3">
              {/* 🚀 FIXED: Replaced dynamicTOS with TOS below */}
              <select value={genSubject} onChange={e => { setGenSubject(e.target.value); setGenSubtopic(TOS[e.target.value]?.[0] || ''); }} className="bg-bg border border-border2 text-textMain p-3 rounded-lg text-xs font-bold outline-none focus:border-reeBlue cursor-pointer transition-colors">
                {Object.keys(TOS).map(s => <option key={s} value={s}>{s === 'Mathematics' ? 'Mathematics (Math)' : s}</option>)}
              </select>
              {/* 🚀 FIXED: Replaced dynamicTOS with TOS below */}
              <select value={genSubtopic} onChange={e => setGenSubtopic(e.target.value)} className="bg-bg border border-border2 text-textMain p-3 rounded-lg text-xs font-bold outline-none focus:border-reeCyan cursor-pointer transition-colors">
                {(TOS[genSubject] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => handleGenerate(false)} disabled={genLoading || !isOnline || parsingPdf} className="flex-1 py-3 bg-surface3 hover:bg-surface2 text-textMain border border-border2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm">
              Internal Logic
            </button>
            <button onClick={() => handleGenerate(true)} disabled={genLoading || !isOnline || parsingPdf} className="flex-1 py-3 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer disabled:opacity-50 transition-colors">
              Web Grounded Search
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: AI Vision & PDF Dropper */}
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-base font-bold text-textMain flex items-center gap-2 mb-1">
              <span className="text-reePurple">📄</span> AI Vision & Module Extractor
            </h3>
            <p className="text-xs text-muted2 mb-5">Drop PDFs or image schematics. The matrix extracts parameters into interactive flashcards.</p>
            
            {!selectedPdf ? (
              <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !parsingPdf && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all relative cursor-pointer min-h-[140px] group
                      ${isDragging ? 'bg-reePurple/10 border-reePurple scale-[1.02]' : 'bg-bg border-border2 hover:border-reePurple/50 hover:bg-surface'}
                  `}
              >
                <input type="file" ref={fileInputRef} accept=".pdf,image/jpeg,image/png,image/webp" onChange={handlePdfSelect} disabled={parsingPdf} className="hidden" />
                <div className="text-sm font-bold text-textMain text-center">
                  <span className={`text-3xl block mb-2 transition-transform duration-300 ${isDragging ? '-translate-y-2' : 'opacity-60 group-hover:opacity-100 group-hover:-translate-y-1'}`}>📁</span>
                  Drag & Drop PDF or Image
                </div>
                <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-surface2 border border-border2 rounded text-[0.6rem] font-bold text-muted uppercase">.PDF</span>
                    <span className="px-2 py-0.5 bg-surface2 border border-border2 rounded text-[0.6rem] font-bold text-muted uppercase">.JPG</span>
                    <span className="px-2 py-0.5 bg-surface2 border border-border2 rounded text-[0.6rem] font-bold text-muted uppercase">.PNG</span>
                </div>
              </div>
            ) : (
              <div className="border border-reeCyan/30 bg-reeCyan/5 rounded-xl p-6 flex flex-col items-center justify-center min-h-[140px] text-center animate-in fade-in relative overflow-hidden">
                {parsingPdf && (
                   <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                       <span className="telemetry-spinner !w-6 !h-6 border-reeCyan border-t-transparent mb-2"></span>
                       <span className="text-[0.65rem] font-bold text-reeCyan uppercase tracking-widest animate-pulse">Parsing Module...</span>
                   </div>
                )}
                <span className="text-3xl mb-2">📑</span>
                <div className="text-sm font-bold text-textMain mb-1 line-clamp-1">{selectedPdf.name}</div>
                <div className="text-xs text-muted2 mb-5">{genStatus || 'File acquired. Ready for extraction block.'}</div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => handlePdfSelect({ target: { files: [] } })} disabled={parsingPdf} className="flex-1 py-2.5 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border2 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={executePdfExtraction} disabled={parsingPdf} className="flex-1 py-2.5 bg-reeCyan hover:bg-cyan-500 text-bg rounded-lg text-xs font-black uppercase tracking-widest shadow-md transition-colors cursor-pointer flex justify-center items-center disabled:opacity-50">
                    Execute Parse
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {(genStatus && !parsingPdf && !showQAModal) && (
            <div className={`mt-4 p-3 rounded-lg text-[0.65rem] font-bold font-mono border uppercase tracking-wider ${genStatus.includes('✅') ? 'bg-reeGreen/10 border-reeGreen/30 text-reeGreen' : genStatus.includes('❌') ? 'bg-reeRed/10 border-reeRed/30 text-reeRed' : 'bg-surface2 border-border2 text-textMain'}`}>
              {genStatus}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUALITY ASSURANCE (QA) MODAL */}
      {/* ========================================================================= */}
      {showQAModal && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showQAModal}>
            <div className="bg-surface border border-border2 p-0 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
              
              <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-lg font-black text-textMain uppercase tracking-widest flex items-center gap-2">
                        <span className="text-reePurple">🧠</span> Quality Assurance Matrix
                    </h2>
                    <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest mt-1">
                        {generatedQuestions.length} Items Extracted from Source
                    </span>
                </div>
                <button 
                    onClick={() => {
                        if(window.confirm("Discard all generated items? This cannot be undone.")) {
                            setShowQAModal(false);
                            handlePdfSelect({ target: { files: [] } }); // Reset upload state
                        }
                    }} 
                    className="px-4 py-2 bg-surface hover:bg-reeRed/10 border border-border2 hover:border-reeRed/30 text-muted hover:text-reeRed rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Discard Batch
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-bg flex flex-col gap-6">
                 {generatedQuestions.length === 0 ? (
                     <div className="m-auto text-center text-muted font-mono text-sm">No valid questions were extracted.</div>
                 ) : (
                     generatedQuestions.map((q, idx) => (
                         <div key={idx} className="bg-surface border border-border2 rounded-xl p-5 shadow-sm relative group">
                             <button 
                                onClick={() => removeQuestion(idx)} 
                                className="absolute top-4 right-4 text-muted hover:text-reeRed bg-surface2 hover:bg-reeRed/10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                title="Reject Item"
                             >
                                 ✕
                             </button>

                             <div className="flex gap-2 mb-4">
                                 <span className="px-2 py-0.5 bg-reePurple/10 text-reePurple border border-reePurple/30 rounded text-[0.6rem] font-black uppercase tracking-widest">
                                     Item {idx + 1}
                                 </span>
                                 <span className="px-2 py-0.5 bg-surface2 border border-border2 text-textMain rounded text-[0.6rem] font-bold uppercase tracking-widest">
                                     {q.subject}
                                 </span>
                                 <span className="px-2 py-0.5 bg-surface2 border border-border2 text-muted rounded text-[0.6rem] font-bold uppercase tracking-widest truncate max-w-[120px]">
                                     {q.subtopic}
                                 </span>
                             </div>

                             <div className="text-sm font-medium text-textMain mb-4 leading-relaxed bg-bg p-3 rounded-lg border border-border2/50">
                                 {q.question}
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                 {q.options?.map((opt, optIdx) => (
                                     <div key={optIdx} className={`p-2.5 rounded-lg border text-xs ${opt === q.answer ? 'bg-reeGreen/10 border-reeGreen/40 text-reeGreen font-bold shadow-[0_0_10px_rgba(34,197,94,0.05)]' : 'bg-surface2 border-border2 text-textMain'}`}>
                                         <span className="mr-2 font-mono opacity-50">{String.fromCharCode(65 + optIdx)}.</span>
                                         {opt}
                                     </div>
                                 ))}
                             </div>

                             {q.fixedExplanation && (
                                 <div className="text-[0.65rem] text-muted bg-surface2/50 p-3 rounded-lg border border-border2 leading-relaxed">
                                     <strong className="uppercase tracking-widest text-reeCyan mr-2">Explanation:</strong> 
                                     {q.fixedExplanation}
                                 </div>
                             )}
                         </div>
                     ))
                 )}
              </div>

              <div className="p-5 border-t border-border2 bg-surface flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold text-muted max-w-md leading-relaxed hidden sm:block">
                      By committing, these items will enter the Admin Flagged Queue for final global verification.
                  </span>
                  <button 
                      onClick={() => handleCommitToMatrix(currentUser)}
                      disabled={isCommitting || generatedQuestions.length === 0}
                      className="w-full sm:w-auto px-8 py-3.5 bg-reePurple hover:bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                      {isCommitting ? <span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span> : 'Inject into Matrix'}
                  </button>
              </div>

            </div>
          </FocusTrap>
        </div>
      )}
    </>
  );
}