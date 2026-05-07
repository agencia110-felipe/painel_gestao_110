import { useState, Fragment, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  expandedRow?: (row: T) => ReactNode
  loading?: boolean
  keyExtractor?: (row: T, i: number) => string
  rowClassName?: (row: T) => string
}

export function DataTable<T>({
  columns, data, onRowClick, expandedRow, loading, keyExtractor, rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 25

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  let sorted = [...data]
  if (sortKey) {
    sorted.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }

  const pages = Math.ceil(sorted.length / pageSize)
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center text-muted text-sm">
        Carregando dados...
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-page">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-muted text-xs uppercase tracking-wide whitespace-nowrap
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:text-neutral select-none' : ''}
                    ${col.width || ''}
                  `}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        : <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted text-sm">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => {
                const idx = page * pageSize + i
                const key = keyExtractor ? keyExtractor(row, idx) : String(idx)
                return (
                  <Fragment key={key}>
                    <tr
                      className={`border-b border-border last:border-0 transition-colors
                        ${onRowClick || expandedRow ? 'cursor-pointer hover:bg-bg-page' : ''}
                        ${rowClassName ? rowClassName(row) : ''}
                      `}
                      onClick={() => {
                        onRowClick?.(row)
                        if (expandedRow) setExpandedIdx(expandedIdx === idx ? null : idx)
                      }}
                    >
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-neutral
                            ${col.align === 'right' ? 'text-right font-mono-nums' : col.align === 'center' ? 'text-center' : ''}
                          `}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                    {expandedRow && expandedIdx === idx && (
                      <tr className="bg-primary-bg">
                        <td colSpan={columns.length} className="px-4 py-4">
                          {expandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
          <span>{sorted.length} registros</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 rounded border border-border hover:bg-bg-page disabled:opacity-40"
            >←</button>
            <span className="px-2">{page + 1}/{pages}</span>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 rounded border border-border hover:bg-bg-page disabled:opacity-40"
            >→</button>
          </div>
        </div>
      )}
    </div>
  )
}
