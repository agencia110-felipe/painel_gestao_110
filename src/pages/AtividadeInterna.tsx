import { useState, useMemo } from 'react'
import { mesAtual, mesAnoNoPeriodo } from '@/lib/utils'
import { formatHours, formatMesAno } from '@/lib/formatters'
import { useSheetsStore } from '@/stores/sheetsStore'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useClientesStore } from '@/stores/clientesStore'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { Table } from '@/components/ui/Table'
import { encontrarColaborador, encontrarCliente } from '@/lib/calc/vinculo'
import type { Periodo, TarefaIClips } from '@/types'

export function AtividadeInternaPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const tarefas = useSheetsStore((s) => s.tarefas)
  const colaboradores = useColaboradoresStore((s) => s.colaboradores)
  const clientes = useClientesStore((s) => s.clientes)

  const internos = useMemo(
    () => clientes.filter((c) => c.isInterno),
    [clientes]
  )

  const tarefasInternas = useMemo(() => {
    return tarefas.filter((t) => {
      if (!mesAnoNoPeriodo(t.mesAno, periodo.inicio, periodo.fim)) return false
      const cli = encontrarCliente(t.clientName, internos)
      return cli !== null
    })
  }, [tarefas, internos, periodo])

  // Agrega por colaborador + cliente interno
  const agregado = useMemo(() => {
    const map = new Map<string, { colaborador: string; cliente: string; horas: number; tarefas: number }>()
    for (const t of tarefasInternas) {
      const col = encontrarColaborador(t.executionResponsible, colaboradores)
      const cli = encontrarCliente(t.clientName, internos)
      const key = `${col?.id ?? t.executionResponsible}__${cli?.id ?? t.clientName}`
      const ex = map.get(key)
      if (ex) { ex.horas += t.horas; ex.tarefas++ }
      else map.set(key, {
        colaborador: col?.nome ?? t.executionResponsible,
        cliente: cli?.nome ?? t.clientName,
        horas: t.horas,
        tarefas: 1,
      })
    }
    return [...map.values()].sort((a, b) => b.horas - a.horas)
  }, [tarefasInternas, colaboradores, internos])

  const totalHoras = tarefasInternas.reduce((s, t) => s + t.horas, 0)

  const columns = [
    { key: 'colaborador', header: 'Colaborador', render: (r: typeof agregado[0]) => (
      <span className="font-medium text-neutral-800">{r.colaborador}</span>
    )},
    { key: 'cliente', header: 'Job / Cliente Interno', render: (r: typeof agregado[0]) => (
      <span className="text-neutral-600">{r.cliente}</span>
    )},
    { key: 'tarefas', header: 'Tarefas', align: 'right' as const },
    { key: 'horas', header: 'Horas', align: 'right' as const, render: (r: typeof agregado[0]) => formatHours(r.horas) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Atividade Interna</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="flex gap-4 text-sm text-muted">
        <span>{tarefasInternas.length} tarefas internas</span>
        <span>·</span>
        <span className="font-medium text-neutral-700">{formatHours(totalHoras)} no período</span>
      </div>

      {internos.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted">
          Nenhum cliente marcado como "Interno". Configure em Configurações → Clientes.
        </div>
      ) : (
        <Table
          columns={columns}
          data={agregado}
          keyFn={(_, i) => i}
          emptyText="Nenhuma atividade interna no período."
        />
      )}
    </div>
  )
}
