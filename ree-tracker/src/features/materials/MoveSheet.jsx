// src/features/materials/MoveSheet.jsx
//
// Where to move what's selected: the folder tree, to pick one. A folder being
// moved, and everything under it, isn't offered, so nothing lands inside itself.
// Props only, so My files can use it with its own folders.
import { useMemo, useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { FolderInput, FolderOpen } from '../../components/ui/icons';
import { byName } from './sortNames';

export default function MoveSheet({ folders, rootLabel, exclude, count, current, onMove, onClose }) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    const children = new Map();
    for (const f of folders) {
      const parent = f.parentId || 'root';
      children.set(parent, [...(children.get(parent) || []), f]);
    }
    const out = [{ id: 'root', name: rootLabel, depth: 0 }];
    const seen = new Set();
    const walk = (parent, depth) => {
      for (const f of [...(children.get(parent) || [])].sort(byName)) {
        if (exclude?.has(f.id) || seen.has(f.id)) continue;
        seen.add(f.id);
        out.push({ id: f.id, name: f.name, depth });
        walk(f.id, depth + 1);
      }
    };
    walk('root', 1);
    return out;
  }, [folders, exclude, rootLabel]);

  const move = async () => {
    setBusy(true);
    try {
      await onMove(target);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={FolderInput}
      title={count === 1 ? 'Move 1 item' : `Move ${count} items`}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} disabled={!target || target === current || busy} onClick={move}>Move here</Button>
        </>
      )}
    >
      <fieldset className="flex flex-col gap-0.5 min-w-0">
        <legend className="text-sm text-muted2 mb-2">Move to</legend>
        {rows.map((row) => (
          <label
            key={row.id}
            style={{ paddingInlineStart: `${0.5 + row.depth}rem` }}
            className="flex items-center gap-2 min-h-11 pr-2 rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface2 has-[:checked]:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] min-w-0"
          >
            <input type="radio" name="move-target" value={row.id} checked={target === row.id} onChange={() => setTarget(row.id)} className="shrink-0 accent-[var(--accent)]" />
            <FolderOpen size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--accent-text)]" />
            <span className="text-sm text-textMain min-w-0 [overflow-wrap:anywhere]">{row.name}</span>
            {row.id === current && <span className="text-xs text-muted2 shrink-0">here now</span>}
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}
