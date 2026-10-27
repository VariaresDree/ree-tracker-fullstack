// src/features/paper-sets/print/QuestionPaper.jsx
//
// The question paper: the PRC-style masthead on page 1 (with the
// not-an-official-PRC-document line), then the items in two columns with a
// thin rule between them, Part headings on a mixed paper (blocks.jsx).
import { formatDuration, formatPaperDate } from '../paperText';
import { PaperSheet, SheetColumn } from './PaperSheet';
import { ITEM_GAP_MM, MASTHEAD_GAP_MM, practiceText } from './layout';

const APPLICANT_FIELDS = ['Name', 'Application no.', 'Seat no.', 'Signature'];
const INSTRUCTIONS = 'Choose the one best answer to each question. Shade its circle completely on the answer sheet with a No. 2 pencil or a dark pen. Erase cleanly if you change an answer.';

export function Masthead({ draw }) {
  const { plan } = draw;
  return (
    <div className="ree-masthead">
      <div className="ree-mast-center">
        <div className="ree-small">Republic of the Philippines</div>
        <div className="ree-mast-prc">PROFESSIONAL REGULATION COMMISSION</div>
        <div className="ree-small">Manila</div>
        <div className="ree-mast-board">BOARD OF ELECTRICAL ENGINEERING</div>
        <div className="ree-small">Registered Electrical Engineer Pre-board Examination</div>
        <div className="ree-mast-title">{plan.title}</div>
        {plan.topic && <div className="ree-small">Topic: {plan.topic}</div>}
        <div className="ree-practice">{practiceText()}</div>
      </div>
      <div className="ree-mast-meta">
        <span>{formatPaperDate(draw.generatedAt)}</span>
        <span>Time allotment: {formatDuration(plan.timeAllotmentMins)}</span>
        <span className="ree-mast-set"><span className="ree-set-box">{draw.setLabel}</span></span>
      </div>
      <div className="ree-applicant">
        {APPLICANT_FIELDS.map((label) => (
          <div key={label} className="ree-field">
            <span>{label}:</span>
            <span className="ree-field-line" />
          </div>
        ))}
      </div>
      <div className="ree-instructions"><b>INSTRUCTIONS.</b> {INSTRUCTIONS}</div>
    </div>
  );
}

export function QuestionPaperPages({ draw, layout, size, scale, footerLeft, render }) {
  const { pages, oversize, heights } = layout;
  return pages.map((page, i) => (
    <PaperSheet
      key={`qp-${i}`}
      size={size}
      scale={scale}
      label={`Question paper, page ${i + 1} of ${pages.length}`}
      footer={{ left: footerLeft, right: `Page ${i + 1} of ${pages.length}` }}
    >
      <div className="ree-body">
        {i === 0 && <Masthead draw={draw} />}
        <div className="ree-columns" style={i === 0 ? { marginTop: `${MASTHEAD_GAP_MM}mm` } : undefined}>
          {page.cols.map((keys, c) => (
            <SheetColumn key={c} keys={keys} oversize={oversize} heights={heights} render={render} gapMm={ITEM_GAP_MM} />
          ))}
        </div>
      </div>
    </PaperSheet>
  ));
}
