import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, BarChart2 } from 'lucide-react'
import { classificarCliente } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import type { CustoClienteRelatorio } from '@/types'

interface DiagnosticoClienteCardProps {
  receita: number
  custoRateado: number
  margemFinanceira: number
  margemOperacional: number
  metaMargem: number
  nMeses: number
  infoRelatorio?: CustoClienteRelatorio
}

// Barra de progresso colorida pela margem vs meta
function MargemBar({ value, meta }: { value: number; meta: number }) {
  const width = Math.min(Math.abs(value) * 100, 100)
  const color = value >= meta ? '#2D8A45' : value >= 0 ? '#E69500' : '#C0392B'
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  )
}

function BadgeMargem({ value, meta }: { value: number; meta: number }) {
  const label = value >= meta ? 'OK' : value >= 0 ? 'Baixa' : 'Prejuízo'
  const cls   = value >= meta
    ? 'bg-green-50 text-green-700'
    : value >= 0
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{label}</span>
}

export function DiagnosticoClienteCard({
  receita,
  custoRateado,
  margemFinanceira,
  margemOperacional,
  metaMargem,
  nMeses,
  infoRelatorio,
}: DiagnosticoClienteCardProps) {
  const [expanded, setExpanded] = useState(false)

  const diag = classificarCliente(margemOperacional, margemFinanceira, metaMargem)
  const { cenario, label, cor, bgCor, conclusao } = diag

  const hasReport      = infoRelatorio != null && infoRelatorio.horasTotal > 0
  const custoOp        = infoRelatorio?.custoTotal ?? 0
  const horasTotais    = infoRelatorio?.horasTotal ?? 0
  const metaLabel      = `${Math.round(metaMargem * 100)}%`

  // Gap para a meta (baseado no custo rateado — visão financeira completa)
  const receitaNecessaria = metaMargem < 1 ? custoRateado / (1 - metaMargem) : custoRateado
  const gap               = receitaNecessaria - receita   // positivo = precisa de mais
  const gapMensal         = gap / Math.max(nMeses, 1)

  // R$/h
  const rphExecutado  = horasTotais > 0 ? receita          / horasTotais : 0
  const rphNecessario = horasTotais > 0 ? receitaNecessaria / horasTotais : 0

  const colorText = (v: number) =>
    v >= metaMargem ? 'text-green-700' : v >= 0 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: cor }}>

      {/* ── Cabeçalho com cenário ────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-white flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cor }}>
          {cenario}
        </span>
        <span className="text-sm font-semibold text-neutral">{label}</span>
      </div>

      {/* ── Dois painéis lado a lado ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border">

        {/* Painel esquerdo — Custo Real (Relatório) */}
        <div className="px-4 py-4 bg-white border-b md:border-b-0 md:border-r border-border">
          <div className="flex items-center gap-1.5 mb-3">
            <FileText size={13} className="text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">
              Custo Real (Relatório)
            </span>
          </div>

          {hasReport ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted">Custo direto</p>
                <p className="text-lg font-bold text-neutral">{formatCurrency(custoOp)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Margem operacional</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${colorText(margemOperacional)}`}>
                      {formatPercent(margemOperacional)}
                    </span>
                    <BadgeMargem value={margemOperacional} meta={metaMargem} />
                  </div>
                </div>
                <MargemBar value={margemOperacional} meta={metaMargem} />
              </div>
              {horasTotais > 0 && (
                <div>
                  <p className="text-xs text-muted">R$/h executado</p>
                  <p className="text-sm font-semibold text-neutral">{formatCurrency(rphExecutado)}/h · {formatHours(horasTotais)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted italic">Sem dados de relatório para este período.</p>
              <p className="text-xs text-muted mt-1">Importe o relatório de atividades em Configurações.</p>
            </div>
          )}
        </div>

        {/* Painel direito — Rateio Financeiro */}
        <div className="px-4 py-4 bg-white">
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart2 size={13} className="text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">
              Rateio Financeiro (Empresa)
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted">Custo rateado</p>
              <p className="text-lg font-bold text-neutral">{formatCurrency(custoRateado)}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">Margem financeira</p>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${colorText(margemFinanceira)}`}>
                    {formatPercent(margemFinanceira)}
                  </span>
                  <BadgeMargem value={margemFinanceira} meta={metaMargem} />
                </div>
              </div>
              <MargemBar value={margemFinanceira} meta={metaMargem} />
            </div>
            {horasTotais > 0 && (
              <div>
                <p className="text-xs text-muted">R$/h necessário (meta {metaLabel})</p>
                <p className="text-sm font-semibold text-neutral">{formatCurrency(rphNecessario)}/h</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conclusão ────────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 mt-3 rounded-lg border p-3" style={{ backgroundColor: bgCor, borderColor: cor + '50' }}>
        <p className="text-xs font-semibold text-neutral uppercase tracking-wide mb-1.5">Conclusão e Ação</p>
        <p className="text-sm text-neutral leading-relaxed">{conclusao}</p>

        <div className="mt-2 pt-2 border-t border-black/10">
          {gap > 0 ? (
            <>
              <p className="text-sm font-semibold text-red-700">
                Gap para meta de {metaLabel}: {formatCurrency(gap)} no período
                {nMeses > 1 && (
                  <span className="font-normal text-muted"> ({formatCurrency(gapMensal)}/mês)</span>
                )}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Receita atual: {formatCurrency(receita)} → Necessária: {formatCurrency(receitaNecessaria)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-green-700">
              Excedente sobre meta de {metaLabel}: {formatCurrency(Math.abs(gap))} no período
            </p>
          )}
        </div>
      </div>

      {/* ── Detalhamento por colaborador (expansível) ─────────────────────── */}
      {infoRelatorio && infoRelatorio.colaboradores.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted hover:text-neutral hover:bg-bg-page transition-colors"
          >
            <span>Ver detalhamento por colaborador ({infoRelatorio.colaboradores.length})</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="text-left py-1 pr-4 font-medium">Colaborador</th>
                    <th className="text-right py-1 pr-4 font-medium">Horas diretas</th>
                    <th className="text-right py-1 pr-4 font-medium">Custo direto</th>
                    <th className="text-right py-1 font-medium">Custo/h</th>
                  </tr>
                </thead>
                <tbody>
                  {infoRelatorio.colaboradores.map((c, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-1 pr-4 text-neutral font-medium">{c.nome}</td>
                      <td className="py-1 pr-4 text-right tabular-nums">{formatHours(c.horas)}</td>
                      <td className="py-1 pr-4 text-right tabular-nums">{formatCurrency(c.custo)}</td>
                      <td className="py-1 text-right tabular-nums text-muted">{formatCurrency(c.custoHora)}/h</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="py-1.5 pr-4 text-neutral">Subtotal direto</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{formatHours(infoRelatorio.horasDiretas)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{formatCurrency(infoRelatorio.custoDireto)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-muted">
                    <td className="py-1 pr-4">+ Overhead rateado</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{formatHours(infoRelatorio.horasOverhead)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{formatCurrency(infoRelatorio.custoOverhead)}</td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-border font-bold">
                    <td className="py-1.5 pr-4 text-neutral">= Total</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{formatHours(infoRelatorio.horasTotal)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{formatCurrency(infoRelatorio.custoTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
