// src/features/quiz-launcher/QuizRunPage.jsx
//
// /library/quiz?id=<id>: an imported quiz being taken, on its own route with the
// exam layout (like the simulator). It reads the quiz and its run from the device,
// so a reload or a closed tab comes back to the same place. No such quiz goes back
// to the list; a quiz with no run goes to its setup.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CaqRunner from './CaqRunner';
import { buildRun } from './quizRun';
import { clearRun, getQuiz, getRun, saveRun } from './quizStore';

const LIST = '/library?tab=quizzes';

export default function QuizRunPage() {
  const navigate = useNavigate();
  const uid = useAuth()?.currentUser?.uid;
  const [params] = useSearchParams();
  const id = params.get('id');
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let live = true;
    Promise.all([id ? getQuiz(uid, id) : null, id ? getRun(uid, id) : null]).then(([quiz, run]) => {
      if (live) setState({ status: 'ready', quiz: quiz || null, run: run || null });
    });
    return () => { live = false; };
  }, [uid, id]);

  if (state.status === 'loading') {
    return <div role="status" className="min-h-dvh flex items-center justify-center text-sm text-muted2">Opening your quiz…</div>;
  }
  if (!state.quiz) return <Navigate to={LIST} replace />;
  if (!state.run) return <Navigate to={`${LIST}&quiz=${encodeURIComponent(id)}`} replace />;

  const again = async (options) => {
    const run = buildRun(state.quiz.result.questions, state.run.setup, options);
    await saveRun(uid, id, run);
    setState((s) => ({ ...s, run }));
  };

  return (
    <CaqRunner
      // A new run is a new sitting: nothing carries over.
      key={state.run.startedAt}
      uid={uid}
      quiz={state.quiz}
      initialRun={state.run}
      onAgain={again}
      onLeave={() => navigate(LIST)}
      onDone={async () => { await clearRun(uid, id); navigate(LIST); }}
    />
  );
}
