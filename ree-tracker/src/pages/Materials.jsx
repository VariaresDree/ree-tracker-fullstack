// src/pages/Materials.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Button, Tabs, Badge } from '../components/ui';
import { X, Maximize2, Minimize2, Cloud, BookOpen, Bookmark, Settings2 } from '../components/ui/icons';

// Extracted Components
import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceCardsTab from '../features/reference/ReferenceCardsTab';
import ReferenceAdminV2 from '../features/reference/ReferenceAdminV2';
import MediaViewer from '../components/MediaViewer';
import FullscreenPdfViewer from '../components/FullscreenPdfViewer';

export default function Materials() {
  const { currentUser } = useAuth();

  // 🚀 FIXED: Grab the flawless boolean directly from the store
  const isAdmin = useStore((state) => state.isAdmin);
  const isOnline = useNetworkStatus();

  // State is now strictly routing context
  const [activeTab, setActiveTab] = useState('cloud_vault');

  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Chrome-free whole-screen PDF mode (Drive/hosted) with zoom, separate from
  // the generic media expand above.
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const isPdf = viewingMaterial?.type === 'pdf';

  if (viewingMaterial) {
    return (
      <div className={isFullscreen ? "fixed inset-0 z-[200] bg-bg flex flex-col w-full h-full animate-in fade-in" : "flex flex-col h-[85vh] page-fade-in w-full max-w-6xl mx-auto pt-4"}>
        
        <div className={`flex justify-between items-center p-4 bg-surface border-b border-border2 shadow-sm z-10 ${isFullscreen ? '' : 'rounded-t-[var(--radius-lg)] border-x border-t'}`}>
          <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => { setViewingMaterial(null); setIsFullscreen(false); }}>
                <X size={14} strokeWidth={1.75} aria-hidden="true" /> Close viewer
              </Button>

              {isPdf ? (
                <Button variant="secondary" size="sm" onClick={() => setPdfFullscreen(true)}>
                  <Maximize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Fullscreen PDF
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen
                    ? <><Minimize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Exit fullscreen</>
                    : <><Maximize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Fullscreen</>}
                </Button>
              )}
          </div>
          <div className="flex flex-col items-end min-w-0">
             <span title={viewingMaterial.name} className="font-bold text-sm text-textMain tracking-wide block truncate max-w-full">{viewingMaterial.name}</span>
             <Badge tone="signal" className="mt-1 uppercase">{viewingMaterial.type}</Badge>
          </div>
        </div>
        
        <div className={`flex-1 bg-bg relative overflow-hidden ${isFullscreen ? '' : 'border-x border-b border-border2 rounded-b-xl'}`}>
          <MediaViewer item={{ type: viewingMaterial.type, url: viewingMaterial.url, title: viewingMaterial.name }} />
        </div>

        {pdfFullscreen && isPdf && (
          <FullscreenPdfViewer
            url={viewingMaterial.url}
            title={viewingMaterial.name}
            onClose={() => setPdfFullscreen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-6xl mx-auto pt-4">
      
      <Tabs
        label="Materials sections"
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'cloud_vault', label: 'Cloud Vault', icon: Cloud },
          { id: 'reference', label: 'Reference Cards', icon: BookOpen },
          { id: 'bookmarks', label: 'Bookmark Vault', icon: Bookmark },
          ...(isAdmin ? [{ id: 'manage_ref', label: 'Manage References', icon: Settings2 }] : []),
        ]}
      />

      {activeTab === 'cloud_vault' && (
        <CloudVaultTab currentUser={currentUser} isAdmin={isAdmin} onViewMaterial={setViewingMaterial} />
      )}

      {activeTab === 'reference' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-6">
            <h2 className="text-display text-2xl text-textMain tracking-tight">Reference cards</h2>
            <p className="text-sm text-muted2 mt-1">Constants, formulas, and concepts as interactive flashcards — browse by subject and topic, or search. Tap a card to flip it.</p>
          </div>
          <ReferenceCardsTab />
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {activeTab === 'manage_ref' && isAdmin && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-textMain tracking-tight">Manage References</h2>
            <p className="text-sm text-muted2 mt-1">Review AI-generated flashcards, create and re-categorize cards, manage cited sources, and keep the data debt at zero.</p>
          </div>
          <ReferenceAdminV2 />
        </div>
      )}

    </div>
  );
}