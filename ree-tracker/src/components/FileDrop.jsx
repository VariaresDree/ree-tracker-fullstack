// src/components/FileDrop.jsx
//
// Drag and drop, plus tap to browse: dropping alone is no use on a phone. The input
// sits beside the button, not inside it: a control inside a control is an
// accessibility fault that axe flags.
import { useRef, useState } from 'react';
import { FileUp } from './ui/icons';

export default function FileDrop({ label, title, hint, accept, compact = false, onFiles }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = ''; // the same file can be chosen again after a failure
        }}
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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          onFiles(Array.from(e.dataTransfer.files));
        }}
        aria-label={label}
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
          <p className="text-textMain font-semibold">{title}</p>
          <p className="text-sm text-muted2 mt-1">{hint}</p>
        </div>
      </div>
    </>
  );
}
