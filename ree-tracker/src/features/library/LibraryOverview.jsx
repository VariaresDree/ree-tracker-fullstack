// src/features/library/LibraryOverview.jsx
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
    updateDynamicTOS,
    fetchReviewQueue,
    updateReviewItem,
    approveReviewItem,
    rejectReviewItem,
    approveQuarantinedQuestion,
    deleteQuestionFromBank
} from '../../services/dbQueries';
import { Button, Modal, FormField, Select, Input, Textarea, Badge, EmptyState, StatusPill } from '../../components/ui';
import { Shield, Settings2, RefreshCw, Plus, X, Sparkles, Layers } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import toast from 'react-hot-toast';

// Per-subject track colors — data-viz distinction routed through theme vars.
const TRACK_ACCENT = {
  Mathematics: 'var(--accent-signal)',
  ESAS: 'var(--accent-velocity)',
  EE: 'var(--color-reeAmber)',
};

export default function LibraryOverview({ serverStats, vaultMetadata, resyncVaultMetadata, manualMode, setManualMode }) {

  // 🚀 Reads dynamicTOS and the setter securely from the global store
  const { isAdmin, dynamicTOS, setDynamicTOS } = useStore();
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
          resyncVaultMetadata();
      } catch (err) {
          toast.error("Approval failed.");
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
          const safeSubj = s === 'Mathematics' ? 'Math' : s;

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
    </div>
  );
}
