import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'

type Format = 'currency' | 'percent' | 'hours' | 'number'

interface TooltipEntry {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  format?: Format
}

export function CustomTooltip({ active, payload, label, format = 'currency' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  function fmt(v: number) {
    if (format === 'currency') return formatCurrency(v)
    if (format === 'percent') return formatPercent(v)
    if (format === 'hours') return formatHours(v)
    return v.toLocaleString('pt-BR')
  }

  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm min-w-[140px]">
      {label && <p className="font-medium text-neutral mb-2 text-xs">{label}</p>}
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted text-xs">{entry.name}</span>
          </div>
          <span className="font-medium text-neutral font-mono-nums text-xs">
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
