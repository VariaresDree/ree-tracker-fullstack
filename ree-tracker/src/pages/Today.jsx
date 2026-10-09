// src/pages/Today.jsx
//
// The home screen answers one question: what should I do now? It shows the
// exam countdown, the streak, and the Today card (readiness, pass chance,
// today's target, and the next steps, today's plan task included).
//
// It used to be an eleven-card dashboard. Pass chance and the projected
// average appeared twice, today's target three times, and "Next best actions"
// overlapped "Today's prescription". The analytics moved to Progress, the past
// sittings to Exams, and the daily-target editor to Account.
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import TodayPanel from '../features/today/TodayPanel';
import SyllabusCoverageLink from '../features/syllabus/SyllabusCoverageLink';
import { daysToExam } from '../features/today/todayActions';
import { TodaySkeleton } from '../components/SkeletonLoaders';
import StatsUnavailable from '../components/StatsUnavailable';
import { Page, PageHeader, StatusPill } from '../components/ui';
import { CalendarDays, Flame } from '../components/ui/icons';

function examLabel(days) {
  if (days < 0) return { tone: 'danger', text: 'Exam date has passed' };
  if (days === 0) return { tone: 'amber', text: 'Exam today' };
  return { tone: days <= 14 ? 'amber' : 'success', text: `${days} day${days === 1 ? '' : 's'} to the exam` };
}

function ExamCountdown({ examDate }) {
  const days = daysToExam(examDate);
  if (days == null) {
    return (
      <Link to="/account#exam-plan" className="text-xs text-muted2 hover:text-textMain hover:underline underline-offset-2">
        Set your exam date
      </Link>
    );
  }
  const { tone, text } = examLabel(days);
  return (
    <StatusPill tone={tone} dot={false}>
      <CalendarDays size={13} strokeWidth={2} aria-hidden="true" /> {text}
    </StatusPill>
  );
}

export default function Today() {
  const { currentUser } = useAuth();
  const { activeStats, readiness, readinessSettled, loading, unavailable, retry, kpi, today } = useDashboardStats({ withReadiness: true });

  if (loading) return <TodaySkeleton />;
  if (unavailable) {
    return (
      <Page>
        <PageHeader title="Today" subtitle={`Welcome back, ${currentUser?.displayName || 'Reviewer'}.`} />
        <StatsUnavailable onRetry={retry} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Today"
        subtitle={`Welcome back, ${currentUser?.displayName || 'Reviewer'}.`}
        meta={
          <>
            <ExamCountdown examDate={activeStats.examDate} />
            <SyllabusCoverageLink />
            {kpi.streak > 0 && (
              <StatusPill tone="amber" dot={false}>
                <Flame size={13} strokeWidth={2} aria-hidden="true" /> {kpi.streak}-day streak
              </StatusPill>
            )}
          </>
        }
      />

      {/* Keyed on the date so a new day remounts the panel: the forecast,
          due reviews, plan task and readiness trend all refetch. */}
      <TodayPanel key={today} today={today} stats={activeStats} readiness={readiness} readinessSettled={readinessSettled} uid={currentUser?.uid} answered={kpi.answered} />
    </Page>
  );
}
