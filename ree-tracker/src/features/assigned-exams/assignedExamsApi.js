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
