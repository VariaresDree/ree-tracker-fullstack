const { z } = require('zod');

// POST /api/readiness/snapshot — all inputs are bounded so a forged payload
// can't wedge nonsense (score: 1e9, ratios > 1, theta outside the IRT scale)
// into the readiness history charts.
const readinessSnapshotSchema = z.object({
    score: z.number().min(0).max(100).default(0),
    topicCoverage: z.number().min(0).max(1).default(0),
    accuracyRate: z.number().min(0).max(1).default(0),
    theta: z.number().min(-4).max(4).default(0),
    consistency: z.number().min(0).max(1).default(0),
    blindSpotRatio: z.number().min(0).max(1).default(0),
});

module.exports = { readinessSnapshotSchema };
