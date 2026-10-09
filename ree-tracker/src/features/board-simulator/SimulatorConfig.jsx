// src/features/board-simulator/SimulatorConfig.jsx
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Card, Button, FormField, IconChip, Select, SegmentedControl, Modal, StatusPill, cn } from '../../components/ui';
import { FileText, TriangleAlert } from '../../components/ui/icons';
import { PRC_TIMES } from '../../config/examStandards';
import { SIM_PROFILES, configForProfile } from './profiles';
import { prcSectionSeconds } from '@ree/shared';

const hms = (secs) => [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60]
  .map((n) => String(n).padStart(2, '0')).join(':');


const FULL_BOARD_ROWS = [['Mathematics', 'Mathematics'], ['ESAS', 'ESAS'], ['EE', 'Electrical Engineering']];

export default function SimulatorConfig({ config, setConfig, session, startSimulation, engine, onStartFullBoard, initialProfile }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = dynamicTOS || {};
  const isOnline = useNetworkStatus();
  const [showNewExamGuard, setShowNewExamGuard] = useState(false);
  // A profile chosen in the Exams hub arrives as /simulator?profile=<id>.
  const [fullBoardSelected, setFullBoardSelected] = useState(() => initialProfile === 'prc_full');

  const isCustom = config.mode === 'subject' && !config.isPrcStandard;
  const isPrcSubject = config.mode === 'subject' && config.isPrcStandard;
  const isBlended = config.mode === 'blended';
  const activeProfile = fullBoardSelected ? 'prc_full' : isBlended ? 'prc_blended' : isPrcSubject ? 'prc_subject' : 'custom';

  const setProfile = (profile) => {
    setFullBoardSelected(profile === 'prc_full');
    const next = configForProfile(profile, config);
    if (next) setConfig(next);
  };

  // Apply a hub-chosen config profile once (the full board is already handled
  // by the state initialiser above).
  const appliedProfile = useRef(false);
  useEffect(() => {
    if (appliedProfile.current || !initialProfile) return;
    appliedProfile.current = true;
    const next = configForProfile(initialProfile, config);
    if (next) setConfig(next);
  }, [initialProfile, config, setConfig]);

  // Starting a new exam silently discards any saved one — make that a
  // deliberate choice instead of an accident.
  const begin = () => (fullBoardSelected && onStartFullBoard ? onStartFullBoard() : startSimulation());
  const handleStart = () => {
    if (engine?.hasSavedSession) {
      setShowNewExamGuard(true);
      return;
    }
    begin();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full">
      <Card elevated grain className="p-6 sm:p-10">
        <div className="mb-8 border-b border-border pb-5">
          <h1 className="text-display text-2xl sm:text-3xl text-textMain tracking-tight">Mock board</h1>
          <p className="text-sm text-muted2 mt-1">Choose how strict the exam should be.</p>
        </div>

        {session?.error && (
          <div className="mb-8 p-4 rounded-[var(--radius-default)] border-l-4 text-sm font-medium animate-in zoom-in"
            style={{
              borderColor: 'var(--accent-danger)',
              background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
              color: 'var(--text-main)',
            }}
          >
            {session.error}
          </div>
        )}

        {engine?.hasSavedSession && (
          <Card className="mb-8 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4"
            style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
          >
            <div className="flex flex-col gap-1.5">
              <StatusPill tone="amber">In progress</StatusPill>
              <p className="text-textMain font-semibold">Resume your last exam?</p>
              <p className="text-sm text-muted2">You have an unfinished simulation saved on this device.</p>
            </div>
            <Button tone="amber" onClick={engine.resumeSimulation} className="w-full sm:w-auto">
              Resume exam
            </Button>
          </Card>
        )}

        {/* Exam profile */}
        <div className="mb-8">
          <span className="text-eyebrow block mb-3">Exam profile</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Exam profile">
            {SIM_PROFILES.map((p) => {
              const selected = activeProfile === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProfile(p.id)}
                  className={cn(
                    'p-5 rounded-[var(--radius-lg)] border text-left transition-all cursor-pointer flex flex-col gap-3 btn-press',
                    selected
                      ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                      : 'bg-surface2 border-border hover:bg-surface3 hover:border-border2'
                  )}
                >
                  <IconChip icon={Icon} tone={selected ? 'accent' : 'muted'} />
                  <div>
                    <span className={cn('block text-sm font-semibold mb-1', selected ? 'text-[var(--accent-text)]' : 'text-textMain')}>{p.name}</span>
                    <p className="text-xs text-muted2 leading-relaxed">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {fullBoardSelected && (
          <Card className="mb-8 p-5 flex flex-col gap-3 bg-surface2">
            <span className="text-eyebrow">Sections, in board order</span>
            <ol className="flex flex-col gap-2">
              {FULL_BOARD_ROWS.map(([key, label], i) => (
                <li key={key} className="flex justify-between gap-3 text-sm">
                  <span className="text-textMain">{i + 1}. {label}</span>
                  <span className="text-muted2 font-mono tabular-nums">100 items · {hms(prcSectionSeconds(key))}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted2">
              Each section runs on its own clock. Break between sections for as long as you like — the sitting keeps for 7 days.
            </p>
          </Card>
        )}

        {/* Subject & topic */}
        {!fullBoardSelected && (
        <>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-in fade-in slide-in-from-top-2">
          <FormField label="Subject" className="flex-1">
            <Select
              disabled={isBlended}
              value={config.subject}
              onChange={(e) => setConfig({ ...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All' })}
              className="py-3.5 text-base"
            >
              {Object.keys(safeTOS).map((s) => (
                <option key={s} value={s}>{s === 'EE' ? 'Electrical Engineering (EE)' : s}</option>
              ))}
              {isBlended && <option value="blended">All subjects (blended)</option>}
            </Select>
          </FormField>

          {isCustom && config.subject && config.subject !== 'blended' && (
            <FormField label="Topic" className="flex-1 animate-in fade-in slide-in-from-left-4">
              <Select
                value={config.subtopic || 'All'}
                onChange={(e) => setConfig({ ...config, subtopic: e.target.value })}
                className="py-3.5 text-base"
              >
                <option value="All">All topics</option>
                {(safeTOS[config.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          )}
        </div>

        {/* Length, or the enforced board time limit */}
        {isCustom ? (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-3">
            <span className="text-eyebrow block mb-3">Length</span>
            <SegmentedControl
              label="Number of questions"
              value={config.count}
              onChange={(v) => setConfig({ ...config, count: v })}
              columns={2}
              size="lg"
              className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]"
              options={[10, 20, 50, 100].map((n) => ({ value: n, label: `${n} questions` }))}
            />
          </div>
        ) : (
          <Card className="mb-8 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 bg-surface2">
            <div className="flex flex-col gap-1">
              <span className="text-eyebrow">Time limit</span>
              <span className="text-sm text-muted2">Fixed by PRC board rules.</span>
            </div>
            <span className="text-display text-3xl text-textMain font-mono tabular-nums bg-surface px-6 py-3 rounded-[var(--radius-default)] border border-border">
              {hms(isBlended ? PRC_TIMES.BLENDED : (prcSectionSeconds(config.subject) || PRC_TIMES.BLENDED))}
            </span>
          </Card>
        )}

        </>
        )}

        {/* Source (custom only) */}
        {isCustom && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-eyebrow block mb-3">Source</span>
            <SegmentedControl
              label="Question source"
              value={config.source}
              onChange={(v) => setConfig({ ...config, source: v })}
              size="lg"
              options={[
                { value: 'library', label: 'Question bank' },
                { value: 'ai', label: 'AI generated', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
              ]}
            />
          </div>
        )}

        {/* Primary action, with the PDF export visibly subordinate */}
        {/* The warning the old nav confirm modal gave, now where you commit. */}
        <p className="text-xs text-muted2 mb-3">Timed like the real board. The clock keeps running if you leave the exam.</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-6 border-t border-border">
          <Button
            size="lg"
            // NOT bare `flex-1`: this container is `flex-col` on mobile, where
            // `flex-1` (flex-basis:0) zeroes the button's own preferred main-
            // size (its height, on that axis) and `min-height:auto` collapses
            // it to its content minimum — the h-12 utility never wins. Measured
            // live: 308x24px instead of the intended 48px. `w-full` avoids the
            // collapse on mobile; `sm:flex-1` restores the intended stretch-to-
            // fill once the row is horizontal (`sm:flex-row`) and height is the
            // cross axis again.
            className="w-full sm:flex-1"
            loading={session?.loading && !engine?.isExporting}
            disabled={session?.loading}
            onClick={handleStart}
          >
            {fullBoardSelected ? 'Start the full board' : 'Start simulation'}
          </Button>
          <Button
            variant="ghost"
            loading={engine?.isExporting}
            disabled={session?.loading || engine?.isExporting || fullBoardSelected}
            onClick={engine?.exportOfflinePDF}
          >
            <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
            Export exam paper (PDF)
          </Button>
        </div>
        <p className="text-[11px] text-muted2 mt-2">
          Exports a printable packet: questionnaire, a bubble answer sheet with a scannable set QR, and a column-major answer key.
        </p>
      </Card>

      <Modal
        open={showNewExamGuard}
        onClose={() => setShowNewExamGuard(false)}
        tone="amber"
        icon={TriangleAlert}
        title="Start a new exam?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setShowNewExamGuard(false); engine.resumeSimulation(); }}
            >
              Resume saved exam
            </Button>
            <Button
              tone="amber"
              onClick={() => { setShowNewExamGuard(false); begin(); }}
            >
              Start new exam
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Starting a new exam replaces the one saved on this device. Your answers in the saved exam will be lost.
        </p>
      </Modal>
    </div>
  );
}
