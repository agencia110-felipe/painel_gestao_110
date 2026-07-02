import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Compara dois 'YYYY-MM' strings. Retorna -1, 0 ou 1
export function compareMesAno(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// Verifica se mesAno está dentro do intervalo [inicio, fim]
export function mesAnoNoPeriodo(mesAno: string, inicio: string, fim: string): boolean {
  return mesAno >= inicio && mesAno <= fim
}

// Retorna lista de meses YYYY-MM de inicio até fim
export function mesesEntre(inicio: string, fim: string): string[] {
  const meses: string[] = []
  let [ano, mes] = inicio.split('-').map(Number)
  const [anoFim, mesFim] = fim.split('-').map(Number)
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes++
    if (mes > 12) { mes = 1; ano++ }
  }
  return meses
}

// Mes anterior: '2026-01' → '2025-12'
export function mesAnterior(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number)
  if (mes === 1) return `${ano - 1}-12`
  return `${ano}-${String(mes - 1).padStart(2, '0')}`
}

// Mes atual YYYY-MM
export function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
