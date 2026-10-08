// The pace line under syllabus coverage: what's left against the exam date.

/** "N topics to go and D days to the exam: about X a week", or null without a future exam date. */
export function paceLine(remaining, days) {
  if (days == null || days <= 0) return null;
  if (remaining <= 0) return 'Every topic covered. Keep them fresh with spaced review.';
  const perWeek = Math.ceil(remaining / Math.max(1, days / 7));
  return `${remaining} ${remaining === 1 ? 'topic' : 'topics'} to go and ${days} ${days === 1 ? 'day' : 'days'} to the exam: about ${perWeek} a week.`;
}
