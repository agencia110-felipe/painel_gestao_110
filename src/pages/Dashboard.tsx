import { useState } from 'react'
import { mesAtual } from '@/lib/utils'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { useEngine } from '@/hooks/useEngine'
import { PendenciasBanner } from '@/components/PendenciasBanner'
import { PeriodoFilter } from '@/components/PeriodoFilter'
import { StatCard } from '@/components/ui/Card'
import { useConfigStore } from '@/stores/configStore'
import type { Periodo } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    const m = mesAtual()
    return { inicio: m, fim: m }
  })
  const margemDesejadaPct = useConfigStore((s) => s.margemDesejadaPct)
  const { pendencias, resultadosClientes, dre } = useEngine(periodo)

  const receitaBruta = dre?.receitaBruta ?? 0
  const resultadoLiquido = dre?.resultadoLiquido ?? 0
  const margemLiquida = dre?.margemLiquida ?? null
  const totalHoras = resultadosClientes.reduce((s, c) => s + c.horasDiretas, 0)

  // Top clientes por custo total
  const topClientes = [...resultadosClientes]
    .filter((c) => c.faturamento > 0 || c.horasDiretas > 0)
    .sort((a, b) => b.custoTotal - a.custoTotal)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>
        <PeriodoFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <PendenciasBanner pendencias={pendencias} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Bruta"
          value={formatCurrency(receitaBruta)}
          color="default"
        />
        <StatCard
          label="Resultado Líquido"
          value={formatCurrency(resultadoLiquido)}
          color={resultadoLiquido >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Margem Líquida"
          value={margemLiquida !== null ? formatPercent(margemLiquida) : '—'}
          sub={`Meta: ${formatPercent(margemDesejadaPct)}`}
          color={
            margemLiquida === null
              ? 'default'
              : margemLiquida >= margemDesejadaPct
              ? 'success'
              : margemLiquida >= 0
              ? 'warning'
              : 'danger'
          }
        />
        <StatCard
          label="Horas Diretas"
          value={formatHours(totalHoras)}
          sub={`${resultadosClientes.filter((c) => c.horasDiretas > 0).length} clientes`}
        />
      </div>

      {/* Gráfico custo vs receita por cliente */}
      {topClientes.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            Custo vs. Receita por Cliente
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topClientes} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="faturamento" name="Receita" fill="#22c55e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="custoTotal" name="Custo Total" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumo DRE simplificado */}
      {dre && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-neutral-900 mb-3">Resumo de Custos</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Custo Direto (folha operacional)', value: dre.custoDiretoTotal },
              { label: 'Custo Backend (rateado por receita)', value: dre.custoBackendTotal },
              { label: 'Overhead Interno (rateado por horas)', value: dre.custoOverheadInterno },
              { label: 'Custos Fixos', value: dre.custoFixoTotal },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-muted">{label}</span>
                <span className="font-medium text-neutral-900">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-1 flex items-center justify-between font-semibold">
              <span>Custo Total</span>
              <span>{formatCurrency(dre.custoDiretoTotal + dre.custoBackendTotal + dre.custoOverheadInterno + dre.custoFixoTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
