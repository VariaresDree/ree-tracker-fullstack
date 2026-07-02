// src/pages/BookmarkVault.jsx
import React from 'react';

export default function BookmarkVault() {
  // Placeholder data for the UI representation
  const savedItems = [
    { id: 1, type: 'Flashcard', subject: 'Calculus 2', content: 'Integration by Parts Formula', difficulty: 'Hard' },
    { id: 2, type: 'Question', subject: 'Electric Circuits', content: 'Find the Thevenin equivalent resistance across terminals A and B.', difficulty: 'Medium' }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto page-fade-in pb-12 w-full mt-8">
      
      <div className="border-b border-border2 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textMain tracking-tight">Bookmark Vault <span className="text-reeAmber">🔐</span></h1>
          <p className="text-muted2 mt-1 text-sm">Your dedicated archive for challenging questions and crucial review concepts.</p>
        </div>
        <span className="px-4 py-2 bg-surface2 border border-border2 rounded-lg text-xs font-bold font-mono text-muted">
          {savedItems.length} Encrypted Items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {savedItems.length === 0 ? (
           <div className="p-12 border-2 border-dashed border-border2 rounded-2xl flex flex-col items-center justify-center bg-surface/50 text-center">
              <span className="text-4xl mb-4 opacity-50">🗄️</span>
              <h3 className="text-lg font-bold text-textMain mb-2">Vault is Empty</h3>
              <p className="text-sm text-muted">You haven't bookmarked any flashcards or items during Active Review.</p>
           </div>
        ) : (
          savedItems.map(item => (
            <div key={item.id} className="p-5 bg-surface border border-border2 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-reeAmber/40 transition-colors group shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${item.type === 'Question' ? 'bg-reeCyan/10 text-reeCyan border-reeCyan/30' : 'bg-reePurple/10 text-reePurple border-reePurple/30'}`}>
                    {item.type}
                  </span>
                  <span className="text-[11px] text-muted font-bold uppercase tracking-widest border-l border-border2 pl-2">
                    {item.subject}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-textMain leading-relaxed">{item.content}</h4>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-6 py-2.5 bg-surface2 hover:bg-surface3 text-textMain border border-border2 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Review Data
                </button>
                <button className="px-3 py-2.5 bg-bg border border-border2 text-muted hover:text-reeRed hover:border-reeRed/30 rounded-lg text-xs font-bold transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100" title="Remove from Vault">
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}