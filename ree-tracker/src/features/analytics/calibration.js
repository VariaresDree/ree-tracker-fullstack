// Confidence-calibration math. Pure functions so this can be tested or run
// in a Web Worker if attempt logs get large.
//
// We treat each `QuestionAttempt.confidenceLevel` as a self-reported
// probability the user assigned to being correct. Mapping is:
//   LOW    → 0.25
//   MED    → 0.55
//   HIGH   → 0.85
// Adjustable below — these are conservative midpoints for a 3-tier scale.

export const CONFIDENCE_MAP = { LOW: 0.25, MED: 0.55, HIGH: 0.85 };

// Bin attempts into reliability buckets and return per-bin stats for plotting
// the calibration curve. Each bin reports the average reported confidence vs
// the observed accuracy in that bin.
export function buildCalibrationCurve(attempts, bins = 5) {
  if (!attempts || attempts.length === 0) return { points: [], n: 0 };
  const edges = Array.from({ length: bins }, (_, i) => i / bins);
  const buckets = edges.map(() => ({ sumConf: 0, correct: 0, n: 0 }));

  for (const a of attempts) {
    const p = mapConfidence(a.confidenceLevel);
    if (p == null) continue;
    const idx = Math.min(bins - 1, Math.floor(p * bins));
    buckets[idx].sumConf += p;
    buckets[idx].correct += a.isCorrect ? 1 : 0;
    buckets[idx].n += 1;
  }

  const points = buckets
    .map((b) => (b.n > 0 ? { confidence: b.sumConf / b.n, accuracy: b.correct / b.n, n: b.n } : null))
    .filter(Boolean);

  return { points, n: attempts.length };
}

// Brier score — lower is better, range [0, 1]. Bench: 0.0 = perfect,
// 0.25 = random guessing on binary.
export function brierScore(attempts) {
  if (!attempts || attempts.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const a of attempts) {
    const p = mapConfidence(a.confidenceLevel);
    if (p == null) continue;
    const o = a.isCorrect ? 1 : 0;
    sum += (p - o) ** 2;
    n += 1;
  }
  return n > 0 ? sum / n : null;
}

// Expected Calibration Error — weighted gap between confidence and accuracy
// across bins. Lower is better.
export function expectedCalibrationError(attempts, bins = 5) {
  const curve = buildCalibrationCurve(attempts, bins);
  if (curve.points.length === 0) return null;
  const total = curve.n;
  let ece = 0;
  for (const p of curve.points) ece += (p.n / total) * Math.abs(p.confidence - p.accuracy);
  return ece;
}

function mapConfidence(level) {
  if (!level) return null;
  return CONFIDENCE_MAP[String(level).toUpperCase()] ?? null;
}
