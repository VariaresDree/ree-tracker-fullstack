// src/features/exam-export/ExportDialog.jsx
//
// "Print or export the exam paper": the PDF (print-ready) or three LaTeX
// files (editable), on A4, Letter or long bond. Lazy-loaded from the mock-board
// setup (SimulatorConfig), so none of the export code is on the boot path.
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, SegmentedControl, StatusPill, cn } from '../../components/ui';
import { Copy, Download, FileText, Shuffle, Timer, TriangleAlert } from '../../components/ui/icons';
import { useExamExport } from './useExamExport';
import { canDownloadFiles } from './deliver';
import { planSummary } from './drawExamPaper';

const FORMATS = [
  { value: 'pdf', label: 'PDF (print-ready)' },
  { value: 'latex', label: 'LaTeX (editable)' },
];
const PAPERS = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'long', label: 'Long 8.5 \u00D7 13 in' },
];
const DOCUMENTS = [
  ['paper', 'Question paper'],
  ['sheet', 'Answer sheet'],
  ['key', 'Answer key'],
];

const kb = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function ExportDialog({ open = true, onClose, config }) {
  const exp = useExamExport(config);
  // The Android app can't save a file (no Filesystem plugin): the PDF would
  // say "saved" and land nowhere, so there it's LaTeX to copy, only.
  const downloads = canDownloadFiles();
  const formats = downloads ? FORMATS : FORMATS.filter((f) => f.value === 'latex');
  const [format, setFormat] = useState(downloads ? 'pdf' : 'latex');
  const [paper, setPaper] = useState('a4');
  const [docs, setDocs] = useState({ paper: true, sheet: true, key: true });
  const [solutions, setSolutions] = useState(true);
  const hintId = useId();

  const plan = exp.plan;
  const noneChosen = !docs.paper && !docs.sheet && !docs.key;
  const pdf = format === 'pdf';
  // The PRC section timer knows a subject paper's board time; a custom
  // paper's own time isn't one of its sections.
  const timeable = plan?.kind === 'subject' && plan.profile === 'prc_subject';

  const change = (setter) => (value) => {
    setter(value);
    exp.clearFiles();
  };
  const toggleDoc = (key) => (e) => {
    setDocs((d) => ({ ...d, [key]: e.target.checked }));
    exp.clearFiles();
  };
  const build = () => (pdf
    ? exp.buildPdf({ paper, documents: docs })
    : exp.buildLatex({ paper, documents: docs, includeSolutions: solutions }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={FileText}
      size="md"
      title="Print or export the exam paper"
      footer={(
        <>
          {timeable && (
            <Button as={Link} to={`/focus?mode=exam&section=${encodeURIComponent(plan.sections[0].subject)}`} variant="ghost">
              <Timer size={16} strokeWidth={1.75} aria-hidden="true" />
              Time this paper
            </Button>
          )}
          {exp.draw && (
            <Button variant="ghost" onClick={exp.newSet} disabled={exp.busy}>
              <Shuffle size={16} strokeWidth={1.75} aria-hidden="true" />
              Draw a new set
            </Button>
          )}
          <Button onClick={build} loading={exp.busy} disabled={exp.busy || !!exp.planError || noneChosen}>
            {pdf ? 'Build PDF' : 'Build LaTeX files'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        {exp.planError ? (
          <div
            className="flex items-start gap-2 p-3 rounded-[var(--radius-default)] border bg-surface2 text-sm text-textMain"
            style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
          >
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-reeAmber-text" />
            <p>{exp.planError}</p>
          </div>
        ) : plan && (
          <p className="text-sm text-muted2 tabular-nums">{planSummary(plan)}</p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-eyebrow" aria-hidden="true">Format</span>
          <SegmentedControl label="Format" options={formats} value={format} onChange={change(setFormat)} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-eyebrow" aria-hidden="true">Paper</span>
          <SegmentedControl label="Paper size" options={PAPERS} value={paper} onChange={change(setPaper)} />
        </div>

        <fieldset className="flex flex-col gap-2 min-w-0">
          <legend className="text-eyebrow mb-2">Include</legend>
          {DOCUMENTS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={docs[key]} onChange={toggleDoc(key)} />
              {label}
            </label>
          ))}
          <label className={cn('flex items-start gap-2 text-sm pointer-coarse:min-h-11', pdf ? 'text-muted2' : 'text-textMain cursor-pointer')}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              checked={!pdf && solutions && docs.key}
              disabled={pdf || !docs.key}
              aria-describedby={pdf ? hintId : undefined}
              onChange={(e) => { setSolutions(e.target.checked); exp.clearFiles(); }}
            />
            <span>
              Worked solutions in the key
              {pdf && <span id={hintId} className="block text-xs text-muted2">Worked solutions are in the LaTeX export</span>}
            </span>
          </label>
        </fieldset>

        {exp.draw && (
          <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-default)] border border-border bg-surface2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <StatusPill tone="velocity" dot={false}>{exp.draw.setLabel}</StatusPill>
              <span className="text-xs text-muted2 font-mono tabular-nums [overflow-wrap:anywhere]">
                Set {exp.draw.setId} {'\u00B7'} Key v{exp.draw.keyVersion} {'\u00B7'} {exp.draw.items.length} items
              </span>
            </div>
            {exp.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 pl-4 list-disc text-xs text-textMain">
                {exp.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        {exp.files.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-textMain">LaTeX files</h3>
            <ul className="flex flex-col border border-border rounded-[var(--radius-default)] divide-y divide-border">
              {exp.files.map((file) => (
                <li key={file.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 text-sm text-textMain [overflow-wrap:anywhere]">
                    {file.name} <span className="text-xs text-muted2 tabular-nums">{kb(file.bytes)}</span>
                  </span>
                  <span className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => exp.copy(file)} aria-label={`Copy ${file.name}`}>
                      <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                      Copy
                    </Button>
                    {downloads && (
                      <Button size="sm" variant="secondary" onClick={() => exp.downloadFile(file)} aria-label={`Download ${file.name}`}>
                        <Download size={14} strokeWidth={1.75} aria-hidden="true" />
                        Download
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {downloads ? (
              <Button variant="secondary" className="self-start" onClick={exp.downloadZip}>
                <Download size={16} strokeWidth={1.75} aria-hidden="true" />
                Download all (.zip)
              </Button>
            ) : (
              <p className="text-xs text-muted2">Paste each file into Overleaf or a TeX editor.</p>
            )}
            <p className="text-xs text-muted2">
              Compile each file twice with pdflatex, or upload them to Overleaf.
            </p>
          </div>
        )}

        {exp.error && (
          <p role="alert" className="text-sm text-[var(--accent-danger)] [overflow-wrap:anywhere]">{exp.error}</p>
        )}
        <p role="status" aria-live="polite" className="text-xs text-muted2 min-h-4 [overflow-wrap:anywhere]">{exp.status}</p>
      </div>
    </Modal>
  );
}
