import type { Colaborador } from '@/types'
import { buscarSalarioVigente } from './salario'

const SEMANAS_POR_MES = 52 / 12  // ≈ 4.345

/**
 * Custo/hora de um colaborador em um dado mês.
 * custoHora = salarioMes / (horasContratadasSemana × 4.345 × aproveitamentoPct)
 */
export function calcCustoHora(
  colaborador: Colaborador,
  mesAno: string,
  aproveitamentoPct: number
): number {
  const salario = buscarSalarioVigente(colaborador.historicoSalarial, mesAno)
  const horasDisp = colaborador.horasContratadasSemana * SEMANAS_POR_MES * aproveitamentoPct
  if (horasDisp <= 0) return 0
  return salario / horasDisp
}

/**
 * Horas disponíveis teóricas por mês.
 */
export function calcHorasDisponiveis(
  colaborador: Colaborador,
  aproveitamentoPct: number
): number {
  return colaborador.horasContratadasSemana * SEMANAS_POR_MES * aproveitamentoPct
}

/**
 * Fração do salário que vai para setores Backend (rateada por receita).
 */
export function calcSalarioBackend(
  colaborador: Colaborador,
  mesAno: string,
  setoresBackendIds: Set<string>
): number {
  const salario = buscarSalarioVigente(colaborador.historicoSalarial, mesAno)
  const pctBackend = colaborador.alocacoes
    .filter((a) => setoresBackendIds.has(a.setorId))
    .reduce((sum, a) => sum + a.percentual, 0)
  return salario * (pctBackend / 100)
}
