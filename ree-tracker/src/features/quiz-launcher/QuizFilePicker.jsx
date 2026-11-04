// src/features/quiz-launcher/QuizFilePicker.jsx
// Reads files entirely via the browser File API; nothing here ever touches
// fetch/XHR.
import { useState } from 'react';
import FileDrop from '../../components/FileDrop';

const ACCEPTED_EXTENSIONS = ['.quiz', '.caq'];

function hasAcceptedExtension(name) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// `compact` once there are quizzes: they matter more than adding another.
export default function QuizFilePicker({ onFilesSelected, compact = false }) {
  // Files that aren't .quiz/.caq, named — they used to be dropped silently,
  // so a wrong file looked like the picker had done nothing.
  const [rejected, setRejected] = useState([]);

  const handleFiles = (all) => {
    const files = all.filter((f) => hasAcceptedExtension(f.name));
    setRejected(all.filter((f) => !hasAcceptedExtension(f.name)).map((f) => f.name));
    if (files.length > 0) onFilesSelected(files);
  };

  return (
    <div className="flex flex-col gap-4">
      <FileDrop
        label="Choose quiz files or drag them here"
        title="Drop quiz files here, or tap to browse"
        hint=".quiz or .caq files. Select as many as you like."
        accept={ACCEPTED_EXTENSIONS.join(',')}
        compact={compact}
        onFiles={handleFiles}
      />
      {rejected.length > 0 && (
        <p role="alert" className="text-sm" style={{ color: 'var(--accent-danger)' }}>
          {rejected.length === 1
            ? `${rejected[0]} isn’t a quiz file. Choose a .quiz or .caq file.`
            : `${rejected.length} files aren’t quiz files (${rejected.slice(0, 3).join(', ')}${rejected.length > 3 ? '…' : ''}). Choose .quiz or .caq files.`}
        </p>
      )}
    </div>
  );
}
