// Ability (θ, the IRT estimate on −4…4) as the percent Today's readiness
// breakdown shows (server readinessService.normalizeTheta): one scale for
// learners everywhere. Progress, Rankings and Milestones showed raw θ ("θ 0.04",
// "θ of 2.0") while Today said "Ability 50%" for the same number.
const THETA_MIN = -4;
const THETA_MAX = 4;

/** θ → 0…100, rounded; 50 when unknown, as the server reads no evidence. */
export function abilityPercent(theta) {
  const t = Number(theta);
  if (!Number.isFinite(t)) return 50;
  return Math.round(Math.min(1, Math.max(0, (t - THETA_MIN) / (THETA_MAX - THETA_MIN))) * 100);
}
