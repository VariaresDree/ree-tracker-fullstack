// src/components/PomodoroOwner.jsx
//
// The Pomodoro's owner clock with nothing on screen, for the exam screens.
// The owner (usePomodoroClock({ owner: true })) is what ends a block on time:
// it switches focus/break and logs the finished focus block. MainLayout's
// FloatingPomodoro carries it everywhere else; the exam layout had none, so a
// block that ran out during a mock board or the Gauntlet never ended or
// logged until the learner left the exam. The exam stays distraction-free:
// nothing renders. Mounted by the exam pages (BoardSimulator, Gauntlet,
// Diagnostic), not by ExamLayout: imported quizzes share that layout and
// must never reach the store (quizLauncher.isolation.test).
import { usePomodoroClock } from '../hooks/usePomodoroClock';

export default function PomodoroOwner() {
  usePomodoroClock({ owner: true });
  return null;
}
