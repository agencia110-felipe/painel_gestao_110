import type { HistoricoSalario } from '@/types'

/**
 * Retorna o salário bruto vigente para um colaborador em um dado mês.
 * Busca o registro com mesVigenciaInicio mais recente <= mesAno.
 * Retorna 0 se não houver nenhum registro.
 */
export function buscarSalarioVigente(
  historico: HistoricoSalario[],
  mesAno: string
): number {
  const elegíveis = historico
    .filter((h) => h.mesVigenciaInicio <= mesAno)
    .sort((a, b) => b.mesVigenciaInicio.localeCompare(a.mesVigenciaInicio))

  return elegíveis[0]?.salarioBruto ?? 0
}
