import { useState } from 'react'
import { mesAtual } from '@/lib/utils'
import { formatHours, formatPercent } from '@/lib/formatters'
import { useEngine } from '@/hooks/useEngine'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Periodo, ResultadoCapacidade } from '@/types'

function CapacidadeBar({ pct, status }: { pct: number; status: ResultadoCapacidade['status'] }) {
  const w = Math.min(100, pct * 100)
  return (
    <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', {
          'bg-success': status === 'Livre',
          'bg-warning': status === 'Atencao',
          'bg-danger': status === 'Estourado',
        })}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

export function CapacidadePage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const { capacidade } = useEngine(periodo)

  const sorted = [...capacidade].sort((a, b) => b.ocupacaoPct - a.ocupacaoPct)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Capacidade por Setor</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="grid gap-3">
        {sorted.map((s) => (
          <div key={s.setorId} className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-800 text-sm">{s.setorNome}</span>
                <Badge
                  variant={
                    s.status === 'Estourado'
                      ? 'danger'
                      : s.status === 'Atencao'
                      ? 'warning'
                      : 'success'
                  }
                >
                  {s.status}
                </Badge>
              </div>
              <span
                className={cn('text-sm font-bold', {
                  'text-success': s.status === 'Livre',
                  'text-warning': s.status === 'Atencao',
                  'text-danger': s.status === 'Estourado',
                })}
              >
                {formatPercent(s.ocupacaoPct)}
              </span>
            </div>
            <CapacidadeBar pct={s.ocupacaoPct} status={s.status} />
            <div className="flex justify-between mt-2 text-xs text-muted">
              <span>{formatHours(s.consumoHoras)} consumidas</span>
              <span>{formatHours(s.capacidadeHoras)} disponíveis</span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted text-center py-12">
            Nenhum dado de capacidade para o período.
          </p>
        )}
      </div>
    </div>
  )
}
