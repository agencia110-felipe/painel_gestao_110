import type { ClienteSheet, ColaboradorSheet } from '@/types'

const ORDEM_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function mesAnoToIndex(mesAno: string): number {
  const [m, y] = mesAno.split('/')
  return parseInt(y) * 12 + ORDEM_MESES.indexOf(m)
}

export function sortMesAno(meses: string[]): string[] {
  return [...meses].sort((a, b) => mesAnoToIndex(a) - mesAnoToIndex(b))
}

export function getMesesNoRange(todos: string[], inicio: string, fim: string): string[] {
  const iA = mesAnoToIndex(inicio)
  const iB = mesAnoToIndex(fim)
  const [lo, hi] = iA <= iB ? [iA, iB] : [iB, iA]
  return sortMesAno(todos.filter(m => {
    const idx = mesAnoToIndex(m)
    return idx >= lo && idx <= hi
  }))
}

export function labelRange(inicio: string, fim: string): string {
  if (inicio === fim) return inicio
  return `${inicio} – ${fim}`
}

// Agrega clientes: soma horas, custos e receita por nome de cliente dentro de um conjunto de meses
export function agregarClientes(
  clientes: ClienteSheet[],
  meses: string[]
): ClienteSheet[] {
  const mesSet = new Set(meses)
  const filtrados = clientes.filter(c => mesSet.has(c.mesAno))
  const mapa = new Map<string, ClienteSheet>()

  for (const c of filtrados) {
    const key = c.cliente
    if (!mapa.has(key)) {
      mapa.set(key, { ...c })
    } else {
      const agg = mapa.get(key)!
      agg.tempoTrabalhado += c.tempoTrabalhado
      agg.custoEfetivoOp += c.custoEfetivoOp
      agg.entradaContratual += c.entradaContratual
    }
  }

  // Recalcula pct após agregação
  return Array.from(mapa.values()).map(c => ({
    ...c,
    mesAno: meses.length === 1 ? meses[0] : `${meses[0]}–${meses[meses.length - 1]}`,
    custoOperacionalPct: c.entradaContratual > 0 ? c.custoEfetivoOp / c.entradaContratual : 0,
  }))
}

// Agrega colaboradores: soma horas e custos, faz média de % entregas
export function agregarColaboradores(
  colaboradores: ColaboradorSheet[],
  meses: string[]
): ColaboradorSheet[] {
  const mesSet = new Set(meses)
  const filtrados = colaboradores.filter(c => mesSet.has(c.mesAno))
  const mapa = new Map<string, ColaboradorSheet & { _entregasCount: number }>()

  for (const c of filtrados) {
    const key = c.colaborador
    if (!mapa.has(key)) {
      mapa.set(key, { ...c, _entregasCount: 1 })
    } else {
      const agg = mapa.get(key)!
      agg.tempoTrabalhado += c.tempoTrabalhado
      agg.tempoArredondado += c.tempoArredondado
      agg.custoEfetivoOp += c.custoEfetivoOp
      agg.totalJobs += c.totalJobs
      agg.percentualEntregas += c.percentualEntregas
      agg._entregasCount += 1
    }
  }

  return Array.from(mapa.values()).map(({ _entregasCount, ...c }) => ({
    ...c,
    mesAno: meses.length === 1 ? meses[0] : `${meses[0]}–${meses[meses.length - 1]}`,
    percentualEntregas: c.percentualEntregas / _entregasCount,
    cargaHorariaMes: c.cargaHorariaMes * meses.length,
    cargaHoraria80pct: c.cargaHoraria80pct * meses.length,
  }))
}
