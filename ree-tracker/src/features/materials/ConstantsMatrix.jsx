// src/features/materials/ConstantsMatrix.jsx
import React, { useState } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import { EE_CONSTANTS } from '../../config/knowledgeBase'; // Pulling from the new unified dictionary

export default function ConstantsMatrix() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...new Set(EE_CONSTANTS.map(c => c.category))];

  const filteredConstants = EE_CONSTANTS.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-in fade-in flex flex-col gap-5">
      
      {/* Filtering Selector Actions Bar (Matched to ReferenceHub style) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border2/50 pb-4 mt-2">
        <div className="flex gap-2 shrink-0">
          <input 
            type="text" 
            placeholder="Search constants array mapping..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-bg border border-border2 text-textMain px-4 py-2 rounded-md text-xs font-bold outline-none focus:border-reeCyan transition-colors w-48 sm:w-64 shadow-inner"
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-border2 shrink-0"></div>
        
        <select 
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="flex-1 bg-bg border border-border2 text-textMain p-2 rounded-md text-xs font-bold outline-none focus:border-reeCyan cursor-pointer min-w-[200px] transition-colors shadow-inner"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'All' ? 'Show All Constants Sectors' : cat}</option>
          ))}
        </select>
      </div>
      
      {/* Cards Matrix - Matched exactly to the Formula Grid design style */}
      {filteredConstants.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-xs font-mono">
            No offline matching engineering metrics found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredConstants.map((item, idx) => (
            <div 
              key={idx} 
              className="p-5 bg-surface border border-border2 rounded-xl shadow-sm hover:border-reeCyan/40 transition-colors flex flex-col h-full overflow-hidden justify-between min-h-[140px]"
            >
              {/* Title Section matching ReferenceHub Layout */}
              <div className="text-[11px] text-muted2 uppercase tracking-widest font-bold mb-3 border-b border-border2 pb-2 leading-relaxed">
                <LatexRenderer content={item.name} />
              </div>
              
              {/* Math Centered Values Area */}
              <div className="w-full overflow-x-auto math-scroll-mobile pb-2 flex-1 flex items-center">
                <div className="w-max mx-auto px-2 text-textMain text-lg font-black tracking-wide font-mono">
                  <LatexRenderer content={item.value} />
                </div>
              </div>
              
              {/* Meta Tags Base Syncing */}
              {activeCategory === 'All' && (
                <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-border2/30">
                  <span className="text-[11px] px-2 py-0.5 rounded border bg-reeCyan/10 border-reeCyan/30 text-reeCyan font-bold tracking-widest uppercase">
                    {item.category}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}