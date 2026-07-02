// src/pages/Gauntlet.jsx
//
// Distraction-free timed gauntlet. Adopts the shared QuestionCard for prompt
// + confidence + choices + reveal, keeps its own chrome (level header, clock,
// right-flank navigator grid, submit/leave actions). Confidence is now
// captured on every item (silent MED default if skipped) so gauntlet attempts
// feed the same calibration analytics as Active Review and Simulator.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGauntletEngine } from '../features/gauntlet/useGauntletEngine';
import GauntletDiagnostics from '../features/gauntlet/GauntletDiagnostics';
import QuestionCard from '../features/quiz/QuestionCard';
import { Button, Modal, EmptyState, Badge } from '../components/ui';
import { TriangleAlert } from '../components/ui/icons';

export default function Gauntlet() {
  const { level } = useParams();
  const navigate = useNavigate();
  const {
    status, questions, answers, confidences, timeLeft, diagnostics,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 page-fade-in text-[var(--accent)]">
        <span className="telemetry-spinner !w-12 !h-12 border-t-transparent"></span>
        <span className="text-sm font-semibold animate-pulse">Building your exam…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-[70vh] page-fade-in">
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't build this exam"
          description="Something went wrong while loading the Gauntlet questions. Try again in a moment."
          action={<Button onClick={() => navigate('/arena')}>Back to Arena</Button>}
        />
      </div>
    );
  }

  if (status === 'diagnostics') {
    return <GauntletDiagnostics diagnostics={diagnostics} level={level} questions={questions} answers={answers} formatTime={formatTime} navigate={navigate} />;
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="w-full flex flex-col page-fade-in bg-bg min-h-screen">
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>Keep working</Button>
            <Button onClick={() => { setShowSubmitConfirm(false); submitExam(); }}>Submit exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Your answers will be graded and count toward this Gauntlet tier. You can't change them after submitting.
        </p>
      </Modal>

      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        tone="danger"
        icon={TriangleAlert}
        title="Leave exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>Keep working</Button>
            <Button tone="danger" onClick={() => navigate('/arena')}>Leave exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Leaving now records no progress for this tier attempt.
        </p>
      </Modal>

      {/* Distraction-free warning bar */}
      <div
        className="w-full border-b px-4 py-2.5 text-center relative z-20"
        style={{
          background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
        }}
      >
        <span className="text-eyebrow animate-pulse" style={{ color: 'var(--accent-danger)' }}>
          Distraction-free exam in progress — the timer keeps running
        </span>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 w-full px-4 pt-6 pb-16 flex-1 items-stretch">
        {/* Left flank: level header + question card + nav buttons */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-surface border border-border2 p-4 rounded-[var(--radius-lg)] flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3">
              <Badge tone="velocity">Level {level}</Badge>
              <span className="text-xs font-bold text-textMain font-mono tabular-nums">
                Item {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <div
              className={`px-4 py-1 rounded-[var(--radius-default)] border font-mono font-bold text-base tabular-nums shadow-inner ${timeLeft < 300 ? 'animate-pulse' : 'bg-bg text-textMain border-border2'}`}
              style={timeLeft < 300 ? {
                color: 'var(--accent-danger)',
                background: 'color-mix(in srgb, var(--accent-danger) 15%, transparent)',
                borderColor: 'var(--accent-danger)',
              } : undefined}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Question canvas — shared QuestionCard. Confidence is shown (silent
              MED default if skipped under time pressure) so gauntlet attempts
              feed the calibration analytics. */}
          <div className="bg-surface border border-border2 rounded-[var(--radius-lg)] p-6 md:p-8 min-h-[420px] flex flex-col relative shadow-md">
            <QuestionCard
              question={currentQ}
              selectedOption={answers[currentIndex] ?? null}
              confidence={confidences?.[currentIndex] ?? null}
              state="answering"
              showConfidence={true}
              requireConfidence={false}
              hotkeys={true}
              index={currentIndex}
              onSelect={(opt) => handleAnswer(currentIndex, opt)}
              onConfidenceChange={(level) => handleConfidence?.(currentIndex, level)}
            />
          </div>

          {/* Linear controls */}
          <div className="flex justify-between items-center mt-2 gap-3">
            <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))} disabled={currentIndex === 0}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.min(questions.length - 1, c + 1))} disabled={currentIndex === questions.length - 1}>
              Next
            </Button>
          </div>
        </div>

        {/* Right flank: navigator grid + submit/leave */}
        <div className="w-full md:w-72 bg-surface border border-border2 rounded-[var(--radius-lg)] p-4 flex flex-col justify-between shadow-sm min-h-[300px] md:min-h-auto">
          <div className="w-full">
            <div className="border-b border-border2 pb-3 mb-4">
              <h4 className="text-sm font-semibold text-textMain">Navigator</h4>
              <p className="text-eyebrow mt-0.5">Level {level}</p>
            </div>

            <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
              {questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to item ${idx + 1}`}
                    className={`aspect-square rounded-[var(--radius-sm)] text-xs font-bold font-mono transition-all cursor-pointer border flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-bg bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] border-[var(--accent)]'
                        : isAnswered
                          ? 'bg-surface3 border-muted text-textMain'
                          : 'bg-bg border-border2 text-muted hover:border-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border2 flex flex-col gap-2">
            <Button fullWidth onClick={() => setShowSubmitConfirm(true)}>
              Submit exam
            </Button>
            <Button fullWidth variant="ghost" tone="danger" size="sm" onClick={() => setShowLeaveConfirm(true)}>
              Leave exam
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
