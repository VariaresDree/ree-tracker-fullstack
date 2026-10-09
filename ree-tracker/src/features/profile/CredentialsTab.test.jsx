// The certificate unlocks on the real Board Readiness Index only. It used to
// fall back to an ability-only (θ+3)/6 figure while the score loaded or when it
// couldn't, so it could unlock on a number Today never showed.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../services/dbQueries', () => ({ fetchReadinessScore: vi.fn() }));
vi.mock('../../utils/certificateEngine', () => ({ generateCertificate: vi.fn(() => Promise.resolve()) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { loading: vi.fn(), success: vi.fn(), error: vi.fn() }) }));

const { fetchReadinessScore } = await import('../../services/dbQueries');
const { default: CredentialsTab } = await import('./CredentialsTab');

beforeEach(() => vi.clearAllMocks());

describe('Readiness certificate', () => {
  it('unlocks at a readiness of 70', async () => {
    fetchReadinessScore.mockResolvedValue({ score: 74 });
    render(<CredentialsTab currentUser={{ uid: 'u1' }} />);
    expect(await screen.findByRole('button', { name: /Download certificate/ })).toBeEnabled();
  });

  it('stays locked below 70 and says where it stands', async () => {
    fetchReadinessScore.mockResolvedValue({ score: 52 });
    render(<CredentialsTab currentUser={{ uid: 'u1' }} />);
    expect(await screen.findByText('Readiness 52 of 70')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlocks at readiness 70/ })).toBeDisabled();
  });

  it('never unlocks on a stand-in when the score can’t load', async () => {
    fetchReadinessScore.mockRejectedValue(new Error('[OFFLINE]'));
    render(<CredentialsTab currentUser={{ uid: 'u1' }} />);
    expect(await screen.findByText(/needs a connection/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download certificate/ })).not.toBeInTheDocument();
  });
});
