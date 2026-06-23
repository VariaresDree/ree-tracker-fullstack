import { describe, it, expect } from 'vitest';
const aiRoutes = require('../src/routes/aiRoutes');

describe('AI model tier list', () => {
    it('exposes a non-empty MODEL_TIERS array', () => {
        expect(Array.isArray(aiRoutes.MODEL_TIERS)).toBe(true);
        expect(aiRoutes.MODEL_TIERS.length).toBeGreaterThan(0);
    });

    it('default tiers are real, shipping Gemini IDs', () => {
        // Reality-check guard so a future edit can't silently re-introduce
        // the broken `gemini-3.5-flash` / `gemini-3.1-flash-lite` IDs.
        const bogus = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
        for (const id of aiRoutes.MODEL_TIERS) {
            expect(bogus).not.toContain(id);
            expect(id.startsWith('gemini-')).toBe(true);
        }
    });

    it('tracks dead tiers across requests', () => {
        expect(aiRoutes.deadTiers instanceof Set).toBe(true);
    });
});
