import React from 'react';
import { cn } from '@/src/lib/utils';

interface DataTableProps<T> {
  columns: {
    header: string;
    accessorKey: keyof T | 'actions';
    cell?: (row: T) => React.ReactNode;
    className?: string;
  }[];
  data: T[];
  emptyState?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({ columns, data, emptyState }: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="text-[10px] uppercase text-neutral-500 font-bold bg-[#111114] border-b border-[#27272a]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn("px-6 py-4", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#27272a]">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-[#111114] transition-colors group">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={cn("px-6 py-4", col.className)}>
                    {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
