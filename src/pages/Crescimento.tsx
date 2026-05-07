import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CheckCircle, XCircle } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useConfigStore } from '@/store/useConfigStore'
import { useCustosStore } from '@/store/useCustosStore'
import {
  calcTotalFolha,
  calcTotalFixos,
  calcReceitaNecessaria,
  calcDeltaReceita,
  calcClientesNecessarios,
  calcImpactoContratacao,
  calcHorasFaturaveisTotal,
  calcPrecoPorHoraMinimo,
  calcPrecoPorHoraRecomendado,
  calcCustoPorHoraReal,
  calcCustoTotalMensal,
  calcPacote,
  calcTicketMedioReceita,
} from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/constants'

const FASES = [
  { label: 'Fase 1', periodo: 'Abr–Jun 2026', nome: 'Estabilizar', meta: 'Faturamento estável e processos ajustados', acao: 'Reajuste de preços e revisão de contratos' },
  { label: 'Fase 2', periodo: 'Jul–Set 2026', nome: 'Crescer', meta: '+2 novos clientes contratados', acao: 'Prospecção ativa e pacotes reposicionados' },
  { label: 'Fase 3', periodo: 'Out–Dez 2026', nome: 'Meta dos sócios', meta: 'Receita necessária atingida com margem desejada', acao: 'Consolidação de operação e expansão seletiva' },
]

export function Crescimento() {
  const { clientesFiltrados, labelPeriodo } = useFilteredSheets()
  const { params, pacotes } = useConfigStore()
  const { equipe, fixos, variaveis } = useCustosStore()

  const [metaJana, setMetaJana] = useState(12000)
  const [metaFelipe, setMetaFelipe] = useState(15000)
  const [metaPedro, setMetaPedro] = useState(15000)
  const [margemMeta, setMargemMeta] = useState(25)
  const [custoNovoPro, setCustoNovoPro] = useState(0)

  const margemMetaPct = margemMeta / 100

  const receitaAtual = clientesFiltrados.reduce((s, c) => s + c.entradaContratual, 0)
  const ticketMedio = calcTicketMedioReceita(clientesFiltrados)

  // Com metas salariais dos sócios
  const equipeComMeta = equipe.map(m => {
    if (m.nome.toLowerCase().includes('jana')) return { ...m, salario: metaJana }
    if (m.nome.toLowerCase().includes('felipe')) return { ...m, salario: metaFelipe }
    if (m.nome.toLowerCase().includes('pedro')) return { ...m, salario: metaPedro }
    return m
  })

  const totalFolhaComMeta = calcTotalFolha(equipeComMeta)
  const totalFixos = calcTotalFixos(fixos)
  const custoComMeta = totalFolhaComMeta + totalFixos
  const receitaNecessaria = calcReceitaNecessaria(custoComMeta, margemMetaPct)
  const deltaReceita = calcDeltaReceita(receitaNecessaria, receitaAtual)
  const clientesNecessarios = calcClientesNecessarios(Math.max(deltaReceita, 0), ticketMedio)

  const barData = [
    { name: 'Receita Atual', valor: receitaAtual, fill: CHART_COLORS.secondary },
    { name: 'Meta', valor: receitaNecessaria, fill: CHART_COLORS.primary },
  ]

  // Preços dos pacotes calculados para cenários
  const custoTotal = calcCustoTotalMensal(equipe, fixos, variaveis)
  const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const custoH = calcCustoPorHoraReal(custoTotal, horasFat)
  const precoMin = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoRec = calcPrecoPorHoraRecomendado(precoMin, params.fatorComplexidadePct)

  const getPacotePreco = (nome: string) => {
    const p = pacotes.find(x => x.nome === nome)
    if (!p) return 0
    return calcPacote(p, custoH, params.margemDesejadaPct, params.fatorComplexidadePct).precoRecomendado
  }

  const cenarios = [
    {
      nome: 'Conservador',
      descricao: '2 clientes Micro + 1 Start',
      receita: getPacotePreco('Micro') * 2 + getPacotePreco('Start'),
    },
    {
      nome: 'Misto',
      descricao: '1 Média + 2 Start',
      receita: getPacotePreco('Média') + getPacotePreco('Start') * 2,
    },
    {
      nome: 'Agressivo',
      descricao: '2 clientes Grande',
      receita: getPacotePreco('Grande') * 2,
    },
  ]

  // Impacto contratação
  const impacto = calcImpactoContratacao(custoNovoPro, horasFat / 12, precoRec)

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Crescimento</h1>
        <p className="text-sm text-muted mt-1">Projeções e metas para escalar a operação</p>
      </div>

      {/* Meta inputs */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-4">Metas dos sócios e parâmetros</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Meta salarial Jana (R$)</label>
            <input
              type="number"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={metaJana}
              onChange={e => setMetaJana(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Meta salarial Felipe (R$)</label>
            <input
              type="number"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={metaFelipe}
              onChange={e => setMetaFelipe(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Meta salarial Pedro (R$)</label>
            <input
              type="number"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={metaPedro}
              onChange={e => setMetaPedro(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Margem desejada (%)</label>
            <input
              type="number" min="0" max="100" step="1"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={margemMeta}
              onChange={e => setMargemMeta(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Projection cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Custo com metas" value={formatCurrency(custoComMeta)} subtext="folha + fixos" />
        <MetricCard label="Receita necessária" value={formatCurrency(receitaNecessaria)} variant="warning" />
        <MetricCard label="Receita atual" value={formatCurrency(receitaAtual)} subtext={labelPeriodo} variant="info" />
        <MetricCard
          label="Receita adicional"
          value={formatCurrency(Math.max(deltaReceita, 0))}
          variant={deltaReceita <= 0 ? 'success' : 'danger'}
          subtext={deltaReceita <= 0 ? 'Meta atingida!' : 'a buscar'}
        />
        <MetricCard
          label="Clientes necessários"
          value={clientesNecessarios <= 0 ? '0' : String(clientesNecessarios)}
          subtext={`ticket médio ${formatCurrency(ticketMedio)}`}
          variant={clientesNecessarios <= 0 ? 'success' : 'default'}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-1">Receita atual vs Meta</h3>
        <p className="text-xs text-muted mb-4">Comparativo do mês selecionado</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mix scenarios */}
      <div className="mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-4">Mix de novos clientes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cenarios.map(c => {
            const receitaTotal = receitaAtual + c.receita
            const atinge = receitaTotal >= receitaNecessaria
            return (
              <div key={c.nome} className={`bg-white rounded-xl border p-5 ${atinge ? 'border-success/40' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-neutral">{c.nome}</h4>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${atinge ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                    {atinge ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {atinge ? 'Atinge meta' : 'Abaixo da meta'}
                  </span>
                </div>
                <p className="text-sm text-muted mb-3">{c.descricao}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Receita adicional</span>
                    <span className="font-medium text-neutral">{formatCurrency(c.receita)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Receita total</span>
                    <span className="font-semibold text-primary">{formatCurrency(receitaTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Delta da meta</span>
                    <span className={`font-medium ${receitaTotal >= receitaNecessaria ? 'text-success' : 'text-danger'}`}>
                      {receitaTotal >= receitaNecessaria ? '+' : ''}{formatCurrency(receitaTotal - receitaNecessaria)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-5">Roadmap 2026</h3>
        <div className="flex flex-col md:flex-row gap-0">
          {FASES.map((fase, i) => (
            <div key={fase.label} className="flex-1 flex flex-col md:flex-row">
              <div className="flex-1 relative">
                {/* Step indicator */}
                <div className="flex md:flex-col items-start gap-3 md:gap-2">
                  <div className="flex items-center gap-2 md:flex-col md:items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                    {i < FASES.length - 1 && (
                      <div className="hidden md:block w-px flex-1 bg-border mt-1 mx-auto" style={{ height: '100%', minHeight: '2px', width: '2px' }}></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">{fase.label} · {fase.periodo}</p>
                    <p className="font-semibold text-neutral text-sm mt-0.5">{fase.nome}</p>
                    <p className="text-xs text-muted mt-1"><span className="font-medium text-neutral">Meta:</span> {fase.meta}</p>
                    <p className="text-xs text-muted mt-0.5"><span className="font-medium text-neutral">Ação:</span> {fase.acao}</p>
                  </div>
                </div>
              </div>
              {i < FASES.length - 1 && (
                <div className="hidden md:flex items-center px-4">
                  <div className="w-8 h-0.5 bg-border"></div>
                  <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-border"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contratação calculator */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold text-neutral text-sm mb-4">Calculadora de Contratação</h3>
        <div className="flex items-end gap-4 mb-5">
          <div>
            <label className="text-xs text-muted mb-1 block">Custo do novo profissional (R$/mês)</label>
            <input
              type="number" min="0"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
              value={custoNovoPro || ''}
              onChange={e => setCustoNovoPro(Number(e.target.value))}
              placeholder="Ex: 6000"
            />
          </div>
        </div>
        {custoNovoPro > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Receita mínima necessária</p>
              <p className="font-semibold text-neutral">{formatCurrency(calcReceitaNecessaria(custoNovoPro, params.margemDesejadaPct))}</p>
              <p className="text-xs text-muted mt-0.5">para cobrir o custo</p>
            </div>
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Lucro incremental</p>
              <p className={`font-semibold ${impacto.lucroIncremental >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(impacto.lucroIncremental)}</p>
              <p className="text-xs text-muted mt-0.5">receita gerada - custo</p>
            </div>
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Payback estimado</p>
              <p className="font-semibold text-neutral">{impacto.paybackMeses <= 0 ? '—' : `${impacto.paybackMeses} meses`}</p>
              <p className="text-xs text-muted mt-0.5">{formatHours(horasFat / 12)} h adicionais/mês estimado</p>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
