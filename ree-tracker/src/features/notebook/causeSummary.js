// src/features/notebook/causeSummary.js
import { MISTAKE_CAUSES, MISTAKE_CAUSE_LABELS } from '@ree/shared';

const PHRASE = {
  concept: 'gaps in the concept',
  computation: 'computation slips',
  misread: 'misreading the question',
  time: 'running out of time',
};

/** "Most of your tagged misses are computation slips" — once three or more are tagged. */
export function causeSummary(items) {
  const tagged = items.filter((i) => i.cause);
  if (tagged.length < 3) return null;
  const counts = Object.fromEntries(MISTAKE_CAUSES.map((c) => [c, 0]));
  for (const i of tagged) counts[i.cause] += 1;
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const phrase = PHRASE[top];
  return n * 2 > tagged.length
    ? `Most of your tagged misses are ${phrase} (${n} of ${tagged.length}).`
    : `Your tagged misses are spread out. The most common: ${MISTAKE_CAUSE_LABELS[top].toLowerCase()} (${n} of ${tagged.length}).`;
}

