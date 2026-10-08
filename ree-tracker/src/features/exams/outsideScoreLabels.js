// Subject choices for outside scores, in the order the form shows them.
// 'ALL' is a whole-board mock: all three subjects in one score.
export const SUBJECT_OPTIONS = [
  { value: 'Mathematics', label: 'Math' },
  { value: 'ESAS', label: 'ESAS' },
  { value: 'EE', label: 'EE' },
  { value: 'ALL', label: 'All three' },
];

export const subjectLabel = (s) => SUBJECT_OPTIONS.find((o) => o.value === s)?.label || s;
