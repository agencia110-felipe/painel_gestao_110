import { useMemo } from 'react'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import { useRelatorioStore } from '@/store/useRelatorioStore'
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
  calcTotalComissoes,
  calcCustoClienteRelatorio,
  calcCustoTotalClienteComRelatorio,
  type CustoClienteIntegrado,
} from '@/lib/calculations'
import type { CustoClienteRelatorio } from '@/types'

// Converte "Jan/2026" (formato Sheets) → "2026-01" (formato relatório)
const MESES_ABREV_REL: Record<string, string> = {
  Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06',
  Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12',
}
function sheetsToRelMes(mesAno: string): string {
  const [abrev, ano] = mesAno.split('/')
  return `${ano}-${MESES_ABREV_REL[abrev] || '01'}`
}

export function useFilteredSheets() {
  const { clientes, colaboradores, modoFiltro, mesSelecionado, mesInicio, mesFim } = useSheetsStore()
  const { equipe, fixos, variaveis } = useCustosStore()
  const { relatorios } = useRelatorioStore()

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
  // Folha: somada mês a mês (considera mesDesligamento de cada membro).
  // Fixos: somados por mês (fixos sem mesAno = recorrentes, contam em cada mês).
  // Variáveis: somadas apenas nos meses do filtro.
  const custoTotal = useMemo(() => {
    const folhaPeriodo = mesesNoFiltro.length > 0
      ? mesesNoFiltro.reduce((acc, m) => acc + calcTotalFolha(equipe, m), 0)
      : calcTotalFolha(equipe)
    const fixosPeriodo = mesesNoFiltro.length > 0
      ? mesesNoFiltro.reduce((acc, m) => acc + calcTotalFixos(fixos, m), 0)
      : calcTotalFixos(fixos)
    const varSemComissoes = variaveis.filter(v => v.categoria !== 'Comissão')
    const variaveisPeriodo = mesesNoFiltro.reduce(
      (acc, m) => acc + calcTotalVariaveis(varSemComissoes, m),
      0
    )
    const comissoesPeriodo = mesesNoFiltro.reduce(
      (acc, m) => acc + calcTotalComissoes(variaveis, m),
      0
    )
    return folhaPeriodo + fixosPeriodo + variaveisPeriodo - comissoesPeriodo
  }, [equipe, fixos, variaveis, mesesNoFiltro])

  // Custo de referência mensal (último mês do período, para custo/hora e preços)
  const mesReferencia = mesesNoFiltro.length > 0
    ? mesesNoFiltro[mesesNoFiltro.length - 1]
    : mesSelecionado

  const custoMensal = useMemo(
    () => calcCustoTotalMensal(equipe, fixos, variaveis, mesReferencia),
    [equipe, fixos, variaveis, mesReferencia]
  )

  const labelPeriodo = useMemo(() => {
    if (modoFiltro === 'mensal') return mesSelecionado
    if (mesesNoFiltro.length === 0) return '—'
    return labelRange(mesesNoFiltro[0], mesesNoFiltro[mesesNoFiltro.length - 1])
  }, [modoFiltro, mesSelecionado, mesesNoFiltro])

  const isRange = modoFiltro === 'personalizado' && nMeses > 1

  // ─── Integração com relatório de atividades ──────────────────────────────────

  // Meses do filtro convertidos para o formato do relatório ("2026-01")
  const mesesRelatorioNoFiltro = useMemo(
    () => mesesNoFiltro.map(sheetsToRelMes),
    [mesesNoFiltro]
  )

  // Relatórios filtrados ao período selecionado
  const relatoriosFiltrados = useMemo(() => {
    if (relatorios.length === 0) return []
    if (mesesRelatorioNoFiltro.length === 0) return relatorios
    return relatorios
      .map(r => ({ ...r, resumos: r.resumos.filter(rs => mesesRelatorioNoFiltro.includes(rs.mesAno)) }))
      .filter(r => r.resumos.length > 0)
  }, [relatorios, mesesRelatorioNoFiltro])

  // Custo XLS (direto + overhead do relatório) por cliente, no período filtrado
  const custoXLSPorCliente = useMemo(() => {
    const mapa = new Map<string, CustoClienteRelatorio>()
    if (relatoriosFiltrados.length === 0) return mapa
    const clientesUnicos = [...new Set(clientesFiltrados.map(c => c.cliente))]
    for (const nome of clientesUnicos) {
      const info = calcCustoClienteRelatorio(nome, null, relatoriosFiltrados)
      if (info.horasTotal > 0) mapa.set(nome, info)
    }
    return mapa
  }, [relatoriosFiltrados, clientesFiltrados])

  // Totais XLS para calcular o pool de custos adicionais
  const totalXLSAllClients = useMemo(() => {
    let total = 0
    custoXLSPorCliente.forEach(v => { total += v.custoTotal })
    return total
  }, [custoXLSPorCliente])

  const totalHorasXLSDiretas = useMemo(() => {
    let total = 0
    custoXLSPorCliente.forEach(v => { total += v.horasDiretas })
    return total
  }, [custoXLSPorCliente])

  // Custo integrado por cliente: XLS + custos adicionais do store proporcionais
  const custoIntegradoPorCliente = useMemo(() => {
    const mapa = new Map<string, CustoClienteIntegrado>()
    if (custoXLSPorCliente.size === 0) return mapa
    const receitaMap = new Map(clientesFiltrados.map(c => [c.cliente, c.entradaContratual]))
    custoXLSPorCliente.forEach((xlsData, nome) => {
      mapa.set(nome, calcCustoTotalClienteComRelatorio(
        receitaMap.get(nome) ?? 0,
        xlsData.custoTotal,
        xlsData.horasDiretas,
        totalHorasXLSDiretas,
        custoTotal,
        totalXLSAllClients,
      ))
    })
    return mapa
  }, [custoXLSPorCliente, totalHorasXLSDiretas, custoTotal, totalXLSAllClients, clientesFiltrados])

  // Há relatório importado com dados para o período atual
  const temRelatorioNoPeriodo = relatoriosFiltrados.length > 0

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
    // Relatório de atividades integrado:
    custoXLSPorCliente,
    custoIntegradoPorCliente,
    totalXLSAllClients,
    temRelatorioNoPeriodo,
  }
}
