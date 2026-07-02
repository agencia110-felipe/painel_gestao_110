import { useMemo } from 'react'
import type { Periodo } from '@/types'
import { mesAtual, mesesEntre } from '@/lib/utils'
import { formatMesAno } from '@/lib/formatters'

interface PeriodoFilterProps {
  periodo: Periodo
  onChange: (periodo: Periodo) => void
}

function gerarOpcoesMes(): { value: string; label: string }[] {
  const atual = mesAtual()
  const inicio = `${parseInt(atual.split('-')[0]) - 2}-01`
  return mesesEntre(inicio, atual).reverse().map((m) => ({ value: m, label: formatMesAno(m) }))
}

export function PeriodoFilter({ periodo, onChange }: PeriodoFilterProps) {
  const opcoes = useMemo(() => gerarOpcoesMes(), [])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted font-medium">Período:</span>
      <select
        value={periodo.inicio}
        onChange={(e) => onChange({ ...periodo, inicio: e.target.value })}
        className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="text-muted text-sm">até</span>
      <select
        value={periodo.fim}
        onChange={(e) => onChange({ ...periodo, fim: e.target.value })}
        className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
