// Component-level accessibility tests. The app's four key screens sit behind a
// hard Firebase auth gate (no CI test-auth path), so we assert a11y at the
// COMPONENT level instead — the shared primitives + the QuestionCard answer
// surface compose every screen, so zero violations here means zero of that class
// of violation everywhere they're used. Runs in the normal CI vitest job.
//
// jsdom can't compute layout/paint, so color-contrast and page-structure rules
// are unmeasurable/irrelevant at the component level — disabled below. The
// design-token work (theme-var colors) + a manual Lighthouse pass cover contrast.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

import { Button, Badge, StatusPill, ProgressIndicator, FormField, Input, Modal } from '../components/ui';
import QuestionCard from '../features/quiz/QuestionCard';

expect.extend(axeMatchers);

// Render LaTeX as plain text — keep the a11y run off react-markdown/KaTeX.
vi.mock('../components/LatexRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false }, // no paint in jsdom
    'html-has-lang': { enabled: false },  // page-level, not a component concern
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
    'document-title': { enabled: false },
  },
};

async function assertNoViolations(ui, { root = 'container' } = {}) {
  const { container } = render(ui);
  const node = root === 'body' ? document.body : container; // Modal portals to body
  expect(await axe(node, AXE_OPTS)).toHaveNoViolations();
}

const QUESTION = {
  text: 'What is $\\sin(2x)$?',
  options: ['$2\\sin x\\cos x$', '$\\sin^2 x$', '$\\cos 2x$', '$1$'],
  answer: '$2\\sin x\\cos x$',
  subject: 'Mathematics',
  subtopic: 'Trigonometry',
};

describe('a11y — shared UI primitives', () => {
  it('Button has no violations', async () => {
    await assertNoViolations(<Button>Save</Button>);
  });

  it('Badge has no violations', async () => {
    await assertNoViolations(<Badge>New</Badge>);
  });

  it('StatusPill has no violations', async () => {
    await assertNoViolations(<StatusPill status="passed" />);
  });

  it('ProgressIndicator exposes a labelled progressbar', async () => {
    await assertNoViolations(<ProgressIndicator value={3} max={5} ariaLabel="Math quota: 3 of 5" />);
  });

  it('FormField associates its label with the control', async () => {
    await assertNoViolations(
      <FormField label="Email address">
        <Input type="email" />
      </FormField>,
    );
  });

  it('Modal has a labelled dialog with no violations', async () => {
    await assertNoViolations(
      <Modal open title="Reset targets?" onClose={() => {}}>
        <p>Body copy.</p>
      </Modal>,
      { root: 'body' },
    );
  });
});

describe('a11y — QuestionCard answer surface', () => {
  it('answering state has no violations', async () => {
    await assertNoViolations(
      <QuestionCard question={QUESTION} selectedOption={null} state="answering" showConfidence hotkeys={false} onSelect={() => {}} />,
    );
  });

  it('reviewing state has no violations', async () => {
    await assertNoViolations(
      <QuestionCard question={QUESTION} selectedOption={'$1$'} state="reviewing" onSelect={() => {}} />,
    );
  });
});
