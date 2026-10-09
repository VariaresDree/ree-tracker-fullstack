// src/features/quiz-launcher/QuizRunPage.jsx
//
// /library/quiz — the imported quiz being run, on its own route with the exam
// layout (like the simulator). No quiz loaded (a reload, a stale link) goes
// back to Library › Imported quizzes.
import { Navigate, useNavigate } from 'react-router-dom';
import CaqRunner from './CaqRunner';
import { setActiveQuiz, useQuizSession } from './quizSession';

const BACK = '/library?tab=quizzes';

export default function QuizRunPage() {
  const navigate = useNavigate();
  const { active } = useQuizSession();
  if (!active) return <Navigate to={BACK} replace />;
  return (
    <CaqRunner
      fileName={active.fileName}
      questions={active.result.questions}
      warnings={active.result.warnings}
      onExit={() => { setActiveQuiz(null); navigate(BACK); }}
    />
  );
}
