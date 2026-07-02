import { useState } from 'react'
import { mesAtual } from '@/lib/utils'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { useEngine } from '@/hooks/useEngine'
import { useConfigStore } from '@/stores/configStore'
import { PendenciasBanner } from '@/components/PendenciasBanner'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import type { Periodo, ResultadoCliente } from '@/types'

export function ClientesPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const [sortKey, setSortKey] = useState<keyof ResultadoCliente>('custoTotal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const margemDesejadaPct = useConfigStore((s) => s.margemDesejadaPct)
  const { pendencias, resultadosClientes } = useEngine(periodo)

  function handleSort(key: keyof ResultadoCliente) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...resultadosClientes].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  const columns = [
    { key: 'nome', header: 'Cliente', render: (r: ResultadoCliente) => (
      <span className="font-medium text-neutral-800">{r.nome}</span>
    )},
    { key: 'faturamento', header: 'Receita', align: 'right' as const, render: (r: ResultadoCliente) => formatCurrency(r.faturamento) },
    { key: 'horasDiretas', header: 'Horas', align: 'right' as const, render: (r: ResultadoCliente) => formatHours(r.horasDiretas) },
    { key: 'custoDireto', header: 'Custo Direto', align: 'right' as const, render: (r: ResultadoCliente) => formatCurrency(r.custoDireto) },
    { key: 'custoTotal', header: 'Custo Total', align: 'right' as const, render: (r: ResultadoCliente) => formatCurrency(r.custoTotal) },
    { key: 'margem', header: 'Margem', align: 'right' as const, render: (r: ResultadoCliente) => {
      if (r.margem === null) return <span className="text-muted">—</span>
      const ok = r.margem >= margemDesejadaPct
      const positivo = r.margem >= 0
      return (
        <Badge variant={ok ? 'success' : positivo ? 'warning' : 'danger'}>
          {formatPercent(r.margem)}
        </Badge>
      )
    }},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Clientes</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <PendenciasBanner pendencias={pendencias} />

      <Table
        columns={columns}
        data={sorted}
        keyFn={(r) => r.clienteId}
        emptyText="Nenhum cliente com dados no período."
      />

      {/* Totais */}
      {sorted.length > 0 && (
        <div className="flex gap-6 px-1 text-sm text-muted">
          <span>
            Receita total:{' '}
            <strong className="text-neutral-900">
              {formatCurrency(sorted.reduce((s, r) => s + r.faturamento, 0))}
            </strong>
          </span>
          <span>
            Custo total:{' '}
            <strong className="text-neutral-900">
              {formatCurrency(sorted.reduce((s, r) => s + r.custoTotal, 0))}
            </strong>
          </span>
        </div>
      )}
    </div>
  )
}
