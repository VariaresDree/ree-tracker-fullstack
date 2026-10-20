// src/features/exam-export/useExamExport.js
//
// The export dialog's state: idle -> drawing -> building -> ready (or error).
// One draw serves every format and paper size until "Draw a new set", so the
// PDF and the LaTeX of one set have the same questions, order and key.
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';
import { ExportError, drawExamPaper, drawWarningLines, resolveExportPlan } from './drawExamPaper';
import { buildExamTex, texWarningLines, zipFileName, zipTexFiles } from './buildExamTex';
import { copyText, downloadBlob } from './deliver';
// examPaper is small and already in this chunk (the draw uses its helpers);
// jsPDF itself stays a dynamic import inside generateExamPaper.
import { generateExamPaper } from '../board-simulator/examPaper';

const IDLE = { phase: 'idle', files: [], texWarnings: [], error: null, status: '' };

const messageOf = (err) => (err instanceof ExportError || err?.name === 'ExportError'
  ? err.message
  : `Couldn't build the paper. ${err?.message || 'Try again.'}`);

/**
 * @param {object} config  the setup screen's config
 * @param {object} [deps]  passed to drawExamPaper (tests inject the bank)
 */
export function useExamExport(config, deps) {
  const [state, setState] = useState(IDLE);
  const [draw, setDraw] = useState(null);
  const drawRef = useRef(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);
  const update = (patch) => { if (live.current) setState((s) => ({ ...s, ...patch })); };

  // What the setup asks for, before anything is fetched (default weights for
  // the summary; the draw uses the server's). An AI-written mock can't print.
  const preview = useMemo(() => {
    try {
      return { plan: resolveExportPlan(config, DEFAULT_SYLLABUS_WEIGHTS), error: null };
    } catch (err) {
      return { plan: null, error: messageOf(err) };
    }
  }, [config]);

  const ensureDraw = async () => {
    if (drawRef.current) return drawRef.current;
    update({ phase: 'drawing', error: null, status: 'Drawing a set of questions\u2026' });
    const next = await drawExamPaper(config, deps);
    drawRef.current = next;
    if (live.current) setDraw(next);
    return next;
  };

  const fail = (err) => {
    if (!(err instanceof ExportError)) console.error('Exam paper export failed:', err);
    update({ phase: 'error', error: messageOf(err), status: '' });
  };

  const buildPdf = async ({ paper, documents }) => {
    try {
      const current = await ensureDraw();
      update({ phase: 'building', error: null, files: [], texWarnings: [], status: 'Building the PDF\u2026' });
      const res = await generateExamPaper({ draw: current, paper, documents });
      update({ phase: 'ready', status: `PDF saved: ${res.filename} (${res.pages} page${res.pages === 1 ? '' : 's'}).` });
    } catch (err) {
      fail(err);
    }
  };

  const buildLatex = async ({ paper, documents, includeSolutions }) => {
    try {
      const current = await ensureDraw();
      update({ phase: 'building', error: null, status: 'Writing the LaTeX files\u2026' });
      const { files, warnings } = await buildExamTex(current, { paper, documents, includeSolutions });
      update({
        phase: 'ready',
        files,
        texWarnings: texWarningLines(warnings),
        status: `${files.length} LaTeX file${files.length === 1 ? '' : 's'} ready.`,
      });
    } catch (err) {
      fail(err);
    }
  };

  const newSet = () => {
    drawRef.current = null;
    setDraw(null);
    setState({ ...IDLE, status: 'The next build draws a new set.' });
  };

  /** Settings changed: the built files no longer match them. */
  const clearFiles = () => {
    if (state.files.length || state.phase === 'ready') update({ phase: 'idle', files: [], texWarnings: [], status: '' });
  };

  const copy = async (file) => {
    const ok = await copyText(file.content);
    update({ status: ok ? `Copied ${file.name}.` : `Couldn't copy ${file.name}. Select the text in a download instead.` });
  };

  const downloadFile = (file) => {
    downloadBlob(new Blob([file.content], { type: 'application/x-tex' }), file.name);
    update({ status: `Downloaded ${file.name}.` });
  };

  const downloadZip = async () => {
    try {
      const bytes = await zipTexFiles(state.files);
      const name = zipFileName(drawRef.current);
      downloadBlob(new Blob([bytes], { type: 'application/zip' }), name);
      update({ status: `Downloaded ${name}.` });
    } catch (err) {
      fail(err);
    }
  };

  return {
    phase: state.phase,
    busy: state.phase === 'drawing' || state.phase === 'building',
    plan: draw?.plan || preview.plan,
    planError: preview.error,
    draw,
    files: state.files,
    warnings: [...drawWarningLines(draw), ...state.texWarnings],
    error: state.error,
    status: state.status,
    buildPdf,
    buildLatex,
    newSet,
    clearFiles,
    copy,
    downloadFile,
    downloadZip,
  };
}
