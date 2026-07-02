import { useState, useMemo } from 'react'
import { mesAtual } from '@/lib/utils'
import { formatCurrency, formatPercent, formatHours, formatMesAno } from '@/lib/formatters'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useSetoresStore } from '@/stores/setoresStore'
import { useConfigStore } from '@/stores/configStore'
import { useSheetsStore } from '@/stores/sheetsStore'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { calcCustoHora, calcHorasDisponiveis } from '@/lib/calc/custoHora'
import { encontrarColaborador } from '@/lib/calc/vinculo'
import { mesAnoNoPeriodo, mesesEntre } from '@/lib/utils'
import type { Periodo } from '@/types'

export function ColaboradoresPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const colaboradores = useColaboradoresStore((s) => s.colaboradores)
  const setores = useSetoresStore((s) => s.setores)
  const aproveitamentoPct = useConfigStore((s) => s.aproveitamentoPct)
  const tarefas = useSheetsStore((s) => s.tarefas)

  const meses = useMemo(() => mesesEntre(periodo.inicio, periodo.fim), [periodo])
  const mesRef = meses[meses.length - 1] ?? mesAtual()

  const rows = useMemo(() => {
    return colaboradores.map((col) => {
      const custoHora = calcCustoHora(col, mesRef, aproveitamentoPct)
      const horasDispMes = calcHorasDisponiveis(col, aproveitamentoPct)
      const horasDispTotal = horasDispMes * meses.length

      const horasTrabalhadas = tarefas
        .filter(
          (t) =>
            mesAnoNoPeriodo(t.mesAno, periodo.inicio, periodo.fim) &&
            encontrarColaborador(t.executionResponsible, [col]) !== null
        )
        .reduce((s, t) => s + t.horas, 0)

      const ocupacaoPct = horasDispTotal > 0 ? horasTrabalhadas / horasDispTotal : 0

      const nomeSetores = col.alocacoes
        .filter((a) => a.percentual > 0)
        .map((a) => setores.find((s) => s.id === a.setorId)?.nome ?? a.setorId)

      return {
        id: col.id,
        nome: col.nome,
        status: col.status,
        setores: nomeSetores,
        custoHora,
        horasDispTotal,
        horasTrabalhadas,
        ocupacaoPct,
      }
    })
  }, [colaboradores, setores, tarefas, periodo, meses, mesRef, aproveitamentoPct])

  const columns = [
    { key: 'nome', header: 'Colaborador', render: (r: typeof rows[0]) => (
      <div>
        <p className="font-medium text-neutral-800">{r.nome}</p>
        <p className="text-xs text-muted">{r.setores.join(', ')}</p>
      </div>
    )},
    { key: 'status', header: 'Status', align: 'center' as const, render: (r: typeof rows[0]) => (
      <Badge variant={r.status === 'Ativo' ? 'success' : 'neutral'}>{r.status}</Badge>
    )},
    { key: 'custoHora', header: 'Custo/hora', align: 'right' as const, render: (r: typeof rows[0]) => formatCurrency(r.custoHora) },
    { key: 'horasTrabalhadas', header: 'Horas iClips', align: 'right' as const, render: (r: typeof rows[0]) => formatHours(r.horasTrabalhadas) },
    { key: 'horasDispTotal', header: 'Capacidade', align: 'right' as const, render: (r: typeof rows[0]) => formatHours(r.horasDispTotal) },
    { key: 'ocupacaoPct', header: 'Ocupação', align: 'right' as const, render: (r: typeof rows[0]) => (
      <Badge variant={r.ocupacaoPct >= 1 ? 'danger' : r.ocupacaoPct >= 0.85 ? 'warning' : 'success'}>
        {formatPercent(r.ocupacaoPct)}
      </Badge>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Colaboradores</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <p className="text-xs text-muted">
        Custo/hora calculado com base no salário vigente em {formatMesAno(mesRef)} e {Math.round(aproveitamentoPct * 100)}% de aproveitamento.
      </p>

      <Table
        columns={columns}
        data={rows}
        keyFn={(r) => r.id}
        emptyText="Nenhum colaborador cadastrado."
      />
    </div>
  )
}
