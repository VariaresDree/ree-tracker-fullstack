// Admin › AI models. A long model id with a failure line used to collapse
// to a one-character column (the row was a single-line flex row with a
// basis-0 name and a basis-full error that never wrapped). The rows are now a
// grid on the list's own width, with the failure on its own line.
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
  it('lays each model out on a grid sized by the list, with a failure on its own line', () => {
    const { container } = render(<AiStatusPanel />);
    const rows = container.querySelectorAll('[data-chain-row]');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      // Narrow: number + name; one line from the list's own 42rem.
      expect(row.className).toMatch(/\bgrid grid-cols-\[1rem_minmax\(0,1fr\)\]/);
      expect(row.className).toMatch(/@2xl:grid-cols-\[/);
      expect(row.className).not.toMatch(/\b(sm|md|lg):flex-row\b/);
    }
    expect(rows[0].closest('ol')).toHaveClass('@container');

    const failing = rows[1];
    expect(within(failing).getByText(/google\/gemma-4-31b-it:free/)).toBeInTheDocument();
    const error = failing.querySelector('[data-chain-error]');
    expect(error).toHaveTextContent('Last failure: rate limited (OpenRouter 429: Provider returned error)');
    expect(error.className).toMatch(/\[grid-column:2\/-1\]/);
    expect(within(failing).getByText('Down')).toBeInTheDocument();
    // A healthy model has no failure line.
    expect(rows[0].querySelector('[data-chain-error]')).toBeNull();
  });

  it('shows each provider as a card on the shared grid, and says which have no key', () => {
    render(<AiStatusPanel />);
    const providers = screen.getByRole('heading', { name: 'Providers' }).closest('section');
    const items = within(providers).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass('surface-glass');
    expect(within(providers).getByText('No key on the server')).toBeInTheDocument();
    expect(within(providers).getByText(/Set CEREBRAS_API_KEY/)).toBeInTheDocument();
  });

  it('wraps a key name at its underscores, and it still reads (and copies) exactly', () => {
    const { container } = render(<AiStatusPanel />);
    const key = [...container.querySelectorAll('[data-env-key]')].find((el) => el.textContent === 'OPENROUTER_API_KEY');
    expect(key).toBeTruthy();
    expect(key.querySelectorAll('wbr')).toHaveLength(2);
    expect(key.className).not.toMatch(/overflow-wrap:anywhere/);
  });

  it('lets a long model id wrap in the "answering now" line', () => {
    render(<AiStatusPanel />);
    expect(screen.getByText(/Answering now:/).className).toMatch(/\[overflow-wrap:anywhere\]/);
  });
});
