// src/pages/admin/QuestionBank.jsx
//
// The shared question bank, as four views in the URL (?view=): the Bank itself,
// the ways to Add to it, the Review queue, and the tools to Fix what's there. It
// was one 5,669px page holding all of them. It was the learner-facing "Module
// Library" page, where every learner saw the authoring tools; it now lives in the
// Admin area (pages/admin/Admin.jsx, behind routes/AdminRoute).
//
// A view loads when first opened and then stays mounted, hidden, so switching away
// can't lose a generation running or a form half filled.
import { useEffect, useState } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import useTabParam from '../../hooks/useTabParam';
import { useStore } from '../../store/useStore';

import { useVaultGrid } from '../../features/library/useVaultGrid';
import { useAIIngestion } from '../../features/library/useAIIngestion';
import { useManualIngestion } from '../../features/library/useManualIngestion';

import LibraryIngestion from '../../features/library/LibraryIngestion';
import QuestionGenerator from '../../features/admin/ai/QuestionGenerator';
import ImportFromAI from '../../features/admin/exchange/ImportFromAI';
import FixWithAI from '../../features/admin/exchange/FixWithAI';
import TagSubtopics from '../../features/admin/exchange/TagSubtopics';
import QuestionReports from '../../features/admin/QuestionReports';
import { apiRequest } from '../../services/dbQueries';
import LibraryOverview from '../../features/library/LibraryOverview';
import ManualIngestionForm from '../../features/library/ManualIngestionForm';
import ReviewQueue from '../../features/library/ReviewQueue';
import VaultDataGrid from '../../features/library/VaultDataGrid';
import AnswerPositions from '../../features/admin/AnswerPositions';
import { SegmentedControl } from '../../components/ui';

const VIEWS = [
  { value: 'bank', label: 'Bank' },
  { value: 'add', label: 'Add' },
  { value: 'review', label: 'Review' },
  { value: 'fix', label: 'Fix' },
  { value: 'tag', label: 'Subtopics' },
  { value: 'reports', label: 'Reports' },
];
const ADD_WAYS = [
  { value: 'generate', label: 'Generate' },
  { value: 'import', label: 'Import' },
  { value: 'file', label: 'From a file' },
  { value: 'manual', label: 'By hand' },
];

/** The options opened so far, so each mounts on first use and then stays. */
function useOpened(current) {
  const [opened, setOpened] = useState(() => new Set([current]));
  if (!opened.has(current)) setOpened(new Set(opened).add(current));
  return opened;
}

// `hidden` on a plain wrapper: a display class on the same element would beat it.
function Pane({ opened, id, current, children }) {
  if (!opened.has(id)) return null;
  return <div hidden={current !== id}><div className="flex flex-col gap-6">{children}</div></div>;
}

export default function QuestionBank() {
  const isOnline = useNetworkStatus();
  // Admin-gated by the route; the grid still reads it for edit/delete.
  const isAdmin = useStore((state) => state.isAdmin);
  const [view, setView] = useTabParam(VIEWS.map((v) => v.value), 'bank', 'view');
  const [way, setWay] = useTabParam(ADD_WAYS.map((w) => w.value), 'generate', 'how');
  const openedViews = useOpened(view);
  const openedWays = useOpened(way);
  // A question just added waits in the review queue: open it afresh.
  const [added, setAdded] = useState(0);
  // Learners' open reports, on the Reports tab, so they're seen without opening it.
  const [reportCount, setReportCount] = useState(null);
  useEffect(() => {
    let live = true;
    apiRequest('/api/questions/reports/count')
      .then((r) => { if (live && Number.isFinite(r?.open)) setReportCount(r.open); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const views = VIEWS.map((v) => (v.value === 'reports' && reportCount ? { ...v, label: `Reports (${reportCount})` } : v));

  // Global filters mapped at the page level so all sub-hooks can react
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterSubtopic, setFilterSubtopic] = useState('All');
  const [search, setSearch] = useState('');

  // 1. Vault Data Sub-Engine
  const {
    questions, serverStats, vaultMetadata, resyncVaultMetadata,
    isFetchingVault, hasMore, isLoadingMore, loadMoreQuestions,
    editingQ, setEditingQ, handleDelete, handleUpdateSubmit, saveState, closeEditor, initializeVault,
    sortOrder, setSortOrder
  } = useVaultGrid(filterSubject, filterSubtopic, search);
  const onSaved = () => {
    setAdded((n) => n + 1);
    return initializeVault();
  };

  // 2. AI Generator Sub-Engine (Passes onSaved to auto-refresh the grid on QA success)
  const {
    genSubject, setGenSubject, genSubtopic, setGenSubtopic,
    genStatus, genTone, parsingPdf, selectedPdf,
    isDragging, handleDragOver, handleDragLeave, handleDrop,
    generatedQuestions, showQAModal, setShowQAModal, isCommitting,
    handlePdfSelect, executePdfExtraction,
    removeQuestion, handleCommitToMatrix
  } = useAIIngestion(onSaved);

  // 3. Manual Form Sub-Engine
  const {
    manualQ, setManualQ, handleManualSubmit, isSubmitting: isManualSubmitting
  } = useManualIngestion(onSaved);

  return (
    <div className="flex flex-col gap-4">
      {/* The tab already says "Question bank"; the heading stays for screen
          readers' heading list. */}
      <h2 className="sr-only">Question bank</h2>
      <SegmentedControl label="Question bank view" value={view} onChange={setView} options={views} />

      <Pane opened={openedViews} id="bank" current={view}>
        <LibraryOverview
          serverStats={serverStats}
          vaultMetadata={vaultMetadata}
          resyncVaultMetadata={resyncVaultMetadata}
        />
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
          saveState={saveState}
          closeEditor={closeEditor}
          search={search}
          setSearch={setSearch}
          isAdmin={isAdmin}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
      </Pane>

      <Pane opened={openedViews} id="add" current={view}>
        <SegmentedControl label="How to add questions" size="sm" value={way} onChange={setWay} options={ADD_WAYS} />
        <p className="text-sm text-muted2">Everything the AI writes waits in Review until an admin approves it.</p>
        <Pane opened={openedWays} id="generate" current={way}>
          <QuestionGenerator isOnline={isOnline} onSaved={onSaved} />
        </Pane>
        <Pane opened={openedWays} id="import" current={way}>
          <ImportFromAI onSaved={onSaved} />
        </Pane>
        <Pane opened={openedWays} id="file" current={way}>
          <LibraryIngestion
            genSubject={genSubject} setGenSubject={setGenSubject}
            genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
            genStatus={genStatus} genTone={genTone}
            parsingPdf={parsingPdf} isOnline={isOnline} selectedPdf={selectedPdf}
            isDragging={isDragging} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleDrop={handleDrop}
            generatedQuestions={generatedQuestions} showQAModal={showQAModal} setShowQAModal={setShowQAModal} isCommitting={isCommitting}
            handlePdfSelect={handlePdfSelect} executePdfExtraction={executePdfExtraction}
            removeQuestion={removeQuestion} handleCommitToMatrix={handleCommitToMatrix}
          />
        </Pane>
        <Pane opened={openedWays} id="manual" current={way}>
          <ManualIngestionForm
            manualQ={manualQ} setManualQ={setManualQ}
            genSubject={genSubject} setGenSubject={setGenSubject}
            genSubtopic={genSubtopic} setGenSubtopic={setGenSubtopic}
            handleManualSubmit={(e) => handleManualSubmit(e, genSubject, genSubtopic)}
            isSubmitting={isManualSubmitting}
          />
        </Pane>
      </Pane>

      <Pane opened={openedViews} id="review" current={view}>
        <ReviewQueue key={added} resyncVaultMetadata={resyncVaultMetadata} />
      </Pane>

      <Pane opened={openedViews} id="fix" current={view}>
        <FixWithAI onSaved={onSaved} />
        <AnswerPositions />
      </Pane>

      <Pane opened={openedViews} id="tag" current={view}>
        <TagSubtopics />
      </Pane>

      <Pane opened={openedViews} id="reports" current={view}>
        <QuestionReports onCount={setReportCount} onClosed={() => setReportCount((n) => Math.max(0, (n || 0) - 1))} />
      </Pane>
    </div>
  );
}
