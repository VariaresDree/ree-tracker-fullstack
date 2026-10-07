// src/pages/admin/QuestionBank.jsx
//
// The shared question bank: AI and PDF ingestion, manual entry, the review
// queue, the syllabus editor and the question grid. It was the learner-facing
// "Module Library" page, where every learner saw the authoring tools; it now
// lives in the Admin area (pages/admin/Admin.jsx, behind routes/AdminRoute).
import { useState } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useStore } from '../../store/useStore';

import { useVaultGrid } from '../../features/library/useVaultGrid';
import { useAIIngestion } from '../../features/library/useAIIngestion';
import { useManualIngestion } from '../../features/library/useManualIngestion';

import LibraryIngestion from '../../features/library/LibraryIngestion';
import LibraryOverview from '../../features/library/LibraryOverview';
import ManualIngestionForm from '../../features/library/ManualIngestionForm';
import VaultDataGrid from '../../features/library/VaultDataGrid';

export default function QuestionBank() {
  const isOnline = useNetworkStatus();
  // Admin-gated by the route; the grid still reads it for edit/delete.
  const isAdmin = useStore((state) => state.isAdmin);

  // Global filters mapped at the page level so all sub-hooks can react
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterSubtopic, setFilterSubtopic] = useState('All');

  // 1. Vault Data Sub-Engine
  const {
    questions, serverStats, vaultMetadata, resyncVaultMetadata,
    isFetchingVault, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit, initializeVault,
    sortOrder, setSortOrder
  } = useVaultGrid(filterSubject, filterSubtopic);

  // 2. AI Generator Sub-Engine (Passes initializeVault to auto-refresh the grid on QA success)
  const {
    genSubject, setGenSubject, genSubtopic, setGenSubtopic,
    genFocus, setGenFocus,
    genLoading, genStatus, parsingPdf, selectedPdf,
    isDragging, handleDragOver, handleDragLeave, handleDrop,
    generatedQuestions, showQAModal, setShowQAModal, isCommitting,
    handleGenerate, handlePdfSelect, executePdfExtraction,
    removeQuestion, handleCommitToMatrix
  } = useAIIngestion(initializeVault); 

  // 3. Manual Form Sub-Engine
  const {
    manualMode, setManualMode, manualQ, setManualQ, handleManualSubmit, isSubmitting: isManualSubmitting
  } = useManualIngestion(initializeVault);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-display text-2xl text-textMain tracking-tight">Question bank</h2>
        <p className="text-sm text-muted2 mt-1">Generate, import, review and edit the shared questions.</p>
      </div>

      <LibraryIngestion 
        genSubject={genSubject} setGenSubject={setGenSubject}
        genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
        genFocus={genFocus} setGenFocus={setGenFocus}
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
        <ManualIngestionForm
          manualQ={manualQ} setManualQ={setManualQ}
          genSubject={genSubject} setGenSubject={setGenSubject}
          genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
          handleManualSubmit={(e) => handleManualSubmit(e, genSubject, genSubtopic)}
          isSubmitting={isManualSubmitting}
        />
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
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
      )}
    </div>
  );
}