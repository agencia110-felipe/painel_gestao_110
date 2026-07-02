import { AlertTriangle } from 'lucide-react'
import type { Pendencias } from '@/types'
import { formatHours } from '@/lib/formatters'

interface PendenciasBannerProps {
  pendencias: Pendencias
}

export function PendenciasBanner({ pendencias }: PendenciasBannerProps) {
  const temPendencias =
    pendencias.colaboradoresSemVinculo.length > 0 ||
    pendencias.clientesSemVinculo.length > 0

  if (!temPendencias) return null

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3">
      <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warning mb-1">
          {pendencias.tarefasIgnoradas} tarefa(s) ignoradas — {formatHours(pendencias.horasIgnoradas)} excluídas dos cálculos
        </p>

        {pendencias.colaboradoresSemVinculo.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-neutral-600 mb-1">
              Responsáveis sem colaborador mapeado ({pendencias.colaboradoresSemVinculo.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {pendencias.colaboradoresSemVinculo.map((nome) => (
                <span
                  key={nome}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-warning/15 text-xs text-warning font-mono"
                >
                  {nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {pendencias.clientesSemVinculo.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1">
              Clientes sem mapeamento ({pendencias.clientesSemVinculo.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {pendencias.clientesSemVinculo.map((nome) => (
                <span
                  key={nome}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-warning/15 text-xs text-warning font-mono"
                >
                  {nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
