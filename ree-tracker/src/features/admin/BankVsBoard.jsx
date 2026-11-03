// src/features/admin/BankVsBoard.jsx
//
// Admin › Question bank: the bank's questions beside the board's items per topic
// (PRC's table of specifications, @ree/shared/boardItems), thinnest first. It says
// where to generate or import next, since PRC papers now draw by these counts and
// a thin topic repeats soon. Loads when opened: it's a count of the whole bank.
import { useState } from 'react';
import { SYLLABUS_SUBJECTS } from '@ree/shared';
import { bankVsBoard } from '@ree/shared/boardItems';
import { apiRequest } from '../../services/dbQueries';
import { Disclosure, SegmentedControl, Skeleton, StatusPill } from '../../components/ui';

const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
// Under this many questions per board item, a learner sees repeats within a few papers.
const THIN_PER_ITEM = 15;

export default function BankVsBoard() {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(null);
  const [subject, setSubject] = useState('EE');

  const load = (opening) => {
    if (!opening || rows) return;
    setFailed(null);
    apiRequest('/api/admin/bank-counts', 'GET', null, { timeoutMs: 30_000 })
      .then((res) => setRows(res.items || []))
      .catch((err) => setFailed(err.message || 'Could not count the bank.'));
  };

  const counts = Object.fromEntries((rows || []).filter((r) => r.subject === subject).map((r) => [r.topic, r.count]));
  const { groups, unitemized } = bankVsBoard(counts, subject);

  return (
    <Disclosure title="Bank vs board" description="Questions in the bank beside the board’s items per topic, thinnest first." onToggle={load}>
      <div className="flex flex-col gap-3">
        <SegmentedControl label="Subject" options={SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABEL[s] }))} value={subject} onChange={setSubject} fullWidth />
        {failed && <p role="alert" className="text-sm text-[var(--accent-danger)]">{failed}</p>}
        {!rows && !failed && <Skeleton className="h-40" />}
        {rows && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{subject}: the bank against the board’s 100 items</caption>
                <thead>
                  <tr className="text-left text-eyebrow">
                    <th scope="col" className="py-2 pr-3 font-normal">Topic</th>
                    <th scope="col" className="py-2 px-3 font-normal text-right">Items</th>
                    <th scope="col" className="py-2 px-3 font-normal text-right">Questions</th>
                    <th scope="col" className="py-2 pl-3 font-normal text-right">Per item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map((g) => (
                    <tr key={g.topics[0]}>
                      <th scope="row" className="py-2 pr-3 text-left font-normal text-textMain [overflow-wrap:anywhere]">{g.topics.join(', ')}</th>
                      <td className="py-2 px-3 text-right tabular-nums text-muted2">{g.items}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-textMain">{g.questions.toLocaleString('en-PH')}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-textMain whitespace-nowrap">
                        {g.perItem < THIN_PER_ITEM && <StatusPill tone="danger" dot={false} className="mr-2">Thin</StatusPill>}
                        {Math.round(g.perItem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted2">
              Thin: under {THIN_PER_ITEM} questions per board item, so a learner sees repeats within a few papers.
            </p>
            {unitemized.length > 0 && (
              <p className="text-xs text-muted2">
                Not itemized by PRC, so these rarely appear in PRC papers: {unitemized.map((u) => `${u.topic} (${u.questions})`).join(', ')}.
              </p>
            )}
          </>
        )}
      </div>
    </Disclosure>
  );
}
