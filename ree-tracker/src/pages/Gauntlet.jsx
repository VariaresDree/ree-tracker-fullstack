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
import ExamLayout from '../layouts/ExamLayout';
import ExamNavigator from '../components/exam/ExamNavigator';
import ExamTimer from '../components/exam/ExamTimer';
import { formatExamTime } from '../utils/examFormat';
import { Button, Modal, EmptyState, Badge, StatusPill } from '../components/ui';
import { TriangleAlert } from '../components/ui/icons';

export default function Gauntlet() {
  const { level } = useParams();
  const navigate = useNavigate();
  const {
    status, questions, answers, confidences, timeLeft, diagnostics,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTime, setShowTime] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
    return <GauntletDiagnostics diagnostics={diagnostics} level={level} questions={questions} answers={answers} formatTime={formatExamTime} navigate={navigate} />;
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Adopts the Board Simulator's exam chrome: ExamLayout + a top toolbar with a
  // show/hide timer, the shared horizontal ExamNavigator, the shared
  // QuestionCard, and linear + submit controls.
  return (
    <ExamLayout>
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

      <div className="flex flex-col gap-4 pb-8">
        {/* Top toolbar — exit / level / answered count / timer (mirrors Simulator) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface/90 backdrop-blur-xl border border-border2/60 px-4 py-3 rounded-[var(--radius-lg)] shadow-sm sticky top-4 z-50">
          <Button variant="ghost" tone="danger" size="sm" onClick={() => setShowLeaveConfirm(true)}>
            Exit exam
          </Button>
          <div className="flex items-center gap-3">
            <Badge tone="velocity" className="hidden sm:inline-flex">Level {level}</Badge>
            <StatusPill tone="success" className="hidden sm:inline-flex tabular-nums">
              {answeredCount} of {questions.length} answered
            </StatusPill>
            <ExamTimer timeRemaining={timeLeft} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} />
          </div>
        </div>

        {/* Horizontal 1-N navigator (shared) */}
        <ExamNavigator
          count={questions.length}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          isAnswered={(idx) => answers[idx] !== undefined}
        />

        {/* Exam canvas — shared QuestionCard. Confidence shown (silent MED
            default under time pressure) so gauntlet attempts feed calibration. */}
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
            onConfidenceChange={(lvl) => handleConfidence?.(currentIndex, lvl)}
          />
        </div>

        {/* Controls: previous / next / submit */}
        <div className="flex justify-between items-center gap-3">
          <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))} disabled={currentIndex === 0}>
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.min(questions.length - 1, c + 1))} disabled={currentIndex === questions.length - 1}>
              Next
            </Button>
            <Button onClick={() => setShowSubmitConfirm(true)}>
              Submit exam
            </Button>
          </div>
        </div>
      </div>
    </ExamLayout>
  );
}
