// src/features/focus/FocusView.jsx
// The full-screen focus timer (/focus): the mode, a ring with the time, and
// three controls, over the theme's own glow and texture (the root has no
// background of its own, so body::before/::after show through).
//
// Modes: Focus, Short break, Long break, and Paper exam: a physical mock board
// timed at the PRC section's length (Mathematics 5 h, ESAS 4 h, EE 6 h), whose
// time counts as focus time for that subject. Ending, restarting or leaving an
// exam section in progress asks first; nothing else does.
//
// A view: the clock and the actions come in as props (pages/Focus owns the
// clock), so it renders the same in tests.
import { useState } from 'react';
import { PRC_EXAM_FORMAT, toDisplaySubject } from '@ree/shared';
import { Button, KBD, Modal, SegmentedControl, cn } from '../../components/ui';
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, SkipForward, X } from '../../components/ui/icons';
import useMediaQuery from '../../hooks/useMediaQuery';
import { EXAM_SECTIONS, MODE_LABEL, inShadingTime, isInProgress } from '../../utils/pomodoroLogic';
import { formatClock, formatTimeOfDay } from '../../utils/time';
import ProgressRing from './ProgressRing';
import FocusSettings from './FocusSettings';
import { useFocusHotkeys } from './useFocusHotkeys';
import { useFullscreen } from './useFullscreen';

const MODE_OPTIONS = ['focus', 'short', 'long', 'exam'].map((value) => ({ value, label: MODE_LABEL[value] }));
const hours = (section) => PRC_EXAM_FORMAT[section].minutes / 60;
const SECTION_OPTIONS = EXAM_SECTIONS.map((s) => ({ value: s, label: toDisplaySubject(s), hint: `${hours(s)} h` }));
const subjectLabel = (s) => (s === 'General' ? 'General' : toDisplaySubject(s));

// The mode's name above the digits, in a text-safe colour. Inline: the
// eyebrow style sets its own colour after Tailwind's text-* utilities.
const MODE_COLOR = {
  focus: 'var(--accent-text)',
  short: 'var(--accent-success)',
  long: 'var(--accent-success)',
  exam: 'var(--color-reeAmber-text)',
};

/** The confirm for a destructive exam action, or null to act at once. */
function confirmCopy(action, p) {
  const s = p.examSection;
  const logged = `The time so far counts as ${s} focus time if it ran 5 minutes or more.`;
  switch (action.type) {
    case 'skip': {
      const i = EXAM_SECTIONS.indexOf(s);
      const next = p.examFullBoard && i < EXAM_SECTIONS.length - 1 ? ` ${EXAM_SECTIONS[i + 1]} is next.` : '';
      return { title: `End the ${s} section now?`, body: `${logged}${next}`, action: 'End section' };
    }
    case 'reset':
      return { title: `Restart the ${s} section?`, body: `The clock goes back to ${formatClock(PRC_EXAM_FORMAT[s].minutes * 60)}. ${logged}`, action: 'Restart section' };
    case 'mode':
      return { title: 'Leave the paper exam?', body: `The ${s} section stops. ${logged}`, action: 'Leave the exam' };
    case 'section':
      return { title: `Switch to ${action.section}?`, body: `The ${s} section stops. ${logged}`, action: `Switch to ${action.section}` };
    default:
      return null;
  }
}

function subLine(p) {
  if (p.mode === 'exam') {
    const i = EXAM_SECTIONS.indexOf(p.examSection);
    const part = p.examFullBoard ? ` (${i + 1} of ${EXAM_SECTIONS.length})` : '';
    const when = p.isRunning && p.endsAt
      ? `ends ${formatTimeOfDay(p.endsAt)}`
      : isInProgress(p) ? 'paused' : `${hours(p.examSection)} hours`;
    return `${p.examSection} section${part} · ${when}`;
  }
  if (p.mode === 'focus') return `Block ${p.cycle + 1} of ${p.longEvery} · ${subjectLabel(p.subject)}`;
  return `Up next: focus block ${p.cycle + 1} of ${p.longEvery}`;
}

// What the live region says when the mode or section changes (never on ticks:
// role="timer" is silent, and the digits would be read every second).
function announcement(p, duration) {
  if (p.mode === 'exam') return `Paper exam, ${p.examSection} section, ${hours(p.examSection)} hours`;
  const minutes = Math.round(duration / 60);
  return `${MODE_LABEL[p.mode]}, ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export default function FocusView({ pomodoro: p, remaining, duration, progress, controls, onExit }) {
  const wide = useMediaQuery('(min-width: 640px)');
  const fullscreen = useFullscreen();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // The live line changes only when the mode or section does (React's
  // "adjust state while rendering" pattern, not an effect).
  const label = announcement(p, duration);
  const [lastLabel, setLastLabel] = useState(label);
  const [spoken, setSpoken] = useState('');
  if (label !== lastLabel) {
    setLastLabel(label);
    setSpoken(label);
  }

  const exam = p.mode === 'exam';
  const inProgress = isInProgress(p);
  const run = (action) => {
    if (action.type === 'reset') controls.reset();
    else if (action.type === 'skip') controls.skip();
    else if (action.type === 'mode') controls.setMode(action.mode);
    else if (action.type === 'section') controls.setExamSection(action.section);
  };
  // In exam mode, a section in progress asks before it's ended or restarted.
  const ask = (action) => (exam && inProgress ? setConfirm(action) : run(action));
  const copy = confirm ? confirmCopy(confirm, p) : null;

  useFocusHotkeys({
    onToggle: controls.toggle,
    onReset: () => ask({ type: 'reset' }),
    onSkip: () => ask({ type: 'skip' }),
    onFullscreen: fullscreen.supported ? fullscreen.toggle : undefined,
    onExit,
  });

  const playLabel = p.isRunning ? 'Pause' : inProgress ? 'Resume' : 'Start';
  const PlayIcon = p.isRunning ? Pause : Play;
  const skipLabel = exam ? 'End section' : 'Skip';
  const longClock = duration >= 3600;

  return (
    <div className="min-h-dvh flex flex-col text-textMain">
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Close the focus timer" title="Close (Esc)">
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-1">
          {fullscreen.supported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={fullscreen.toggle}
              aria-label="Full screen"
              aria-pressed={fullscreen.active}
              title="Full screen (F)"
            >
              {fullscreen.active
                ? <Minimize2 size={18} strokeWidth={1.75} aria-hidden="true" />
                : <Maximize2 size={18} strokeWidth={1.75} aria-hidden="true" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Timer settings" title="Timer settings">
            <Settings2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col items-center justify-center gap-5 sm:gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-hidden"
      >
        <h1 className="sr-only">Focus timer</h1>

        <SegmentedControl
          label="Timer mode"
          options={MODE_OPTIONS}
          value={p.mode}
          onChange={(mode) => ask({ type: 'mode', mode })}
          columns={wide ? 4 : 2}
          fullWidth
          className="max-w-xl"
        />

        {exam && (
          <div className="w-full max-w-md flex flex-col items-center gap-3">
            <SegmentedControl
              label="Exam section"
              size="sm"
              options={SECTION_OPTIONS}
              value={p.examSection}
              onChange={(section) => ask({ type: 'section', section })}
              fullWidth
            />
            <label className="inline-flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
              <input
                type="checkbox"
                checked={!!p.examFullBoard}
                onChange={(e) => controls.setExamFullBoard(e.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]"
              />
              Full board in order
              <span className="text-muted2">(Math, ESAS, EE)</span>
            </label>
            <p className="text-xs text-muted2 text-center max-w-sm">
              Answer on paper. The time counts as focus time for {toDisplaySubject(p.examSection)}.
            </p>
          </div>
        )}

        <ProgressRing key={`${p.mode}-${p.examSection}`} progress={progress} mode={p.mode}>
          <p className="text-eyebrow mb-2" style={{ color: MODE_COLOR[p.mode] }}>{MODE_LABEL[p.mode]}</p>
          <div
            role="timer"
            className={cn(
              'font-mono tabular-nums font-semibold leading-none tracking-tight text-textMain',
              longClock ? 'text-[length:clamp(2rem,min(11vw,8dvh),4.5rem)]' : 'text-[length:clamp(2.5rem,min(16vw,11dvh),6rem)]',
            )}
          >
            {formatClock(remaining, { pad: true })}
          </div>
          <p className="mt-3 text-sm text-muted2 tabular-nums">{subLine(p)}</p>
          {inShadingTime(p) && (
            <p className="mt-2 text-sm font-semibold text-[var(--color-reeAmber-text)]">Shading time: transfer your answers</p>
          )}
        </ProgressRing>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="min-h-12 min-w-12"
            onClick={() => ask({ type: 'reset' })}
            aria-label="Reset"
            title="Reset (R)"
          >
            <RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <Button size="lg" className="min-h-14 min-w-40" onClick={controls.toggle}>
            <PlayIcon size={20} strokeWidth={1.75} aria-hidden="true" />
            {playLabel}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="min-h-12 min-w-12"
            onClick={() => ask({ type: 'skip' })}
            aria-label={skipLabel}
            title={`${skipLabel} (S)`}
          >
            <SkipForward size={20} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>

        {p.mode === 'focus' && (
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            Counts toward {subjectLabel(p.subject)}
          </Button>
        )}

        <p className="hidden md:flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted2">
          <span><KBD>Space</KBD> start or pause</span>
          <span><KBD>R</KBD> reset</span>
          <span><KBD>S</KBD> {exam ? 'end section' : 'skip'}</span>
          {fullscreen.supported && <span><KBD>F</KBD> full screen</span>}
          <span><KBD>Esc</KBD> close</span>
        </p>

        <p className="sr-only" aria-live="polite">{spoken}</p>
      </main>

      <FocusSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pomodoro={p}
        onSave={controls.update}
      />

      <Modal
        open={!!copy}
        onClose={() => setConfirm(null)}
        title={copy?.title}
        tone="amber"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Keep going</Button>
            <Button tone="amber" onClick={() => { const a = confirm; setConfirm(null); run(a); }}>{copy?.action}</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">{copy?.body}</p>
      </Modal>
    </div>
  );
}
