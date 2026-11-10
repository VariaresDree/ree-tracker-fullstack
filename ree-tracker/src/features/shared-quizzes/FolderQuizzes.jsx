// src/features/shared-quizzes/FolderQuizzes.jsx
//
// Library > Handouts: the shared quiz files in the open folder, as the same tiles
// Imported quizzes shows. Start opens it there, in Imported quizzes, and closing
// it comes back here. Loaded only when a folder has quiz files.
import { useLocation, useSearchParams } from 'react-router-dom';
import { Grid } from '../../components/ui';
import { useQuizSession } from '../quiz-launcher/quizSession';
import { SharedTile } from './SharedQuizzes';

export default function FolderQuizzes({ files, whereOf }) {
  const location = useLocation();
  const [, setParams] = useSearchParams();
  const { entries } = useQuizSession();
  const start = (id) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('tab', 'quizzes');
    next.set('quiz', id);
    return next;
  }, { state: { ...location.state, quizSheet: true } });

  return (
    <section aria-labelledby="folder-quizzes" className="flex flex-col gap-2">
      <p id="folder-quizzes" className="text-eyebrow">Quiz files · {files.length}</p>
      <Grid kind="cards" as="ul" aria-labelledby="folder-quizzes" className="@5xl:grid-cols-4">
        {files.map((file) => <SharedTile key={file.id} file={file} entries={entries} onStart={start} where={whereOf?.(file)} />)}
      </Grid>
    </section>
  );
}
