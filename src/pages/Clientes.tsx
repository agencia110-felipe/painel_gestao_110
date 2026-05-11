import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ChartCard } from '@/components/charts/ChartCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import {
  calcClientesAnalise,
  calcReceitaMinimaCliente,
  calcCustoPorHoraReal,
} from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { CLUSTER_COLORS } from '@/lib/constants'
import type { ClienteAnalise, ClienteSheet } from '@/types'
import { DollarSign, TrendingUp, Users, BarChart2 } from 'lucide-react'

type SortField = 'receita' | 'lucroReal' | 'margemReal' | 'horasMes'

export function Clientes() {
  const { clientesFiltrados, colaboradoresFiltrados, custoTotal, labelPeriodo, isRange, nMeses, mesesNoFiltro, todosOsMeses } = useFilteredSheets()
  const { params } = useConfigStore()
  const { clientes } = useSheetsStore()

  const [clusterFiltro, setClusterFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [atividadeFiltro, setAtividadeFiltro] = useState<'ativos' | 'inativos' | 'todos'>('ativos')
  const [sortField, setSortField] = useState<SortField>('receita')

  // Horas reais trabalhadas no período (soma de todos os colaboradores)
  const horasFaturaveis = useMemo(
    () => colaboradoresFiltrados.reduce((s, c) => s + c.tempoTrabalhado, 0),
    [colaboradoresFiltrados]
  )

  const custoPorHora = calcCustoPorHoraReal(custoTotal, horasFaturaveis)

  const todosClientesMerged = useMemo((): ClienteSheet[] => {
    const filtradoMap = new Map(clientesFiltrados.map(c => [c.cliente, c]))
    const vistos = new Set<string>()
    const resultado: ClienteSheet[] = []
    for (const c of clientes) {
      if (vistos.has(c.cliente)) continue
      vistos.add(c.cliente)
      resultado.push(
        filtradoMap.get(c.cliente) ?? {
          mesAno: mesesNoFiltro[0] || c.mesAno,
          cluster: c.cluster,
          cliente: c.cliente,
          tempoTrabalhado: 0,
          custoEfetivoOp: 0,
          entradaContratual: 0,
          custoOperacionalPct: 0,
        }
      )
    }
    return resultado
  }, [clientes, clientesFiltrados, mesesNoFiltro])

  const analise = useMemo(
    () => calcClientesAnalise(todosClientesMerged, custoTotal),
    [todosClientesMerged, custoTotal]
  )

  // Dois meses mais recentes da planilha para determinar atividade
  const ultimos2Meses = useMemo(() => todosOsMeses.slice(-2), [todosOsMeses])

  // Clientes ativos = têm receita ou horas em pelo menos um dos 2 últimos meses
  const clientesAtivos = useMemo(() => {
    const set = new Set<string>()
    for (const c of clientes) {
      if (ultimos2Meses.includes(c.mesAno) && (c.entradaContratual > 0 || c.tempoTrabalhado > 0)) {
        set.add(c.cliente)
      }
    }
    return set
  }, [clientes, ultimos2Meses])

  const clustersDisponiveis = useMemo(
    () => [...new Set(analise.map(c => c.cluster))].sort(),
    [analise]
  )

  const statusDisponiveis = useMemo(
    () => [...new Set(analise.map(c => c.status))].sort(),
    [analise]
  )

  const dadosFiltrados = useMemo(() => {
    let lista = analise
    if (clusterFiltro) lista = lista.filter(c => c.cluster === clusterFiltro)
    if (statusFiltro) lista = lista.filter(c => c.status === statusFiltro)
    if (atividadeFiltro === 'ativos')   lista = lista.filter(c => clientesAtivos.has(c.nome))
    if (atividadeFiltro === 'inativos') lista = lista.filter(c => !clientesAtivos.has(c.nome))
    return [...lista].sort((a, b) => b[sortField] - a[sortField])
  }, [analise, clusterFiltro, statusFiltro, atividadeFiltro, sortField, clientesAtivos])

  // KPIs summary
  const totalReceita = useMemo(() => dadosFiltrados.reduce((s, c) => s + c.receita, 0), [dadosFiltrados])
  const totalLucro = useMemo(() => dadosFiltrados.reduce((s, c) => s + c.lucroReal, 0), [dadosFiltrados])
  const margemMedia = totalReceita > 0 ? totalLucro / totalReceita : 0
  const ticketMedio = dadosFiltrados.length > 0 ? totalReceita / dadosFiltrados.length : 0

  // Charts
  const chartLucroPorCliente = useMemo(() =>
    [...dadosFiltrados]
      .sort((a, b) => b.lucroReal - a.lucroReal)
      .map(c => ({
        cliente: c.nome.length > 12 ? c.nome.slice(0, 12) + '…' : c.nome,
        Lucro: c.lucroReal,
        fill: c.status === 'Saudável' ? '#2D8A45'
          : c.status === 'Atenção' ? '#E69500'
          : '#C0392B',
      })),
    [dadosFiltrados]
  )

  const chartReceitaPorCluster = useMemo(() => {
    const map: Record<string, number> = {}
    dadosFiltrados.forEach(c => {
      map[c.cluster] = (map[c.cluster] || 0) + c.receita
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [dadosFiltrados])

  // Diagnostics
  const diagnosticos = useMemo(() => {
    return dadosFiltrados.map(c => {
      const min20 = calcReceitaMinimaCliente(c.horasMes, custoPorHora, 0.20)
      const min25 = calcReceitaMinimaCliente(c.horasMes, custoPorHora, 0.25)
      const gap = min25 - c.receita
      return {
        ...c,
        min20,
        min25,
        gap,
        acao: gap > 0 ? 'Reajuste urgente' : 'OK',
      }
    })
  }, [dadosFiltrados, custoPorHora])

  // Table columns
  const columns: Column<ClienteAnalise>[] = [
    {
      key: 'nome',
      header: 'Cliente',
      render: row => <span className="font-medium text-neutral">{row.nome}</span>,
    },
    {
      key: 'cluster',
      header: 'Cluster',
      render: row => (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: CLUSTER_COLORS[row.cluster] || '#888' }}
        >
          {row.cluster}
        </span>
      ),
    },
    {
      key: 'receita',
      header: 'Receita',
      align: 'right',
      sortable: true,
      render: row => formatCurrency(row.receita),
    },
    {
      key: 'horasMes',
      header: 'Horas',
      align: 'right',
      sortable: true,
      render: row => formatHours(row.horasMes),
    },
    {
      key: 'custoRateado',
      header: 'Custo Rateado',
      align: 'right',
      sortable: true,
      render: row => formatCurrency(row.custoRateado),
    },
    {
      key: 'lucroReal',
      header: 'Lucro Real',
      align: 'right',
      sortable: true,
      render: row => (
        <span className={row.lucroReal < 0 ? 'text-danger font-medium' : 'text-success font-medium'}>
          {formatCurrency(row.lucroReal)}
        </span>
      ),
    },
    {
      key: 'margemReal',
      header: 'Margem',
      align: 'right',
      sortable: true,
      render: row => (
        <span className={
          row.margemReal >= 0.25 ? 'text-success font-medium'
          : row.margemReal >= 0.10 ? 'text-warning font-medium'
          : 'text-danger font-medium'
        }>
          {formatPercent(row.margemReal)}
        </span>
      ),
    },
    {
      key: 'receitaPorHora',
      header: 'R$/h cobrado',
      align: 'right',
      render: row => formatCurrency(row.receitaPorHora),
    },
    {
      key: 'concentracao',
      header: 'Concentração',
      align: 'right',
      render: row => (
        <span className={row.concentracao > 0.20 ? 'text-warning font-medium' : ''}>
          {formatPercent(row.concentracao)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: row => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <PageWrapper>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral">Análise de Clientes</h1>
        <p className="text-sm text-muted mt-1">Lucratividade e saúde financeira por cliente — {labelPeriodo}</p>
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
          value={clusterFiltro}
          onChange={e => setClusterFiltro(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os clusters</option>
          {clustersDisponiveis.map(c => (
            <option key={c} value={c}>{c}</option>
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

        <select
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="receita">Ordenar por Receita</option>
          <option value="lucroReal">Ordenar por Lucro</option>
          <option value="margemReal">Ordenar por Margem</option>
          <option value="horasMes">Ordenar por Horas</option>
        </select>

        {(clusterFiltro || statusFiltro || atividadeFiltro !== 'ativos') && (
          <button
            onClick={() => { setClusterFiltro(''); setStatusFiltro(''); setAtividadeFiltro('ativos') }}
            className="text-xs text-muted hover:text-neutral underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── KPI Summary ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Receita"
          value={formatCurrency(totalReceita)}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          label="Total Lucro"
          value={formatCurrency(totalLucro)}
          icon={<TrendingUp size={16} />}
          variant={totalLucro >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Margem Média"
          value={formatPercent(margemMedia)}
          icon={<BarChart2 size={16} />}
          variant={margemMedia >= 0.25 ? 'success' : margemMedia >= 0.10 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={<Users size={16} />}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <DataTable
          columns={columns}
          data={dadosFiltrados}
          keyExtractor={(_, i) => String(i)}
          expandedRow={(row) => {
            const r = row as unknown as ClienteAnalise
            const min20 = calcReceitaMinimaCliente(r.horasMes, custoPorHora, 0.20)
            const min25 = calcReceitaMinimaCliente(r.horasMes, custoPorHora, 0.25)
            const gap20 = min20 - r.receita
            const gap25 = min25 - r.receita
            return (
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Margem de Contribuição</span>
                  <p className={`font-semibold mt-0.5 ${r.margemContribuicao >= 0.30 ? 'text-success' : r.margemContribuicao >= 0.10 ? 'text-warning' : 'text-danger'}`}>
                    {formatPercent(r.margemContribuicao)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">(Receita − Custo Direto) / Receita</p>
                </div>
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Break-even</span>
                  <p className="font-semibold text-neutral mt-0.5">{formatCurrency(r.breakEven)}</p>
                  <p className="text-xs text-muted mt-0.5">Receita mínima para lucro zero</p>
                </div>
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Concentração</span>
                  <p className={`font-semibold mt-0.5 ${r.concentracao > 0.20 ? 'text-warning' : 'text-neutral'}`}>
                    {formatPercent(r.concentracao)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{r.concentracao > 0.20 ? 'Risco: &gt;20% da receita' : 'Dentro do limite'}</p>
                </div>
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Receita mínima para 20%</span>
                  <p className="font-semibold text-neutral mt-0.5">{formatCurrency(min20)}</p>
                  <p className={`text-xs mt-0.5 ${gap20 > 0 ? 'text-danger' : 'text-success'}`}>
                    {gap20 > 0 ? `Falta ${formatCurrency(gap20)}` : `Excesso de ${formatCurrency(Math.abs(gap20))}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Receita mínima para 25%</span>
                  <p className="font-semibold text-neutral mt-0.5">{formatCurrency(min25)}</p>
                  <p className={`text-xs mt-0.5 ${gap25 > 0 ? 'text-danger' : 'text-success'}`}>
                    {gap25 > 0 ? `Falta ${formatCurrency(gap25)}` : `Excesso de ${formatCurrency(Math.abs(gap25))}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted text-xs uppercase tracking-wide">Receita atual</span>
                  <p className="font-semibold text-neutral mt-0.5">{formatCurrency(r.receita)}</p>
                  <p className="text-xs text-muted mt-0.5">{formatHours(r.horasMes)} · {formatCurrency(r.receitaPorHora)}/h</p>
                </div>
              </div>
            )
          }}
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <ChartCard title="Lucratividade por Cliente" subtitle={labelPeriodo}>
          {dadosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">
              Nenhum dado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartLucroPorCliente}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis type="category" dataKey="cliente" width={85} tick={{ fontSize: 11, fill: '#555' }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="Lucro" radius={[0, 3, 3, 0]}>
                  {chartLucroPorCliente.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Mix de Receita por Cluster" subtitle="Distribuição percentual">
          {chartReceitaPorCluster.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">
              Nenhum dado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartReceitaPorCluster}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartReceitaPorCluster.map((entry, i) => (
                    <Cell key={i} fill={CLUSTER_COLORS[entry.name] || '#888'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Diagnostics ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-neutral text-sm">Diagnóstico de Precificação</h3>
          <p className="text-xs text-muted mt-0.5">Receita mínima para atingir 20% e 25% de margem</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-page">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Receita Atual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Mín. 20%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Mín. 25%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Gap (25%)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {diagnosticos.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-bg-page">
                  <td className="px-4 py-3 font-medium text-neutral">{c.nome}</td>
                  <td className="px-4 py-3 text-right font-mono-nums">{formatCurrency(c.receita)}</td>
                  <td className="px-4 py-3 text-right font-mono-nums">{formatCurrency(c.min20)}</td>
                  <td className="px-4 py-3 text-right font-mono-nums">{formatCurrency(c.min25)}</td>
                  <td className={`px-4 py-3 text-right font-mono-nums font-medium ${c.gap > 0 ? 'text-danger' : 'text-success'}`}>
                    {c.gap > 0 ? `+ ${formatCurrency(c.gap)}` : formatCurrency(c.gap)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      c.acao === 'OK'
                        ? 'bg-success-bg text-success border-success/30'
                        : 'bg-danger-bg text-danger border-danger/30'
                    }`}>
                      {c.acao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
