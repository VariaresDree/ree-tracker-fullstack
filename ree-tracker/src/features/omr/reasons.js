// src/features/omr/reasons.js
//
// Why a frame or a photo couldn't be read, and what to tell the person
// holding the phone. No imports, so the scanner screen can show these without
// loading the pipeline.

export const OMR_REASONS = Object.freeze([
  'no-sheet',
  'too-small',
  'too-skewed',
  'blurry',
  'unreadable-code',
  'wrong-set',
  'layout-changed',
  'wrong-page',
  'duplicate-page',
]);

export const REASON_HINTS = Object.freeze({
  'no-sheet': 'Fit all four black squares inside the frame.',
  'too-small': 'Move closer.',
  'too-skewed': 'Hold the phone flat above the sheet.',
  blurry: 'Hold steady.',
  'unreadable-code': 'Keep the row of small squares along the bottom edge clean and in view.',
  'wrong-set': 'This sheet belongs to another paper set.',
  'layout-changed': 'This sheet was printed before the options changed. Print the answer sheet again.',
  'wrong-page': 'This is another page of the answer sheet.',
  'duplicate-page': 'This page is already read.',
});

/** The hint for a reason, or a generic one. */
export const hintFor = (reason) => REASON_HINTS[reason] || 'Try another photo.';
