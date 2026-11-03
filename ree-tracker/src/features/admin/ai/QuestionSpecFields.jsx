// src/features/admin/ai/QuestionSpecFields.jsx
//
// What to write: subject, topic, focus, how many, type and difficulty. Shared by
// the in-app generator and Import from another AI, so the two ask the same
// things. `children` go under More options.
import { useStore } from '../../../store/useStore';
import { calculationCount, DIFFICULTY_MIXES, QUESTION_TYPES } from '../../../services/aiPrompts';
import { Button, FormField, Input, SegmentedControl, Select, Textarea } from '../../../components/ui';
import { ChevronDown } from '../../../components/ui/icons';

export default function QuestionSpecFields({ spec, update, maxCount, countHint, presets, idPrefix, children }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS) || {};
  const total = Math.min(maxCount, spec.count || 1);
  const calcN = calculationCount(total, spec.type, spec.calcShare);
  const setCount = (value) => {
    const n = Math.round(Number(value));
    update({ count: Number.isFinite(n) ? Math.min(maxCount, Math.max(1, n)) : 1 });
  };

  return (
    <>
      <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-3">
        <FormField label="Subject">
          <Select value={spec.subject} onChange={(e) => update({ subject: e.target.value, topic: 'All' })}>
            {Object.keys(dynamicTOS).map((s) => <option key={s} value={s}>{s === 'Mathematics' ? 'Mathematics (Math)' : s}</option>)}
          </Select>
        </FormField>
        <FormField label="Topic">
          <Select value={spec.topic} onChange={(e) => update({ topic: e.target.value })}>
            <option value="All">All topics (spread across them)</option>
            {(dynamicTOS[spec.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Specific focus (optional)" className="@xl:col-span-2 @3xl:col-span-1">
          <Input value={spec.focus} onChange={(e) => update({ focus: e.target.value })} placeholder="e.g. transformer efficiency, PEC grounding" />
        </FormField>
      </div>

      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <FormField label="How many questions" hint={countHint}>
            {(a11y) => (
              <div className="flex gap-2 items-center flex-wrap">
                <Input {...a11y} type="number" inputMode="numeric" min={1} max={maxCount} value={spec.count}
                  onChange={(e) => setCount(e.target.value)} className="!w-24" />
                {presets.map((n) => (
                  <Button key={n} type="button" size="sm" variant={spec.count === n ? 'primary' : 'secondary'} onClick={() => update({ count: n })} aria-pressed={spec.count === n}>
                    {n}
                  </Button>
                ))}
              </div>
            )}
          </FormField>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-eyebrow">Question type</span>
          <SegmentedControl
            label="Question type"
            value={spec.type}
            onChange={(type) => update({ type })}
            options={QUESTION_TYPES.map((t) => ({
              ...t,
              hint: t.value === 'mixed' ? 'Both kinds' : t.value === 'conceptual' ? 'Theory, code' : 'Problem solving',
            }))}
          />
          {spec.type === 'mixed' && (
            <div className="flex flex-col gap-1 mt-1">
              <label htmlFor={`${idPrefix}-share`} className="text-xs text-muted2 flex justify-between">
                <span>Calculation share</span>
                <span className="tabular-nums text-textMain">{calcN} calculation · {total - calcN} conceptual</span>
              </label>
              <input id={`${idPrefix}-share`} type="range" min={0} max={100} step={10}
                value={Math.round(spec.calcShare * 100)}
                onChange={(e) => update({ calcShare: Number(e.target.value) / 100 })}
                className="w-full accent-[var(--accent)]" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-eyebrow">Difficulty</span>
        <SegmentedControl
          label="Difficulty"
          value={spec.difficulty}
          onChange={(difficulty) => update({ difficulty })}
          columns={4}
          options={Object.entries(DIFFICULTY_MIXES).map(([value, d]) => ({
            value,
            label: d.label,
            hint: value === 'board' ? '30 / 50 / 20' : undefined,
          }))}
        />
      </div>

      <details className="group rounded-[var(--radius-default)] border border-border bg-bg px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-textMain flex items-center gap-2 list-none">
          <ChevronDown size={15} strokeWidth={1.75} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          More options
        </summary>
        <div className="flex flex-col gap-4 mt-4">
          <FormField label="Instructions for the writer (optional)" hint="Anything else: a style of problem, values to use, a reference to follow.">
            <Textarea rows={3} value={spec.notes} maxLength={600} onChange={(e) => update({ notes: e.target.value })}
              placeholder="e.g. Use three-phase delta-connected loads. Include one PEC ampacity question." />
          </FormField>
          {children}
        </div>
      </details>
    </>
  );
}
