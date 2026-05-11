import { useState } from 'react'
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
} from '@/lib/calculations'
import { formatCurrency, formatHours } from '@/lib/formatters'

export function Crescimento() {
  const { clientesFiltrados, labelPeriodo } = useFilteredSheets()
  const { params } = useConfigStore()
  const { equipe, fixos, variaveis } = useCustosStore()

  const [custoNovoPro, setCustoNovoPro] = useState(0)

  const custoTotal    = calcCustoTotalMensal(equipe, fixos, variaveis)
  const horasFat      = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const custoH        = calcCustoPorHoraReal(custoTotal, horasFat)
  const precoHMin     = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoHRec     = calcPrecoPorHoraRecomendado(precoHMin, params.fatorComplexidadePct)
  const receitaAtual  = clientesFiltrados.reduce((s, c) => s + c.entradaContratual, 0)

  // Calculadora de contratação
  const novoCustoTotal      = custoTotal + custoNovoPro
  const receitaNecessaria   = calcReceitaNecessaria(novoCustoTotal, params.margemDesejadaPct)
  const receitaAdicional    = Math.max(receitaNecessaria - receitaAtual, 0)
  // Horas que o novo profissional pode contribuir por mês
  const horasAdicionais     = params.horasMes * params.aproveitamentoPct
  // Receita gerada pelo novo profissional a preço recomendado
  const receitaGerada       = horasAdicionais * precoHRec
  const lucroIncremental    = receitaGerada - custoNovoPro

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
        <p className="text-xs text-muted mb-5">Informe o custo de um novo profissional para ver o impacto na operação.</p>

        <div className="mb-6">
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

        {custoNovoPro > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-page rounded-lg p-4 border border-border">
              <p className="text-xs text-muted mb-1">Novo custo total mensal</p>
              <p className="font-semibold text-neutral text-base">{formatCurrency(novoCustoTotal)}</p>
              <p className="text-xs text-muted mt-1">+{formatCurrency(custoNovoPro)} vs. atual</p>
            </div>

            <div className="bg-bg-page rounded-lg p-4 border border-border">
              <p className="text-xs text-muted mb-1">Receita necessária</p>
              <p className="font-semibold text-neutral text-base">{formatCurrency(receitaNecessaria)}</p>
              <p className="text-xs text-muted mt-1">
                {receitaAdicional > 0
                  ? `+${formatCurrency(receitaAdicional)} a mais`
                  : 'Receita atual já cobre'}
              </p>
            </div>

            <div className="bg-bg-page rounded-lg p-4 border border-border">
              <p className="text-xs text-muted mb-1">Horas adicionais / mês</p>
              <p className="font-semibold text-neutral text-base">{formatHours(horasAdicionais)}</p>
              <p className="text-xs text-muted mt-1">a {formatCurrency(precoHRec)}/h = {formatCurrency(receitaGerada)}</p>
            </div>

            <div className={`bg-bg-page rounded-lg p-4 border ${lucroIncremental >= 0 ? 'border-success/30' : 'border-danger/30'}`}>
              <p className="text-xs text-muted mb-1">Lucro incremental / mês</p>
              <p className={`font-semibold text-base ${lucroIncremental >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(lucroIncremental)}
              </p>
              <p className="text-xs text-muted mt-1">receita gerada − custo</p>
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
