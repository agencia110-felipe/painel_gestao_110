import type { Colaborador, CustoFixo, Setor } from '@/types'
import { buscarSalarioVigente } from './salario'
import { calcSalarioBackend } from './custoHora'
import { mesesEntre } from '@/lib/utils'

/**
 * Pool de custo Backend: soma dos salários alocados em setores Backend
 * de todos colaboradores ativos no período.
 */
export function calcPoolBackend(
  colaboradores: Colaborador[],
  setores: Setor[],
  periodo: { inicio: string; fim: string }
): number {
  const meses = mesesEntre(periodo.inicio, periodo.fim)
  const backendIds = new Set(
    setores.filter((s) => s.tipo === 'Backend').map((s) => s.id)
  )

  let total = 0
  for (const mes of meses) {
    for (const col of colaboradores) {
      if (col.status === 'Inativo' && col.mesDesligamento && col.mesDesligamento < mes) continue
      total += calcSalarioBackend(col, mes, backendIds)
    }
  }
  return total
}

/**
 * Pool de custos fixos: soma de todos CustoFixo no período.
 */
export function calcPoolFixo(
  custosFixos: CustoFixo[],
  periodo: { inicio: string; fim: string }
): number {
  return custosFixos
    .filter((c) => c.mesAno >= periodo.inicio && c.mesAno <= periodo.fim)
    .reduce((sum, c) => sum + c.valor, 0)
}

/**
 * Pool overhead interno: custo total de horas dos colaboradores
 * alocados em setores operacionais MAS que trabalharam para clientes internos.
 * Na prática: salário total menos backend = overhead operacional interno
 * que não é direto nem backend. Aqui calculamos pela folha total - backend.
 * O overhead interno é rateado por horas diretas comerciais.
 */
export function calcFolhaTotal(
  colaboradores: Colaborador[],
  periodo: { inicio: string; fim: string }
): number {
  const meses = mesesEntre(periodo.inicio, periodo.fim)
  let total = 0
  for (const mes of meses) {
    for (const col of colaboradores) {
      if (col.status === 'Inativo' && col.mesDesligamento && col.mesDesligamento < mes) continue
      total += buscarSalarioVigente(col.historicoSalarial, mes)
    }
  }
  return total
}
