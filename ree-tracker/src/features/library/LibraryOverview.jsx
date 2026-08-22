// src/features/library/LibraryOverview.jsx
import { useState } from 'react';
import { toDisplaySubject } from '@ree/shared';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import {
    updateDynamicTOS,
    fetchReviewQueue,
    updateReviewItem,
    approveReviewItem,
    rejectReviewItem,
    bulkApproveReviewItems,
    approveQuarantinedQuestion,
    deleteQuestionFromBank
} from '../../services/dbQueries';
import { sanitizeOptions, stripChoicePrefix } from '../../utils/sanitizeOptions';
import { Button, Modal, FormField, Select, Input, Textarea, Badge, EmptyState, StatusPill, ProgressIndicator } from '../../components/ui';
import { Shield, Settings2, RefreshCw, Plus, X, Sparkles, Layers } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import toast from 'react-hot-toast';

// Per-subject track colors — data-viz distinction routed through theme vars.
const TRACK_ACCENT = {
  Mathematics: 'var(--accent-signal)',
  ESAS: 'var(--accent-velocity)',
  EE: 'var(--color-reeAmber)',
};

// Client mirror of the server's Accept-All clean-item gate
// (reviewService.isBulkEligible) — drives the label COUNT and the pre-filter
// only; the server re-validates authoritatively. Legacy flagged items are
// always excluded (they use a different approve path and deserve eyes).
const BULK_OK_SUBJECTS = new Set(['mathematics', 'math', 'esas', 'ee', 'electrical engineering']);

// apiRequest hard-aborts at 12s (dbQueries.js) and a large Accept-All queue
// approves serially on the server (reviewService.approveBulk) — one request
// covering hundreds of items reliably blows that budget, so the client
// reports "failed" while the server keeps going and finishes anyway. Chunking
// keeps each request comfortably inside the timeout; 25 is well under the
// 200-id server cap (bulkIdsSchema) with headroom.
const BULK_CHUNK_SIZE = 25;
const isBulkEligibleClient = (q) => {
  if (!q || q.legacy) return false;
  if (!BULK_OK_SUBJECTS.has(String(q.subject || '').trim().toLowerCase())) return false;
  const text = q.text || q.content || '';
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  const options = sanitizeOptions(q.options);
  if (!Array.isArray(options) || options.length < 2) return false;
  const answer = stripChoicePrefix(q.answer);
  if (typeof answer !== 'string' || answer.trim().length === 0) return false;
  return options.includes(answer);
};

export default function LibraryOverview({ serverStats, vaultMetadata, resyncVaultMetadata, manualMode, setManualMode }) {

  // 🚀 Reads dynamicTOS and the setter securely from the global store
  // Shallow slice, not the root object. This file also recomputes bulkEligible
  // (a full sanitizeOptions pass over the whole review queue) unmemoized in
  // render, so a root subscription meant that ran on every unrelated store
  // mutation.
  const { isAdmin, dynamicTOS, setDynamicTOS } = useStore(
    useShallow((s) => ({ isAdmin: s.isAdmin, dynamicTOS: s.dynamicTOS, setDynamicTOS: s.setDynamicTOS })),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // --- TOS MANAGER STATE ---
  const [showTOSManager, setShowTOSManager] = useState(false);
  const [editTOS, setEditTOS] = useState(null);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [targetSubject, setTargetSubject] = useState('Mathematics');
  const [isSavingTOS, setIsSavingTOS] = useState(false);

  // --- REVIEW QUEUE STATE (AI review loop, Phase 3.6) ---
  const [showQuarantineQueue, setShowQuarantineQueue] = useState(false);
  const [quarantineItems, setQuarantineItems] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  // Inline editor: one item at a time; `editDraft` holds the working copy.
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  // "Accept All" batch approval (confirmation-gated, server-reconciled,
  // chunked, dedicated progress modal). bulkProgress is null when idle;
  // while running it's { done, total, chunkIndex, chunkCount } — done/total
  // count IDS SENT so far (not approved — a chunk can partially fail),
  // chunkIndex/chunkCount drive the "batch N of M" line.
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);

  const bulkEligible = quarantineItems.filter(isBulkEligibleClient);
  const bulkExcludedCount = quarantineItems.length - bulkEligible.length;

  // --- REVIEW QUEUE HANDLERS ---
  const openQuarantineQueue = async () => {
      setShowQuarantineQueue(true);
      setIsLoadingQueue(true);
      setEditingId(null);
      try {
          // New pending-review items + legacy isFlagged rows (item.legacy) in
          // one queue, so both drain through the same UI.
          const items = await fetchReviewQueue();
          setQuarantineItems(items);
      } catch (err) {
          toast.error("Couldn't load the review queue.");
      }
      setIsLoadingQueue(false);
  };

  const handleApproveQuarantinedItem = async (item) => {
      try {
          if (item.legacy) {
              await approveQuarantinedQuestion(item.id, item.subject, item.subtopic);
          } else {
              await approveReviewItem(item.id);
          }
          setQuarantineItems(prev => prev.filter(q => q.id !== item.id));
          toast.success("Question approved.");
          // Fire-and-forget — a failure here (e.g. the 12s/30s breaker tripped
          // right after a slow approve) must not surface as an unhandled
          // rejection or a false "approval failed" toast; the vault counts
          // just stay stale until the next resync.
          resyncVaultMetadata().catch(() => {});
      } catch (err) {
          toast.error("Approval failed.");
      }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // After a chunk we couldn't get a clean verdict for (a 409 — see below —
  // or a thrown error that survived one retry), ask the server what's
  // ACTUALLY true for just those ids instead of guessing. This is what
  // directly fixes the reported confusion: "it said failed, but the items
  // were there after a refresh." Ids no longer in the PENDING queue were
  // resolved by whatever request actually reached the server (our own
  // retry, or the original request a 409 told us was still in flight) —
  // NOT necessarily "approved" specifically (could have been rejected by
  // someone else), so this is reported as "processed", not folded into the
  // approved count. Ids still pending are left in the queue untouched.
  // Swallows its own failure (offline, etc.) — reconciliation is a
  // best-effort improvement, not something that should crash the run.
  const reconcileChunk = async (chunkIds) => {
      try {
          const freshQueue = await fetchReviewQueue();
          const stillPendingIds = new Set(freshQueue.map((q) => q.id));
          const resolvedIds = chunkIds.filter((id) => !stillPendingIds.has(id));
          if (resolvedIds.length > 0) {
              const resolvedSet = new Set(resolvedIds);
              setQuarantineItems((prev) => prev.filter((q) => !resolvedSet.has(q.id)));
          }
          return resolvedIds.length;
      } catch {
          return 0;
      }
  };

  // Chunked, SEQUENTIAL Accept All, with a dedicated progress modal (see
  // showBulkProgress). apiRequest gives this endpoint a 45s timeout (see
  // bulkApproveReviewItems in dbQueries.js) — the server now batches a whole
  // chunk into one transaction (reviewService.approveBulk), so this is
  // headroom for a cold connection, not the load-bearing fix it used to be.
  // Chunking at BULK_CHUNK_SIZE is still what drives a meaningful "batch N
  // of M" progress display for a large queue, and bounds the blast radius
  // of any single chunk failure.
  //
  // Each chunk's SERVER response is still the only source of truth — an
  // item is removed from the queue only once ITS OWN chunk confirms it,
  // never optimistically. A chunk that throws gets ONE retry before giving
  // up on it. Two distinct failure shapes get different handling:
  //   - 409 (Idempotency-Key still in flight — see middlewares/idempotency.js's
  //     30s in-flight reservation): this means a PRIOR attempt at this exact
  //     chunk (same ids -> same content-hash key) is still being processed
  //     server-side. Retrying immediately would just get another 409, so
  //     instead: wait briefly, then reconcile (ask the server what actually
  //     happened) and move on to the next chunk.
  //   - anything else (network drop, timeout, 5xx): retry the chunk once;
  //     if that ALSO fails, reconcile (in case it silently succeeded anyway
  //     — the exact "said failed but was actually fine" confusion reported)
  //     and then stop the run, since two failures in a row on the same
  //     chunk suggests something systemic rather than a one-off blip.
  const handleBulkApprove = async () => {
      const ids = quarantineItems.filter(isBulkEligibleClient).map((q) => q.id);
      if (ids.length === 0) { setShowBulkConfirm(false); return; }

      const chunks = [];
      for (let i = 0; i < ids.length; i += BULK_CHUNK_SIZE) chunks.push(ids.slice(i, i + BULK_CHUNK_SIZE));

      setShowBulkConfirm(false);
      setIsBulkApproving(true);
      setShowBulkProgress(true);
      setBulkProgress({ done: 0, total: ids.length, chunkIndex: 0, chunkCount: chunks.length });

      let approvedTotal = 0;
      let failedTotal = 0;
      // Published live, but the audit/bookkeeping write failed — distinct from
      // a genuine failure (reviewService: 'published-pending-recordkeeping').
      let recordkeepingPendingTotal = 0;
      // Resolved via reconcileChunk — we know the item left the queue, but
      // not definitively that OUR run is what approved it.
      let reconciledTotal = 0;
      let sentCount = 0;
      let stoppedEarly = false;

      try {
          for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              setBulkProgress({ done: sentCount, total: ids.length, chunkIndex: i + 1, chunkCount: chunks.length });

              let res;
              let ok = false;
              try {
                  res = await bulkApproveReviewItems(chunk);
                  ok = true;
              } catch (err) {
                  if (err?.status === 409) {
                      await sleep(3000);
                      reconciledTotal += await reconcileChunk(chunk);
                      sentCount += chunk.length;
                      setBulkProgress({ done: sentCount, total: ids.length, chunkIndex: i + 1, chunkCount: chunks.length });
                      continue; // move on; this chunk doesn't get a normal res to process below
                  }
                  // One retry for anything else, per the plan's explicit ask.
                  try {
                      res = await bulkApproveReviewItems(chunk);
                      ok = true;
                  } catch {
                      reconciledTotal += await reconcileChunk(chunk);
                      stoppedEarly = true;
                  }
              }

              if (!ok) break;

              sentCount += chunk.length;
              const approvedSet = new Set(res?.approved || []);
              const failedItems = res?.failed || [];
              recordkeepingPendingTotal += failedItems.filter((f) => f.reason === 'published-pending-recordkeeping').length;
              failedTotal += failedItems.length;
              approvedTotal += approvedSet.size;

              setQuarantineItems((prev) => prev.filter((q) => !approvedSet.has(q.id)));
              setBulkProgress({ done: sentCount, total: ids.length, chunkIndex: i + 1, chunkCount: chunks.length });
          }

          const plainFailedTotal = failedTotal - recordkeepingPendingTotal;
          const isFullyClean = !stoppedEarly && plainFailedTotal === 0 && recordkeepingPendingTotal === 0
              && reconciledTotal === 0 && approvedTotal === ids.length;

          if (isFullyClean) {
              // The clean, common-case signal the spec asks for — one toast,
              // no need to also repeat the count via the granular messages
              // below (which are for when there's something to be aware of).
              toast.success(`All ${ids.length} item${ids.length === 1 ? '' : 's'} successfully added to the question bank!`);
          } else {
              if (approvedTotal > 0) {
                  toast.success(`${approvedTotal} question${approvedTotal === 1 ? '' : 's'} approved and published.`);
              }
              if (reconciledTotal > 0) {
                  toast(
                      `${reconciledTotal} item${reconciledTotal === 1 ? '' : 's'} ${reconciledTotal === 1 ? 'was' : 'were'} already processed by an earlier attempt despite the connection issue, and ${reconciledTotal === 1 ? 'has' : 'have'} left the queue.`,
                      { icon: 'ℹ️', duration: 8000 },
                  );
              }
              if (recordkeepingPendingTotal > 0) {
                  toast(
                      `${recordkeepingPendingTotal} item${recordkeepingPendingTotal === 1 ? '' : 's'} published but still need${recordkeepingPendingTotal === 1 ? 's' : ''} a bookkeeping retry — reopen the queue and Accept All again (it will not duplicate).`,
                      { icon: '⚠️', duration: 8000 },
                  );
              }
              if (plainFailedTotal > 0) {
                  toast.error(`${plainFailedTotal} item${plainFailedTotal === 1 ? '' : 's'} failed and stay${plainFailedTotal === 1 ? 's' : ''} in the queue.`);
              }
              if (stoppedEarly) {
                  const remaining = ids.length - sentCount;
                  if (remaining > 0) {
                      toast.error(`Connection dropped partway — ${remaining} item${remaining === 1 ? '' : 's'} not yet sent. Reopen the queue to continue.`);
                  }
              }
          }
          if (approvedTotal > 0 || recordkeepingPendingTotal > 0) resyncVaultMetadata().catch(() => {});
      } finally {
          setIsBulkApproving(false);
          setShowBulkProgress(false);
          setBulkProgress(null);
      }
  };

  const handleRejectQuarantinedItem = async (item) => {
      try {
          if (item.legacy) {
              // Legacy flagged rows live in the question bank — old behavior.
              await deleteQuestionFromBank(item.id);
              toast.success("Question deleted.");
          } else {
              // Soft reject: the row is kept (auditable), just never goes live.
              await rejectReviewItem(item.id);
              toast.success("Question rejected.");
          }
          setQuarantineItems(prev => prev.filter(q => q.id !== item.id));
      } catch (err) {
          toast.error("Reject failed.");
      }
  };

  const startEditItem = (item) => {
      setEditingId(item.id);
      setEditDraft({
          subject: item.subject,
          subtopic: item.subtopic,
          text: item.content || item.text || '',
          options: [...(item.options || [])],
          answer: item.answer || '',
      });
  };

  const handleSaveEdit = async (item) => {
      // The answer must stay one of the options — the exact-match grading
      // invariant. The Select below enforces it; this is the belt-and-braces.
      if (!editDraft.options.includes(editDraft.answer)) {
          toast.error("The answer must be one of the options.");
          return;
      }
      if (editDraft.options.some(o => !o.trim()) || !editDraft.text.trim()) {
          toast.error("Question text and every option must be non-empty.");
          return;
      }
      try {
          const res = await updateReviewItem(item.id, editDraft);
          setQuarantineItems(prev => prev.map(q => q.id === item.id ? { ...q, ...(res?.item || editDraft) } : q));
          setEditingId(null);
          setEditDraft(null);
          toast.success("Edits saved.");
      } catch (err) {
          toast.error("Couldn't save the edits.");
      }
  };

  const handleResync = async () => {
    setIsSyncing(true);
    try {
      await resyncVaultMetadata();
      toast.success("Vault counts refreshed.");
    } catch (err) {
      toast.error("Refresh failed.");
    }
    setIsSyncing(false);
  };

  // --- TOS MANAGER HANDLERS ---
  const openTOSManager = () => {
      setEditTOS(JSON.parse(JSON.stringify(dynamicTOS)));
      setShowTOSManager(true);
  };

  const handleAddSubtopic = () => {
      if (!newSubtopic.trim()) return;
      if (editTOS[targetSubject].includes(newSubtopic.trim())) {
          toast.error(`${newSubtopic} already exists in ${targetSubject}.`);
          return;
      }
      setEditTOS(prev => ({
          ...prev,
          [targetSubject]: [...prev[targetSubject], newSubtopic.trim()].sort()
      }));
      setNewSubtopic('');
      toast.success(`Added: ${newSubtopic.trim()}`);
  };

  const handleRemoveSubtopic = (subject, subtopicToRemove) => {
      setEditTOS(prev => ({
          ...prev,
          [subject]: prev[subject].filter(sub => sub !== subtopicToRemove)
      }));
  };

  const saveTOSChanges = async () => {
      setIsSavingTOS(true);
      try {
          await updateDynamicTOS(editTOS);
          setDynamicTOS(editTOS); // Updates global UI immediately without reload
          setShowTOSManager(false);
          toast.success("Syllabus updated.");
      } catch (error) {
          toast.error("Couldn't save the syllabus changes.");
      }
      setIsSavingTOS(false);
  };

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6 shadow-sm flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-textMain tracking-tight flex items-center gap-2">
          <Layers size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" /> Vault overview
        </h3>
        <div className="flex flex-wrap gap-2 z-10">
          {isAdmin && (
              <>
                  <Button size="sm" variant="outline" tone="amber" onClick={openQuarantineQueue}>
                      <Shield size={14} strokeWidth={1.75} aria-hidden="true" /> Review queue
                  </Button>
                  <Button size="sm" variant="outline" tone="signal" onClick={openTOSManager}>
                      <Settings2 size={14} strokeWidth={1.75} aria-hidden="true" /> Edit syllabus
                  </Button>
              </>
          )}
          <Button size="sm" variant="secondary" loading={isSyncing} disabled={isSyncing} onClick={handleResync}>
            {!isSyncing && <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />} Refresh counts
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setManualMode(!manualMode)}>
            {manualMode ? 'Back to AI ingestion' : <><Plus size={14} strokeWidth={1.75} aria-hidden="true" /> Add manually</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total questions', value: serverStats?.total || 0, accent: null },
          { label: 'Mathematics', value: serverStats?.math || 0, accent: TRACK_ACCENT.Mathematics },
          { label: 'ESAS', value: serverStats?.esas || 0, accent: TRACK_ACCENT.ESAS },
          { label: 'EE', value: serverStats?.ee || 0, accent: TRACK_ACCENT.EE },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 bg-bg border rounded-[var(--radius-lg)] text-center"
            style={{ borderColor: s.accent ? `color-mix(in srgb, ${s.accent} 20%, transparent)` : 'var(--border-light)' }}
          >
            <div className="text-display text-3xl tabular-nums" style={{ color: s.accent || 'var(--text-main)' }}>{s.value}</div>
            <div className="text-eyebrow mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 animate-in fade-in">
        {['Mathematics', 'ESAS', 'EE'].map(s => {
          const accent = TRACK_ACCENT[s];
          const safeSubj = toDisplaySubject(s);

          return (
            <div key={s} className="p-5 bg-surface2 border rounded-[var(--radius-lg)] flex flex-col h-[280px]" style={{ borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}>
              <div className="border-b border-border2 pb-3 mb-3 shrink-0">
                <div className="text-eyebrow" style={{ color: accent }}>{s}</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                {/* 🚀 FIXED: Maps directly over the dynamic store array */}
                {(dynamicTOS[s] || []).map(sub => {
                  const count = vaultMetadata ? vaultMetadata[`${safeSubj}_${sub}`] || 0 : 0;
                  return (
                    <div key={sub} className="flex justify-between items-center text-xs group shrink-0">
                      <span className={`truncate pr-3 transition-colors ${count > 0 ? 'text-textMain font-medium' : 'text-muted2 opacity-50'}`} title={sub}>{sub}</span>
                      <span
                        className="font-mono text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] border tabular-nums"
                        style={count > 0
                          ? { color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)`, borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`, fontWeight: 700 }
                          : { opacity: 0.3 }}
                      >{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Syllabus editor --- */}
      <Modal
        open={showTOSManager && !!editTOS}
        onClose={() => setShowTOSManager(false)}
        size="xl"
        icon={Settings2}
        title="Edit the syllabus"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTOSManager(false)}>Discard changes</Button>
            <Button loading={isSavingTOS} disabled={isSavingTOS} onClick={saveTOSChanges}>Save syllabus</Button>
          </>
        }
      >
        {editTOS && (
          <>
            <p className="text-sm text-muted2 mb-6">
              Add or remove topics. Changes apply immediately to AI generation and the dashboard heatmaps.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 border rounded-[var(--radius-lg)]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-signal) 30%, transparent)',
                background: 'color-mix(in srgb, var(--accent-signal) 5%, transparent)',
              }}
            >
              <FormField label="Subject" className="sm:w-1/3">
                <Select value={targetSubject} onChange={(e) => setTargetSubject(e.target.value)}>
                  {Object.keys(editTOS).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="New topic" className="flex-1">
                <Input
                  type="text"
                  value={newSubtopic}
                  onChange={(e) => setNewSubtopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtopic())}
                  placeholder="e.g. Vector Analysis"
                />
              </FormField>
              <div className="flex items-end">
                <Button tone="signal" onClick={handleAddSubtopic} disabled={!newSubtopic.trim()}>
                  Add topic
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.keys(editTOS).map(subject => (
                  <div key={subject} className="bg-surface2/40 border border-border rounded-[var(--radius-lg)] p-4 flex flex-col max-h-[350px]">
                      <h4 className="text-eyebrow mb-3 pb-2 border-b border-border shrink-0">{subject}</h4>
                      <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
                          {editTOS[subject].map(sub => (
                              <div key={sub} className="flex justify-between items-center bg-bg border border-border p-2 rounded-[var(--radius-sm)] group transition-colors shrink-0">
                                  <span className="text-xs font-medium text-muted2 truncate pr-2" title={sub}>{sub}</span>
                                  <button
                                      onClick={() => handleRemoveSubtopic(subject, sub)}
                                      aria-label={`Remove ${sub}`}
                                      className="text-muted hover:text-[var(--accent-danger)] p-1 rounded-[var(--radius-sm)] transition-colors opacity-50 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                                  >
                                      <X size={12} strokeWidth={2} aria-hidden="true" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* --- AI review queue --- */}
      <Modal
        open={showQuarantineQueue}
        onClose={() => setShowQuarantineQueue(false)}
        size="xl"
        tone="amber"
        icon={Shield}
        title="AI review queue"
      >
        {isLoadingQueue ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-reeAmber)]">
                <span className="telemetry-spinner"></span>
                <span className="ml-3 text-muted font-mono text-sm">Loading the queue…</span>
            </div>
        ) : quarantineItems.length === 0 ? (
            <EmptyState
                icon={Sparkles}
                title="Queue is clear"
                description="No AI-generated questions are waiting for review."
            />
        ) : (
            <div className="flex flex-col gap-6">
                {/* Batch header — hidden entirely when nothing is bulk-eligible. */}
                {bulkEligible.length > 0 && (
                    <div className="flex items-center justify-between gap-3 flex-wrap border border-border bg-surface2/40 rounded-[var(--radius-default)] px-4 py-3">
                        <p className="text-xs text-muted2">
                            <span className="font-bold text-textMain">{bulkEligible.length}</span> item{bulkEligible.length === 1 ? '' : 's'} pass all checks
                            {bulkExcludedCount > 0 && <> · <span className="font-bold">{bulkExcludedCount}</span> flagged/legacy need individual review</>}
                        </p>
                        <Button size="sm" tone="success" onClick={() => setShowBulkConfirm(true)} disabled={isBulkApproving}>
                            Accept all {bulkEligible.length} valid
                        </Button>
                    </div>
                )}
                {quarantineItems.map((q) => {
                    const isEditing = editingId === q.id;
                    return (
                    <div key={q.id} className="bg-surface2/40 border rounded-[var(--radius-lg)] p-5 shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)' }}>
                        <div className="flex justify-between items-start mb-4 border-b border-border pb-3 gap-3 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2">
                                    <StatusPill tone="amber">Pending review</StatusPill>
                                    {q.legacy && <Badge tone="neutral">Legacy flag</Badge>}
                                </div>
                                <div className="text-eyebrow mt-2">{q.subject} • {q.subtopic}</div>
                            </div>
                            <div className="flex gap-2">
                                {!q.legacy && (
                                    isEditing
                                        ? <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</Button>
                                        : <Button size="sm" variant="outline" onClick={() => startEditItem(q)}>Edit</Button>
                                )}
                                {isEditing ? (
                                    <Button size="sm" tone="success" onClick={() => handleSaveEdit(q)}>Save edits</Button>
                                ) : (
                                    <>
                                        <Button size="sm" variant="outline" tone="danger" onClick={() => handleRejectQuarantinedItem(q)}>
                                            {q.legacy ? 'Delete' : 'Reject'}
                                        </Button>
                                        <Button size="sm" tone="success" onClick={() => handleApproveQuarantinedItem(q)}>Approve</Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField label="Subject">
                                        <Select
                                            value={editDraft.subject}
                                            onChange={(e) => setEditDraft(d => ({ ...d, subject: e.target.value, subtopic: (dynamicTOS?.[e.target.value] || [])[0] || d.subtopic }))}
                                        >
                                            {['Mathematics', 'ESAS', 'EE'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </Select>
                                    </FormField>
                                    <FormField label="Subtopic">
                                        <Select
                                            value={editDraft.subtopic}
                                            onChange={(e) => setEditDraft(d => ({ ...d, subtopic: e.target.value }))}
                                        >
                                            {((dynamicTOS?.[editDraft.subject]) || [editDraft.subtopic]).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Select>
                                    </FormField>
                                </div>
                                <FormField label="Question text">
                                    <Textarea
                                        rows={3}
                                        value={editDraft.text}
                                        onChange={(e) => setEditDraft(d => ({ ...d, text: e.target.value }))}
                                    />
                                </FormField>
                                {editDraft.options.map((opt, i) => (
                                    <FormField key={i} label={`Option ${String.fromCharCode(65 + i)}`}>
                                        <Input
                                            value={opt}
                                            onChange={(e) => setEditDraft(d => {
                                                const options = [...d.options];
                                                const wasAnswer = d.answer === options[i];
                                                options[i] = e.target.value;
                                                // Follow the answer through its own option edit so the
                                                // exact-match invariant survives label fixes.
                                                return { ...d, options, answer: wasAnswer ? e.target.value : d.answer };
                                            })}
                                        />
                                    </FormField>
                                ))}
                                <FormField label="Correct answer" hint="Must be one of the options — grading is an exact match.">
                                    <Select
                                        value={editDraft.answer}
                                        onChange={(e) => setEditDraft(d => ({ ...d, answer: e.target.value }))}
                                    >
                                        {editDraft.options.map((opt, i) => <option key={i} value={opt}>{String.fromCharCode(65 + i)}. {opt}</option>)}
                                    </Select>
                                </FormField>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm text-textMain mb-4">
                                    <LatexRenderer content={q.content || q.text || q.question || "No content available."} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options && q.options.map((opt, i) => (
                                        <div
                                          key={i}
                                          className="p-3 rounded-[var(--radius-default)] text-xs font-mono border"
                                          style={opt === q.answer
                                            ? { background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)', color: 'var(--accent-success)', fontWeight: 700 }
                                            : undefined}
                                        >
                                            {String.fromCharCode(65 + i)}. <LatexRenderer content={opt} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    );
                })}
            </div>
        )}
      </Modal>

      {/* Accept-All confirmation — count reflects only what will actually be
          approved (clean, non-legacy items), never the raw queue length.
          Closes immediately on confirm; the dedicated progress modal below
          takes over from there (see handleBulkApprove). */}
      <Modal
        open={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        tone="amber"
        icon={Shield}
        title={`Approve all ${bulkEligible.length} valid item${bulkEligible.length === 1 ? '' : 's'}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkConfirm(false)}>Cancel</Button>
            <Button tone="success" onClick={handleBulkApprove} disabled={bulkEligible.length === 0}>
              Approve {bulkEligible.length}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          This publishes them to users immediately.
          {bulkExcludedCount > 0 && ` ${bulkExcludedCount} flagged/legacy item${bulkExcludedCount === 1 ? ' is' : 's are'} excluded and stay${bulkExcludedCount === 1 ? 's' : ''} in the queue for individual review.`}
          {' '}Every approval is logged.
        </p>
      </Modal>

      {/* Accept-All progress — a DEDICATED modal (not sharing the confirm
          dialog above), non-dismissable: no onClose (hides the X/backdrop/
          Escape close per Modal.jsx) so a stray click or Escape can't orphan
          a run partway through. Large queues send in chunks (see
          BULK_CHUNK_SIZE) so no single request has to cover everything —
          this shows the true count of items SENT so far, reconciled against
          the server after every chunk, never optimistic. */}
      <Modal
        open={showBulkProgress}
        tone="amber"
        icon={Shield}
        title="Approving questions…"
        closeOnBackdrop={false}
      >
        {bulkProgress && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted2">
              Approving batch {bulkProgress.chunkIndex} of {bulkProgress.chunkCount} ({bulkProgress.done} / {bulkProgress.total} completed)…
            </p>
            <ProgressIndicator
              value={bulkProgress.done}
              max={bulkProgress.total}
              tone="amber"
              showValue
              ariaLabel="Accept All progress"
            />
            <p className="text-xs text-muted2">
              Keep this tab open until this finishes — closing or navigating away partway through is safe to
              resume later (nothing is duplicated), but this run will stop.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
