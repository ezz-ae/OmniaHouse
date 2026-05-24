import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  className?: string;
};

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  empty = 'No data',
  className,
  dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  className?: string;
  dense?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="panel p-8 text-center text-sm text-ink-dim">{empty}</div>
    );
  }
  return (
    <div className={cn('panel overflow-hidden', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-line-soft">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn(
                  'label px-3 py-2 text-left font-medium',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40 transition-colors',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 text-sm',
                    dense ? 'py-1.5' : 'py-2.5',
                    c.align === 'right' && 'text-right numeric',
                    c.align === 'center' && 'text-center',
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
