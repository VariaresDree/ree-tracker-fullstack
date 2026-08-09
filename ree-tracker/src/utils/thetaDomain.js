// src/utils/thetaDomain.js
// Y-axis domain for the ability (θ) trajectory chart.
//
// The chart previously hardcoded domain={[-4, 4]} — the full theoretical 3PL
// range. Real ability histories occupy a small slice of that (a typical user
// sits in the 1–2 band), so the plotted line was compressed into a narrow
// horizontal ribbon with ~60% of the plot area permanently empty.
//
// Naively auto-scaling to the data would fill the space but lie about
// progress: a flat history with ±0.05 of noise would render as dramatic
// peaks and troughs. So the domain is fitted to the data but constrained:
//
//   - the pass cutoff (θ=0) and readiness marker (θ=1) are ALWAYS in view,
//     since the chart draws ReferenceLines at both and a window that
//     excluded them would strand a line outside the plot;
//   - a minimum span stops small fluctuations from being magnified;
//   - the result is clamped to the theoretical ±4 bounds and snapped to
//     half-units so the auto-generated ticks read cleanly.

// Theoretical bounds of the 3PL θ scale used throughout the app.
const THETA_MIN = -4;
const THETA_MAX = 4;
// Never show a window narrower than this — the anti-noise-magnification floor.
const MIN_SPAN = 2;
// Reference lines the chart draws; keeping them in-domain keeps them meaningful.
const REFERENCE_LINES = [0, 1];
// Breathing room so the line/area never touches the top or bottom edge.
const PADDING = 0.4;

/**
 * Compute a [min, max] Y domain for a set of θ values.
 *
 * @param {number[]} values θ values actually plotted
 * @returns {[number, number]} domain, always including θ=0 and θ=1
 */
export function computeThetaDomain(values) {
    const nums = (values || []).filter((v) => Number.isFinite(v));
    // No usable data — show the full scale rather than inventing a window.
    if (nums.length === 0) return [THETA_MIN, THETA_MAX];

    let lo = Math.min(...nums, ...REFERENCE_LINES) - PADDING;
    let hi = Math.max(...nums, ...REFERENCE_LINES) + PADDING;

    // Widen symmetrically about the midpoint if the fitted window is too tight.
    if (hi - lo < MIN_SPAN) {
        const mid = (lo + hi) / 2;
        lo = mid - MIN_SPAN / 2;
        hi = mid + MIN_SPAN / 2;
    }

    lo = Math.max(THETA_MIN, lo);
    hi = Math.min(THETA_MAX, hi);

    // Snap outward to half-units for readable tick labels.
    return [Math.floor(lo * 2) / 2, Math.ceil(hi * 2) / 2];
}
