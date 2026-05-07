import { useState, useMemo } from 'react'
import { ReferenceLine, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useCustosStore } from '@/store/useCustosStore'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import {
  calcCapacidadeSetor,
  calcStatusSetor,
  calcHorasFaturaveisTotal,
  calcCustoTotalMensal,
  calcCustoPorHoraReal,
  calcPrecoPorHoraMinimo,
  calcPrecoPorHoraRecomendado,
} from '@/lib/calculations'
import { formatCurrency, formatHours, formatPercent } from '@/lib/formatters'
import { CHART_COLORS, PACOTES_BASE } from '@/lib/constants'

const SETORES = ['Tráfego', 'Atendimento', 'Criação'] as const
type Setor = typeof SETORES[number]

const SETOR_WEIGHTS: Record<Setor, number> = {
  'Tráfego': 0.6,
  'Atendimento': 0.25,
  'Criação': 0.15,
}

const SETOR_COLORS: Record<Setor, string> = {
  'Tráfego': CHART_COLORS.primary,
  'Atendimento': CHART_COLORS.secondary,
  'Criação': CHART_COLORS.purple,
}

function progressColor(pct: number): string {
  if (pct >= 0.85) return '#C0392B'
  if (pct >= 0.75) return '#E69500'
  return '#2D8A45'
}

export function Capacidade() {
  const { clientesFiltrados, labelPeriodo } = useFilteredSheets()
  const { equipe, fixos, variaveis } = useCustosStore()
  const { params } = useConfigStore()
  const { clientes } = useSheetsStore()
  const [simHoras, setSimHoras] = useState(0)

  const totalHorasClientes = clientesFiltrados.reduce((s, c) => s + c.tempoTrabalhado, 0)

  const setoresData = useMemo(() => SETORES.map(setor => {
    const cap = calcCapacidadeSetor(equipe, setor, params.horasMes, params.aproveitamentoPct)
    const consumo = totalHorasClientes * SETOR_WEIGHTS[setor]
    const pct = cap > 0 ? consumo / cap : 0
    const status = calcStatusSetor(consumo, cap, params.gatilhoContratacaoPct)
    return { setor, cap, consumo, pct, status, folga: cap - consumo }
  }), [equipe, params, totalHorasClientes])

  const totalCap = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const totalConsumo = totalHorasClientes
  const totalOcupacao = totalCap > 0 ? totalConsumo / totalCap : 0
  const totalFolga = totalCap - totalConsumo

  // Preço recomendado para simulador
  const custoTotal = calcCustoTotalMensal(equipe, fixos, variaveis)
  const custoH = calcCustoPorHoraReal(custoTotal, totalCap)
  const precoMin = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoRec = calcPrecoPorHoraRecomendado(precoMin, params.fatorComplexidadePct)

  // Simulador
  const simSetores = SETORES.map(setor => {
    const novoConsumo = setoresData.find(s => s.setor === setor)!.consumo + simHoras * SETOR_WEIGHTS[setor]
    const cap = setoresData.find(s => s.setor === setor)!.cap
    return { setor, novoConsumo, cap, pct: cap > 0 ? novoConsumo / cap : 0 }
  })
  const gargalo = simSetores.find(s => s.pct >= 1)
  const simReceita = simHoras * precoRec
  const pacoteSugerido = [...PACOTES_BASE].sort((a, b) => Math.abs(a.horas - simHoras) - Math.abs(b.horas - simHoras))[0]

  // Histórico por mês (mock baseado em meses disponíveis)
  const meses = [...new Set(clientes.map(c => c.mesAno))].sort()
  const historicoData = meses.map(mes => {
    const cMes = clientes.filter(c => c.mesAno === mes)
    const hMes = cMes.reduce((s, c) => s + c.tempoTrabalhado, 0)
    const result: Record<string, number | string> = { mes }
    SETORES.forEach(setor => {
      const cap = calcCapacidadeSetor(equipe, setor, params.horasMes, params.aproveitamentoPct)
      const consumo = hMes * SETOR_WEIGHTS[setor]
      result[setor] = cap > 0 ? Math.round((consumo / cap) * 100) : 0
    })
    return result
  })

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Capacidade</h1>
        <p className="text-sm text-muted mt-1">Análise de ocupação por setor — {labelPeriodo}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Horas Faturáveis Totais" value={formatHours(totalCap)} />
        <MetricCard label="Consumo Atual" value={formatHours(totalConsumo)} subtext={labelPeriodo} />
        <MetricCard
          label="Ocupação Geral"
          value={formatPercent(totalOcupacao)}
          variant={totalOcupacao >= 0.85 ? 'danger' : totalOcupacao >= 0.75 ? 'warning' : 'success'}
        />
        <MetricCard label="Folga Total" value={formatHours(totalFolga)} variant={totalFolga < 0 ? 'danger' : 'default'} />
      </div>

      {/* Setor cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {setoresData.map(({ setor, cap, consumo, pct, status, folga }) => (
          <div key={setor} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral">{setor}</h3>
              <StatusBadge status={status} size="sm" />
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span>{formatHours(consumo)} consumidas</span>
                <span>{formatHours(cap)} capacidade</span>
              </div>
              <div className="h-2.5 bg-neutral/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: progressColor(pct) }}
                />
              </div>
              {/* Gatilho marker */}
              <div className="relative h-1 mt-0.5">
                <div
                  className="absolute w-0.5 h-3 bg-warning -top-1 opacity-60"
                  style={{ left: `${params.gatilhoContratacaoPct * 100}%` }}
                  title={`Gatilho ${formatPercent(params.gatilhoContratacaoPct)}`}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm mt-3">
              <span className="text-muted">Ocupação</span>
              <span className="font-semibold" style={{ color: progressColor(pct) }}>{formatPercent(pct)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted">{folga >= 0 ? 'Folga' : 'Excedente'}</span>
              <span className={`font-medium ${folga >= 0 ? 'text-success' : 'text-danger'}`}>{formatHours(Math.abs(folga))}</span>
            </div>
            <div className="flex justify-between text-xs mt-1 text-muted">
              <span>Gatilho em {formatPercent(params.gatilhoContratacaoPct)}</span>
              <span>{formatHours(cap * params.gatilhoContratacaoPct)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Simulator */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-4">Simulador — Novo Cliente</h3>
        <div className="flex items-end gap-4 mb-5">
          <div>
            <label className="text-xs text-muted mb-1 block">Horas do novo cliente/mês</label>
            <input
              type="number"
              min="0"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
              value={simHoras || ''}
              onChange={e => setSimHoras(Number(e.target.value))}
              placeholder="Ex: 40"
            />
          </div>
          {simHoras > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${gargalo ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
              {gargalo ? `Gargalo em ${gargalo.setor}` : 'Pode fechar!'}
            </div>
          )}
        </div>
        {simHoras > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-page rounded-lg p-3">
              <p className="text-xs text-muted mb-1">Receita estimada</p>
              <p className="font-semibold text-neutral">{formatCurrency(simReceita)}</p>
            </div>
            <div className="bg-bg-page rounded-lg p-3">
              <p className="text-xs text-muted mb-1">Pacote sugerido</p>
              <p className="font-semibold text-neutral">{pacoteSugerido?.nome} ({pacoteSugerido?.horas}h)</p>
            </div>
            {simSetores.map(s => (
              <div key={s.setor} className="bg-bg-page rounded-lg p-3">
                <p className="text-xs text-muted mb-1">{s.setor}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-neutral/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(s.pct * 100, 100)}%`, backgroundColor: progressColor(s.pct) }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: progressColor(s.pct) }}>{formatPercent(s.pct)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History chart */}
      {historicoData.length >= 2 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-neutral text-sm mb-1">Histórico de Ocupação por Setor</h3>
          <p className="text-xs text-muted mb-4">% de ocupação por setor ao longo dos meses</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={historicoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} domain={[0, 110]} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <ReferenceLine y={85} stroke={CHART_COLORS.warning} strokeDasharray="4 4" label={{ value: 'Gatilho 85%', position: 'right', fontSize: 11, fill: CHART_COLORS.warning }} />
              {SETORES.map(setor => (
                <Line key={setor} type="monotone" dataKey={setor} stroke={SETOR_COLORS[setor]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {SETORES.map(setor => (
              <span key={setor} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: SETOR_COLORS[setor] }}></span>
                {setor}
              </span>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
