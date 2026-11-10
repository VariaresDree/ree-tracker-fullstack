// src/features/shared-quizzes/FolderQuizzes.test.jsx
//
// A folder's quiz files in Library › Handouts: Start opens the quiz in Imported
// quizzes, where its sheet lives, and marks the way back.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import FolderQuizzes from './FolderQuizzes';
import { deviceIdOf } from './sharedState';

const file = { id: 'q1', name: 'Terms-2', fileName: 'terms-2.quiz', sizeBytes: 2048, questionCount: 10, checksum: 'c'.repeat(64), folderId: 'f1' };
vi.mock('../quiz-launcher/quizSession', () => ({
  useQuizSession: () => ({ entries: [{ id: 'c'.repeat(32), status: 'ready' }] }),
  addDownloadedQuiz: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../exam-export/deliver', () => ({ canDownloadFiles: () => false, downloadBlob: vi.fn() }));

const Where = () => {
  const { search, state } = useLocation();
  return <p data-testid="where">{JSON.stringify({ search, state })}</p>;
};
const where = () => JSON.parse(screen.getByTestId('where').textContent);

describe('quiz files in a handouts folder', () => {
  it('Start opens it in Imported quizzes, with a way back', () => {
    render(
      <MemoryRouter initialEntries={['/library?tab=handouts&folder=f1']}>
        <Where />
        <FolderQuizzes files={[file]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Quiz files · 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Terms-2' }));
    const { search, state } = where();
    const params = new URLSearchParams(search);
    expect(params.get('tab')).toBe('quizzes');
    expect(params.get('quiz')).toBe(deviceIdOf(file));
    expect(state).toMatchObject({ quizSheet: true });
  });

  it('a search result says which folder it’s in', () => {
    render(<MemoryRouter><FolderQuizzes files={[file]} whereOf={() => 'Machines / Transformers'} /></MemoryRouter>);
    expect(screen.getByText('Machines / Transformers')).toBeInTheDocument();
  });
});
