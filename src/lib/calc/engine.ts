import type {
  Colaborador,
  Cliente,
  CustoFixo,
  Setor,
  TarefaIClips,
  Pendencias,
  ResultadoCliente,
  ResultadoDRE,
  ResultadoCapacidade,
} from '@/types'
import { calcularPendencias } from './vinculo'
import { calcCustoDiretoPorCliente } from './custoCliente'
import { calcPoolBackend, calcPoolFixo, calcFolhaTotal } from './pools'
import { calcRateioPorCliente } from './rateio'
import { buildDRE } from './dre'
import { calcCapacidadeSetor } from './capacidade'

export interface EngineResult {
  pendencias: Pendencias
  resultadosClientes: ResultadoCliente[]
  dre: (ResultadoDRE & { reconciliacao: { ok: boolean; delta: number } }) | null
  capacidade: ResultadoCapacidade[]
}

/**
 * Ponto central de cálculo. Recebe todos os dados brutos e retorna
 * os resultados completos para todas as telas.
 */
export function runEngine(
  tarefas: TarefaIClips[],
  colaboradores: Colaborador[],
  clientes: Cliente[],
  setores: Setor[],
  custosFixos: CustoFixo[],
  periodo: { inicio: string; fim: string },
  aproveitamentoPct: number
): EngineResult {
  // 1. Vínculos e pendências — tarefas sem vínculo são excluídas
  const { tarefasVinculadas, pendencias } = calcularPendencias(
    tarefas,
    colaboradores,
    clientes
  )

  // 2. Custo direto por cliente
  const custoDireto = calcCustoDiretoPorCliente(
    tarefasVinculadas,
    colaboradores,
    clientes,
    periodo,
    aproveitamentoPct
  )

  // 3. Pools de custo
  const poolBackend = calcPoolBackend(colaboradores, setores, periodo)
  const poolFixo = calcPoolFixo(custosFixos, periodo)
  const folhaTotal = calcFolhaTotal(colaboradores, periodo)
  // overhead = tudo que não é backend direto
  const poolOverhead = folhaTotal - poolBackend - [...custoDireto.values()].reduce(
    (s, d) => s + d.custoDireto,
    0
  )

  // 4. Rateio e resultado por cliente
  const resultadosClientes = calcRateioPorCliente(
    clientes,
    custoDireto,
    poolBackend,
    Math.max(0, poolOverhead),
    poolFixo,
    periodo
  )

  // 5. DRE
  const dre = buildDRE(resultadosClientes, folhaTotal, poolFixo)

  // 6. Capacidade
  const capacidade = calcCapacidadeSetor(
    setores,
    colaboradores,
    tarefasVinculadas,
    periodo,
    aproveitamentoPct
  )

  return { pendencias, resultadosClientes, dre, capacidade }
}
