// src/features/assigned-exams/assignedExamsApi.js
//
// Assigned exams on the server (backend routes/adminAssignedExamRoutes.js).
// A slow timeout, because Render's free tier can take most of a minute to wake.
import { apiRequest } from '../../services/dbQueries';

const SLOW = 60_000;
const ADMIN = '/api/admin/assigned-exams';
const one = (id) => `${ADMIN}/${encodeURIComponent(id)}`;

export const listAdminExams = async () => (await apiRequest(ADMIN, 'GET', null, { timeoutMs: SLOW })).items;
export const getAdminExam = async (id) => (await apiRequest(one(id), 'GET', null, { timeoutMs: SLOW })).item;
/** `exam`: { title, description, questionIds, timeLimitSecs, status }. */
export const saveAdminExam = async (id, exam) => (
  await apiRequest(id ? one(id) : ADMIN, id ? 'PUT' : 'POST', exam, { timeoutMs: SLOW })
).item;
export const setAdminExamStatus = async (id, status) => (await apiRequest(one(id), 'PATCH', { status }, { timeoutMs: SLOW })).item;
export const deleteAdminExam = (id) => apiRequest(one(id), 'DELETE', null, { timeoutMs: SLOW });

// Learners (backend routes/assignedExamRoutes.js). The published list is shared
// by the Exams tab's badge and the Assigned tab, so a visit asks once: the
// request is kept for 30 s (a failure is dropped at once, to be asked again).
const LEARNER = '/api/assigned-exams';
const KEEP_MS = 30_000;
let listing = null;
export const listAssignedExams = ({ fresh = false } = {}) => {
  if (fresh || !listing || Date.now() - listing.at > KEEP_MS) {
    const promise = apiRequest(LEARNER, 'GET', null, { timeoutMs: SLOW }).then((r) => r.items);
    listing = { at: Date.now(), promise };
    promise.catch(() => { if (listing?.promise === promise) listing = null; });
  }
  return listing.promise;
};
/** Test seam. */
export function __resetAssignedExamList() {
  listing = null;
}

/** An exam's questions in the shape the simulator runs (features/exams/review/retake.js). */
export const getAssignedExamRun = async (id) => {
  const run = await apiRequest(`${LEARNER}/${encodeURIComponent(id)}/questions`, 'GET', null, { timeoutMs: SLOW });
  return {
    ...run,
    questions: run.questions.map((q) => ({
      ...q, subtopic: q.subtopic || 'General', question: q.text, explanation: q.fixedExplanation || null,
    })),
  };
};

export const getAdminExamResults = (id) => apiRequest(`${one(id)}/results`, 'GET', null, { timeoutMs: SLOW });
