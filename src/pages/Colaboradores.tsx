import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter,
} from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ChartCard } from '@/components/charts/ChartCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useSheetsStore } from '@/store/useSheetsStore'
import { calcColaboradoresAnalise } from '@/lib/calculations'
import { sortMesAno } from '@/lib/aggregation'
import { formatPercent, formatHours, formatNumber, formatCurrency } from '@/lib/formatters'
import { SETOR_COLORS, CHART_COLORS } from '@/lib/constants'
import type { ColaboradorAnalise, ColaboradorSheet } from '@/types'
import { Users, Clock, TrendingUp, AlertTriangle, Star, Activity } from 'lucide-react'

export function Colaboradores() {
  const { colaboradoresFiltrados, mesesNoFiltro, labelPeriodo } = useFilteredSheets()
  const { colaboradores } = useSheetsStore()

  const [areaFiltro, setAreaFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [atividadeFiltro, setAtividadeFiltro] = useState<'ativos' | 'inativos' | 'todos'>('ativos')

  // Dois meses mais recentes para determinar atividade do colaborador
  const ultimos2Meses = useMemo(() => {
    const meses = sortMesAno([...new Set(colaboradores.map(c => c.mesAno))])
    return meses.slice(-2)
  }, [colaboradores])

  const colaboradoresAtivoSet = useMemo(() => {
    const set = new Set<string>()
    for (const c of colaboradores) {
      if (ultimos2Meses.includes(c.mesAno) && c.tempoTrabalhado > 0) {
        set.add(c.colaborador)
      }
    }
    return set
  }, [colaboradores, ultimos2Meses])

  // Merge: todos os colaboradores únicos da planilha inteira.
  // Quem não tem dados no período selecionado aparece com zeros.
  const todosColaboradoresMerged = useMemo((): ColaboradorSheet[] => {
    const filtradoMap = new Map(colaboradoresFiltrados.map(c => [c.colaborador, c]))
    const vistos = new Set<string>()
    const resultado: ColaboradorSheet[] = []

    for (const c of colaboradores) {
      if (vistos.has(c.colaborador)) continue
      vistos.add(c.colaborador)

      if (filtradoMap.has(c.colaborador)) {
        resultado.push(filtradoMap.get(c.colaborador)!)
      } else {
        resultado.push({
          mesAno: mesesNoFiltro[0] || 'n/a',
          colaborador: c.colaborador,
          area: c.area,
          tempoTrabalhado: 0,
          tempoArredondado: 0,
          custoEfetivoOp: 0,
          totalJobs: 0,
          percentualEntregas: 0,
          cargaHoraria80pct: c.cargaHoraria80pct,
          cargaHorariaMes: c.cargaHorariaMes,
        })
      }
    }
    return resultado
  }, [colaboradores, colaboradoresFiltrados, mesesNoFiltro])

  const analise = useMemo(
    () => calcColaboradoresAnalise(todosColaboradoresMerged),
    [todosColaboradoresMerged]
  )

  const areasDisponiveis = useMemo(
    () => [...new Set(analise.map(c => c.area))].sort(),
    [analise]
  )

  const statusDisponiveis = useMemo(
    () => [...new Set(analise.map(c => c.status))].sort(),
    [analise]
  )

  const dadosFiltrados = useMemo(() => {
    let lista = analise
    if (areaFiltro) lista = lista.filter(c => c.area === areaFiltro)
    if (statusFiltro) lista = lista.filter(c => c.status === statusFiltro)
    if (atividadeFiltro === 'ativos')   lista = lista.filter(c => colaboradoresAtivoSet.has(c.nome))
    if (atividadeFiltro === 'inativos') lista = lista.filter(c => !colaboradoresAtivoSet.has(c.nome))
    return lista
  }, [analise, areaFiltro, statusFiltro, atividadeFiltro, colaboradoresAtivoSet])

  // KPIs
  const totalAtivos = dadosFiltrados.length
  const mediaOcupacao = totalAtivos > 0
    ? dadosFiltrados.reduce((s, c) => s + c.percentualOcupacao, 0) / totalAtivos
    : 0
  const mediaEntregas = totalAtivos > 0
    ? dadosFiltrados.reduce((s, c) => s + c.percentualEntregas, 0) / totalAtivos
    : 0
  const maiorEficiencia = useMemo(() => {
    if (dadosFiltrados.length === 0) return '-'
    return [...dadosFiltrados].sort((a, b) => b.eficiencia - a.eficiencia)[0]?.nome || '-'
  }, [dadosFiltrados])
  const menorEntregas = useMemo(() => {
    if (dadosFiltrados.length === 0) return '-'
    return [...dadosFiltrados].sort((a, b) => a.percentualEntregas - b.percentualEntregas)[0]?.nome || '-'
  }, [dadosFiltrados])
  const totalHoras = useMemo(
    () => dadosFiltrados.reduce((s, c) => s + c.horasTrabalhadas, 0),
    [dadosFiltrados]
  )

  // Chart: % Entregas por Colaborador
  const chartEntregas = useMemo(() =>
    [...dadosFiltrados]
      .sort((a, b) => b.percentualEntregas - a.percentualEntregas)
      .map(c => ({
        nome: c.nome.split(' ')[0],
        Entregas: parseFloat((c.percentualEntregas * 100).toFixed(1)),
        fill: c.percentualEntregas >= 0.85 ? CHART_COLORS.success
          : c.percentualEntregas >= 0.60 ? CHART_COLORS.warning
          : CHART_COLORS.danger,
      })),
    [dadosFiltrados]
  )

  // Chart: Scatter Ocupação vs Entregas
  const chartScatter = useMemo(() =>
    dadosFiltrados.map(c => ({
      nome: c.nome.split(' ')[0],
      ocupacao: parseFloat((c.percentualOcupacao * 100).toFixed(1)),
      entregas: parseFloat((c.percentualEntregas * 100).toFixed(1)),
    })),
    [dadosFiltrados]
  )

  // Chart: Horas por Área (todos os meses)
  const mesesDisponiveis = useMemo(
    () => sortMesAno([...new Set(colaboradores.map(c => c.mesAno))]),
    [colaboradores]
  )

  const areasUnicas = useMemo(
    () => [...new Set(colaboradores.map(c => c.area))].sort(),
    [colaboradores]
  )

  const chartHorasPorArea = useMemo(() => {
    return mesesDisponiveis.map(mes => {
      const row: Record<string, string | number> = { mes }
      const colaboradoresMes = colaboradores.filter(c => c.mesAno === mes)
      areasUnicas.forEach(area => {
        row[area] = colaboradoresMes
          .filter(c => c.area === area)
          .reduce((s, c) => s + c.tempoTrabalhado, 0)
      })
      return row
    })
  }, [colaboradores, mesesDisponiveis, areasUnicas])

  // Table columns
  const columns: Column<ColaboradorAnalise>[] = [
    {
      key: 'nome',
      header: 'Colaborador',
      render: row => <span className="font-medium text-neutral">{row.nome}</span>,
    },
    {
      key: 'area',
      header: 'Área',
      render: row => (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: SETOR_COLORS[row.area] || '#888' }}
        >
          {row.area}
        </span>
      ),
    },
    {
      key: 'horasTrabalhadas',
      header: 'H. Trabalhadas',
      align: 'right',
      sortable: true,
      render: row => formatHours(row.horasTrabalhadas),
    },
    {
      key: 'cargaEsperada',
      header: 'Carga Esperada',
      align: 'right',
      render: row => formatHours(row.cargaEsperada),
    },
    {
      key: 'percentualOcupacao',
      header: 'Ocupação',
      align: 'right',
      sortable: true,
      render: row => (
        <span className={
          row.percentualOcupacao > 1 ? 'text-danger font-medium'
          : row.percentualOcupacao >= 0.80 ? 'text-success font-medium'
          : row.percentualOcupacao >= 0.60 ? 'text-warning font-medium'
          : 'text-muted'
        }>
          {formatPercent(row.percentualOcupacao)}
        </span>
      ),
    },
    {
      key: 'percentualEntregas',
      header: '% Entregas',
      align: 'right',
      sortable: true,
      render: row => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(row.percentualEntregas * 100, 100)}%`,
                backgroundColor: row.percentualEntregas >= 0.85 ? CHART_COLORS.success
                  : row.percentualEntregas >= 0.60 ? CHART_COLORS.warning
                  : CHART_COLORS.danger,
              }}
            />
          </div>
          <span className={`w-12 text-right font-medium ${
            row.percentualEntregas >= 0.85 ? 'text-success'
            : row.percentualEntregas >= 0.60 ? 'text-warning'
            : 'text-danger'
          }`}>
            {formatPercent(row.percentualEntregas)}
          </span>
        </div>
      ),
    },
    {
      key: 'totalJobs',
      header: 'Jobs',
      align: 'right',
      render: row => formatNumber(row.totalJobs),
    },
    {
      key: 'produtividadePorHora',
      header: 'Jobs/h',
      align: 'right',
      render: row => row.produtividadePorHora > 0 ? row.produtividadePorHora.toFixed(2) : '—',
    },
    {
      key: 'custoPortJob',
      header: 'Custo/Job',
      align: 'right',
      render: row => row.custoPortJob > 0 ? formatCurrency(row.custoPortJob) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: row => <StatusBadge status={row.status} />,
    },
  ]

  // Custom scatter tooltip
  const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nome: string; ocupacao: number; entregas: number } }> }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border border-border rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-semibold text-neutral mb-1">{d.nome}</p>
        <p className="text-muted">Ocupação: <span className="text-neutral font-medium">{d.ocupacao}%</span></p>
        <p className="text-muted">Entregas: <span className="text-neutral font-medium">{d.entregas}%</span></p>
      </div>
    )
  }

  // Top performers ranking
  const topPerformers = useMemo(() =>
    [...dadosFiltrados]
      .sort((a, b) => b.eficiencia - a.eficiencia)
      .slice(0, 5),
    [dadosFiltrados]
  )

  return (
    <PageWrapper>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral">Análise de Colaboradores</h1>
        <p className="text-sm text-muted mt-1">
          Ocupação e performance da equipe — {labelPeriodo}
          {analise.length > colaboradoresFiltrados.length && (
            <span className="ml-2 text-warning">
              · {analise.length - colaboradoresFiltrados.length} sem dados neste período
            </span>
          )}
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={atividadeFiltro}
          onChange={e => setAtividadeFiltro(e.target.value as typeof atividadeFiltro)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>

        <select
          value={areaFiltro}
          onChange={e => setAreaFiltro(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as áreas</option>
          {areasDisponiveis.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={statusFiltro}
          onChange={e => setStatusFiltro(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os status</option>
          {statusDisponiveis.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {(areaFiltro || statusFiltro || atividadeFiltro !== 'ativos') && (
          <button
            onClick={() => { setAreaFiltro(''); setStatusFiltro(''); setAtividadeFiltro('ativos') }}
            className="text-xs text-muted hover:text-neutral underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <MetricCard
          label="Colaboradores"
          value={String(totalAtivos)}
          icon={<Users size={16} />}
        />
        <MetricCard
          label="Média Ocupação"
          value={formatPercent(mediaOcupacao)}
          icon={<Activity size={16} />}
          variant={mediaOcupacao > 0.85 ? 'danger' : mediaOcupacao > 0.70 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Média % Entregas"
          value={formatPercent(mediaEntregas)}
          icon={<TrendingUp size={16} />}
          variant={mediaEntregas >= 0.85 ? 'success' : mediaEntregas >= 0.60 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Maior Eficiência"
          value={maiorEficiencia.split(' ')[0]}
          subtext={maiorEficiencia}
          icon={<Star size={16} />}
          variant="success"
        />
        <MetricCard
          label="Menor Entregas"
          value={menorEntregas.split(' ')[0]}
          subtext={menorEntregas}
          icon={<AlertTriangle size={16} />}
          variant="danger"
        />
        <MetricCard
          label="Total Horas"
          value={formatHours(totalHoras)}
          icon={<Clock size={16} />}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        {dadosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted text-sm">
            Nenhum colaborador encontrado para os filtros selecionados
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={dadosFiltrados}
            keyExtractor={(_, i) => String(i)}
          />
        )}
      </div>

      {/* ── Charts row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <ChartCard
          title="% de Entregas por Colaborador"
          subtitle="Meta: 85%"
        >
          {chartEntregas.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">Nenhum dado</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartEntregas}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis type="category" dataKey="nome" width={70} tick={{ fontSize: 11, fill: '#555' }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <ReferenceLine x={85} stroke={CHART_COLORS.warning} strokeDasharray="5 5" label={{ value: '85%', position: 'top', fontSize: 10, fill: CHART_COLORS.warning }} />
                <Bar dataKey="Entregas" radius={[0, 3, 3, 0]}>
                  {chartEntregas.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Ocupação vs % Entregas"
          subtitle="Dispersão por colaborador"
        >
          {chartScatter.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">Nenhum dado</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  type="number"
                  dataKey="ocupacao"
                  name="Ocupação"
                  domain={[0, 120]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#888' }}
                  label={{ value: 'Ocupação %', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#888' }}
                />
                <YAxis
                  type="number"
                  dataKey="entregas"
                  name="Entregas"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#888' }}
                  label={{ value: 'Entregas %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#888' }}
                />
                <Tooltip content={<ScatterTooltip />} />
                <ReferenceLine y={85} stroke={CHART_COLORS.warning} strokeDasharray="5 5" />
                <ReferenceLine x={80} stroke={CHART_COLORS.secondary} strokeDasharray="5 5" />
                <Scatter data={chartScatter} fill={CHART_COLORS.primary} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title="Horas por Área"
          subtitle="Todos os meses disponíveis"
        >
          {chartHorasPorArea.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">Nenhum dado</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartHorasPorArea} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tickFormatter={v => `${v}h`} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(0)}h`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {areasUnicas.map(area => (
                  <Bar key={area} dataKey={area} stackId="a" fill={SETOR_COLORS[area] || '#888'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Ranking card */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-neutral text-sm">Ranking de Eficiência</h3>
            <p className="text-xs text-muted mt-0.5">Top performers (ocupação × % entregas)</p>
          </div>
          {topPerformers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted text-sm">Nenhum dado</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topPerformers.map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    i === 0 ? 'bg-warning' : i === 1 ? 'bg-neutral' : 'bg-muted/50'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral truncate">{c.nome}</span>
                      <span className="text-xs text-muted flex-shrink-0">{c.area}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(c.eficiencia * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted flex-shrink-0 w-10 text-right">
                        {formatPercent(c.eficiencia)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted">
                        Ocup. <span className="text-neutral">{formatPercent(c.percentualOcupacao)}</span>
                      </span>
                      <span className="text-xs text-muted">
                        Entr. <span className="text-neutral">{formatPercent(c.percentualEntregas)}</span>
                      </span>
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
