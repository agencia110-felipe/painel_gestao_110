import { useMemo } from 'react'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import {
  agregarClientes,
  agregarColaboradores,
  getMesesNoRange,
  labelRange,
  sortMesAno,
} from '@/lib/aggregation'
import {
  calcCustoTotalMensal,
  calcTotalFolha,
  calcTotalFixos,
  calcTotalVariaveis,
} from '@/lib/calculations'

export function useFilteredSheets() {
  const { clientes, colaboradores, modoFiltro, mesSelecionado, mesInicio, mesFim } = useSheetsStore()
  const { equipe, fixos, variaveis } = useCustosStore()

  const todosOsMeses = useMemo(
    () => sortMesAno([...new Set(clientes.map(c => c.mesAno))]),
    [clientes]
  )

  const mesesNoFiltro = useMemo(() => {
    if (modoFiltro === 'mensal') return [mesSelecionado].filter(m => todosOsMeses.includes(m))
    return getMesesNoRange(todosOsMeses, mesInicio, mesFim)
  }, [modoFiltro, mesSelecionado, mesInicio, mesFim, todosOsMeses])

  const nMeses = Math.max(mesesNoFiltro.length, 1)

  const clientesFiltrados = useMemo(
    () => agregarClientes(clientes, mesesNoFiltro),
    [clientes, mesesNoFiltro]
  )

  const colaboradoresFiltrados = useMemo(
    () => agregarColaboradores(colaboradores, mesesNoFiltro),
    [colaboradores, mesesNoFiltro]
  )

  // Custos totais do período.
  // Folha: mensal × nMeses.
  // Fixos: somados por mês (fixos sem mesAno = recorrentes, contam em cada mês).
  // Variáveis: somadas apenas nos meses do filtro.
  const custoTotal = useMemo(() => {
    const folha = calcTotalFolha(equipe)
    const fixosPeriodo = mesesNoFiltro.length > 0
      ? mesesNoFiltro.reduce((acc, m) => acc + calcTotalFixos(fixos, m), 0)
      : calcTotalFixos(fixos)
    const variaveisPeriodo = mesesNoFiltro.reduce(
      (acc, m) => acc + calcTotalVariaveis(variaveis, m),
      0
    )
    return folha * nMeses + fixosPeriodo + variaveisPeriodo
  }, [equipe, fixos, variaveis, mesesNoFiltro, nMeses])

  // Custo de um único mês (para cálculos por hora, por pacote, etc.)
  const custoMensal = useMemo(
    () => calcCustoTotalMensal(equipe, fixos, variaveis, mesSelecionado),
    [equipe, fixos, variaveis, mesSelecionado]
  )

  const labelPeriodo = useMemo(() => {
    if (modoFiltro === 'mensal') return mesSelecionado
    if (mesesNoFiltro.length === 0) return '—'
    return labelRange(mesesNoFiltro[0], mesesNoFiltro[mesesNoFiltro.length - 1])
  }, [modoFiltro, mesSelecionado, mesesNoFiltro])

  const isRange = modoFiltro === 'personalizado' && nMeses > 1

  return {
    clientesFiltrados,
    colaboradoresFiltrados,
    custoTotal,
    custoMensal,
    mesesNoFiltro,
    nMeses,
    labelPeriodo,
    isRange,
    todosOsMeses,
  }
}
