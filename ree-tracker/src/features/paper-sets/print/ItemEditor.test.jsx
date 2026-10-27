// The item editor: live typeset previews, the shared edit rules plus a
// formula check, the minimal edit saved, the bank's wording restored, and the
// warnings for printed and scored sheets.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import ItemEditor, { FORMULA_ERROR } from './ItemEditor';

expect.extend(axeMatchers);

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

const original = {
  n: 3, subject: 'EE', text: 'Find $x^2$ when $x = 3$.', options: ['A. 6', '9', '12', '3'], answer: '9', answerIndex: 1,
  explanation: 'Square it: $3^2 = 9$.',
};
const asPrinted = (over = {}) => ({ ...original, answerLetter: 'B', edited: false, ...over });

const renderEditor = (props = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<ItemEditor item={asPrinted()} original={original} sheetCount={0} onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose, dialog: screen.getByRole('dialog', { name: 'Edit item 3' }) };
};

describe('ItemEditor', () => {
  it('opens on the item as it prints, with typeset previews and no axe violations', async () => {
    const { dialog } = renderEditor();
    expect(within(dialog).getByLabelText('Question')).toHaveValue('Find $x^2$ when $x = 3$.');
    expect(within(dialog).getByLabelText('Option A')).toHaveValue('6'); // the bank's "A." prefix is the paper's own
    expect(within(dialog).getByRole('radio', { name: 'B' })).toBeChecked();
    expect(within(dialog).getByLabelText('Worked solution')).toHaveValue('Square it: $3^2 = 9$.');
    expect(dialog.querySelectorAll('.ree-edit-preview .katex').length).toBeGreaterThan(2);
    // A bank item can't be "restored": it is the bank's wording.
    expect(within(dialog).queryByRole('button', { name: /question bank/ })).toBeNull();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });

  it('saves only what changed', async () => {
    const user = userEvent.setup();
    const { onSave, dialog } = renderEditor();
    const stem = within(dialog).getByLabelText('Question');
    await user.clear(stem);
    await user.type(stem, 'E2E edited: $\\frac{{1}{{2}$');
    await waitFor(() => expect(dialog.querySelector('.ree-edit-preview .katex .mfrac')).not.toBeNull());
    await user.click(within(dialog).getByRole('radio', { name: 'C' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ text: 'E2E edited: $\\frac{1}{2}$', answerIndex: 2 });
  });

  it('options: add and remove, the answer follows, and a change in count asks for a reprint', async () => {
    const user = userEvent.setup();
    const { onSave, dialog } = renderEditor();
    await user.click(within(dialog).getByRole('button', { name: 'Remove option A' }));
    expect(within(dialog).getByRole('radio', { name: 'A' })).toBeChecked(); // "9" moved up to A
    expect(within(dialog).getByText(/Reprint the answer sheet after this change/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add an option' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Fill in every option, or remove it.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Option D'), '27');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ options: ['9', '12', '3', '27'], answerIndex: 0 });
  });

  it('a formula that doesn\u2019t render is caught before it prints', async () => {
    const user = userEvent.setup();
    const { onSave, dialog } = renderEditor();
    const stem = within(dialog).getByLabelText('Question');
    await user.clear(stem);
    await user.type(stem, 'Broken $\\nosuchmacro{{x}$');
    await waitFor(() => expect(within(dialog).getAllByText(FORMULA_ERROR).length).toBeGreaterThan(0));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(FORMULA_ERROR);
    // A parse error too.
    await user.clear(stem);
    await user.type(stem, 'Half: $\\frac{{1}$');
    await waitFor(() => expect(dialog.querySelector('.ree-edit-preview .katex-error')).not.toBeNull());
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('warns that scored sheets are scored again when the key changes', async () => {
    const user = userEvent.setup();
    const { dialog } = renderEditor({ sheetCount: 4 });
    expect(within(dialog).queryByText(/already scored/)).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: 'D' }));
    expect(within(dialog).getByText('4 sheets are already scored. They are scored again with this key.')).toBeInTheDocument();
  });

  it('an edited item can go back to the question bank\u2019s wording', async () => {
    const user = userEvent.setup();
    const { onSave, dialog } = renderEditor({ item: asPrinted({ text: 'Mine', edited: true }) });
    await user.click(within(dialog).getByRole('button', { name: 'Use the question bank\u2019s wording' }));
    expect(onSave).toHaveBeenCalledWith(null);
  });
});
