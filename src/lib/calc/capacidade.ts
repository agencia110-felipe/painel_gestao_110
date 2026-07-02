import type { Colaborador, Setor, TarefaIClips, ResultadoCapacidade } from '@/types'
import { calcHorasDisponiveis } from './custoHora'
import { encontrarColaborador } from './vinculo'
import { mesesEntre, mesAnoNoPeriodo } from '@/lib/utils'

/**
 * Calcula capacidade e consumo por setor no período.
 * Capacidade = soma de horasDisponiveis × percentualAlocação de cada colaborador ativo.
 * Consumo = horas das tarefas vinculadas cujo colaborador tem alocação no setor.
 */
export function calcCapacidadeSetor(
  setores: Setor[],
  colaboradores: Colaborador[],
  tarefasVinculadas: TarefaIClips[],
  periodo: { inicio: string; fim: string },
  aproveitamentoPct: number
): ResultadoCapacidade[] {
  const meses = mesesEntre(periodo.inicio, periodo.fim)
  const numMeses = meses.length || 1

  return setores.map((setor) => {
    // Capacidade: soma de horas disponíveis alocadas neste setor no período
    let capacidadeHoras = 0
    for (const mes of meses) {
      for (const col of colaboradores) {
        if (col.status === 'Inativo' && col.mesDesligamento && col.mesDesligamento < mes) continue
        const alocacao = col.alocacoes.find((a) => a.setorId === setor.id)
        if (!alocacao || alocacao.percentual <= 0) continue
        const horasDisp = calcHorasDisponiveis(col, aproveitamentoPct)
        capacidadeHoras += horasDisp * (alocacao.percentual / 100)
      }
    }

    // Consumo: horas das tarefas deste setor no período
    let consumoHoras = 0
    for (const t of tarefasVinculadas) {
      if (!mesAnoNoPeriodo(t.mesAno, periodo.inicio, periodo.fim)) continue
      if (t.nomeDepartamento?.trim().toLowerCase() !== setor.nome.trim().toLowerCase()) continue
      consumoHoras += t.horas
    }

    const ocupacaoPct = capacidadeHoras > 0 ? consumoHoras / capacidadeHoras : 0
    const status: ResultadoCapacidade['status'] =
      ocupacaoPct >= 1 ? 'Estourado' : ocupacaoPct >= 0.85 ? 'Atencao' : 'Livre'

    return {
      setorId: setor.id,
      setorNome: setor.nome,
      capacidadeHoras,
      consumoHoras,
      ocupacaoPct,
      status,
    }
  })
}
