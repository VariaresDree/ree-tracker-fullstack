// A forecast that failed to load while the server was asleep used to stay
// empty until a reload. It now loads again when the server is back.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const fetchForecast = vi.fn();
vi.mock('../services/dbQueries', () => ({ fetchForecast: (...a) => fetchForecast(...a), recomputeForecast: vi.fn() }));

import { useForecast, __resetForecastInFlight } from './useForecast';
import { __resetConnection, noteNetworkFailure, noteBackendAnswered } from '../services/connection';

beforeEach(() => {
  __resetConnection();
  __resetForecastInFlight();
  fetchForecast.mockReset();
});

describe('useForecast', () => {
  it('fetches again when the server answers after an outage', async () => {
    fetchForecast.mockResolvedValueOnce(null).mockResolvedValueOnce({ snapshot: { passProbability: 0.6 } });
    const { result } = renderHook(() => useForecast());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshot).toBeNull();

    act(() => { noteNetworkFailure(); noteBackendAnswered(); });
    await waitFor(() => expect(result.current.snapshot).toEqual({ passProbability: 0.6 }));
    expect(fetchForecast).toHaveBeenCalledTimes(2);
  });

  it('keeps the forecast it has when a later fetch fails', async () => {
    fetchForecast.mockResolvedValueOnce({ snapshot: { passProbability: 0.6 } }).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useForecast());
    await waitFor(() => expect(result.current.snapshot).toEqual({ passProbability: 0.6 }));
    act(() => { noteNetworkFailure(); noteBackendAnswered(); });
    await waitFor(() => expect(fetchForecast).toHaveBeenCalledTimes(2));
    expect(result.current.snapshot).toEqual({ passProbability: 0.6 });
  });
});
