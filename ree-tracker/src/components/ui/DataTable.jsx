import { useMemo, useState } from 'react';
import { cn } from './cn';
import { ChevronDown, ChevronUp, ChevronsUpDown } from './icons';

// Responsive data table. Renders a real <table> from `sm` up (sortable headers,
// hover rows) and reflows to stacked label/value cards on mobile. Columns:
//   { key, label, align?('left'|'right'|'center'), sortable?, render?(row), sortAccessor?(row) }
export function DataTable({
  columns = [],
  rows = [],
  initialSort = null, // { key, dir: 'asc'|'desc' }
  onRowClick,
  rowKey,
  emptyMessage = 'No records yet.',
  className,
}) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const acc = col.sortAccessor || ((r) => r[sort.key]);
    const arr = [...rows].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return sort.dir === 'desc' ? arr.reverse() : arr;
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev && prev.key === key
        ? prev.dir === 'asc'
          ? { key, dir: 'desc' }
          : null
        : { key, dir: 'asc' }
    );

  const keyOf = (r, i) => (rowKey ? rowKey(r) : r.id ?? i);
  const alignCls = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  if (!rows.length) {
    return <div className={cn('text-sm text-muted2 py-8 text-center', className)}>{emptyMessage}</div>;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop / tablet: semantic table */}
      <table className="hidden sm:table w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'py-2.5 px-3 text-[11px] font-mono uppercase tracking-[0.14em] text-muted font-medium',
                  alignCls(col.align)
                )}
                aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      'inline-flex items-center gap-1 hover:text-textMain transition-colors',
                      col.align === 'right' && 'flex-row-reverse'
                    )}
                  >
                    {col.label}
                    {sort?.key === col.key ? (
                      sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    ) : (
                      <ChevronsUpDown size={13} className="opacity-40" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={keyOf(r, i)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                'border-b border-border/60 last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-surface2/40'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('py-3 px-3 text-sm text-textMain tabular-nums align-middle', alignCls(col.align))}
                >
                  {col.render ? col.render(r) : r[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {sorted.map((r, i) => (
          <div
            key={keyOf(r, i)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cn(
              'rounded-[var(--radius-default)] border border-border bg-surface2/30 p-3 flex flex-col gap-1.5',
              onRowClick && 'cursor-pointer active:bg-surface2/60'
            )}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted shrink-0">{col.label}</span>
                <span className="text-sm text-textMain text-right tabular-nums min-w-0 truncate">
                  {col.render ? col.render(r) : r[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
