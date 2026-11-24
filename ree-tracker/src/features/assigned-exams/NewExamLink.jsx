// src/features/assigned-exams/NewExamLink.jsx
//
// Today's one line about assigned exams: "New exam: EE prelim", or "2 new
// exams from your reviewer", linking to Exams › Assigned. Only exams the
// learner can start now and hasn't taken; nothing renders otherwise (or
// offline, or before the list arrives). The list request is shared with the
// Exams tab's badge (assignedExamsApi keeps it 30 s).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from '../../components/ui/icons';
import { listAssignedExams } from './assignedExamsApi';
import { newExams } from './examMath';

export default function NewExamLink() {
  const [fresh, setFresh] = useState([]);
  useEffect(() => {
    let live = true;
    listAssignedExams().then((items) => { if (live) setFresh(newExams(items)); }, () => {});
    return () => { live = false; };
  }, []);
  if (fresh.length === 0) return null;
  return (
    <Link
      to="/exams?tab=assigned"
      className="touch-target inline-flex items-center gap-1.5 min-h-8 min-w-0 max-w-full text-xs text-textMain hover:underline underline-offset-2"
    >
      <FileText size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{fresh.length === 1 ? `New exam: ${fresh[0].title}` : `${fresh.length} new exams from your reviewer`}</span>
    </Link>
  );
}
