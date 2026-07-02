import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T, i: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn: (row: T, i: number) => string | number
  emptyText?: string
  className?: string
}

export function Table<T>({ columns, data, keyFn, emptyText = 'Nenhum registro.', className }: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide',
                  {
                    'text-left': col.align === 'left' || !col.align,
                    'text-center': col.align === 'center',
                    'text-right': col.align === 'right',
                  },
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={keyFn(row, i)} className="hover:bg-neutral-50/50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-neutral-700',
                      {
                        'text-left': col.align === 'left' || !col.align,
                        'text-center': col.align === 'center',
                        'text-right': col.align === 'right',
                      },
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
