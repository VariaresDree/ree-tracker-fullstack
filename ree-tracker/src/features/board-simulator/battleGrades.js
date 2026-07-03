// src/features/board-simulator/battleGrades.js
// Post-battle grading: battles run with sanitized questions (no answer keys),
// so the full diagnostics can only be computed once the server reveals the
// key at battle-complete. Pure function — unit-tested without React.

// `questions` are the session's mapped questions (userAnswer/userConf baked in
// at submit). `answerKey` is { [questionId]: answer } and `explanationKey` is
// { [questionId]: fixedExplanation }, both revealed by the server at
// battle-complete (sanitization strips them during play).
export function computeBattleDiagnostics({ questions, answerKey, explanationKey = {}, timeSpentPerQuestion = {}, timeTakenSecs = 0 }) {
  let correct = 0;
  const subjBreakdown = { Math: { c: 0, t: 0 }, ESAS: { c: 0, t: 0 }, EE: { c: 0, t: 0 } };
  const topicBreakdown = {};

  const mappedQuestions = (questions || []).map((q) => {
    const answer = answerKey?.[q.id] ?? q.answer ?? null;
    const isCorrect = q.userAnswer != null && q.userAnswer === answer;
    if (isCorrect) correct++;

    const sKey = q.subject === 'Mathematics' ? 'Math' : q.subject;
    if (subjBreakdown[sKey]) {
      subjBreakdown[sKey].t += 1;
      if (isCorrect) subjBreakdown[sKey].c += 1;
    }

    if (!topicBreakdown[q.subtopic]) topicBreakdown[q.subtopic] = { t: 0, c: 0 };
    topicBreakdown[q.subtopic].t += 1;
    if (isCorrect) topicBreakdown[q.subtopic].c += 1;

    const fixedExplanation = explanationKey?.[q.id] ?? q.fixedExplanation ?? null;
    return {
      ...q,
      answer,
      fixedExplanation,
      // `explanation` alias kept in sync — some review surfaces read it.
      explanation: fixedExplanation ?? q.explanation ?? null,
    };
  });

  const totalItems = mappedQuestions.length;
  const score = totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0;
  const verdict = score >= 70 ? 'PASSED' : (score >= 60 ? 'CONDITIONAL PASS' : 'FAILED');

  const subjectScores = {
    Math: subjBreakdown.Math.t > 0 ? Math.round((subjBreakdown.Math.c / subjBreakdown.Math.t) * 100) : null,
    ESAS: subjBreakdown.ESAS.t > 0 ? Math.round((subjBreakdown.ESAS.c / subjBreakdown.ESAS.t) * 100) : null,
    EE: subjBreakdown.EE.t > 0 ? Math.round((subjBreakdown.EE.c / subjBreakdown.EE.t) * 100) : null,
  };

  return {
    mappedQuestions,
    diagnostics: {
      score,
      verdict,
      timeTakenSecs,
      subjectScores,
      weakTopics: Object.entries(topicBreakdown).filter(([, d]) => d.t > 0 && (d.c / d.t) < 0.6).map(([t]) => t),
      totalItems,
      correctItems: correct,
      chronoAnomalies: mappedQuestions.filter((_, idx) => (timeSpentPerQuestion[idx] || 0) > 180000),
      blindSpots: mappedQuestions.filter((q) => q.userConf === 'HIGH' && q.userAnswer !== q.answer),
    },
  };
}
