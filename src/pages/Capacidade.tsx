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
import { sortMesAno } from '@/lib/aggregation'
import { formatCurrency, formatHours, formatPercent } from '@/lib/formatters'
import { CHART_COLORS, SETOR_COLORS, PACOTES_BASE, SETORES_BACKEND_LIST } from '@/lib/constants'

const BACKEND_SET = new Set<string>(SETORES_BACKEND_LIST)

function progressColor(pct: number): string {
  if (pct >= 0.85) return '#C0392B'
  if (pct >= 0.75) return '#E69500'
  return '#2D8A45'
}

export function Capacidade() {
  const { colaboradoresFiltrados, labelPeriodo } = useFilteredSheets()
  const { equipe, fixos, variaveis } = useCustosStore()
  const { params } = useConfigStore()
  const { colaboradores } = useSheetsStore()
  const [simHoras, setSimHoras] = useState(0)

  const equipeMap = useMemo(
    () => new Map(equipe.map(m => [m.nome.trim().toLowerCase(), m])),
    [equipe]
  )

  // Horas reais por setor — distribui proporcionalmente pelas alocações de cada colaborador
  const horasPorArea = useMemo(() => {
    const map: Record<string, number> = {}
    colaboradoresFiltrados.forEach(c => {
      const membro = equipeMap.get(c.colaborador.trim().toLowerCase())
      if (!membro || membro.alocacoes.length === 0) return
      for (const aloc of membro.alocacoes) {
        if (BACKEND_SET.has(aloc.setor)) continue
        map[aloc.setor] = (map[aloc.setor] || 0) + c.tempoTrabalhado * (aloc.pct / 100)
      }
    })
    return map
  }, [colaboradoresFiltrados, equipeMap])

  // Setores ativos = união das alocações da equipe + áreas com dados reais na planilha
  const setoresAtivos = useMemo(() => {
    const vistos = new Set<string>()
    equipe
      .filter(m => m.status === 'Ativo')
      .forEach(m =>
        m.alocacoes
          .filter(a => !BACKEND_SET.has(a.setor) && a.pct > 0)
          .forEach(a => vistos.add(a.setor))
      )
    Object.keys(horasPorArea).forEach(area => vistos.add(area))
    return [...vistos].sort()
  }, [equipe, horasPorArea])

  const setoresData = useMemo(() => setoresAtivos.map(setor => {
    const cap = calcCapacidadeSetor(equipe, setor, params.horasMes, params.aproveitamentoPct)
    const consumo = horasPorArea[setor] ?? 0
    const pct = cap > 0 ? consumo / cap : 0
    const status = calcStatusSetor(consumo, cap, params.gatilhoContratacaoPct)
    return { setor, cap, consumo, pct, status, folga: cap - consumo }
  }), [equipe, params, horasPorArea, setoresAtivos])

  const totalCap = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const totalConsumo = useMemo(
    () => Object.values(horasPorArea).reduce((s, h) => s + h, 0),
    [horasPorArea]
  )
  const totalOcupacao = totalCap > 0 ? totalConsumo / totalCap : 0
  const totalFolga = totalCap - totalConsumo

  // Preço recomendado para simulador
  const custoTotal = calcCustoTotalMensal(equipe, fixos, variaveis)
  const custoH = calcCustoPorHoraReal(custoTotal, totalCap)
  const precoMin = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoRec = calcPrecoPorHoraRecomendado(precoMin, params.fatorComplexidadePct)

  // Simulador: distribui horas do novo cliente proporcionalmente ao mix real da planilha
  const simSetores = setoresAtivos.map(setor => {
    const base = setoresData.find(s => s.setor === setor)!
    const peso = totalConsumo > 0 ? (horasPorArea[setor] ?? 0) / totalConsumo : 0
    const novoConsumo = base.consumo + simHoras * peso
    return { setor, novoConsumo, cap: base.cap, pct: base.cap > 0 ? novoConsumo / base.cap : 0 }
  })
  const gargalo = simSetores.find(s => s.pct >= 1)
  const simReceita = simHoras * precoRec
  const pacoteSugerido = [...PACOTES_BASE].sort((a, b) => Math.abs(a.horas - simHoras) - Math.abs(b.horas - simHoras))[0]

  // Histórico por mês: distribui horas pelas alocações de cada colaborador
  const meses = sortMesAno([...new Set(colaboradores.map(c => c.mesAno))])
  const historicoData = meses.map(mes => {
    const horasMes: Record<string, number> = {}
    colaboradores.filter(c => c.mesAno === mes).forEach(c => {
      const membro = equipeMap.get(c.colaborador.trim().toLowerCase())
      if (!membro || membro.alocacoes.length === 0) return
      for (const aloc of membro.alocacoes) {
        if (BACKEND_SET.has(aloc.setor)) continue
        horasMes[aloc.setor] = (horasMes[aloc.setor] || 0) + c.tempoTrabalhado * (aloc.pct / 100)
      }
    })
    const result: Record<string, number | string> = { mes }
    setoresAtivos.forEach(setor => {
      const cap = calcCapacidadeSetor(equipe, setor, params.horasMes, params.aproveitamentoPct)
      result[setor] = cap > 0 ? Math.round(((horasMes[setor] ?? 0) / cap) * 100) : 0
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
      {setoresData.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted text-sm mb-6">
          Nenhum membro ativo com alocação em setores operacionais.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
          {setoresData.map(({ setor, cap, consumo, pct, status, folga }) => (
            <div key={setor} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SETOR_COLORS[setor] || '#888' }}
                  />
                  <h3 className="font-semibold text-neutral">{setor}</h3>
                </div>
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
      )}

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
      {historicoData.length >= 2 && setoresAtivos.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-neutral text-sm mb-1">Histórico de Ocupação por Setor</h3>
          <p className="text-xs text-muted mb-4">% de ocupação por setor ao longo dos meses</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={historicoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} domain={[0, 110]} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <ReferenceLine y={params.gatilhoContratacaoPct * 100} stroke={CHART_COLORS.warning} strokeDasharray="4 4" label={{ value: `Gatilho ${Math.round(params.gatilhoContratacaoPct * 100)}%`, position: 'right', fontSize: 11, fill: CHART_COLORS.warning }} />
              {setoresAtivos.map(setor => (
                <Line key={setor} type="monotone" dataKey={setor} stroke={SETOR_COLORS[setor] || '#888'} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-2 justify-center">
            {setoresAtivos.map(setor => (
              <span key={setor} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: SETOR_COLORS[setor] || '#888' }}></span>
                {setor}
              </span>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
