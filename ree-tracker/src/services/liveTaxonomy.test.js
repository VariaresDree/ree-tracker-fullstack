import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchDynamicTOS = vi.fn();
vi.mock('./dbQueries', () => ({ fetchDynamicTOS: (...a) => fetchDynamicTOS(...a) }));

const setDynamicTOS = vi.fn();
vi.mock('../store/useStore', () => ({ useStore: { getState: () => ({ setDynamicTOS }) } }));

const { refreshLiveTOS } = await import('./liveTaxonomy');

const LIVE = { EE: ['Electric Circuits 1', 'Electrical Transient Analysis'], ESAS: ['Fluid Mechanics'], Mathematics: ['Algebra'] };

describe('refreshLiveTOS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies the live taxonomy to the store and returns it', async () => {
    fetchDynamicTOS.mockResolvedValue(LIVE);
    await expect(refreshLiveTOS()).resolves.toEqual(LIVE);
    expect(setDynamicTOS).toHaveBeenCalledWith(LIVE);
  });

  it.each([
    ['a failed fetch', null],
    ['an empty map', {}],
    ['a map with no topics', { EE: [] }],
    ['a malformed payload', ['EE']],
  ])('keeps the current list on %s', async (_label, payload) => {
    fetchDynamicTOS.mockResolvedValue(payload);
    await expect(refreshLiveTOS()).resolves.toBeNull();
    expect(setDynamicTOS).not.toHaveBeenCalled();
  });
});
