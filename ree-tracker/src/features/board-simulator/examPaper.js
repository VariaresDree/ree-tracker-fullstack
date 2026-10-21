// src/features/board-simulator/examPaper.js
// The old print-ready PDF (questionnaire + answer sheet + answer key) of an
// ExamDraw, drawn with jsPDF in Helvetica, so its math is mathToText's plain
// Latin-1 text. Only the old export dialog (exam-export/ExportDialog.jsx) still
// uses it; the print preview replaces both.
//
// The shared helpers moved to features/exam-export/paperFormat.js; they are
// re-exported here so the old imports keep working until this file goes.
import { stripChoicePrefix } from '../../utils/sanitizeOptions';
import { answerSheetLayout, pageCells, paginateColumnMajor } from '../exam-export/sheetLayout';
import {
    columnMajorPosition, formatDuration, formatPaperDate, letterOf, mathToText, paperDay, partLabel, setLabelFor,
} from '../exam-export/paperFormat';

export {
    SUBJECT_CODE, answerLetterFor, chooseOptionLayout, columnMajorPosition, deriveExamIdentity, formatDuration,
    formatPaperDate, letterOf, mathToText, paperDay, partLabel, setLabelFor,
} from '../exam-export/paperFormat';

const PT_TO_MM = 0.3527777778;
const lineHeight = (pt, factor = 1.15) => pt * PT_TO_MM * factor;

// jsPDF page formats. PH long bond is 8.5 x 13 in.
const JSPDF_FORMAT = { a4: 'a4', letter: 'letter', long: [215.9, 330.2] };

// --- main builder ---------------------------------------------------------
/**
 * @param {object} opts
 * @param {object} opts.draw       an ExamDraw (drawExamPaper)
 * @param {'a4'|'letter'|'long'} [opts.paper]
 * @param {{ paper?: boolean, sheet?: boolean, key?: boolean }} [opts.documents]
 * @param {string|null} [opts.output]  'arraybuffer'/'blob' returns the bytes instead of saving
 */
export async function generateExamPaper({ draw, paper = 'a4', documents = { paper: true, sheet: true, key: true }, output = null }) {
    if (!draw || !Array.isArray(draw.items) || draw.items.length === 0) {
        throw new Error('No questions available for the selected configuration.');
    }
    const want = { paper: !!documents?.paper, sheet: !!documents?.sheet, key: !!documents?.key };
    if (!want.paper && !want.sheet && !want.key) throw new Error('Choose at least one part to print.');

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: JSPDF_FORMAT[paper] || 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const M = 12;                       // page margin (mm)
    const contentW = pageW - M * 2;
    const footerY = pageH - 8;
    const bottomLimit = pageH - 14;     // leave room for footer

    const plan = draw.plan || {};
    const code = plan.code || 'EE';
    const duration = formatDuration(plan.timeAllotmentMins);
    const sections = Array.isArray(draw.sections) ? draw.sections : [];
    const showSections = plan.kind === 'blended' || sections.length > 1;

    // Clean per item once so the questionnaire, sheet and key agree. The
    // letters come from the draw, which matched them against this order.
    const items = draw.items.map((it) => ({
        n: it.n,
        stem: mathToText(it.text || ''),
        options: (it.options || []).map((o) => mathToText(stripChoicePrefix(o))),
        answerLetter: it.answerLetter || '-',
    }));
    const unmatched = draw.items.filter((it) => !(it.answerIndex >= 0)).length;
    const { setId, keyVersion } = draw;
    const setLabel = draw.setLabel || setLabelFor(setId);
    const idLine = `Set ${setId} \u00B7 Key v${keyVersion}`;

    let y = M;
    let started = false;
    const setFont = (pt, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(pt); };
    // Each part starts on a fresh page (the first one on page 1).
    const startPart = () => {
        if (started) doc.addPage();
        started = true;
        y = M;
    };

    // ---- Questionnaire ----
    if (want.paper) {
        startPart();
        setFont(12, 'bold');
        doc.text('REGISTERED ELECTRICAL ENGINEER Pre-board Examination', M, y + 3);
        setFont(9, 'normal');
        doc.text(formatPaperDate(draw.generatedAt), M, y + 9);
        doc.text(`Time Allotment: ${duration}`, pageW - M, y + 9, { align: 'right' });
        y += 12;
        doc.setLineWidth(0.4);
        doc.line(M, y, pageW - M, y);
        y += 5;
        setFont(11, 'bold');
        doc.text(code, M, y);
        doc.text(setLabel, pageW - M, y, { align: 'right' });
        y += 2;
        doc.setLineWidth(0.2);
        doc.line(M, y, pageW - M, y);
        y += 5;

        setFont(8.5, 'normal');
        const instruction =
            'INSTRUCTION: Select the correct answer for each of the following questions. Mark only the answer ' +
            'for each item by shading the box corresponding to the letter of your choice on the answer sheet ' +
            'provided. STRICTLY NO ERASURES ALLOWED. Use pencil no. 2 only. Please do not write anything on ' +
            'this questionnaire.';
        const instrLines = doc.splitTextToSize(instruction, contentW);
        const instrLH = lineHeight(8.5);
        doc.text(instrLines, M, y);
        y += instrLines.length * instrLH + 3;
        setFont(9.5, 'bold');
        doc.text('MULTIPLE CHOICE', M, y);
        y += lineHeight(9.5) + 2;

        // ---- Questions (continuous flow, 2-column options) ----
        const qPT = 9.5, oPT = 9;
        const qLH = lineHeight(qPT), oLH = lineHeight(oPT);
        const leftX = M + 4, rightX = M + contentW / 2 + 3;
        const optW = contentW / 2 - 7;     // wrap width per option column
        const rowGap = 1.3, qGap = 4.5;
        const sectionAt = new Map(sections.map((s, i) => [s.from, { s, i }]));

        const newContentPage = () => { doc.addPage(); y = M; };

        for (const it of items) {
            // A mixed paper's sections: "Part II, Engineering Sciences and
            // Allied Subjects (items 26-55)".
            const section = showSections && sectionAt.get(it.n);
            if (section) {
                const headH = lineHeight(10) + 3;
                if (y + headH + 18 > bottomLimit) newContentPage();
                setFont(10, 'bold');
                doc.text(`${partLabel(section.i)}, ${section.s.title} (items ${section.s.from}-${section.s.to})`, M, y + lineHeight(10) - 1);
                y += headH;
            }

            setFont(qPT, 'normal');
            const stemLines = doc.splitTextToSize(`${it.n}. ${it.stem}`, contentW);

            // Two-column options: the left half (A,B) stacks over the right half
            // (C,D), so row r pairs left[r] with right[r] - matching real board papers.
            setFont(oPT, 'normal');
            const n = it.options.length;
            const leftCount = Math.ceil(n / 2);
            const rows = [];
            for (let r = 0; r < leftCount; r++) {
                const li = r;
                const ri = leftCount + r;
                const left = doc.splitTextToSize(`${letterOf(li)}. ${it.options[li]}`, optW);
                const right = ri < n ? doc.splitTextToSize(`${letterOf(ri)}. ${it.options[ri]}`, optW) : null;
                rows.push({ left, right, h: Math.max(left.length, right ? right.length : 1) * oLH });
            }

            const blockH = stemLines.length * qLH + 1.5 + rows.reduce((s, r) => s + r.h + rowGap, 0) + qGap;

            // Keep a question intact on one page when it fits; else start a new page.
            if (y + blockH > bottomLimit && blockH <= pageH - M - 14) newContentPage();

            setFont(qPT, 'normal');
            // Draw stem (with per-line page-break safety for the rare oversized block).
            for (const ln of stemLines) {
                if (y + qLH > bottomLimit) newContentPage();
                doc.text(ln, M, y + qLH - 1);
                y += qLH;
            }
            y += 1.5;

            setFont(oPT, 'normal');
            for (const row of rows) {
                if (y + row.h > bottomLimit) newContentPage();
                if (row.left) doc.text(row.left, leftX, y + oLH - 1);
                if (row.right) doc.text(row.right, rightX, y + oLH - 1);
                y += row.h + rowGap;
            }
            y += qGap - rowGap;
        }
    }

    // ---- Answer sheet ----
    if (want.sheet) {
        startPart();
        // QR (top-right): encodes setId + keyVersion so a grader can scan a filled
        // sheet and match it to the correct printed ANSWER KEY page. It never
        // contains the answers themselves. Best-effort - a QR failure must not abort
        // the whole PDF.
        try {
            const mod = await import('qrcode');
            const toDataURL = mod.toDataURL || mod.default?.toDataURL;
            if (toDataURL) {
                const qrPayload = draw.qrPayload || `REE|${setId}|v${keyVersion}`;
                const qrUrl = await toDataURL(qrPayload, { margin: 0, width: 256, errorCorrectionLevel: 'M' });
                const qrSize = 20;
                doc.addImage(qrUrl, 'PNG', pageW - M - qrSize, M, qrSize, qrSize);
                setFont(6.5, 'normal');
                doc.setTextColor(120);
                doc.text('Scan to verify set', pageW - M - qrSize / 2, M + qrSize + 2.5, { align: 'center' });
                doc.setTextColor(0);
            }
        } catch { /* qrcode unavailable - the sheet still prints without the QR */ }

        setFont(13, 'bold');
        doc.text('ANSWER SHEET', pageW / 2, y + 4, { align: 'center' });
        setFont(9, 'normal');
        y += 9;
        doc.text(`${code}   ${setLabel}`, M, y);
        y += 4.5;
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(idLine, M, y);
        doc.setTextColor(0);
        y += 5;
        setFont(9, 'normal');
        doc.text('Name: ____________________________', M, y);
        y += 5;
        setFont(7.5, 'normal');
        doc.text('Shade the circle of your choice completely. Use pencil no. 2 only. STRICTLY NO ERASURES.', M, y);
        y += 6;

        // One bubble per option on every row (2-6); rows that don't fit
        // continue on the next page, column-major on each page.
        const maxOptions = Math.max(2, ...draw.items.map((it) => (it.options || []).length));
        const SHEET_FIRST_HEADER = y - M;
        const SHEET_NEXT_HEADER = 16;
        const layout = answerSheetLayout({
            count: items.length, maxOptions, paper, marginMm: M, bottomMm: pageH - bottomLimit,
            firstHeaderMm: SHEET_FIRST_HEADER, nextHeaderMm: SHEET_NEXT_HEADER,
            rowPitchMm: 8.4, bubblePitchMm: 8, numberColMm: 11, colGapMm: 4,
        });
        const bubbleR = 1.9;
        layout.pages.forEach((page, p) => {
            let gridY = y;
            if (p > 0) {
                doc.addPage();
                setFont(10, 'bold');
                doc.text(`ANSWER SHEET (continued) \u2014 ${code}   ${setLabel}`, M, M + 4);
                setFont(8, 'normal');
                doc.text(`Items ${page.from}-${page.to}     Name: ____________________________`, M, M + 9.5);
                gridY = M + SHEET_NEXT_HEADER;
            }
            setFont(8.5, 'normal');
            for (const cell of pageCells(layout, page)) {
                const it = draw.items[cell.n - 1];
                const cellX = M + cell.x;
                const cellY = gridY + cell.y;
                doc.text(`${cell.n}.`, cellX + 6, cellY + 3, { align: 'right' });
                const count = Math.max(0, (it.options || []).length);
                for (let b = 0; b < count; b++) {
                    const bx = cellX + 11 + b * 8;
                    const by = cellY + 2;
                    doc.setLineWidth(0.25);
                    doc.circle(bx, by, bubbleR, 'S');
                    doc.text(letterOf(b), bx, by + 1, { align: 'center' });
                }
            }
        });
    }

    // ---- Answer key ----
    if (want.key) {
        startPart();
        setFont(13, 'bold');
        doc.text('ANSWER KEY', pageW / 2, y + 4, { align: 'center' });
        setFont(9, 'normal');
        y += 9;
        doc.text(`${code}   ${setLabel}   (${items.length} items)`, M, y);
        y += 4.5;
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(`${idLine}  \u2014  scan the answer-sheet QR to confirm a sheet matches this key`, M, y);
        if (showSections) {
            y += 4;
            doc.text(sections.map((s, i) => `${partLabel(i)} ${s.subject} ${s.from}-${s.to}`).join('   \u00B7   '), M, y);
        }
        doc.setTextColor(0);
        y += 6;

        // Column-major (fill each column top-to-bottom), matching the answer sheet
        // and the PH convention. 5 columns -> e.g. 50 items = 5 cols of 10. Rows
        // past the page continue on the next one.
        const akCols = 5;
        const akColW = contentW / akCols;
        const akRowH = 6;
        const firstRows = Math.floor((bottomLimit - y) / akRowH);
        const nextRows = Math.floor((bottomLimit - (M + 8)) / akRowH);
        const pages = paginateColumnMajor(items.length, akCols, firstRows, nextRows);
        pages.forEach((page, p) => {
            let startY = y;
            if (p > 0) {
                doc.addPage();
                setFont(10, 'bold');
                doc.text(`ANSWER KEY (continued) \u2014 ${code}   ${setLabel}`, M, M + 4);
                startY = M + 10;
            }
            setFont(9.5, 'normal');
            for (let n = page.from; n <= page.to; n++) {
                const it = items[n - 1];
                const { col, row } = columnMajorPosition(n - page.from, page.rows);
                const x = M + col * akColW;
                const ry = startY + row * akRowH;
                doc.text(`${it.n}.`, x + 7, ry, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(it.answerLetter, x + 9, ry);
                doc.setFont('helvetica', 'normal');
            }
        });
    }

    // ---- Footer (page X of Y) on every page ----
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(`REE Pre-board \u2014 ${code} \u2014 ${setLabel} \u2014 ${setId}`, M, footerY);
        doc.text(`Page ${p} of ${total}`, pageW - M, footerY, { align: 'right' });
        doc.setTextColor(0);
    }

    const filename = `REE-${code}-${setLabel.replace(' ', '')}-${paperDay(draw.generatedAt)}.pdf`;
    // `unmatched` lets the caller warn when a stored answer couldn't be mapped to
    // an option (a silent '-' in the key) instead of shipping a broken key.
    const result = { pages: total, items: items.length, setLabel, setId, keyVersion, unmatched, filename };
    // `output` (e.g. 'arraybuffer'/'blob') returns the bytes instead of triggering
    // a browser download - used by tests/tooling; the UI path leaves it null.
    if (output) return { ...result, data: doc.output(output) };
    doc.save(filename);
    return result;
}
