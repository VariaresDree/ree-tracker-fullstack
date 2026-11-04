// src/features/board-simulator/SimulatorConfig.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Card, Button, FormField, PageHeader, Select, SegmentedControl, Modal, StatusPill } from '../../components/ui';
import { FileText, TriangleAlert } from '../../components/ui/icons';
import { PRC_TIMES } from '../../config/examStandards';
import { SIM_PROFILES, configForProfile } from './profiles';
import { readSavedRuns } from '../exams/savedRuns';
import { FULL_BOARD_SECTIONS } from './fullBoard';
import { prcSectionSeconds, SYLLABUS_SUBJECTS, toDisplaySubject } from '@ree/shared';
import { AI_SOURCE_MESSAGE } from '../exam-export/drawExamPaper';
import { drawApplies } from './drawModes';
import { useDrawPrefs } from './useDrawPrefs';
import DrawPicker from './DrawPicker';

const hms = (secs) => [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60]
  .map((n) => String(n).padStart(2, '0')).join(':');

// The board's own sitting first, the custom mock last.
const FORMAT_ORDER = ['prc_full', 'prc_blended', 'prc_subject', 'custom'];
const FORMATS = FORMAT_ORDER.map((id) => SIM_PROFILES.find((p) => p.id === id));
const SUBJECT_OPTIONS = SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: toDisplaySubject(s) }));

const FULL_BOARD_ROWS = [['Mathematics', 'Mathematics'], ['ESAS', 'ESAS'], ['EE', 'Electrical Engineering']];

// "Print this paper" draws a set, saves it to the account and opens its
// print preview (/print/<id>). The draw and the save load only when asked.
const loadPrintedSets = () => import('../paper-sets/printedSetsApi');
const PRINT_HINT = 'A print preview: the question paper, an answer sheet you can scan to score, and the answer key. Edit any question before you print, or open it as LaTeX.';

export default function SimulatorConfig({ config, setConfig, session, startSimulation, engine, onStartFullBoard, initialProfile }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = dynamicTOS || {};
  const isOnline = useNetworkStatus();
  const [showNewExamGuard, setShowNewExamGuard] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const navigate = useNavigate();
  // A profile chosen in the Exams hub arrives as /simulator?profile=<id>.
  const [fullBoardSelected, setFullBoardSelected] = useState(() => initialProfile === 'prc_full');

  // The full board is its own flow, so the config beneath it says nothing about it.
  const isCustom = !fullBoardSelected && config.mode === 'subject' && !config.isPrcStandard;
  const isPrcSubject = config.mode === 'subject' && config.isPrcStandard;
  const isBlended = config.mode === 'blended';
  const activeProfile = fullBoardSelected ? 'prc_full' : isBlended ? 'prc_blended' : isPrcSubject ? 'prc_subject' : 'custom';
  const { prefs: draw, save: saveDraw } = useDrawPrefs();
  // What a paper is drawn from: the setup's choices plus how questions are picked.
  const withDraw = { ...config, drawMode: draw.drawMode, ownCounts: draw.ownCounts };

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

  // A custom mock written by AI has no fixed questions to print.
  const aiSource = isCustom && config.source === 'ai';
  const printPaper = async () => {
    setPrinting(true);
    setPrintError(null);
    try {
      const { createPrintedSetFromConfig } = await loadPrintedSets();
      const { set } = await createPrintedSetFromConfig(withDraw);
      navigate(`/print/${set.id}`);
    } catch (err) {
      setPrintError(err?.name === 'ExportError' ? err.message : `Couldn\u2019t make the paper. ${err?.message || 'Try again.'}`);
      setPrinting(false);
    }
  };

  // Starting a new exam silently discards any saved one — make that a
  // deliberate choice instead of an accident.
  const begin = () => (fullBoardSelected && onStartFullBoard ? onStartFullBoard(draw) : startSimulation(withDraw));
  const handleStart = () => {
    if (engine?.hasSavedSession) {
      setShowNewExamGuard(true);
      return;
    }
    begin();
  };

  // The screen renders into BoardSimulator's <Page> (reading width), which
  // owns the frame: the setup sits under the full-board banner there.
  return (
    <>
      <PageHeader title="Mock board" />

      <Card elevated grain padding="lg" className="flex flex-col gap-6">
        {session?.error && (
          <div className="p-4 rounded-[var(--radius-default)] border-l-4 text-sm font-medium animate-in zoom-in [overflow-wrap:anywhere]"
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
          <div className="p-4 rounded-[var(--radius-default)] border bg-surface2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4"
            style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
          >
            <div className="flex flex-col gap-1.5 min-w-0">
              <StatusPill tone="amber">In progress</StatusPill>
              <p className="text-textMain font-semibold">Resume your last exam?</p>
              <p className="text-sm text-muted2">{readSavedRuns().mock?.summary || 'You have an unfinished mock board saved on this device.'}</p>
            </div>
            <Button tone="amber" onClick={engine.resumeSimulation} className="w-full sm:w-auto">
              Resume exam
            </Button>
          </div>
        )}

        {/* The format chosen in Exams, here to change without going back. */}
        <div className="flex flex-col gap-2">
          <span className="text-label block">Format</span>
          <SegmentedControl
            label="Format"
            value={activeProfile}
            onChange={setProfile}
            columns={2}
            className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]!"
            options={FORMATS.map((p) => ({ value: p.id, label: p.short, icon: p.icon }))}
          />
          <p className="text-sm text-muted2">{SIM_PROFILES.find((p) => p.id === activeProfile)?.description}</p>
        </div>

        {fullBoardSelected && (
          <div className="flex flex-col gap-2">
            <span className="text-eyebrow">Sections, in board order</span>
            <ol className="flex flex-col gap-1">
              {FULL_BOARD_ROWS.map(([key, label], i) => (
                <li key={key} className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="text-textMain min-w-0">{i + 1}. {label}</span>
                  <span className="text-muted2 tabular-nums">100 items · {hms(prcSectionSeconds(key))}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted2">
              Each section runs on its own clock. Break between sections for as long as you like — the sitting keeps for 7 days.
            </p>
          </div>
        )}

        {!fullBoardSelected && !isBlended && (
          <div className="flex flex-col gap-2">
            <span className="text-label block">Subject</span>
            <SegmentedControl
              label="Subject"
              value={config.subject}
              onChange={(subject) => setConfig({ ...config, subject, subtopic: 'All' })}
              options={SUBJECT_OPTIONS}
            />
          </div>
        )}

        {isCustom && config.subject && config.subject !== 'blended' && (
          <FormField label="Topic">
            <Select value={config.subtopic || 'All'} onChange={(e) => setConfig({ ...config, subtopic: e.target.value })}>
              <option value="All">All topics</option>
              {(safeTOS[config.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
        )}

        {isCustom && (
          <div className="flex flex-col gap-2">
            <span className="text-label block">Questions</span>
            <SegmentedControl
              label="Number of questions"
              value={config.count}
              onChange={(v) => setConfig({ ...config, count: v })}
              options={[10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
            />
          </div>
        )}

        {!fullBoardSelected && !isCustom && (
          <p className="text-sm text-muted2">
            Time limit <span className="font-semibold text-textMain tabular-nums">{hms(isBlended ? PRC_TIMES.BLENDED : (prcSectionSeconds(config.subject) || PRC_TIMES.BLENDED))}</span>, fixed by PRC board rules.
          </p>
        )}

        {/* Source (custom only) */}
        {isCustom && (
          <div className="flex flex-col gap-2">
            <span className="text-label block">Source</span>
            <SegmentedControl
              label="Question source"
              value={config.source}
              onChange={(v) => setConfig({ ...config, source: v })}
              options={[
                { value: 'library', label: 'Question bank' },
                { value: 'ai', label: 'AI generated', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
              ]}
            />
          </div>
        )}

        {(fullBoardSelected || drawApplies(config)) && (
          <DrawPicker
            prefs={draw}
            onChange={saveDraw}
            subjects={fullBoardSelected ? FULL_BOARD_SECTIONS : isBlended ? SYLLABUS_SUBJECTS : [config.subject]}
          />
        )}

        {/* Primary action, with the PDF export visibly subordinate */}
        <div className="flex flex-col gap-3 pt-6 border-t border-border">
          {/* The warning the old nav confirm modal gave, now where you commit. */}
          <p className="text-xs text-muted2">Timed like the real board. The clock keeps running if you leave the exam.</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
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
              loading={session?.loading}
              disabled={session?.loading}
              onClick={handleStart}
            >
              {fullBoardSelected ? 'Start the full board' : 'Start mock board'}
            </Button>
            <Button
              variant="ghost"
              loading={printing}
              disabled={session?.loading || fullBoardSelected || aiSource || printing}
              aria-describedby="sim-print-hint"
              onClick={printPaper}
            >
              <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
              Print this paper
            </Button>
          </div>
          <p id="sim-print-hint" className="text-micro text-muted2">
            {fullBoardSelected
              ? 'Print one section at a time: choose One subject (PRC clock) or Mixed paper.'
              : aiSource ? AI_SOURCE_MESSAGE : PRINT_HINT}
          </p>
          {printError && <p role="alert" className="text-sm text-[var(--accent-danger)] [overflow-wrap:anywhere]">{printError}</p>}
        </div>
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
    </>
  );
}
