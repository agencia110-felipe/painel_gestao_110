import { useState, useMemo } from 'react'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { useConfigStore } from '@/stores/configStore'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useSetoresStore } from '@/stores/setoresStore'
import { calcCustoHora } from '@/lib/calc/custoHora'
import { mesAtual } from '@/lib/utils'
import { Card, CardTitle, StatCard } from '@/components/ui/Card'

export function CalculadoraPage() {
  const [horasEstimadas, setHorasEstimadas] = useState('80')
  const [percentualOverhead, setPercentualOverhead] = useState('30')
  const [margemDesejada, setMargemDesejada] = useState('')
  const [faturamentoEstimado, setFaturamentoEstimado] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual())
  const [colsSelecionados, setColsSelecionados] = useState<string[]>([])

  const colaboradores = useColaboradoresStore((s) => s.colaboradores)
  const setores = useSetoresStore((s) => s.setores)
  const aproveitamentoPct = useConfigStore((s) => s.aproveitamentoPct)
  const margemPadrao = useConfigStore((s) => s.margemDesejadaPct)

  const horas = Number(horasEstimadas) || 0
  const overheadPct = (Number(percentualOverhead) || 0) / 100
  const margem = (Number(margemDesejada) || margemPadrao * 100) / 100

  // Custo médio/hora dos colaboradores selecionados
  const custoHoraMedio = useMemo(() => {
    const selecionados = colaboradores.filter((c) =>
      colsSelecionados.length === 0 || colsSelecionados.includes(c.id)
    )
    if (selecionados.length === 0) return 0
    const totalCusto = selecionados.reduce(
      (s, col) => s + calcCustoHora(col, mesSelecionado, aproveitamentoPct),
      0
    )
    return totalCusto / selecionados.length
  }, [colaboradores, colsSelecionados, mesSelecionado, aproveitamentoPct])

  const custoDireto = horas * custoHoraMedio
  const custoComOverhead = custoDireto * (1 + overheadPct)
  const precoMinimo = margem < 1 ? custoComOverhead / (1 - margem) : 0

  const fatEstimado = Number(faturamentoEstimado) || 0
  const margemCalculada = fatEstimado > 0 ? (fatEstimado - custoComOverhead) / fatEstimado : null

  function toggleCol(id: string) {
    setColsSelecionados((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-neutral-900">Calculadora de Proposta</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardTitle>Parâmetros</CardTitle>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Mês de referência</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Horas estimadas</label>
              <input
                type="number"
                value={horasEstimadas}
                onChange={(e) => setHorasEstimadas(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">% Overhead (backend + fixo)</label>
              <input
                type="number"
                value={percentualOverhead}
                onChange={(e) => setPercentualOverhead(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Margem desejada (%)</label>
              <input
                type="number"
                value={margemDesejada}
                placeholder={`${Math.round(margemPadrao * 100)} (padrão)`}
                onChange={(e) => setMargemDesejada(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Faturamento estimado (opcional)</label>
              <input
                type="number"
                value={faturamentoEstimado}
                placeholder="Calcular margem real"
                onChange={(e) => setFaturamentoEstimado(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Colaboradores</CardTitle>
          <p className="text-xs text-muted mb-2">Selecione para calcular custo/hora médio (vazio = todos)</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {colaboradores.filter((c) => c.status === 'Ativo').map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colsSelecionados.includes(col.id)}
                  onChange={() => toggleCol(col.id)}
                  className="accent-primary"
                />
                <span className="text-sm text-neutral-700">{col.nome}</span>
                <span className="text-xs text-muted ml-auto">
                  {formatCurrency(calcCustoHora(col, mesSelecionado, aproveitamentoPct))}/h
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Resultado */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Custo/hora médio"
          value={formatCurrency(custoHoraMedio)}
          sub={`${formatHours(horas)} × ${formatCurrency(custoHoraMedio)}/h`}
        />
        <StatCard
          label="Custo Direto"
          value={formatCurrency(custoDireto)}
        />
        <StatCard
          label="Custo com Overhead"
          value={formatCurrency(custoComOverhead)}
          sub={`+${Math.round(overheadPct * 100)}% overhead`}
        />
        <StatCard
          label="Preço Mínimo (com margem)"
          value={formatCurrency(precoMinimo)}
          sub={`Margem ${formatPercent(margem)}`}
          color={precoMinimo > 0 ? 'default' : 'danger'}
        />
      </div>

      {fatEstimado > 0 && margemCalculada !== null && (
        <StatCard
          label="Margem com faturamento estimado"
          value={formatPercent(margemCalculada)}
          color={margemCalculada >= margemPadrao ? 'success' : margemCalculada >= 0 ? 'warning' : 'danger'}
          sub={`Meta: ${formatPercent(margemPadrao)}`}
        />
      )}
    </div>
  )
}
