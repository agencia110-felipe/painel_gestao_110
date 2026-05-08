import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { ChartCard } from '@/components/charts/ChartCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import { useConfigStore } from '@/store/useConfigStore'
import {
  calcHorasFaturaveisTotal,
  calcCustoPorHoraReal,
  calcPrecoPorHoraMinimo,
  calcPrecoPorHoraRecomendado,
  calcTicketMedioReceita,
  calcClientesAnalise,
  calcCustoBackendEquipe,
  calcCustoBackendFixos,
  calcTotalFolha,
  membroFaturavelPct,
} from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/constants'
import {
  TrendingUp, Users, DollarSign, Clock, AlertTriangle, Target,
} from 'lucide-react'

export function Dashboard() {
  const { clientesFiltrados, colaboradoresFiltrados, custoTotal, labelPeriodo, isRange } = useFilteredSheets()
  const { clientes } = useSheetsStore()
  const { equipe, fixos } = useCustosStore()
  const { params } = useConfigStore()

  const analiseClientes = useMemo(
    () => calcClientesAnalise(clientesFiltrados, custoTotal),
    [clientesFiltrados, custoTotal]
  )

  const receita = useMemo(
    () => clientesFiltrados.reduce((s, c) => s + c.entradaContratual, 0),
    [clientesFiltrados]
  )

  const lucro = receita - custoTotal
  const margemLiquida = receita > 0 ? lucro / receita : 0

  const horasFaturaveis = useMemo(
    () => calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct),
    [equipe, params]
  )

  const custoPorHora = calcCustoPorHoraReal(custoTotal, horasFaturaveis)
  const precoMinimo = calcPrecoPorHoraMinimo(custoPorHora, params.margemDesejadaPct)
  const precoRecomendado = calcPrecoPorHoraRecomendado(precoMinimo, params.fatorComplexidadePct)
  const ticketMedio = calcTicketMedioReceita(clientesFiltrados)
  const ticketMedioLucro = analiseClientes.length > 0
    ? analiseClientes.reduce((s, c) => s + c.lucroReal, 0) / analiseClientes.length
    : 0

  const totalHoras = useMemo(
    () => clientesFiltrados.reduce((s, c) => s + c.tempoTrabalhado, 0),
    [clientesFiltrados]
  )

  const ocupacaoMedia = useMemo(() => {
    if (colaboradoresFiltrados.length === 0) return 0
    const total = colaboradoresFiltrados.reduce(
      (s, c) => s + (c.cargaHorariaMes > 0 ? c.tempoTrabalhado / c.cargaHorariaMes : 0),
      0
    )
    return total / colaboradoresFiltrados.length
  }, [colaboradoresFiltrados])

  const setorMaisSobrecarregado = useMemo(() => {
    const porArea: Record<string, { horas: number; carga: number }> = {}
    colaboradoresFiltrados.forEach(c => {
      if (!porArea[c.area]) porArea[c.area] = { horas: 0, carga: 0 }
      porArea[c.area].horas += c.tempoTrabalhado
      porArea[c.area].carga += c.cargaHorariaMes
    })
    let maxArea = '-'
    let maxPct = 0
    Object.entries(porArea).forEach(([area, v]) => {
      const pct = v.carga > 0 ? v.horas / v.carga : 0
      if (pct > maxPct) { maxPct = pct; maxArea = area }
    })
    return { nome: maxArea, pct: maxPct }
  }, [colaboradoresFiltrados])

  // ── Alert conditions ──────────────────────────────────────────────────────
  const clientesNegativos = analiseClientes.filter(c => c.lucroReal < 0)
  const altaOcupacao = ocupacaoMedia > 0.85

  // ── Chart: Receita vs Custo vs Lucro (all months) ─────────────────────────
  const mesesDisponiveis = useMemo(() => {
    return [...new Set(clientes.map(c => c.mesAno))]
  }, [clientes])

  const chartReceitaCustoLucro = useMemo(() => {
    return mesesDisponiveis.map(mes => {
      const clientesMes = clientes.filter(c => c.mesAno === mes)
      const receitaMes = clientesMes.reduce((s, c) => s + c.entradaContratual, 0)
      const avgCustoPct = clientesMes.length > 0
        ? clientesMes.reduce((s, c) => s + c.custoOperacionalPct, 0) / clientesMes.length
        : 0
      const custoMes = receitaMes * avgCustoPct
      return {
        mes,
        Receita: receitaMes,
        Custo: custoMes,
        Lucro: receitaMes - custoMes,
      }
    })
  }, [clientes, mesesDisponiveis])

  // ── Chart: Composição do custo ─────────────────────────────────────────────
  const folhaFaturavel = useMemo(() => {
    return equipe
      .filter(m => m.status === 'Ativo')
      .reduce((s, m) => s + m.salario * membroFaturavelPct(m), 0)
  }, [equipe])

  const backendEquipe = useMemo(() => calcCustoBackendEquipe(equipe), [equipe])
  const backendFixos = useMemo(() => calcCustoBackendFixos(fixos), [fixos])
  const fixosOperacionais = useMemo(
    () => fixos.filter(f => f.tipo === 'Operacional').reduce((s, f) => s + f.valor, 0),
    [fixos]
  )

  const chartComposicaoCusto = [
    { name: 'Folha Faturável', value: folhaFaturavel, color: CHART_COLORS.primary },
    { name: 'Backend Equipe', value: backendEquipe, color: CHART_COLORS.secondary },
    { name: 'Fixos Operacionais', value: fixosOperacionais, color: CHART_COLORS.teal },
    { name: 'Fixos Backend', value: backendFixos, color: CHART_COLORS.purple },
  ].filter(d => d.value > 0)

  // ── Chart: Lucro por cliente ───────────────────────────────────────────────
  const chartLucroPorCliente = useMemo(() => {
    return [...analiseClientes]
      .sort((a, b) => b.lucroReal - a.lucroReal)
      .map(c => ({
        cliente: c.nome.length > 12 ? c.nome.slice(0, 12) + '…' : c.nome,
        Lucro: c.lucroReal,
        fill: c.lucroReal >= 0 ? CHART_COLORS.success : CHART_COLORS.danger,
      }))
  }, [analiseClientes])

  // ── Chart: Evolução da margem ──────────────────────────────────────────────
  const chartEvolucaoMargem = useMemo(() => {
    return mesesDisponiveis.map(mes => {
      const clientesMes = clientes.filter(c => c.mesAno === mes)
      const receitaMes = clientesMes.reduce((s, c) => s + c.entradaContratual, 0)
      const avgCustoPct = clientesMes.length > 0
        ? clientesMes.reduce((s, c) => s + c.custoOperacionalPct, 0) / clientesMes.length
        : 0
      const custoMes = receitaMes * avgCustoPct
      const lucroMes = receitaMes - custoMes
      return {
        mes,
        margem: receitaMes > 0 ? parseFloat(((lucroMes / receitaMes) * 100).toFixed(1)) : 0,
      }
    })
  }, [clientes, mesesDisponiveis])

  const isMockData = clientes.some(c => c.cliente === 'Virage')

  const currencyFormatter = (v: number) => formatCurrency(v)
  const percentAxisFormatter = (v: number) => `${v}%`

  if (clientesFiltrados.length === 0) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64 text-muted text-sm">
          Nenhum dado para o período selecionado
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral">Visão Executiva</h1>
        <p className="text-sm text-muted mt-1">Painel geral de desempenho — {labelPeriodo}{isRange ? ' (período acumulado)' : ''}</p>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 mb-6">
        {isMockData && (
          <AlertBanner
            type="info"
            message="Você está visualizando dados de demonstração. Conecte sua planilha para dados reais."
          />
        )}
        {clientesNegativos.length > 0 && (
          <AlertBanner
            type="danger"
            message={`${clientesNegativos.length} cliente(s) com margem negativa: ${clientesNegativos.map(c => c.nome).join(', ')}`}
          />
        )}
        {altaOcupacao && (
          <AlertBanner
            type="warn"
            message={`Ocupação média da equipe em ${formatPercent(ocupacaoMedia)} — acima do limite de 85%. Avalie a contratação.`}
          />
        )}
      </div>

      {/* ── KPIs linha 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <MetricCard
          label="Receita Total"
          value={formatCurrency(receita)}
          icon={<DollarSign size={16} />}
          variant="default"
        />
        <MetricCard
          label="Custo Total"
          value={formatCurrency(custoTotal)}
          icon={<AlertTriangle size={16} />}
          variant="default"
        />
        <MetricCard
          label="Lucro Líquido"
          value={formatCurrency(lucro)}
          icon={<TrendingUp size={16} />}
          variant={lucro >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Margem Líquida"
          value={formatPercent(margemLiquida)}
          icon={<Target size={16} />}
          variant={margemLiquida >= 0.25 ? 'success' : margemLiquida >= 0.10 ? 'warning' : 'danger'}
          subtext="Meta: 25%"
        />
        <MetricCard
          label="Custo / Hora Real"
          value={formatCurrency(custoPorHora)}
          icon={<Clock size={16} />}
          subtext={`${formatHours(horasFaturaveis)} fat./mês`}
        />
        <MetricCard
          label="Preço / Hora Rec."
          value={formatCurrency(precoRecomendado)}
          icon={<TrendingUp size={16} />}
          variant="info"
          subtext={`Mín. ${formatCurrency(precoMinimo)}`}
        />
      </div>

      {/* ── KPIs linha 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          label="Clientes Ativos"
          value={String(clientesFiltrados.length)}
          icon={<Users size={16} />}
        />
        <MetricCard
          label="Ticket Médio Receita"
          value={formatCurrency(ticketMedio)}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          label="Ticket Médio Lucro"
          value={formatCurrency(ticketMedioLucro)}
          variant={ticketMedioLucro >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Total Horas (clientes)"
          value={formatHours(totalHoras)}
          icon={<Clock size={16} />}
        />
        <MetricCard
          label="Ocupação Geral"
          value={formatPercent(ocupacaoMedia)}
          variant={ocupacaoMedia > 0.85 ? 'danger' : ocupacaoMedia > 0.70 ? 'warning' : 'success'}
          subtext="Média da equipe"
        />
        <MetricCard
          label="Setor Mais Sobrecarr."
          value={setorMaisSobrecarregado.nome}
          subtext={formatPercent(setorMaisSobrecarregado.pct)}
          variant={setorMaisSobrecarregado.pct > 0.85 ? 'danger' : 'warning'}
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Chart 1: Receita vs Custo vs Lucro */}
        <ChartCard
          title="Receita vs Custo vs Lucro"
          subtitle="Evolução mensal"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartReceitaCustoLucro} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receita" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Custo" fill={CHART_COLORS.danger} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Lucro" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Composição do Custo */}
        <ChartCard
          title="Composição do Custo"
          subtitle={`Total: ${formatCurrency(custoTotal)}`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartComposicaoCusto}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartComposicaoCusto.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Lucro por Cliente */}
        <ChartCard
          title="Lucro por Cliente"
          subtitle={labelPeriodo}
        >
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
        </ChartCard>

        {/* Chart 4: Evolução da Margem */}
        <ChartCard
          title="Evolução da Margem"
          subtitle="Margem líquida % por mês"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartEvolucaoMargem} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tickFormatter={percentAxisFormatter} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <ReferenceLine y={25} stroke={CHART_COLORS.warning} strokeDasharray="5 5" label={{ value: 'Meta 25%', position: 'right', fontSize: 11, fill: CHART_COLORS.warning }} />
              <Line
                type="monotone"
                dataKey="margem"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                dot={{ fill: CHART_COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageWrapper>
  )
}
