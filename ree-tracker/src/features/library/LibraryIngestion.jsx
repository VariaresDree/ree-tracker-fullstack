// src/features/library/LibraryIngestion.jsx
import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore'; // 🚀 FIXED: Dynamic Store Import
import { useAuth } from '../../contexts/AuthContext';
import { Button, FormField, Select, Modal, Badge } from '../../components/ui';
import { Sparkles, FileText, FileUp, X, TriangleAlert } from '../../components/ui/icons';

export default function LibraryIngestion({
  genSubject, setGenSubject, genSubtopic, setGenSubtopic,
  genLoading, genStatus, parsingPdf, isOnline, selectedPdf,
  isDragging, handleDragOver, handleDragLeave, handleDrop,
  generatedQuestions, showQAModal, setShowQAModal, isCommitting,
  handleGenerate, handlePdfSelect, executePdfExtraction,
  removeQuestion, handleCommitToMatrix
}) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // 🚀 FIXED: Pull the live syllabus from global memory
  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};

  const discardBatch = () => {
    setShowDiscardConfirm(false);
    setShowQAModal(false);
    handlePdfSelect({ target: { files: [] } }); // Reset upload state
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">

        {/* LEFT PANEL: AI generation */}
        <div className="p-6 bg-surface border border-border rounded-[var(--radius-lg)] flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-textMain flex items-center gap-2 mb-1">
              <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} /> AI ingestion
            </h3>
            <p className="text-xs text-muted2 mb-5">Generate new questions targeted at a specific topic from the syllabus.</p>
            <div className="flex flex-col gap-3">
              <FormField label="Subject">
                <Select
                    value={genSubject}
                    onChange={e => {
                        setGenSubject(e.target.value);
                        // Reset to the neutral sentinel, not topic index 0.
                        setGenSubtopic('All');
                    }}
                >
                  {Object.keys(safeTOS).map(s => <option key={s} value={s}>{s === 'Mathematics' ? 'Mathematics (Math)' : s}</option>)}
                </Select>
              </FormField>
              <FormField label="Topic">
                <Select value={genSubtopic} onChange={e => setGenSubtopic(e.target.value)}>
                  <option value="All">All topics</option>
                  {(safeTOS[genSubject] || []).map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => handleGenerate(false)} disabled={genLoading || !isOnline || parsingPdf}>
              Generate from model
            </Button>
            <Button className="flex-1" onClick={() => handleGenerate(true)} disabled={genLoading || !isOnline || parsingPdf}>
              Generate with web search
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: PDF & image extraction */}
        <div className="p-6 bg-surface border border-border rounded-[var(--radius-lg)] flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-textMain flex items-center gap-2 mb-1">
              <FileText size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent)' }} /> PDF & image extraction
            </h3>
            <p className="text-xs text-muted2 mb-5">Drop a PDF or schematic image — the AI extracts questions ready for review.</p>

            {!selectedPdf ? (
              <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !parsingPdf && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[var(--radius-lg)] p-6 flex flex-col items-center justify-center transition-all relative cursor-pointer min-h-[140px] group
                      ${isDragging ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[var(--accent)] scale-[1.02]' : 'bg-bg border-border2 hover:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] hover:bg-surface'}
                  `}
              >
                <input type="file" ref={fileInputRef} accept=".pdf,image/jpeg,image/png,image/webp" onChange={handlePdfSelect} disabled={parsingPdf} className="hidden" aria-label="Upload a PDF or image" />
                <div className="text-sm font-bold text-textMain text-center flex flex-col items-center">
                  <FileUp
                    size={30}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className={`mb-2 transition-transform duration-300 ${isDragging ? '-translate-y-2 text-[var(--accent)]' : 'opacity-60 text-muted group-hover:opacity-100 group-hover:-translate-y-1'}`}
                  />
                  Drag & drop a PDF or image
                </div>
                <div className="flex gap-2 mt-3">
                    <Badge tone="neutral" className="uppercase">.pdf</Badge>
                    <Badge tone="neutral" className="uppercase">.jpg</Badge>
                    <Badge tone="neutral" className="uppercase">.png</Badge>
                </div>
              </div>
            ) : (
              <div className="border rounded-[var(--radius-lg)] p-6 flex flex-col items-center justify-center min-h-[140px] text-center animate-in fade-in relative overflow-hidden"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-signal) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--accent-signal) 5%, transparent)',
                }}
              >
                {parsingPdf && (
                   <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-[var(--accent-signal)]">
                       <span className="telemetry-spinner !w-6 !h-6 border-t-transparent mb-2"></span>
                       <span className="text-eyebrow animate-pulse" style={{ color: 'var(--accent-signal)' }}>Reading the file…</span>
                   </div>
                )}
                <FileText size={30} strokeWidth={1.5} aria-hidden="true" className="mb-2 text-[var(--accent-signal)]" />
                <div className="text-sm font-bold text-textMain mb-1 line-clamp-1">{selectedPdf.name}</div>
                <div className="text-xs text-muted2 mb-5">{genStatus || 'File ready — extract the questions when you are.'}</div>
                <div className="flex gap-3 w-full">
                  <Button variant="secondary" className="flex-1" onClick={() => handlePdfSelect({ target: { files: [] } })} disabled={parsingPdf}>
                    Cancel
                  </Button>
                  <Button tone="signal" className="flex-1" onClick={executePdfExtraction} disabled={parsingPdf}>
                    Extract questions
                  </Button>
                </div>
              </div>
            )}
          </div>

          {(genStatus && !parsingPdf && !showQAModal) && (
            <div
              className="mt-4 p-3 rounded-[var(--radius-default)] text-xs font-medium border"
              style={
                genStatus.includes('✅')
                  ? { background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)', color: 'var(--accent-success)' }
                  : genStatus.includes('❌')
                    ? { background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)', color: 'var(--accent-danger)' }
                    : undefined
              }
            >
              {genStatus}
            </div>
          )}
        </div>
      </div>

      {/* Review generated questions before they enter the vault */}
      <Modal
        open={showQAModal}
        onClose={() => setShowDiscardConfirm(true)}
        size="xl"
        icon={Sparkles}
        eyebrow="Review before adding"
        title={`${generatedQuestions.length} generated question${generatedQuestions.length === 1 ? '' : 's'}`}
        closeOnBackdrop={false}
        footer={
          <>
            <span className="text-xs text-muted mr-auto max-w-md leading-relaxed hidden sm:block">
              Added questions go to the admin review queue before they appear in the vault.
            </span>
            <Button variant="ghost" tone="danger" onClick={() => setShowDiscardConfirm(true)}>
              Discard all
            </Button>
            <Button
              onClick={() => handleCommitToMatrix(currentUser)}
              loading={isCommitting}
              disabled={isCommitting || generatedQuestions.length === 0}
            >
              Add {generatedQuestions.length} question{generatedQuestions.length === 1 ? '' : 's'} to vault
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {generatedQuestions.length === 0 ? (
              <div className="m-auto text-center text-muted font-mono text-sm py-10">No valid questions were extracted.</div>
          ) : (
              generatedQuestions.map((q, idx) => (
                  <div key={idx} className="bg-surface2/40 border border-border rounded-[var(--radius-lg)] p-5 shadow-sm relative group">
                      <Button
                        size="icon"
                        variant="ghost"
                        tone="danger"
                        onClick={() => removeQuestion(idx)}
                        aria-label={`Remove question ${idx + 1}`}
                        className="absolute top-3 right-3 text-muted opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                          <X size={16} strokeWidth={1.75} aria-hidden="true" />
                      </Button>

                      <div className="flex gap-2 mb-4 flex-wrap">
                          <Badge tone="velocity">Item {idx + 1}</Badge>
                          <Badge tone="neutral">{q.subject}</Badge>
                          <Badge tone="neutral" className="truncate max-w-[160px]">{q.subtopic}</Badge>
                      </div>

                      <div className="text-sm font-medium text-textMain mb-4 leading-relaxed bg-bg p-3 rounded-[var(--radius-default)] border border-border/50">
                          {q.question}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {q.options?.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="p-2.5 rounded-[var(--radius-default)] border text-xs"
                                style={opt === q.answer
                                  ? { background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)', color: 'var(--accent-success)', fontWeight: 700 }
                                  : undefined}
                              >
                                  <span className="mr-2 font-mono opacity-50">{String.fromCharCode(65 + optIdx)}.</span>
                                  {opt}
                              </div>
                          ))}
                      </div>

                      {q.fixedExplanation && (
                          <div className="text-xs text-muted bg-surface2/50 p-3 rounded-[var(--radius-default)] border border-border leading-relaxed">
                              <strong className="text-eyebrow mr-2" style={{ color: 'var(--accent-signal)' }}>Explanation</strong>
                              {q.fixedExplanation}
                          </div>
                      )}
                  </div>
              ))
          )}
        </div>
      </Modal>

      <Modal
        open={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        tone="danger"
        icon={TriangleAlert}
        title="Discard generated questions?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDiscardConfirm(false)}>Keep reviewing</Button>
            <Button tone="danger" onClick={discardBatch}>Discard all</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">This throws away every generated question in this batch. It can't be undone.</p>
      </Modal>
    </>
  );
}
