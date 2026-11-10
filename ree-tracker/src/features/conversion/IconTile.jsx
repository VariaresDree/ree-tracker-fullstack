// src/features/conversion/IconTile.jsx
//
// One tile in Units and tools: an icon, a short name, and a quiet line under it
// (a quantity's units, a tool's subject). The full name is the accessible name.
import { Card, IconChip } from '../../components/ui';

export default function IconTile({ icon, tone = 'accent', title, detail, label, onClick }) {
  return (
    <Card as="button" type="button" variant="interactive" padding="none" aria-label={label} onClick={onClick} className="flex flex-col items-center text-center gap-1.5 px-2 py-3 cursor-pointer min-w-0 min-h-24">
      <IconChip icon={icon} tone={tone} size="md" />
      {/* A name hyphenates; a unit string may break anywhere. */}
      <span className="text-sm font-semibold text-textMain leading-tight hyphens-auto [overflow-wrap:break-word] max-w-full">{title}</span>
      {detail && <span className="text-xs text-muted2 leading-tight [overflow-wrap:anywhere]">{detail}</span>}
    </Card>
  );
}
