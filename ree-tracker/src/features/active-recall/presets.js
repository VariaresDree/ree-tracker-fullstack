// src/features/active-recall/presets.js
//
// Session presets other screens start Practice with: launchPractice(navigate,
// preset) goes to /practice with { state: { preset } }, and Practice
// auto-starts it. Stated once — Today, Progress, the planner and the
// placement result each used to spell these objects (and the route) by hand.

/** Start a practice session from anywhere. */
export const launchPractice = (navigate, preset) => navigate('/practice', { state: { preset } });

const BASE = {
  sessionMode: 'mcq',
  studyMode: 'interleaved',
  subject: 'All',
  subtopic: 'All',
  cognitiveFocus: 'mixed',
};

/** A mixed library set across every subject. */
export const quickReviewPreset = (count = 20) => ({ ...BASE, count, source: 'library' });

/** The learner's bookmarked questions, newest first. */
export const bookmarksPreset = (count = 20) => ({ ...BASE, count, source: 'bookmarks' });

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

/**
 * Today's loop (GET /api/user/today-loop): due reviews and open mistakes in
 * the server's order, by board weight. Started from Today with the loop it
 * already loaded; without one it asks for it. The summary then points to the
 * formula cards due.
 */
export const todayLoopPreset = (loop = null) => ({
  ...BASE,
  count: loop?.items?.length || 25,
  source: 'today-loop',
  items: loop?.items || null,
  cardsDue: loop?.cardsDue || 0,
});

/**
 * A fixed set of questions, e.g. the items missed in a past sitting (Exams ›
 * Past sittings › Review › Practise missed). The questions travel with the
 * preset, so it works offline once they are on screen.
 */
export const itemsPreset = (items = []) => ({ ...BASE, count: items.length, source: 'items', items });
