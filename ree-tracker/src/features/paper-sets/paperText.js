// src/features/paper-sets/paperText.js
//
// The paper helpers the print preview shares with the LaTeX export (dates,
// durations, Part labels, the option layout, the practice line, the sheet's
// geometry and QR). All from exam-export/paperFormat.js, which is pure: the
// TeX writer itself stays out of the preview's chunk until it's asked for.
export {
  PRACTICE_LINE, chooseOptionLayout, formatDuration, formatPaperDate, loadQrEncoder, partLabel,
  setCodeFor, sheetGeometryFor,
} from '../exam-export/paperFormat';
