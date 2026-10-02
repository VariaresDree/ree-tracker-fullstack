// src/features/active-recall/presets.js
//
// Session presets other screens launch Active Review with (passed as
// `navigate('/review', { state: { preset } })`; ActiveReview auto-starts it).
// Stated once — the dashboard, the Today panel, the analytics deep dive and the
// placement result each used to spell these objects out by hand.

const BASE = {
  sessionMode: 'mcq',
  studyMode: 'interleaved',
  subject: 'All',
  subtopic: 'All',
  cognitiveFocus: 'mixed',
};

/** A mixed library set across every subject. */
export const quickReviewPreset = (count = 20) => ({ ...BASE, count, source: 'library' });

/** The spaced-review queue (engine/srs). */
export const dueReviewPreset = (count = 20) => ({ ...BASE, count, source: 'srs-due' });

/**
 * The targeted, adaptive drill (routes/smartDrillRoutes). With no topic it
 * drills the weakest topics; `mode: 'blind-spot'` leads with confident misses.
 */
export const drillPreset = ({ topicId, topic, subject, mode, count = 10 } = {}) => ({
  ...BASE,
  studyMode: 'bleeding',
  count,
  source: 'smart-drill',
  drillTopicId: topicId || null,
  drillTopic: topic || null,
  drillSubject: subject || null,
  drillMode: mode || null,
});
