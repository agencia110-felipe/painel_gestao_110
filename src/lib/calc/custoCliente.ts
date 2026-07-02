import type { TarefaIClips, Colaborador, Cliente } from '@/types'
import { encontrarColaborador, encontrarCliente } from './vinculo'
import { calcCustoHora } from './custoHora'
import { mesAnoNoPeriodo } from '@/lib/utils'

export interface CustoDiretoCliente {
  clienteId: string
  horasDiretas: number
  custoDireto: number
}

/**
 * Agrega custo direto por cliente no período.
 * Usa apenas tarefas já vinculadas (sem pendências).
 * Colaboradores inativos antes do período são excluídos (mesDesligamento < inicio).
 */
export function calcCustoDiretoPorCliente(
  tarefasVinculadas: TarefaIClips[],
  colaboradores: Colaborador[],
  clientes: Cliente[],
  periodo: { inicio: string; fim: string },
  aproveitamentoPct: number
): Map<string, CustoDiretoCliente> {
  const resultado = new Map<string, CustoDiretoCliente>()

  for (const t of tarefasVinculadas) {
    if (!mesAnoNoPeriodo(t.mesAno, periodo.inicio, periodo.fim)) continue

    const col = encontrarColaborador(t.executionResponsible, colaboradores)
    const cli = encontrarCliente(t.clientName, clientes)
    if (!col || !cli) continue

    const custoHora = calcCustoHora(col, t.mesAno, aproveitamentoPct)
    const custoDireto = t.horas * custoHora

    const existing = resultado.get(cli.id)
    if (existing) {
      existing.horasDiretas += t.horas
      existing.custoDireto += custoDireto
    } else {
      resultado.set(cli.id, {
        clienteId: cli.id,
        horasDiretas: t.horas,
        custoDireto,
      })
    }
  }

  return resultado
}
