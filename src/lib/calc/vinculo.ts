import type { Colaborador, Cliente, TarefaIClips, Pendencias } from '@/types'

/**
 * Mapeia nome do iClips para o Colaborador correspondente.
 * Busca case-insensitive nos nomesIClips.
 */
export function encontrarColaborador(
  nomeIClips: string,
  colaboradores: Colaborador[]
): Colaborador | null {
  const normalizado = nomeIClips.trim().toLowerCase()
  return (
    colaboradores.find((c) =>
      c.nomesIClips.some((n) => n.trim().toLowerCase() === normalizado)
    ) ?? null
  )
}

/**
 * Mapeia nome do iClips para o Cliente correspondente.
 */
export function encontrarCliente(
  nomeIClips: string,
  clientes: Cliente[]
): Cliente | null {
  const normalizado = nomeIClips.trim().toLowerCase()
  return (
    clientes.find((c) =>
      c.nomesIClips.some((n) => n.trim().toLowerCase() === normalizado)
    ) ?? null
  )
}

/**
 * Analisa as tarefas e retorna:
 * - tarefas com vínculo OK (colaborador e cliente mapeados)
 * - pendências (nomes sem vínculo)
 */
export function calcularPendencias(
  tarefas: TarefaIClips[],
  colaboradores: Colaborador[],
  clientes: Cliente[]
): {
  tarefasVinculadas: TarefaIClips[]
  pendencias: Pendencias
} {
  const colSemVinculo = new Set<string>()
  const cliSemVinculo = new Set<string>()
  const tarefasVinculadas: TarefaIClips[] = []
  let horasIgnoradas = 0

  for (const t of tarefas) {
    const col = encontrarColaborador(t.executionResponsible, colaboradores)
    const cli = encontrarCliente(t.clientName, clientes)

    if (!col) colSemVinculo.add(t.executionResponsible.trim())
    if (!cli) cliSemVinculo.add(t.clientName.trim())

    if (col && cli) {
      tarefasVinculadas.push(t)
    } else {
      horasIgnoradas += t.horas
    }
  }

  return {
    tarefasVinculadas,
    pendencias: {
      colaboradoresSemVinculo: [...colSemVinculo].sort(),
      clientesSemVinculo: [...cliSemVinculo].sort(),
      tarefasIgnoradas: tarefas.length - tarefasVinculadas.length,
      horasIgnoradas,
    },
  }
}
