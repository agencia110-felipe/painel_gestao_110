import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { useConfigStore } from '@/store/useConfigStore'
import { useCustosStore } from '@/store/useCustosStore'
import {
  calcCustoTotalMensal,
  calcHorasFaturaveisTotal,
  calcCustoPorHoraReal,
  calcPrecoPorHoraMinimo,
  calcPrecoPorHoraRecomendado,
  calcPacote,
} from '@/lib/calculations'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/constants'

export function Pacotes() {
  const { params, pacotes, setParam } = useConfigStore()
  const { equipe, fixos, variaveis } = useCustosStore()

  const [simHoras, setSimHoras] = useState(0)

  const custoTotal = calcCustoTotalMensal(equipe, fixos, variaveis)
  const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const custoH = calcCustoPorHoraReal(custoTotal, horasFat)
  const precoHMin = calcPrecoPorHoraMinimo(custoH, params.margemDesejadaPct)
  const precoHRec = calcPrecoPorHoraRecomendado(precoHMin, params.fatorComplexidadePct)

  const calculados = pacotes.map(p => calcPacote(p, custoH, params.margemDesejadaPct, params.fatorComplexidadePct))

  // Simulador avulso
  const simCusto = simHoras * custoH
  const simPrecoMin = simHoras * precoHMin
  const simPrecoRec = simHoras * precoHRec
  const simLucro = simPrecoRec - simCusto
  const simMargem = simPrecoRec > 0 ? simLucro / simPrecoRec : 0

  function marginColor(margem: number): string {
    if (margem >= params.margemDesejadaPct) return CHART_COLORS.success
    if (margem >= params.margemDesejadaPct * 0.75) return CHART_COLORS.warning
    return CHART_COLORS.danger
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Pacotes</h1>
        <p className="text-sm text-muted mt-1">Precificação baseada no custo real da operação</p>
      </div>

      {/* Reference cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Custo/hora real" value={formatCurrency(custoH)} subtext="base de cálculo" />
        <MetricCard label="Preço/hora mínimo" value={formatCurrency(precoHMin)} subtext={`margem ${formatPercent(params.margemDesejadaPct)}`} variant="warning" />
        <MetricCard label="Preço/hora recomendado" value={formatCurrency(precoHRec)} subtext={`+${formatPercent(params.fatorComplexidadePct)} complexidade`} variant="success" />
        <MetricCard label="Margem desejada" value={formatPercent(params.margemDesejadaPct)} variant="info" />
      </div>

      {/* Parameters */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h3 className="font-semibold text-neutral text-sm mb-4">Parâmetros de precificação</h3>
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="text-xs text-muted mb-1 block">Margem desejada (%)</label>
            <input
              type="number" min="0" max="100" step="1"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-32"
              value={Math.round(params.margemDesejadaPct * 100)}
              onChange={e => setParam('margemDesejadaPct', Number(e.target.value) / 100)}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Fator de complexidade (%)</label>
            <input
              type="number" min="0" max="100" step="1"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-32"
              value={Math.round(params.fatorComplexidadePct * 100)}
              onChange={e => setParam('fatorComplexidadePct', Number(e.target.value) / 100)}
            />
          </div>
        </div>
      </div>

      {/* Package grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {calculados.map(p => (
          <div
            key={p.nome}
            className={`bg-white rounded-xl border p-5 flex flex-col ${p.destaque ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
          >
            {p.destaque && (
              <span className="self-start mb-2 text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">Recomendado</span>
            )}
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-neutral text-base">{p.nome}</h4>
              <span className="text-xs text-muted font-medium">{p.horas}h/mês</span>
            </div>

            <div className="mt-2">
              <span className="text-xs text-muted line-through">{formatCurrency(p.precoAntigo)}</span>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-primary">{formatCurrency(p.precoRecomendado)}</span>
            </div>
            <div className="text-xs text-muted mt-0.5">{formatCurrency(p.precoRecomendado / p.horas)}/hora</div>

            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Margem</span>
                <span className="font-medium" style={{ color: marginColor(p.margemNova) }}>{formatPercent(p.margemNova)}</span>
              </div>
              <div className="h-1.5 bg-neutral/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(p.margemNova * 100, 100)}%`, backgroundColor: marginColor(p.margemNova) }}
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Custo</span>
                <span className="text-neutral">{formatCurrency(p.custoReal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Lucro/mês</span>
                <span className="font-medium text-success">{formatCurrency(p.lucroMes)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparative table */}
      <div className="bg-white rounded-xl border border-border overflow-x-auto mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-neutral text-sm">Tabela comparativa</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Pacote', 'Horas', 'Preço Antigo', 'Preço Correto', 'Diferença', 'Margem Antiga', 'Margem Nova'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calculados.map(p => {
              const diff = p.precoRecomendado - p.precoAntigo
              const okMargem = p.margemNova >= params.margemDesejadaPct
              const closeMargem = p.margemNova >= params.margemDesejadaPct * 0.75
              const rowColor = okMargem ? '' : closeMargem ? 'bg-warning-bg/30' : 'bg-danger-bg/30'
              return (
                <tr key={p.nome} className={`border-b border-border last:border-0 ${rowColor}`}>
                  <td className="px-4 py-3 font-medium text-neutral">{p.nome}</td>
                  <td className="px-4 py-3 text-muted">{p.horas}h</td>
                  <td className="px-4 py-3 text-muted line-through">{formatCurrency(p.precoAntigo)}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatCurrency(p.precoRecomendado)}</td>
                  <td className={`px-4 py-3 font-medium ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatPercent(p.margemAntiga)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: marginColor(p.margemNova) }}>{formatPercent(p.margemNova)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Simulador avulso */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold text-neutral text-sm mb-4">Simulador Avulso</h3>
        <div className="flex items-end gap-4 mb-5">
          <div>
            <label className="text-xs text-muted mb-1 block">Número de horas</label>
            <input
              type="number" min="0"
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
              value={simHoras || ''}
              onChange={e => setSimHoras(Number(e.target.value))}
              placeholder="Ex: 30"
            />
          </div>
        </div>
        {simHoras > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Custo</p>
              <p className="font-semibold text-neutral">{formatCurrency(simCusto)}</p>
            </div>
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Preço mínimo</p>
              <p className="font-semibold text-warning">{formatCurrency(simPrecoMin)}</p>
            </div>
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Preço recomendado</p>
              <p className="font-semibold text-primary">{formatCurrency(simPrecoRec)}</p>
            </div>
            <div className="bg-bg-page rounded-lg p-4">
              <p className="text-xs text-muted mb-1">Lucro / Margem</p>
              <p className="font-semibold text-success">{formatCurrency(simLucro)}</p>
              <p className="text-xs text-muted">{formatPercent(simMargem)}</p>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
