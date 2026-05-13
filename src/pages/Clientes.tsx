import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ChartCard } from '@/components/charts/ChartCard'
import { DiagnosticoClienteCard } from '@/components/clientes/DiagnosticoClienteCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useRelatorioStore } from '@/store/useRelatorioStore'
import {
  calcClientesAnalise,
  calcCustoClienteRelatorio,
  classificarCliente,
  type CenarioCliente,
} from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { CLUSTER_COLORS } from '@/lib/constants'
import type { ClienteAnalise, ClienteSheet, CustoClienteRelatorio } from '@/types'

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type OrdemCalculo = 'rateio' | 'real'
type SortField = 'receita' | 'lucroReal' | 'margemReal' | 'margemOperacional' | 'horasMes'

type CenarioStatus = 'Saudável' | 'Monitorar' | 'Reajuste' | 'Crítico'

type ClienteEnriquecido = ClienteAnalise & {
  infoRelatorio?: CustoClienteRelatorio
  margemOperacional: number   // from report when available, else == margemReal
  cenario: CenarioCliente
  cenarioStatus: CenarioStatus
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES_ABREV: Record<string, string> = {
  Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06',
  Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12',
}
function sheetsToRelatorioMes(mesAno: string): string {
  const [m, y] = mesAno.split('/')
  return `${y}-${MESES_ABREV[m] || '01'}`
}

const CENARIO_META: Record<CenarioCliente, { label: string; cor: string; bgCor: string; status: CenarioStatus }> = {
  A: { label: 'Saudável',  cor: '#2D8A45', bgCor: '#EAF3DE', status: 'Saudável'  },
  B: { label: 'Monitorar', cor: '#E69500', bgCor: '#FFF3CC', status: 'Monitorar' },
  C: { label: 'Reajuste',  cor: '#E69500', bgCor: '#FAEEDA', status: 'Reajuste'  },
  D: { label: 'Crítico',   cor: '#C0392B', bgCor: '#FCEBEB', status: 'Crítico'   },
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function Clientes() {
  const {
    clientesFiltrados, colaboradoresFiltrados, custoTotal,
    labelPeriodo, nMeses, mesesNoFiltro, todosOsMeses,
  } = useFilteredSheets()
  const { params } = useConfigStore()
  const { clientes } = useSheetsStore()
  const { relatorios } = useRelatorioStore()

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [clusterFiltro, setClusterFiltro]     = useState('')
  const [atividadeFiltro, setAtividadeFiltro] = useState<'ativos' | 'inativos' | 'todos'>('ativos')
  const [cenarioFiltro, setCenarioFiltro]     = useState<CenarioCliente | ''>('')
  const [ordemCalculo, setOrdemCalculo]       = useState<OrdemCalculo>('rateio')
  const [sortField, setSortField]             = useState<SortField>('receita')

  const metaMargem = params.margemDesejadaPct  // já é decimal (0.25 = 25%)

  // ── Relatórios filtrados para o período ────────────────────────────────────
  const mesesRelatorio = useMemo(
    () => mesesNoFiltro.map(sheetsToRelatorioMes),
    [mesesNoFiltro]
  )

  const relatoriosParaPeriodo = useMemo(() => {
    if (mesesRelatorio.length === 0) return relatorios
    return relatorios
      .map(r => ({ ...r, resumos: r.resumos.filter(rs => mesesRelatorio.includes(rs.mesAno)) }))
      .filter(r => r.resumos.length > 0)
  }, [relatorios, mesesRelatorio])

  const temRelatorioParaPeriodo = relatoriosParaPeriodo.length > 0

  // ── Lista completa de clientes (ativos + inativos) ─────────────────────────
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
          entradaContratual: 0,
          semReceita: true,
        }
      )
    }
    return resultado
  }, [clientes, clientesFiltrados, mesesNoFiltro])

  // ── Análise enriquecida com cenário ────────────────────────────────────────
  const analise = useMemo((): ClienteEnriquecido[] => {
    const base = calcClientesAnalise(todosClientesMerged, custoTotal)
    return base.map(c => {
      const info = temRelatorioParaPeriodo
        ? calcCustoClienteRelatorio(c.nome, null, relatoriosParaPeriodo)
        : undefined

      const hasReport = info != null && info.horasTotal > 0
      const margemOp  = hasReport && c.receita > 0
        ? (c.receita - info!.custoTotal) / c.receita
        : c.margemReal

      const diag = classificarCliente(margemOp, c.margemReal, metaMargem)

      return {
        ...c,
        infoRelatorio: hasReport ? info : undefined,
        margemOperacional: margemOp,
        cenario: diag.cenario,
        cenarioStatus: CENARIO_META[diag.cenario].status,
      }
    })
  }, [todosClientesMerged, custoTotal, temRelatorioParaPeriodo, relatoriosParaPeriodo, metaMargem])

  // ── Identificar clientes ativos (últimos 2 meses) ─────────────────────────
  const ultimos2Meses = useMemo(() => todosOsMeses.slice(-2), [todosOsMeses])
  const clientesAtivos = useMemo(() => {
    const set = new Set<string>()
    for (const c of clientes) {
      if (ultimos2Meses.includes(c.mesAno) && (c.entradaContratual > 0 || c.tempoTrabalhado > 0)) {
        set.add(c.cliente)
      }
    }
    return set
  }, [clientes, ultimos2Meses])

  // ── Dados filtrados SEM filtro de cenário (para contar por cenário) ────────
  const dadosSemCenario = useMemo((): ClienteEnriquecido[] => {
    let lista = analise
    if (clusterFiltro) lista = lista.filter(c => c.cluster === clusterFiltro)
    if (atividadeFiltro === 'ativos')   lista = lista.filter(c =>  clientesAtivos.has(c.nome))
    if (atividadeFiltro === 'inativos') lista = lista.filter(c => !clientesAtivos.has(c.nome))
    return lista
  }, [analise, clusterFiltro, atividadeFiltro, clientesAtivos])

  const contagemCenarios = useMemo(() => {
    const cont: Record<CenarioCliente, { count: number; receita: number }> = {
      A: { count: 0, receita: 0 },
      B: { count: 0, receita: 0 },
      C: { count: 0, receita: 0 },
      D: { count: 0, receita: 0 },
    }
    dadosSemCenario.forEach(c => {
      cont[c.cenario].count++
      cont[c.cenario].receita += c.receita
    })
    return cont
  }, [dadosSemCenario])

  // ── Dados filtrados e ordenados ────────────────────────────────────────────
  const dadosFiltrados = useMemo((): ClienteEnriquecido[] => {
    let lista = dadosSemCenario
    if (cenarioFiltro) lista = lista.filter(c => c.cenario === cenarioFiltro)
    return [...lista].sort((a, b) => {
      const aVal = a[sortField as keyof ClienteEnriquecido] as number ?? 0
      const bVal = b[sortField as keyof ClienteEnriquecido] as number ?? 0
      return bVal - aVal
    })
  }, [dadosSemCenario, cenarioFiltro, sortField])

  const clustersDisponiveis = useMemo(
    () => [...new Set(analise.map(c => c.cluster))].sort(),
    [analise]
  )

  // ── Quando toggle muda, ajusta o sortField padrão ─────────────────────────
  function handleOrdemCalculo(ordem: OrdemCalculo) {
    setOrdemCalculo(ordem)
    setSortField(ordem === 'real' && temRelatorioParaPeriodo ? 'margemOperacional' : 'margemReal')
  }

  // ── Diagnóstico de precificação (usa custoRateado) ─────────────────────────
  const diagnosticos = useMemo(() => {
    return dadosFiltrados.map(c => {
      const min20 = c.custoRateado / (1 - 0.20)
      const min25 = c.custoRateado / (1 - 0.25)
      const gap   = min25 - c.receita
      return { ...c, min20, min25, gap, acao: gap > 0 ? 'Reajuste' : 'OK' }
    })
  }, [dadosFiltrados])

  // ── Charts ─────────────────────────────────────────────────────────────────
  const chartLucroPorCliente = useMemo(() =>
    [...dadosFiltrados]
      .sort((a, b) => b.lucroReal - a.lucroReal)
      .map(c => ({
        cliente: c.nome.length > 12 ? c.nome.slice(0, 12) + '…' : c.nome,
        Lucro:   c.lucroReal,
        fill:    CENARIO_META[c.cenario].cor,
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

  // ── Colunas da tabela ──────────────────────────────────────────────────────
  const columns: Column<ClienteEnriquecido>[] = [
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
      render: row => {
        const h = row.infoRelatorio ? row.infoRelatorio.horasTotal : row.horasMes
        return formatHours(h)
      },
    },
    {
      key: 'custoRateado',
      header: 'Custo Rateado',
      align: 'right',
      sortable: true,
      render: row => formatCurrency(row.custoRateado),
    },
    {
      key: 'margemReal',
      header: 'Marg. Financeira',
      align: 'right',
      sortable: true,
      render: row => (
        <span className={
          row.margemReal >= metaMargem ? 'text-green-700 font-semibold'
          : row.margemReal >= 0        ? 'text-amber-700 font-semibold'
          :                              'text-red-700 font-semibold'
        }>
          {formatPercent(row.margemReal)}
        </span>
      ),
    },
    ...(temRelatorioParaPeriodo ? [{
      key: 'margemOperacional' as keyof ClienteEnriquecido,
      header: 'Marg. Operacional',
      align: 'right' as const,
      sortable: true,
      render: (row: ClienteEnriquecido) => (
        row.infoRelatorio ? (
          <span className={
            row.margemOperacional >= metaMargem ? 'text-green-700 font-semibold'
            : row.margemOperacional >= 0         ? 'text-amber-700 font-semibold'
            :                                       'text-red-700 font-semibold'
          }>
            {formatPercent(row.margemOperacional)}
          </span>
        ) : <span className="text-muted text-xs">—</span>
      ),
    }] : []),
    {
      key: 'cenario',
      header: 'Cenário',
      align: 'center',
      render: row => {
        const m = CENARIO_META[row.cenario]
        return (
          <span
            title={m.label}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white cursor-default"
            style={{ backgroundColor: m.cor }}
          >
            {row.cenario}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: row => <StatusBadge status={row.cenarioStatus} />,
    },
  ]

  return (
    <PageWrapper>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Análise de Clientes</h1>
          <p className="text-sm text-muted mt-1">Lucratividade e saúde financeira por cliente — {labelPeriodo}</p>
        </div>
        {/* Toggle controla a ordenação padrão da tabela */}
        <div className="flex items-center gap-1 bg-bg-page border border-border rounded-lg p-1 text-sm">
          <button
            onClick={() => handleOrdemCalculo('rateio')}
            className={`px-3 py-1.5 rounded-md transition-colors font-medium ${ordemCalculo === 'rateio' ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-neutral'}`}
          >
            Ordenar: Margem Financeira
          </button>
          <button
            onClick={() => handleOrdemCalculo('real')}
            disabled={!temRelatorioParaPeriodo}
            title={!temRelatorioParaPeriodo ? 'Sem relatório importado para este período' : 'Ordenar por margem operacional (custo real)'}
            className={`px-3 py-1.5 rounded-md transition-colors font-medium ${ordemCalculo === 'real' ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-neutral'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Ordenar: Marg. Operacional
          </button>
        </div>
      </div>

      {/* ── Cards de cenário (substituem os KPI cards) ───────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {(['A', 'B', 'C', 'D'] as CenarioCliente[]).map(c => {
          const m    = CENARIO_META[c]
          const data = contagemCenarios[c]
          const ativo = cenarioFiltro === c
          return (
            <button
              key={c}
              onClick={() => setCenarioFiltro(ativo ? '' : c)}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                ativo ? 'shadow-md' : 'border-border bg-white hover:shadow-sm'
              }`}
              style={ativo ? { borderColor: m.cor, backgroundColor: m.bgCor } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: m.cor }}
                >
                  {c}
                </span>
                <span className="text-xs font-semibold text-muted">{m.label}</span>
              </div>
              <p className="text-2xl font-bold text-neutral">{data.count}</p>
              <p className="text-xs text-muted mt-0.5">
                {data.count === 1 ? 'cliente' : 'clientes'} · {formatCurrency(data.receita)}
              </p>
            </button>
          )
        })}
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
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
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="receita">Ordenar por Receita</option>
          <option value="lucroReal">Ordenar por Lucro</option>
          <option value="margemReal">Ordenar por Marg. Financeira</option>
          <option value="margemOperacional">Ordenar por Marg. Operacional</option>
          <option value="horasMes">Ordenar por Horas</option>
        </select>

        {(clusterFiltro || atividadeFiltro !== 'ativos' || cenarioFiltro) && (
          <button
            onClick={() => { setClusterFiltro(''); setAtividadeFiltro('ativos'); setCenarioFiltro('') }}
            className="text-xs text-muted hover:text-neutral underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <DataTable
          columns={columns}
          data={dadosFiltrados}
          keyExtractor={(_, i) => String(i)}
          expandedRow={(row) => {
            const r = row as unknown as ClienteEnriquecido
            return (
              <DiagnosticoClienteCard
                receita={r.receita}
                custoRateado={r.custoRateado}
                margemFinanceira={r.margemReal}
                margemOperacional={r.margemOperacional}
                metaMargem={metaMargem}
                nMeses={nMeses}
                infoRelatorio={r.infoRelatorio}
              />
            )
          }}
        />
      </div>

      {/* ── Gráficos ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <ChartCard title="Lucratividade por Cliente" subtitle={labelPeriodo}>
          {dadosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">Nenhum dado</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartLucroPorCliente} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis type="category" dataKey="cliente" width={85} tick={{ fontSize: 11, fill: '#555' }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="Lucro" radius={[0, 3, 3, 0]}>
                  {chartLucroPorCliente.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Mix de Receita por Cluster" subtitle="Distribuição percentual">
          {chartReceitaPorCluster.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted text-sm">Nenhum dado</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartReceitaPorCluster}
                  cx="50%" cy="50%"
                  innerRadius={65} outerRadius={105} paddingAngle={3}
                  dataKey="value" nameKey="name"
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

      {/* ── Diagnóstico de Precificação ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-neutral text-sm">Diagnóstico de Precificação</h3>
          <p className="text-xs text-muted mt-0.5">
            Receita mínima para atingir 20% e 25% de margem — baseado no custo rateado total
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-page">
                <th className="px-4 py-3 text-left   text-xs font-medium text-muted uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-muted uppercase tracking-wide">Custo Base</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-muted uppercase tracking-wide">Receita Atual</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-muted uppercase tracking-wide">Mín. 20%</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-muted uppercase tracking-wide">Mín. 25%</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-muted uppercase tracking-wide">Gap (25%)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {diagnosticos.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-bg-page">
                  <td className="px-4 py-3 font-medium text-neutral">{c.nome}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(c.custoRateado)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.receita)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.min20)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.min25)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${c.gap > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {c.gap > 0 ? `+ ${formatCurrency(c.gap)}` : formatCurrency(c.gap)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      c.acao === 'OK'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {c.acao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border bg-bg-page">
          <p className="text-xs text-muted">
            Custo base = custo rateado total (inclui folha, fixos, variáveis e overhead).
            Representa o custo real que a empresa incorre para atender este cliente.
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
