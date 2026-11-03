// Admin › AI models: one row a feature, with healthy backups as a name in a line
// and any model in trouble called out with its reason.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const STATUS = {
  checkedAt: '2026-10-27T12:00:00Z',
  providers: {
    groq: { label: 'Groq', envKey: 'GROQ_API_KEY', configured: true, catalog: { ok: true, models: 20, free: 20 } },
    openrouter: { label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY', configured: true },
    cerebras: { label: 'Cerebras', envKey: 'CEREBRAS_API_KEY', configured: false },
  },
  tasks: {
    report: {
      label: 'AI board report',
      audience: 'learner',
      tier: 'fast',
      state: 'ok',
      primary: { model: 'openai/gpt-oss-20b', providerLabel: 'Groq' },
      perModelTimeoutMs: 12000,
      budgetMs: 30000,
      chain: [
        { id: 'a', model: 'openai/gpt-oss-20b', providerLabel: 'Groq', state: 'ok', calls: 4, medianMs: 1100, successRate: 1 },
        {
          id: 'b',
          model: 'google/gemma-4-31b-it:free',
          picked: true,
          providerLabel: 'OpenRouter',
          state: 'down',
          calls: 3,
          medianMs: null,
          successRate: 0,
          lastError: { kind: 'rate_limited', message: 'OpenRouter 429: Provider returned error' },
        },
        { id: 'c', model: 'gemini-2.5-flash', providerLabel: 'Google Gemini', state: 'ok', calls: 2, medianMs: 800, successRate: 0.5 },
      ],
    },
  },
};

vi.mock('../../../hooks/useAiStatus', () => ({
  useAiStatus: () => ({ status: STATUS, refresh: vi.fn() }),
  setAiStatus: vi.fn(),
}));
vi.mock('../../../services/geminiApi', () => ({ probeAiModels: vi.fn() }));

const { default: AiStatusPanel } = await import('./AiStatusPanel');

describe('AiStatusPanel', () => {
  it('is one row a feature, not a card a feature and a row a model', () => {
    const { container } = render(<AiStatusPanel />);
    expect(container.querySelectorAll('[data-feature-row]')).toHaveLength(1);
    expect(container.querySelector('[data-chain-row]')).toBeNull();
    const row = container.querySelector('[data-feature-row]');
    expect(within(row).getByText('AI board report')).toBeInTheDocument();
    expect(row).toHaveTextContent('Learners, speed first');
    expect(within(row).getByText('Working')).toBeInTheDocument();
  });

  it('says who answers now and how it’s doing, and who’s next', () => {
    render(<AiStatusPanel />);
    const now = screen.getByText(/Answering now:/);
    expect(now).toHaveTextContent('Answering now: openai/gpt-oss-20b on Groq · 1.1 s median, 100% · up to 12.0 s each, 30.0 s in all');
    expect(now.className).toMatch(/\[overflow-wrap:anywhere\]/);
    expect(screen.getByText(/^Then:/)).toHaveTextContent('Then: google/gemma-4-31b-it:free (picked, down, 0%), gemini-2.5-flash (800 ms, 50%)');
  });

  it('still shows a failure, with the model and its reason, and none for a healthy model', () => {
    const { container } = render(<AiStatusPanel />);
    const errors = container.querySelectorAll('[data-chain-error]');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toHaveTextContent('google/gemma-4-31b-it:free: rate limited (OpenRouter 429: Provider returned error)');
  });

  it('lists the providers, and says which have no key', () => {
    render(<AiStatusPanel />);
    const providers = screen.getByRole('heading', { name: 'Providers' }).closest('section');
    expect(within(providers).getAllByRole('listitem')).toHaveLength(3);
    expect(within(providers).getByText(/Key works, 20 models offered, 20 free/)).toBeInTheDocument();
    expect(within(providers).getByText(/No key on the server/)).toHaveTextContent('CEREBRAS_API_KEY');
  });

  it('wraps a key name at its underscores, and it still reads (and copies) exactly', () => {
    const { container } = render(<AiStatusPanel />);
    const key = [...container.querySelectorAll('[data-env-key]')].find((el) => el.textContent === 'CEREBRAS_API_KEY');
    expect(key).toBeTruthy();
    expect(key.querySelectorAll('wbr')).toHaveLength(2);
    expect(key.className).not.toMatch(/overflow-wrap:anywhere/);
  });
});
