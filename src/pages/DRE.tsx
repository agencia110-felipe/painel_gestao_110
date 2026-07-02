import { useState } from 'react'
import { mesAtual } from '@/lib/utils'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { useEngine } from '@/hooks/useEngine'
import { PendenciasBanner } from '@/components/PendenciasBanner'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import type { Periodo } from '@/types'

function DRERow({
  label,
  value,
  indent = 0,
  bold = false,
  color,
}: {
  label: string
  value: number | null
  indent?: number
  bold?: boolean
  color?: 'success' | 'danger' | 'warning'
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 border-b border-border last:border-0 ${bold ? 'font-semibold' : ''}`}
      style={{ paddingLeft: `${indent * 20 + 16}px`, paddingRight: '16px' }}
    >
      <span className={`text-sm ${bold ? 'text-neutral-900' : 'text-neutral-600'}`}>{label}</span>
      <span
        className={`text-sm font-mono ${
          color === 'success'
            ? 'text-success font-semibold'
            : color === 'danger'
            ? 'text-danger font-semibold'
            : color === 'warning'
            ? 'text-warning font-semibold'
            : bold
            ? 'text-neutral-900'
            : 'text-neutral-700'
        }`}
      >
        {value === null ? '—' : formatCurrency(value)}
      </span>
    </div>
  )
}

export function DREPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const { pendencias, dre } = useEngine(periodo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">DRE — Demonstrativo de Resultado</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <PendenciasBanner pendencias={pendencias} />

      {!dre ? (
        <div className="text-center py-12 text-muted text-sm">
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div className="max-w-xl">
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-border">
              <h2 className="text-sm font-semibold text-neutral-700">Demonstrativo de Resultado</h2>
            </div>

            <DRERow label="(+) Receita Bruta" value={dre.receitaBruta} bold />

            <DRERow label="(−) Custo Direto de Produção" value={-dre.custoDiretoTotal} indent={1} />
            <DRERow label="(−) Custo Backend (rateado por receita)" value={-dre.custoBackendTotal} indent={1} />
            <DRERow label="(−) Overhead Interno (rateado por horas)" value={-dre.custoOverheadInterno} indent={1} />
            <DRERow label="(−) Custos Fixos" value={-dre.custoFixoTotal} indent={1} />

            <div className="border-t-2 border-neutral-200">
              <DRERow
                label="(=) Resultado Líquido"
                value={dre.resultadoLiquido}
                bold
                color={dre.resultadoLiquido >= 0 ? 'success' : 'danger'}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-sm text-muted">Margem Líquida</span>
                <span
                  className={`text-sm font-semibold ${
                    dre.margemLiquida === null
                      ? 'text-muted'
                      : dre.margemLiquida >= 0
                      ? 'text-success'
                      : 'text-danger'
                  }`}
                >
                  {dre.margemLiquida !== null ? formatPercent(dre.margemLiquida) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Informativo */}
          <div className="mt-4 bg-bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Informativo</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Folha total (bruta)</span>
              <span className="font-mono text-neutral-700">{formatCurrency(dre.folhaTotalInformativo)}</span>
            </div>
          </div>

          {/* Reconciliação */}
          <div
            className={`mt-4 rounded-xl border p-4 flex gap-3 ${
              dre.reconciliacao.ok
                ? 'border-success/30 bg-success/5'
                : 'border-danger/30 bg-danger/5'
            }`}
          >
            {dre.reconciliacao.ok ? (
              <CheckCircle className="text-success shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-danger shrink-0" size={18} />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${dre.reconciliacao.ok ? 'text-success' : 'text-danger'}`}
              >
                {dre.reconciliacao.ok
                  ? 'Reconciliação OK — custos distribuídos corretamente'
                  : `Divergência de reconciliação: Δ ${formatCurrency(dre.reconciliacao.delta)}`}
              </p>
              <p className="text-xs text-muted mt-0.5">
                A soma dos custos distribuídos por cliente deve ser igual à folha total + custos fixos (±R$1).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
