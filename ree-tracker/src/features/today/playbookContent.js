// The review playbook: what each review phase is for, a few tips for it, and
// what the study plan does in it. The tips are adapted from the CELE
// tracker's "Tips" sheet — one passer's review, told in Taglish — for the REE
// board, in plain words. Phases themselves are reviewPhase in @ree/shared.
import { PHASE_MOCK_EVERY } from '@ree/shared';

export const PLAYBOOK = {
  foundations: {
    aim: 'Learn each topic’s concepts before chasing volume.',
    tips: [
      'Concepts first. Follow the lecture or the chapter with your calculator, then solve its problems on your own afterwards.',
      'Write the formulas as you meet them. Your own handwriting is easier to find again than a printout.',
      'Tick each topic in Progress › Syllabus as you read and drill it, so the gaps show early.',
    ],
  },
  practice: {
    aim: 'Turn concepts into speed and accuracy.',
    tips: [
      'Start your past boards and review-center sets. Log each score with the time it took and the topics to improve.',
      'Clear your open mistakes and due reviews each day: Today’s loop does this.',
      'Keep a rest day or two each week. Rest is part of the plan.',
    ],
  },
  refresher: {
    aim: 'Intensity: full papers, preboards, and the board’s hours.',
    tips: [
      'Take preboards seriously. They’re made harder than the board, so a low score is a list of topics, not a verdict.',
      'Practise sitting four to six hours, and leave at least 30 minutes of each section for shading.',
      'Start studying at board hours: sleep by 10 PM and wake for the 8 AM start.',
      'Don’t measure your pace against anyone else’s.',
    ],
    center: 'When another book’s solution differs, trust your review center’s method first.',
  },
  final: {
    aim: 'Sharpen what you know. This isn’t the time for new topics.',
    tips: [
      'Put the formulas you still miss where you’ll see them every day, and only those.',
      'Sit timed mocks in the morning, and review every miss the same day.',
      'Keep the topics you dread small: one formula card at a time.',
    ],
    center: 'Go back over your review center’s handouts before anyone else’s.',
  },
  eve: {
    aim: 'Rest, and get everything ready.',
    tips: [
      'Light review only. Your plan has no drills these days.',
      'Lay out your PRC admission papers, ID, calculator and pencils the night before.',
      'Eat properly and sleep a full night. Skip the energy drinks.',
    ],
  },
  exam: {
    aim: 'You’ve done the work. Trust it.',
    tips: [
      'Eat breakfast. Pace each section by the clock, and leave time to shade.',
      'Skip a problem that stalls you and come back to it.',
    ],
  },
};

/** What the plan does in a phase, in one line. */
export function planLine(phaseId) {
  const every = PHASE_MOCK_EVERY[phaseId];
  if (!every) return 'Your plan keeps these days to light review.';
  return `Your plan puts a timed PRC sitting every ${every} study days${every < 7 ? ', closer together than earlier in your review' : ''}. Re-plan as you move into a new phase.`;
}
