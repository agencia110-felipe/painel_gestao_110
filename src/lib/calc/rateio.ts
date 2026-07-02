import type { Cliente, ResultadoCliente } from '@/types'
import type { CustoDiretoCliente } from './custoCliente'
import { mesesEntre } from '@/lib/utils'

/**
 * Busca faturamento de um cliente no período.
 */
function getFaturamentoPeriodo(
  cliente: Cliente,
  periodo: { inicio: string; fim: string }
): number {
  return cliente.faturamentoMensal
    .filter((f) => f.mesAno >= periodo.inicio && f.mesAno <= periodo.fim)
    .reduce((sum, f) => sum + f.valor, 0)
}

/**
 * Calcula o custo total por cliente aplicando rateio de:
 * - custoBackend → por proporcaoReceita (receita do cliente / receita total comercial)
 * - custoOverhead → por proporcaoHoras (horas diretas do cliente / horas diretas totais comerciais)
 * - custoFixo → por proporcaoReceita
 *
 * Clientes isInterno=true não recebem rateio (custo interno vai para overhead).
 */
export function calcRateioPorCliente(
  clientes: Cliente[],
  custoDireto: Map<string, CustoDiretoCliente>,
  poolBackend: number,
  poolOverhead: number,
  poolFixo: number,
  periodo: { inicio: string; fim: string }
): ResultadoCliente[] {
  const comerciais = clientes.filter((c) => !c.isInterno)

  // Receita total dos comerciais
  const receitaTotal = comerciais.reduce(
    (sum, c) => sum + getFaturamentoPeriodo(c, periodo),
    0
  )

  // Horas diretas totais dos comerciais
  const horasTotais = comerciais.reduce(
    (sum, c) => sum + (custoDireto.get(c.id)?.horasDiretas ?? 0),
    0
  )

  return comerciais.map((cliente) => {
    const direto = custoDireto.get(cliente.id)
    const horasDiretas = direto?.horasDiretas ?? 0
    const custoDir = direto?.custoDireto ?? 0
    const faturamento = getFaturamentoPeriodo(cliente, periodo)

    const proporcaoReceita = receitaTotal > 0 ? faturamento / receitaTotal : 0
    const proporcaoHoras = horasTotais > 0 ? horasDiretas / horasTotais : 0

    const custoBackendRateado = poolBackend * proporcaoReceita
    const custoOverheadRateado = poolOverhead * proporcaoHoras
    const custoFixoRateado = poolFixo * proporcaoReceita

    const custoTotal = custoDir + custoBackendRateado + custoOverheadRateado + custoFixoRateado
    const margem = faturamento > 0 ? (faturamento - custoTotal) / faturamento : null

    return {
      clienteId: cliente.id,
      nome: cliente.nome,
      faturamento,
      horasDiretas,
      custoDireto: custoDir,
      custoBackendRateado,
      custoOverheadRateado,
      custoFixoRateado,
      custoTotal,
      margem,
      temPendencias: false,
    }
  })
}
