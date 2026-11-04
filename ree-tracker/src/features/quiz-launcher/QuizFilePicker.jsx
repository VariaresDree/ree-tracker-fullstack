// src/features/quiz-launcher/QuizFilePicker.jsx
// Drag-and-drop dropzone PLUS a click-to-browse fallback — drag-and-drop
// alone is unusable on a phone, and this app is mobile-first. Reads files
// entirely via the browser File API; nothing here ever touches fetch/XHR.
import { useCallback, useRef, useState } from 'react';
import { FileUp } from '../../components/ui/icons';

const ACCEPTED_EXTENSIONS = ['.quiz', '.caq'];

function hasAcceptedExtension(name) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// `compact` once there are quizzes: they matter more than adding another.
export default function QuizFilePicker({ onFilesSelected, compact = false }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Files that aren't .quiz/.caq, named — they used to be dropped silently,
  // so a wrong file looked like the picker had done nothing.
  const [rejected, setRejected] = useState([]);

  const handleFiles = useCallback((fileList) => {
    const all = Array.from(fileList);
    const files = all.filter((f) => hasAcceptedExtension(f.name));
    setRejected(all.filter((f) => !hasAcceptedExtension(f.name)).map((f) => f.name));
    if (files.length > 0) onFilesSelected(files);
  }, [onFilesSelected]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onInputChange = useCallback((e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file after a failed parse
  }, [handleFiles]);

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        multiple
        onChange={onInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        aria-label="Choose quiz files or drag them here"
        className={`flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed cursor-pointer transition-colors ${compact ? 'p-4 text-left' : 'flex-col p-10 text-center'} ${
          isDragOver
            ? 'border-[var(--accent-velocity)] bg-[color-mix(in_srgb,var(--accent-velocity)_8%,transparent)]'
            : 'border-border2 bg-surface2/30 hover:border-[var(--accent-velocity)]/50'
        }`}
      >
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--accent-velocity) 12%, transparent)', color: 'var(--accent-text)' }}
        >
          <FileUp size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-textMain font-semibold">Drop quiz files here, or tap to browse</p>
          <p className="text-sm text-muted2 mt-1">.quiz or .caq files. Select as many as you like.</p>
        </div>
      </div>

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
