// src/pages/Library.jsx
import React, { useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useStore } from '../store/useStore';

// Phase 3: Decoupled Architectural Hooks
import { useVaultGrid } from '../features/library/useVaultGrid';
import { useAIIngestion } from '../features/library/useAIIngestion';
import { useManualIngestion } from '../features/library/useManualIngestion';

import LibraryIngestion from '../features/library/LibraryIngestion';
import LibraryOverview from '../features/library/LibraryOverview';
import ManualIngestionForm from '../features/library/ManualIngestionForm';
import VaultDataGrid from '../features/library/VaultDataGrid';

export default function Library() {
  const isOnline = useNetworkStatus();
  
  // 🚀 FIXED: Grab the flawless boolean directly from the store.
  // No more checking stats?.role which caused the race condition lockout!
  const isAdmin = useStore((state) => state.isAdmin);

  // Global filters mapped at the page level so all sub-hooks can react
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterSubtopic, setFilterSubtopic] = useState('All');

  // 1. Vault Data Sub-Engine
  const {
    questions, serverStats, vaultMetadata, resyncVaultMetadata,
    isFetchingVault, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit, initializeVault
  } = useVaultGrid(filterSubject, filterSubtopic);

  // 2. AI Generator Sub-Engine (Passes initializeVault to auto-refresh the grid on QA success)
  const {
    genSubject, setGenSubject, genSubtopic, setGenSubtopic,
    genLoading, genStatus, parsingPdf, selectedPdf,
    isDragging, handleDragOver, handleDragLeave, handleDrop,
    generatedQuestions, showQAModal, setShowQAModal, isCommitting,
    handleGenerate, handlePdfSelect, executePdfExtraction,
    removeQuestion, handleCommitToMatrix
  } = useAIIngestion(initializeVault); 

  // 3. Manual Form Sub-Engine
  const {
    manualMode, setManualMode, manualQ, setManualQ, handleManualSubmit
  } = useManualIngestion(initializeVault);

  return (
    <div className="flex flex-col gap-6 page-fade-in max-w-6xl mx-auto pb-12 w-full pt-4">
      <div className="mb-2">
        <h1 className="text-3xl font-black text-textMain tracking-tight">The Global Matrix</h1>
        <p className="text-sm text-muted2 mt-1">Ingest, refine, and forge new telemetry data for the active recall system.</p>
      </div>

      <LibraryIngestion 
        genSubject={genSubject} setGenSubject={setGenSubject}
        genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
        genLoading={genLoading} genStatus={genStatus}
        parsingPdf={parsingPdf} isOnline={isOnline} selectedPdf={selectedPdf} 
        isDragging={isDragging} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleDrop={handleDrop}
        generatedQuestions={generatedQuestions} showQAModal={showQAModal} setShowQAModal={setShowQAModal} isCommitting={isCommitting}
        handleGenerate={handleGenerate} handlePdfSelect={handlePdfSelect} executePdfExtraction={executePdfExtraction}
        removeQuestion={removeQuestion} handleCommitToMatrix={handleCommitToMatrix}
      />

      <LibraryOverview 
        serverStats={serverStats}
        vaultMetadata={vaultMetadata}             
        resyncVaultMetadata={resyncVaultMetadata} 
        manualMode={manualMode} 
        setManualMode={setManualMode} 
      />

      {manualMode ? (
        isAdmin ? (
          <ManualIngestionForm 
            manualQ={manualQ} setManualQ={setManualQ}
            genSubject={genSubject} setGenSubject={setGenSubject}
            genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
            handleManualSubmit={(e) => handleManualSubmit(e, genSubject, genSubtopic)}
          />
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 font-mono text-sm">
            Manual insertion locked. Requires Admin clearance.
          </div>
        )
      ) : (
        <VaultDataGrid 
          questions={questions} 
          filteredQuestions={questions}
          filterSubject={filterSubject} setFilterSubject={setFilterSubject}
          filterSubtopic={filterSubtopic} setFilterSubtopic={setFilterSubtopic}
          handleDelete={handleDelete}
          isFetchingVault={isFetchingVault} 
          hasMore={hasMore} 
          isLoadingMore={isLoadingMore} 
          loadMoreQuestions={loadMoreQuestions} 
          editingQ={editingQ}                   
          setEditingQ={setEditingQ}             
          handleUpdateSubmit={handleUpdateSubmit}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}