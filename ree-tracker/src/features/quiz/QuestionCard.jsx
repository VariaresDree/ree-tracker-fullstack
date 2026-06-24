// src/features/quiz/QuestionCard.jsx
//
// Single shared answer surface — the source of truth for how a question prompt,
// confidence selector, and choice grid look and behave. Used by Active Review
// (per-question reveal), Board Simulator (lock + navigator + post-exam review),
// Gauntlet (distraction-free timed), and Combat (multiplayer). Parents own the
// surrounding chrome (timer, navigator, scratchpad, AI explanation panel) and
// just hand this component a question + selection state.
//
// Why a single component:
//   - Identical hit zones, hotkeys, ARIA, reveal animation across surfaces
//   - One place to honor `prefers-reduced-motion`
//   - One place to enforce the confidence + correctness color semantics
//   - Removes ~300 lines of duplicated JSX from MCQMode/SimulatorActive/Gauntlet

import React, { useCallback, useEffect, useMemo } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import { prefersReducedMotion } from '../../motion/presets';

const CONFIDENCE_LEVELS = ['LOW', 'MED', 'HIGH'];
const HOTKEY_TO_CONFIDENCE = { q: 'LOW', w: 'MED', e: 'HIGH' };
const HOTKEY_TO_OPTION_INDEX = { 1: 0, a: 0, 2: 1, b: 1, 3: 2, c: 2, 4: 3, d: 3 };
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * @typedef {Object} QuestionShape
 * @property {string} [text]
 * @property {string} [question]
 * @property {string[]} options
 * @property {string} [answer]
 * @property {string} [subject]
 * @property {string} [subtopic]
 */

/**
 * @param {Object} props
 * @param {QuestionShape} props.question
 * @param {?string} props.selectedOption
 * @param {?('LOW'|'MED'|'HIGH')} [props.confidence]
 * @param {'answering'|'reviewing'} [props.state='answering']
 * @param {boolean} [props.showConfidence=true]   - render the confidence selector row
 * @param {boolean} [props.requireConfidence=false] - block option clicks until confidence picked
 * @param {boolean} [props.hotkeys=false]         - attach window keydown for 1-4 / A-D / Q-W-E
 * @param {?number} [props.index]                 - show "Item N" badge when set
 * @param {function(string):void} props.onSelect
 * @param {function('LOW'|'MED'|'HIGH'):void} [props.onConfidenceChange]
 * @param {function():void} [props.onConfidenceRequiredBlocked] - called when user clicks an option but confidence is required + missing
 * @param {React.ReactNode} [props.headerSlot]    - injected to the right of the eyebrow row
 * @param {string} [props.className]
 */
export default function QuestionCard({
  question,
  selectedOption,
  confidence = null,
  state = 'answering',
  showConfidence = true,
  requireConfidence = false,
  hotkeys = false,
  index,
  onSelect,
  onConfidenceChange,
  onConfidenceRequiredBlocked,
  headerSlot,
  className = '',
}) {
  const reduceMotion = prefersReducedMotion();
  const isReviewing = state === 'reviewing';

  const prompt = question?.text || question?.question || '';
  const options = question?.options || [];
  const correctAnswer = question?.answer;

  const handleSelect = useCallback(
    (opt) => {
      if (isReviewing) return;
      if (requireConfidence && !confidence) {
        onConfidenceRequiredBlocked?.();
        return;
      }
      onSelect?.(opt);
    },
    [isReviewing, requireConfidence, confidence, onSelect, onConfidenceRequiredBlocked],
  );

  // Hotkeys — opt-in so parents that manage their own keyboard (Simulator's
  // arrow-key navigation) don't double-bind. Q/W/E pick confidence, 1-4 / A-D
  // pick options. Skips when focus is in a form field.
  useEffect(() => {
    if (!hotkeys || isReviewing) return undefined;
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const key = e.key.toLowerCase();
      if (HOTKEY_TO_CONFIDENCE[key] && onConfidenceChange) {
        onConfidenceChange(HOTKEY_TO_CONFIDENCE[key]);
        return;
      }
      const idx = HOTKEY_TO_OPTION_INDEX[key];
      if (idx != null && options[idx] != null) handleSelect(options[idx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeys, isReviewing, options, onConfidenceChange, handleSelect]);

  const subjectLabel = useMemo(() => {
    if (!question?.subject) return null;
    return question.subtopic ? `${question.subject} › ${question.subtopic}` : question.subject;
  }, [question?.subject, question?.subtopic]);

  return (
    <div className={`flex flex-col gap-6 relative z-10 ${className}`}>
      {/* Eyebrow: Item N + subject/subtopic + optional header slot */}
      {(index != null || subjectLabel || headerSlot) && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {index != null && (
              <span className="bg-surface2/50 border border-border2 px-2 py-0.5 rounded-md font-mono text-[0.65rem] font-black text-muted uppercase tracking-widest">
                Item {index + 1}
              </span>
            )}
            {subjectLabel && (
              <span className="px-3 py-1 bg-reeCyan/10 border border-reeCyan/20 text-reeCyan rounded-md text-[0.65rem] font-black uppercase tracking-wider">
                {subjectLabel}
              </span>
            )}
          </div>
          {headerSlot}
        </div>
      )}

      {/* Prompt */}
      <div className="text-lg sm:text-xl font-semibold text-textMain leading-relaxed overflow-x-auto math-scroll-mobile [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0">
        <LatexRenderer content={prompt} />
      </div>

      {/* Confidence selector */}
      {showConfidence && !isReviewing && (
        <fieldset className="border-0 p-0 m-0">
          <legend className="text-[0.65rem] text-muted uppercase tracking-widest font-black mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-reeAmber rounded-full animate-pulse"></span>
            Target Lock Confidence
            {requireConfidence && <span className="text-reeAmber/70 normal-case font-bold ml-1">(required)</span>}
          </legend>
          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Confidence level">
            {CONFIDENCE_LEVELS.map((level, i) => {
              const isSelected = confidence === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onConfidenceChange?.(level)}
                  className={`py-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-velocity)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] ${
                    isSelected
                      ? 'bg-surface3 border-textMain text-textMain shadow-md'
                      : 'bg-surface2/30 border-border2/50 text-muted hover:border-textMain/40 hover:text-textMain hover:bg-surface2'
                  } ${!reduceMotion && isSelected ? 'scale-[1.02]' : ''} ${!reduceMotion && !isSelected ? 'hover:-translate-y-0.5' : ''}`}
                >
                  {level}
                  <span className="opacity-30 text-[0.55rem] font-mono hidden sm:inline">
                    [{['Q', 'W', 'E'][i]}]
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Options A–D */}
      <div className="flex flex-col gap-3.5" role="radiogroup" aria-label="Answer choices">
        {options.map((opt, i) => (
          <OptionRow
            key={i}
            opt={opt}
            letter={LETTERS[i] || String.fromCharCode(65 + i)}
            isSelected={selectedOption === opt}
            isCorrectAnswer={correctAnswer != null && opt === correctAnswer}
            isReviewing={isReviewing}
            onClick={() => handleSelect(opt)}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    </div>
  );
}

function OptionRow({ opt, letter, isSelected, isCorrectAnswer, isReviewing, onClick, reduceMotion }) {
  // Visual semantics:
  //   answering + selected      → blue ring (locked-in choice)
  //   answering + idle          → muted hover
  //   reviewing + correct       → green (always shown; even if user didn't pick it)
  //   reviewing + wrongly-picked → red strikethrough
  //   reviewing + neither       → dimmed
  let stateClass =
    'bg-surface2/40 border-border2/50 hover:border-reeBlue/50 hover:bg-surface3/50 text-textMain cursor-pointer';
  let letterColor = 'text-muted/60 group-hover:text-reeBlue';
  let innerClass = '';
  let icon = null;

  if (!isReviewing && isSelected) {
    stateClass = 'bg-reeBlue/15 border-reeBlue/60 text-textMain shadow-[0_0_20px_rgba(59,130,246,0.15)] font-semibold';
    letterColor = 'text-reeBlue';
  } else if (isReviewing) {
    if (isCorrectAnswer) {
      stateClass = 'bg-[#0f291e] border-reeGreen/60 text-reeGreen shadow-[0_0_20px_rgba(34,197,94,0.15)] font-bold';
      letterColor = 'text-reeGreen';
      icon = <CheckIcon />;
    } else if (isSelected) {
      stateClass = 'bg-[#2a1215] border-reeRed/50 text-reeRed/80 font-semibold';
      letterColor = 'text-reeRed/80';
      innerClass = 'line-through decoration-reeRed/40';
      icon = <XIcon />;
    } else {
      stateClass = 'bg-surface/10 border-border2/20 text-muted opacity-40 cursor-not-allowed';
      letterColor = 'text-muted/40';
    }
  }

  const scaleClass = !reduceMotion && isSelected ? 'scale-[1.005]' : '';
  const hoverLift = !reduceMotion && !isReviewing && !isSelected ? 'hover:-translate-y-0.5 hover:shadow-lg' : '';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={isReviewing}
      onClick={onClick}
      className={`group p-5 sm:p-6 rounded-2xl border text-left flex items-center w-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-velocity)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] ${stateClass} ${scaleClass} ${hoverLift}`}
    >
      <span className={`w-8 shrink-0 font-black font-mono text-base sm:text-lg tracking-wider transition-colors duration-200 ${letterColor}`}>
        {letter}.
      </span>
      <div className={`flex-1 flex items-center overflow-x-auto math-scroll-mobile [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0 ${innerClass}`}>
        <LatexRenderer content={opt} />
      </div>
      {icon && <div className={`ml-4 ${!reduceMotion ? 'animate-in zoom-in duration-200' : ''}`}>{icon}</div>}
    </button>
  );
}

function CheckIcon() {
  return (
    <div className="w-7 h-7 bg-reeGreen rounded-lg flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-reeRed shrink-0" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
