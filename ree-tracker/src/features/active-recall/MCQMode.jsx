// src/features/active-recall/MCQMode.jsx
//
// Thin wrapper around the shared QuestionCard. Active Review's per-question
// flow requires confidence before answering (so the calibration analytics
// always has a value), reveals the correct answer immediately after the user
// locks in a choice, and lets the parent attach the reference panel + AI
// explanation below.
//
// The big duplicated JSX (confidence row, A-D options, correct/incorrect
// reveal) used to live here AND in SimulatorActive AND in Gauntlet. It all
// moved into QuestionCard so the four answering surfaces share semantics.

import toast from 'react-hot-toast';
import QuestionCard from '../quiz/QuestionCard';

// ReferencePanel intentionally NOT rendered here — Reference Constants
// during an active answer phase functions as a cheat code that compromises
// the calibration analytics. The panel is still available on demand from
// the Materials Hub / sidebar where it doesn't undermine the assessment.
export default function MCQMode({ session, setSession, handleAnswerSelection, index, headerSlot }) {
  const currentQ = session.questions[session.currentIndex];
  if (!currentQ) return null;

  return (
    <div className="flex flex-col gap-6 relative z-10 animate-in fade-in">
      <QuestionCard
        question={currentQ}
        selectedOption={session.selectedOption}
        confidence={session.confidence}
        state={session.isAnswered ? 'reviewing' : 'answering'}
        showConfidence={true}
        requireConfidence={true}
        hotkeys={true}
        index={index}
        headerSlot={headerSlot}
        onSelect={handleAnswerSelection}
        onConfidenceChange={(level) => setSession((prev) => ({ ...prev, confidence: level }))}
        onConfidenceRequiredBlocked={() => toast.error('Pick a confidence level first.')}
      />
    </div>
  );
}
