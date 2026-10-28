// src/features/analytics/sections/SelfVsData.jsx
//
// Progress › Confidence › Your rating vs your answers: each syllabus topic's
// own rating (how sure, how much it's dreaded; the CELE tracker's "Meta
// topics") set against what the learner's answers say. Topics rated surer
// than the answers bear out, topics known better than rated, and dreaded
// topics split by whether the dread is earned. The ratings are set in
// Progress › Syllabus. Needs MIN_ANSWERS answers in a topic to compare.
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Panel, Skeleton } from '../../../components/ui';
import { Crosshair, Scale } from '../../../components/ui/icons';
import { useSyllabus } from '../../syllabus/useSyllabus';
import { compareSelfRating, dreadLabel, MIN_ANSWERS, GAP } from '../../syllabus/selfRating';
import { drillPreset, launchPractice } from '../../active-recall/presets';

const FRESH_MS = 5 * 60 * 1000;

function Group({ title, hint, rows, detail, onDrill }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-h3 text-textMain">{title}</h3>
      <p className="text-xs text-muted2">{hint}</p>
      <ul className="flex flex-col gap-2">
        {rows.slice(0, 5).map((r) => (
          <li key={r.topicId}>
            <Card variant="inset" padding="sm" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-textMain [overflow-wrap:anywhere]">{r.name}</p>
                <p className="text-xs text-muted2 tabular-nums">{detail(r)}</p>
              </div>
              {onDrill && (
                <Button type="button" size="sm" variant="secondary" onClick={() => onDrill(r)} aria-label={`Drill ${r.name}`}>
                  <Crosshair size={14} strokeWidth={1.75} aria-hidden="true" /> Drill
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SelfVsData() {
  const navigate = useNavigate();
  const { topics } = useSyllabus({ fetchIfOlderThanMs: FRESH_MS });
  const drill = (r) => launchPractice(navigate, drillPreset({ topicId: r.topicId, topic: r.name, subject: r.subject }));

  let body;
  if (topics === null) {
    body = <Skeleton className="h-24 w-full" />;
  } else {
    const c = compareSelfRating(topics);
    const any = c.above.length + c.below.length + c.dreadedWeak.length + c.dreadedStrong.length > 0;
    body = c.rated === 0 ? (
      <EmptyState
        compact
        icon={Scale}
        title="No topics rated yet"
        description="In Progress › Syllabus, rate how sure you are of each topic and how much you dread it. This shows where your feeling and your answers disagree."
      />
    ) : !any ? (
      <p className="text-sm text-muted2">
        {c.tooFew > 0
          ? `Your ratings and your answers agree so far. ${c.tooFew} rated ${c.tooFew === 1 ? 'topic needs' : 'topics need'} ${MIN_ANSWERS} answers before it can be compared.`
          : 'Your ratings and your answers agree: no topic is off by more than 25 points.'}
      </p>
    ) : (
      <div className="flex flex-col gap-5">
        <Group
          title="Rated above your answers"
          hint={`You feel surer than your answers show, by ${GAP} points or more. Drill these before they surprise you.`}
          rows={c.above}
          detail={(r) => `You: ${r.confidence}% sure · answers: ${r.mastery}%`}
          onDrill={drill}
        />
        <Group
          title="Dreaded, and the answers agree"
          hint="Worth facing early: the plan drills these sooner."
          rows={c.dreadedWeak}
          detail={(r) => `Dread: ${dreadLabel(r.dread)} · answers: ${r.mastery}%`}
          onDrill={drill}
        />
        <Group
          title="You know these better than you think"
          hint={`Your answers are ${GAP} points or more ahead of your rating.`}
          rows={c.below}
          detail={(r) => `You: ${r.confidence}% sure · answers: ${r.mastery}%`}
        />
        <Group
          title="Dreaded, but you’re ready"
          hint="Proficient or better on your answers. The dread isn’t earned."
          rows={c.dreadedStrong}
          detail={(r) => `Dread: ${dreadLabel(r.dread)} · answers: ${r.mastery}%`}
        />
        {c.tooFew > 0 && (
          <p className="text-xs text-muted2">{c.tooFew} rated {c.tooFew === 1 ? 'topic has' : 'topics have'} fewer than {MIN_ANSWERS} answers, so {c.tooFew === 1 ? 'it isn’t' : 'they aren’t'} compared yet.</p>
        )}
      </div>
    );
  }

  return (
    <Panel icon={Scale} eyebrow="Self-check" title="Your rating vs your answers" bodyClassName="flex flex-col gap-4">
      {body}
    </Panel>
  );
}
