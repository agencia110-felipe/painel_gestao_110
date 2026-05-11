import { useMemo, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { useFilteredSheets } from '@/hooks/useFilteredSheets'
import { useConfigStore } from '@/store/useConfigStore'
import { useCustosStore } from '@/store/useCustosStore'
import {
  calcHorasFaturaveisTotal,
  calcCustoPorHoraReal,
  calcPrecoPorHoraMinimo,
  calcPrecoPorHoraRecomendado,
  calcCustoTotalMensal,
  calcReceitaNecessaria,
  calcTicketMedioReceita,
} from '@/lib/calculations'
import { formatCurrency, formatHours, formatPercent } from '@/lib/formatters'

export function Crescimento() {
  const { clientesFiltrados, labelPeriodo } = useFilteredSheets()
  const { params } = useConfigStore()
  const { equipe, fixos, variaveis } = useCustosStore()

  const [custoNovoPro, setCustoNovoPro] = useState(0)
  const [novaFaturavelPct, setNovaFaturavelPct] = useState(100)

  const custoTotal   = calcCustoTotalMensal(equipe, fixos, variaveis)
  const horasFat     = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const custoH       = calcCustoPorHoraReal(custoTotal, horasFat)
  const precoHMin    = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoHRec    = calcPrecoPorHoraRecomendado(precoHMin, params.fatorComplexidadePct)
  const receitaAtual = clientesFiltrados.reduce((s, c) => s + c.entradaContratual, 0)
  const ticketMedio  = calcTicketMedioReceita(clientesFiltrados)

  // ── Projeção pós-contratação ────────────────────────────────────────────────
  const projecao = useMemo(() => {
    if (custoNovoPro <= 0) return null

    const novoCustoTotal  = custoTotal + custoNovoPro
    // Horas faturáveis adicionais do novo profissional (% alocação configurável)
    const horasNovasPro   = params.horasMes * params.aproveitamentoPct * (novaFaturavelPct / 100)
    const novasHorasFat   = horasFat + horasNovasPro

    // Novo custo/hora com overhead redistribuído
    const novoCustoH      = calcCustoPorHoraReal(novoCustoTotal, novasHorasFat)
    const novoPrecoHMin   = calcPrecoPorHoraMinimo(novoCustoH, params.margemDesejadaPct)
    const novoPrecoHRec   = calcPrecoPorHoraRecomendado(novoPrecoHMin, params.fatorComplexidadePct)

    // Receita necessária para atingir a margem desejada com a nova estrutura
    const receitaNecessaria = calcReceitaNecessaria(novoCustoTotal, params.margemDesejadaPct)
    const receitaAdicional  = Math.max(receitaNecessaria - receitaAtual, 0)

    // Quantos clientes adicionais no ticket médio atual
    const clientesAdicionais = ticketMedio > 0 ? Math.ceil(receitaAdicional / ticketMedio) : 0

    // Receita potencial se todas as novas horas forem vendidas
    const receitaCapacidade = novasHorasFat * novoPrecoHRec
    const lucroCapacidade   = receitaCapacidade - novoCustoTotal

    return {
      novoCustoTotal,
      horasNovasPro,
      novasHorasFat,
      novoCustoH,
      novoPrecoHRec,
      receitaNecessaria,
      receitaAdicional,
      clientesAdicionais,
      receitaCapacidade,
      lucroCapacidade,
      deltaCustoH: novoCustoH - custoH,
      deltaPrecoH: novoPrecoHRec - precoHRec,
    }
  }, [custoNovoPro, novaFaturavelPct, custoTotal, horasFat, custoH, precoHRec, receitaAtual, ticketMedio, params])

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Crescimento</h1>
        <p className="text-sm text-muted mt-1">Calculadora de contratação — {labelPeriodo}</p>
      </div>

      {/* Contexto atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Custo Total Mensal" value={formatCurrency(custoTotal)} subtext="folha + fixos + variáveis" />
        <MetricCard label="Custo / Hora" value={formatCurrency(custoH)} subtext="base de precificação" variant="warning" />
        <MetricCard label="Horas Faturáveis" value={formatHours(horasFat)} subtext="capacidade atual/mês" variant="info" />
        <MetricCard label="Receita Atual" value={formatCurrency(receitaAtual)} subtext={labelPeriodo} variant="success" />
      </div>

      {/* Calculadora */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold text-neutral text-sm mb-1">Calculadora de Contratação</h3>
        <p className="text-xs text-muted mb-5">
          Simula o impacto real de uma contratação: o overhead aumenta, o custo/hora sobe,
          e o preço mínimo precisa ser recalculado.
        </p>

        <div className="flex flex-wrap gap-5 mb-6">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Custo do novo profissional (R$/mês)</label>
            <input
              type="number"
              min="0"
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
              value={custoNovoPro || ''}
              onChange={e => setCustoNovoPro(Number(e.target.value))}
              placeholder="Ex: 6.000"
            />
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">% das horas faturáveis do novo pro</label>
            <select
              value={novaFaturavelPct}
              onChange={e => setNovaFaturavelPct(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
            >
              <option value={100}>100% faturável</option>
              <option value={80}>80% faturável</option>
              <option value={60}>60% faturável</option>
              <option value={50}>50% faturável</option>
              <option value={0}>0% (gestão/back)</option>
            </select>
          </div>
        </div>

        {projecao ? (
          <div className="space-y-5">
            {/* Impacto no custo */}
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Impacto no custo e precificação</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Novo custo total/mês</p>
                  <p className="font-semibold text-neutral text-base">{formatCurrency(projecao.novoCustoTotal)}</p>
                  <p className="text-xs text-muted mt-1">+{formatCurrency(custoNovoPro)} vs. atual</p>
                </div>

                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Novo custo / hora</p>
                  <p className={`font-semibold text-base ${projecao.deltaCustoH > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatCurrency(projecao.novoCustoH)}
                  </p>
                  <p className={`text-xs mt-1 ${projecao.deltaCustoH > 0 ? 'text-warning' : 'text-success'}`}>
                    {projecao.deltaCustoH > 0 ? `+${formatCurrency(projecao.deltaCustoH)}` : formatCurrency(projecao.deltaCustoH)} vs. atual
                  </p>
                </div>

                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Novo preço/hora recomendado</p>
                  <p className={`font-semibold text-base ${projecao.deltaPrecoH > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatCurrency(projecao.novoPrecoHRec)}
                  </p>
                  <p className={`text-xs mt-1 ${projecao.deltaPrecoH > 0 ? 'text-warning' : 'text-success'}`}>
                    {projecao.deltaPrecoH > 0 ? `+${formatCurrency(projecao.deltaPrecoH)}` : formatCurrency(projecao.deltaPrecoH)} vs. atual
                  </p>
                </div>

                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Horas faturáveis adicionais</p>
                  <p className="font-semibold text-neutral text-base">{formatHours(projecao.horasNovasPro)}</p>
                  <p className="text-xs text-muted mt-1">total: {formatHours(projecao.novasHorasFat)}</p>
                </div>
              </div>
            </div>

            {/* Receita necessária */}
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Crescimento necessário</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Receita necessária</p>
                  <p className="font-semibold text-neutral text-base">{formatCurrency(projecao.receitaNecessaria)}</p>
                  <p className="text-xs text-muted mt-1">
                    para {formatPercent(params.margemDesejadaPct)} de margem
                  </p>
                </div>

                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Receita adicional</p>
                  <p className={`font-semibold text-base ${projecao.receitaAdicional > 0 ? 'text-danger' : 'text-success'}`}>
                    {projecao.receitaAdicional > 0 ? `+${formatCurrency(projecao.receitaAdicional)}` : 'Receita já cobre'}
                  </p>
                  <p className="text-xs text-muted mt-1">acima da receita atual</p>
                </div>

                <div className="bg-bg-page rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted mb-1">Clientes adicionais necessários</p>
                  <p className={`font-semibold text-base ${projecao.clientesAdicionais > 0 ? 'text-warning' : 'text-success'}`}>
                    {projecao.clientesAdicionais > 0 ? `${projecao.clientesAdicionais} clientes` : '0 clientes'}
                  </p>
                  <p className="text-xs text-muted mt-1">ticket médio: {formatCurrency(ticketMedio)}</p>
                </div>

                <div className={`bg-bg-page rounded-lg p-4 border ${projecao.lucroCapacidade >= 0 ? 'border-success/30' : 'border-danger/30'}`}>
                  <p className="text-xs text-muted mb-1">Lucro (capacidade plena)</p>
                  <p className={`font-semibold text-base ${projecao.lucroCapacidade >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(projecao.lucroCapacidade)}
                  </p>
                  <p className="text-xs text-muted mt-1">se {formatHours(projecao.novasHorasFat)} vendidas</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted text-center py-6 border border-dashed border-border rounded-lg">
            Informe o custo acima para calcular o impacto.
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
