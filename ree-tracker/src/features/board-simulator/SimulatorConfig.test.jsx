// The mock-board setup's "Print this paper": it draws a set, saves it, and
// opens the print preview. Not for the full board or an AI-written mock.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
// The store persists through idb-keyval; in memory here.
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));
const createPrintedSetFromConfig = vi.fn();
vi.mock('../paper-sets/printedSetsApi', () => ({ createPrintedSetFromConfig: (...a) => createPrintedSetFromConfig(...a) }));

const { useStore } = await import('../../store/useStore');
const { default: SimulatorConfig } = await import('./SimulatorConfig');
const { AI_SOURCE_MESSAGE } = await import('../exam-export/drawExamPaper');

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false },
    'html-has-lang': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
    'document-title': { enabled: false },
  },
};

const PRC_EE = { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' };
const CUSTOM_AI = { mode: 'subject', subject: 'EE', subtopic: 'All', isPrcStandard: false, count: 20, source: 'ai', cognitiveFocus: 'mixed' };

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

const renderConfig = (config = PRC_EE, props = {}) => render(
  <MemoryRouter initialEntries={['/simulator']}>
    <Routes>
      <Route path="/simulator" element={(
        <SimulatorConfig
          config={config}
          setConfig={vi.fn()}
          session={{ loading: false }}
          startSimulation={vi.fn()}
          engine={{ hasSavedSession: false }}
          {...props}
        />
      )} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  createPrintedSetFromConfig.mockReset();
  useStore.setState({ dynamicTOS: { EE: ['Protection'], ESAS: ['Chemistry'], Mathematics: ['Calculus'] } });
});

describe('SimulatorConfig: Print this paper', () => {
  it('saves a set from the setup and opens its print preview', async () => {
    const user = userEvent.setup();
    createPrintedSetFromConfig.mockResolvedValue({ set: { id: 'K7P29QXAM3TD' }, status: 'sent' });
    renderConfig();
    const button = screen.getByRole('button', { name: 'Print this paper' });
    expect(button).toHaveAccessibleDescription(/an answer sheet you can scan to score/);
    expect(screen.queryByRole('button', { name: /Print or export/ })).toBeNull();
    await user.click(button);
    expect(createPrintedSetFromConfig).toHaveBeenCalledWith(PRC_EE);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/print/K7P29QXAM3TD'));
  });

  it('says why a paper couldn\u2019t be made, and lets you try again', async () => {
    const user = userEvent.setup();
    createPrintedSetFromConfig.mockRejectedValue(Object.assign(new Error('No questions match these settings yet.'), { name: 'ExportError' }));
    renderConfig();
    await user.click(screen.getByRole('button', { name: 'Print this paper' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No questions match these settings yet.');
    expect(screen.getByRole('button', { name: 'Print this paper' })).toBeEnabled();
  });

  it('an AI-written mock can\u2019t be printed, and says so', () => {
    renderConfig(CUSTOM_AI);
    const button = screen.getByRole('button', { name: 'Print this paper' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(AI_SOURCE_MESSAGE);
  });

  it('the full board prints one section at a time', () => {
    renderConfig(PRC_EE, { initialProfile: 'prc_full' });
    const button = screen.getByRole('button', { name: 'Print this paper' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/Print one section at a time/);
  });

  it('has no axe violations', async () => {
    renderConfig();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });
});
