import { useMemo } from 'react'
import { useSheetsStore } from '@/stores/sheetsStore'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useClientesStore } from '@/stores/clientesStore'
import { calcularPendencias } from '@/lib/calc/vinculo'
import { PendenciasBanner } from '@/components/PendenciasBanner'
import { formatHours } from '@/lib/formatters'

export function TabVinculos() {
  const tarefas = useSheetsStore((s) => s.tarefas)
  const colaboradores = useColaboradoresStore((s) => s.colaboradores)
  const clientes = useClientesStore((s) => s.clientes)

  const { tarefasVinculadas, pendencias } = useMemo(
    () => calcularPendencias(tarefas, colaboradores, clientes),
    [tarefas, colaboradores, clientes]
  )

  const temDados = tarefas.length > 0

  if (!temDados) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        Sincronize os dados do Google Sheets para ver os vínculos.
      </div>
    )
  }

  const ok = pendencias.colaboradoresSemVinculo.length === 0 && pendencias.clientesSemVinculo.length === 0

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-muted">
        <span>{tarefas.length} tarefas carregadas</span>
        <span>·</span>
        <span className="text-success">{tarefasVinculadas.length} vinculadas</span>
        {pendencias.tarefasIgnoradas > 0 && (
          <>
            <span>·</span>
            <span className="text-danger">{pendencias.tarefasIgnoradas} ignoradas ({formatHours(pendencias.horasIgnoradas)})</span>
          </>
        )}
      </div>

      {ok ? (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success font-medium">
          Todos os nomes estão mapeados. Nenhuma tarefa sendo ignorada.
        </div>
      ) : (
        <PendenciasBanner pendencias={pendencias} />
      )}

      <p className="text-xs text-muted">
        Para resolver as pendências, vá em <strong>Colaboradores</strong> ou <strong>Clientes</strong> e adicione os nomes como aliases iClips.
      </p>
    </div>
  )
}
