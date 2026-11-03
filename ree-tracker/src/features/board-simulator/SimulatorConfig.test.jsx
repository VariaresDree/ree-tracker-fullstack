// The mock-board setup: the format switch, how questions are picked, and "Print
// this paper", which draws a set, saves it and opens the print preview. Not for
// the full board or an AI-written mock.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
const drawPrefs = { prefs: { drawMode: 'even', ownCounts: {} }, save: vi.fn(async () => 'sent') };
vi.mock('./useDrawPrefs', () => ({ useDrawPrefs: () => drawPrefs }));
const fetchBoardGroups = vi.fn();
vi.mock('../../services/dbQueries', async (importOriginal) => ({ ...(await importOriginal()), fetchBoardGroups }));
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
  drawPrefs.prefs = { drawMode: 'even', ownCounts: {} };
  drawPrefs.save.mockClear();
  fetchBoardGroups.mockReset();
  fetchBoardGroups.mockResolvedValue({ EE: [{ items: 60, topics: ['Protection'] }, { items: 40, topics: ['Machines'] }] });
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
    expect(createPrintedSetFromConfig).toHaveBeenCalledWith({ ...PRC_EE, drawMode: 'even', ownCounts: {} });
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

describe('SimulatorConfig: the format', () => {
  it('opens on the format chosen in Exams, and switches without a second page of cards', async () => {
    const user = userEvent.setup();
    const setConfig = vi.fn();
    renderConfig(PRC_EE, { setConfig });
    const format = screen.getByRole('radiogroup', { name: 'Format' });
    expect(within(format).getByRole('radio', { name: 'One subject' })).toBeChecked();
    expect(within(format).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Full board', 'Mixed', 'One subject', 'Custom']);
    await user.click(within(format).getByRole('radio', { name: 'Mixed' }));
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ mode: 'blended', isPrcStandard: true }));
  });

  it('the full board asks nothing a custom mock does, whatever the setup last held', () => {
    renderConfig(CUSTOM_AI, { initialProfile: 'prc_full' });
    for (const name of ['Subject', 'Number of questions', 'Question source']) expect(screen.queryByRole('radiogroup', { name })).toBeNull();
    expect(screen.queryByLabelText('Topic')).toBeNull();
    // An AI source left in the setup doesn't apply to it, so the choice still shows.
    expect(screen.getByRole('radiogroup', { name: 'How questions are picked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print this paper' })).toHaveAccessibleDescription(/Print one section at a time/);
  });

  it('a subject chip covers the whole subject, not its first topic', async () => {
    const user = userEvent.setup();
    const setConfig = vi.fn();
    renderConfig(PRC_EE, { setConfig });
    await user.click(screen.getByRole('radio', { name: 'ESAS' }));
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ subject: 'ESAS', subtopic: 'All' }));
  });

  it('shows the board’s time as one line, and hides Subject on a mixed paper', () => {
    renderConfig(PRC_EE);
    expect(screen.getByText('06:00:00').closest('p')).toHaveTextContent('fixed by PRC board rules');
    expect(screen.queryByRole('radiogroup', { name: 'Number of questions' })).toBeNull();
    document.body.innerHTML = '';
    renderConfig({ ...PRC_EE, mode: 'blended', subject: 'blended' });
    expect(screen.queryByRole('radiogroup', { name: 'Subject' })).toBeNull();
  });
});

describe('SimulatorConfig: how questions are picked', () => {
  const picker = () => screen.getByRole('radiogroup', { name: 'How questions are picked' });
  const CUSTOM = { mode: 'subject', subject: 'EE', subtopic: 'All', isPrcStandard: false, count: 20, source: 'library', cognitiveFocus: 'mixed' };

  it('starts on an even spread, and doesn’t ask for the board’s counts', () => {
    renderConfig();
    expect(within(picker()).getByRole('radio', { name: 'Even spread' })).toBeChecked();
    expect(screen.getByText('About the same number from every topic.')).toBeInTheDocument();
    expect(fetchBoardGroups).not.toHaveBeenCalled();
  });

  it('saves a new choice on the account', async () => {
    const user = userEvent.setup();
    renderConfig();
    await user.click(within(picker()).getByRole('radio', { name: 'Board’s counts' }));
    expect(drawPrefs.save).toHaveBeenCalledWith({ drawMode: 'board' });
  });

  it('Board’s counts shows the subject’s shares, largest first', async () => {
    drawPrefs.prefs = { drawMode: 'board', ownCounts: {} };
    renderConfig();
    expect(await screen.findByRole('img', { name: 'EE. Protection: 60. Machines: 40' })).toBeInTheDocument();
    expect(screen.getByText(/Most items: Protection: 60 · Machines: 40/)).toBeInTheDocument();
  });

  it('a mixed paper shows all three subjects, and PRC’s table when Admin’s can’t be reached', async () => {
    drawPrefs.prefs = { drawMode: 'board', ownCounts: {} };
    fetchBoardGroups.mockResolvedValue(null);
    renderConfig({ ...PRC_EE, mode: 'blended', subject: 'blended' });
    expect(await screen.findByRole('img', { name: /^Math\. .*Calculus 1: 15/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^ESAS\./ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^EE\./ })).toBeInTheDocument();
  });

  it('is hidden for a pinned topic and an AI mock, and shown for all topics', () => {
    renderConfig({ ...CUSTOM, subtopic: 'Protection' });
    expect(screen.queryByRole('radiogroup', { name: 'How questions are picked' })).toBeNull();
    document.body.innerHTML = '';
    renderConfig(CUSTOM_AI);
    expect(screen.queryByRole('radiogroup', { name: 'How questions are picked' })).toBeNull();
    document.body.innerHTML = '';
    renderConfig(CUSTOM);
    expect(picker()).toBeInTheDocument();
  });

  it('a sitting and a printed paper both carry the choice', async () => {
    const user = userEvent.setup();
    drawPrefs.prefs = { drawMode: 'own', ownCounts: { EE: { Protection: 9 } } };
    const startSimulation = vi.fn();
    renderConfig(PRC_EE, { startSimulation });
    await user.click(screen.getByRole('button', { name: 'Start mock board' }));
    expect(startSimulation).toHaveBeenCalledWith({ ...PRC_EE, drawMode: 'own', ownCounts: { EE: { Protection: 9 } } });
  });

  it('the full board carries it too, for every section', async () => {
    const user = userEvent.setup();
    drawPrefs.prefs = { drawMode: 'board', ownCounts: {} };
    const onStartFullBoard = vi.fn();
    renderConfig(PRC_EE, { initialProfile: 'prc_full', onStartFullBoard });
    await user.click(screen.getByRole('button', { name: 'Start the full board' }));
    expect(onStartFullBoard).toHaveBeenCalledWith({ drawMode: 'board', ownCounts: {} });
  });

  it('My own: says when a subject has no counts, and sets them in a sheet', async () => {
    const user = userEvent.setup();
    drawPrefs.prefs = { drawMode: 'own', ownCounts: {} };
    renderConfig();
    expect(screen.getByText(/No counts yet, so this paper draws evenly/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Set my counts' }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByRole('radio', { name: 'EE' })).toBeChecked();
    await user.click(sheet.getByRole('button', { name: 'More: Items for Protection' }));
    expect(sheet.getByText('Total 1 items')).toBeInTheDocument();
    await user.click(sheet.getByRole('radio', { name: 'Math' }));
    await user.click(sheet.getByRole('button', { name: 'More: Items for Calculus' }));
    await user.click(sheet.getByRole('button', { name: 'Save counts' }));
    expect(drawPrefs.save).toHaveBeenCalledWith({ ownCounts: { EE: { Protection: 1 }, Mathematics: { Calculus: 1 } } });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('My own can start from the board’s counts, and Cancel saves nothing', async () => {
    const user = userEvent.setup();
    drawPrefs.prefs = { drawMode: 'own', ownCounts: {} };
    renderConfig();
    await user.click(screen.getByRole('button', { name: 'Set my counts' }));
    const sheet = within(screen.getByRole('dialog'));
    await waitFor(() => expect(fetchBoardGroups).toHaveBeenCalled());
    await user.click(sheet.getByRole('button', { name: 'Start from the board’s counts' }));
    await waitFor(() => expect(sheet.getByRole('spinbutton', { name: 'Items for Protection' })).toHaveValue(60));
    await user.click(sheet.getByRole('button', { name: 'Cancel' }));
    expect(drawPrefs.save).not.toHaveBeenCalled();
  });

  it('has no axe violations with the sheet closed', async () => {
    drawPrefs.prefs = { drawMode: 'board', ownCounts: {} };
    renderConfig();
    await screen.findByRole('img', { name: /^EE\./ });
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });
});
