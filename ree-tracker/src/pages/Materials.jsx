// src/pages/Materials.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Extracted Components
import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceHub from '../components/ReferenceHub';
import ConstantsMatrix from '../features/materials/ConstantsMatrix';
import MediaViewer from '../components/MediaViewer';

export default function Materials() {
  const { currentUser } = useAuth();
  const { stats } = useStore();
  const isAdmin = stats?.role === 'admin';
  const isOnline = useNetworkStatus();

  // State is now strictly routing context
  const [activeTab, setActiveTab] = useState('cloud_vault'); 
  
  // This state was lifted up so the MediaViewer can hijack the full page layout without destroying the tabs if needed,
  // matching the original monolithic behavior precisely.
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // NEW: Fullscreen state controller for Phase 10.3
  const [isFullscreen, setIsFullscreen] = useState(false); 

  if (viewingMaterial) {
    return (
      <div className={isFullscreen ? "fixed inset-0 z-[200] bg-bg flex flex-col w-full h-full animate-in fade-in" : "flex flex-col h-[85vh] page-fade-in w-full max-w-6xl mx-auto pt-4"}>
        
        <div className={`flex justify-between items-center p-4 bg-surface border-b border-border2 shadow-sm z-10 ${isFullscreen ? '' : 'rounded-t-xl border-x border-t'}`}>
          <div className="flex gap-2">
              <button 
                  onClick={() => { setViewingMaterial(null); setIsFullscreen(false); }} 
                  className="px-4 py-2 bg-surface2 hover:bg-reeRed/10 text-muted hover:text-reeRed border border-border2 hover:border-reeRed/30 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>🚪</span> Terminate Viewer
              </button>
              
              {/* NEW: Dynamic Fullscreen Toggle */}
              <button 
                  onClick={() => setIsFullscreen(!isFullscreen)} 
                  className="px-4 py-2 bg-surface2 hover:bg-surface3 text-muted hover:text-textMain border border-border2 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>{isFullscreen ? '🗗' : '⛶'}</span> {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
          </div>
          <div className="flex flex-col items-end">
             <span className="font-bold text-sm text-textMain tracking-wide">{viewingMaterial.name}</span>
             <span className="text-[0.6rem] text-reeCyan font-mono uppercase tracking-widest">{viewingMaterial.type} MODE</span>
          </div>
        </div>
        
        {/* Dynamic Wrapper handles borders depending on layout mode */}
        <div className={`flex-1 bg-bg relative overflow-hidden ${isFullscreen ? '' : 'border-x border-b border-border2 rounded-b-xl'}`}>
          <MediaViewer item={{ type: viewingMaterial.type, url: viewingMaterial.url, title: viewingMaterial.name }} />
        </div>
        
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-6xl mx-auto pt-4">
      
      {/* Universal Tab Header (Matches exact original layout) */}
      <div className="flex flex-wrap gap-4 border-b border-border2 pb-4">
        <button onClick={() => setActiveTab('cloud_vault')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'cloud_vault' ? 'bg-reeBlue/10 text-reeBlue border border-reeBlue/30 shadow-sm' : 'text-muted hover:text-textMain border border-transparent'}`}>
          <span>☁️</span> Cloud Vault
        </button>
        <button onClick={() => setActiveTab('constants')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'constants' ? 'bg-reePurple/10 text-reePurple border border-reePurple/30 shadow-sm' : 'text-muted hover:text-textMain border border-transparent'}`}>
          <span>📐</span> Constants Matrix
        </button>
        <button onClick={() => setActiveTab('matrix')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'matrix' ? 'bg-reeCyan/10 text-reeCyan border border-reeCyan/30 shadow-sm' : 'text-muted hover:text-textMain border border-transparent'}`}>
          <span>🧮</span> Formula Matrix
        </button>
        <button onClick={() => setActiveTab('bookmarks')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'bookmarks' ? 'bg-reeAmber/10 text-reeAmber border border-reeAmber/30 shadow-sm' : 'text-muted hover:text-textMain border border-transparent'}`}>
          <span>🔐</span> Bookmark Vault
        </button>
      </div>

      {/* Render Component based on Tab State */}
      {activeTab === 'cloud_vault' && (
        <CloudVaultTab currentUser={currentUser} isAdmin={isAdmin} onViewMaterial={setViewingMaterial} />
      )}

      {activeTab === 'constants' && (
        <div className="flex-1 min-h-[60vh]">
          <ConstantsMatrix />
        </div>
      )}
      
      {activeTab === 'matrix' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-textMain tracking-tight">Formula Matrix</h2>
            <p className="text-sm text-muted2 mt-1">Offline hardcoded equations and mathematical principles.</p>
          </div>
          <ReferenceHub />
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

    </div>
  );
}