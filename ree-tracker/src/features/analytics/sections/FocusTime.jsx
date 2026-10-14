// src/features/analytics/sections/FocusTime.jsx
//
// Progress › Habits › Focus time: the Pomodoro's focus blocks (deep/focus-time)
// — minutes per day for two weeks, and how the last 30 days split across the
// board's subjects beside their PRC weights, so "EE is 45% of the board but
// 20% of my focus" is visible. This week runs against a weekly goal the
// learner sets (FocusGoal). Pick what a block is for on the timer; fix or
// delete a logged block under Recent blocks.
import { toDisplaySubject } from '@ree/shared';
import { ProgressIndicator } from '../../../components/ui';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, SectionCard, StatTile } from './shared';
import { formatDuration } from '../../../utils/time';
import { focusGapLine, pct } from './focusGap';
import RecentFocusBlocks from './RecentFocusBlocks';
import FocusGoal from './FocusGoal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (isoDate) => {
  const [, m, d] = String(isoDate).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${d}` : isoDate;
};
export default function FocusTime() {
  const { data, status, retry } = useDeepAnalytics('focus-time');
  const days = (data?.days || []).map((d) => ({ ...d, shortDate: shortDay(d.date) }));
  const total14 = days.reduce((a, d) => a + d.minutes, 0);
  const activeDays = days.filter((d) => d.minutes > 0).length;
  const last30 = data?.last30 || { minutes: 0, blocks: 0 };
  const shares = data?.shares || [];
  const gap = data?.boardMinutes > 0 ? focusGapLine(shares) : null;

  return (
    <SectionCard eyebrow="Habits" title="Focus time">
      <DeepStatus status={status} retry={retry}>
        {last30.blocks === 0 ? (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted2">
              Start a focus block on the timer, and pick what it’s for. Finished blocks (and any you stop after five minutes) show here, split by subject.
            </p>
            <FocusGoal week={data?.week} goal={data?.goal} shares={shares} onSaved={retry} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <FocusGoal week={data?.week} goal={data?.goal} shares={shares} onSaved={retry} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile label="Focus (last 14 days)" value={formatDuration(total14 * 60)} color="var(--color-reeAmber-text)" />
              <StatTile label="Blocks (last 30 days)" value={String(last30.blocks)} sub={formatDuration(last30.minutes * 60)} color="var(--accent-text)" />
              <StatTile label="Average per focus day" value={activeDays > 0 ? `${Math.round(total14 / activeDays)}min` : '—'} color="var(--accent-success)" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-eyebrow">Focus minutes per day, last 14 days</h3>
              <BarList items={days} valueKey="minutes" labelKey="shortDate" empty="" limit={days.length} />
            </div>

            {data?.boardMinutes > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-eyebrow">Your focus by subject, last 30 days, against the board</h3>
                {gap && <p className="text-sm text-textMain">{gap}</p>}
                <ul className="flex flex-col gap-3">
                  {shares.map((s) => (
                    <li key={s.subject} className="flex flex-col gap-1.5">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-textMain font-medium">{toDisplaySubject(s.subject)}</span>
                        <span className="text-muted2 tabular-nums">
                          {pct(s.share)}% of your focus{s.weight != null && <> · {pct(s.weight)}% of the board</>}
                        </span>
                      </div>
                      <ProgressIndicator
                        value={pct(s.share)}
                        tone={s.weight != null && s.weight - s.share >= 0.15 ? 'amber' : 'success'}
                        size="sm"
                        ariaLabel={`${toDisplaySubject(s.subject)}: ${pct(s.share)}% of your focus${s.weight != null ? `, ${pct(s.weight)}% of the board` : ''}`}
                      />
                    </li>
                  ))}
                </ul>
                {last30.bySubject?.General > 0 && (
                  <p className="text-xs text-muted2">Plus {formatDuration(last30.bySubject.General * 60)} marked General, not counted in the split.</p>
                )}
              </div>
            )}

            <RecentFocusBlocks blocks={data?.recent} onChanged={retry} />
          </div>
        )}
      </DeepStatus>
    </SectionCard>
  );
}
