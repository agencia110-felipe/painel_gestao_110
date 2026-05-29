import { useMemo } from 'react'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import { useConfigStore } from '@/store/useConfigStore'
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
  calcHorasFaturaveisTotal,
  calcCustoClienteRelatorio,
  calcCustoTotalClienteComRelatorio,
  buildCustoHoraMapa,
  buscarCustoHoraPorNome,
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
  const { params } = useConfigStore()
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

  // Mapa nome → custo/hora calculado do store (ignora employeeHourlyCost do iClips)
  const custoHoraMapa = useMemo(
    () => buildCustoHoraMapa(equipe, params.horasMes, params.aproveitamentoPct),
    [equipe, params.horasMes, params.aproveitamentoPct]
  )

  // Custo/hora médio da empresa como fallback para colaboradores sem cadastro no store
  const custoHoraMedia = useMemo(() => {
    const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
    return horasFat > 0 ? custoMensal / horasFat : 0
  }, [equipe, params.horasMes, params.aproveitamentoPct, custoMensal])

  // Colaboradores presentes no relatório mas sem cadastro no store (usam custo médio)
  const naoEncontradosRelatorio = useMemo(() => {
    if (relatoriosFiltrados.length === 0) return []
    const naoEncontrados = new Set<string>()
    for (const rel of relatoriosFiltrados) {
      for (const resumo of rel.resumos) {
        if (resumo.isOverhead || resumo.clienteCanônico === '__NAO_MAPEADO__') continue
        if (!buscarCustoHoraPorNome(custoHoraMapa, resumo.colaborador.trim())) {
          naoEncontrados.add(resumo.colaborador.trim())
        }
      }
    }
    return [...naoEncontrados]
  }, [relatoriosFiltrados, custoHoraMapa])

  // Custo XLS (direto + overhead do relatório) por cliente, no período filtrado.
  // Usa custo/hora do store — não o custo líquido exportado pelo iClips.
  const custoXLSPorCliente = useMemo(() => {
    const mapa = new Map<string, CustoClienteRelatorio>()
    if (relatoriosFiltrados.length === 0) return mapa
    const clientesUnicos = [...new Set(clientesFiltrados.map(c => c.cliente))]
    for (const nome of clientesUnicos) {
      const info = calcCustoClienteRelatorio(nome, null, relatoriosFiltrados, custoHoraMapa, custoHoraMedia)
      if (info.horasTotal > 0) mapa.set(nome, info)
    }
    return mapa
  }, [relatoriosFiltrados, clientesFiltrados, custoHoraMapa, custoHoraMedia])

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
    naoEncontradosRelatorio,
  }
}
