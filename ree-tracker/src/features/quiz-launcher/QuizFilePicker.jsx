// src/features/quiz-launcher/QuizFilePicker.jsx
// Drag-and-drop dropzone PLUS a click-to-browse fallback — drag-and-drop
// alone is unusable on a phone, and this app is mobile-first. Reads files
// entirely via the browser File API; nothing here ever touches fetch/XHR.
import { useCallback, useRef, useState } from 'react';
import { FileUp, Lock } from '../../components/ui/icons';

const ACCEPTED_EXTENSIONS = ['.quiz', '.caq'];

function hasAcceptedExtension(name) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function QuizFilePicker({ onFilesSelected }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList).filter((f) => hasAcceptedExtension(f.name));
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
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        aria-label="Choose quiz files or drag them here"
        className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-10 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] ${
          isDragOver
            ? 'border-[var(--accent-velocity)] bg-[color-mix(in_srgb,var(--accent-velocity)_8%,transparent)]'
            : 'border-border2 bg-surface2/30 hover:border-[var(--accent-velocity)]/50'
        }`}
      >
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--accent-velocity) 12%, transparent)', color: 'var(--accent-velocity)' }}
        >
          <FileUp size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <p className="text-textMain font-semibold">Drop quiz files here, or tap to browse</p>
          <p className="text-sm text-muted2 mt-1">.quiz files — select as many as you like</p>
        </div>
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
      </div>

      {/* Persistent, unmissable — not a tooltip a user could miss before starting. */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-default)] border border-border2 bg-surface2/40 p-3.5">
        <Lock size={15} strokeWidth={1.75} className="shrink-0 mt-0.5 text-muted2" aria-hidden="true" />
        <p className="text-xs text-muted2 leading-relaxed">
          Runs entirely on this device. Your quiz file is never uploaded, and the session isn't saved
          anywhere — closing or reloading this tab discards it. It also doesn't affect your Dashboard
          analytics, streak, or readiness score.
        </p>
      </div>
    </div>
  );
}
