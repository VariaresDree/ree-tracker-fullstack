// Small numerics shared by the engine. Kept dep-free so the bundle stays
// disciplined and we can run the engine in any Node runtime.

'use strict';

/**
 * Abramowitz & Stegun erf approximation (max error ~1.5e-7).
 * Sufficient for forecasting and confidence-band math; not for cryptography.
 */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t) *
      Math.exp(-ax * ax);
  return sign * y;
}

module.exports = { erf };
