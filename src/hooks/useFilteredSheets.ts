import { useMemo, useEffect } from 'react'
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
  normalizarNome,
  type CustoClienteIntegrado,
} from '@/lib/calculations'
import type { CustoClienteRelatorio } from '@/types'

// Converte "Jan/2026" → "2026-01" e vice-versa
const MESES_ABREV_REL: Record<string, string> = {
  Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06',
  Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12',
}
const REL_TO_ABREV: Record<string, string> = Object.fromEntries(
  Object.entries(MESES_ABREV_REL).map(([k, v]) => [v, k])
)
function sheetsToRelMes(mesAno: string): string {
  const [abrev, ano] = mesAno.split('/')
  return `${ano}-${MESES_ABREV_REL[abrev] || '01'}`
}
function relMesToSheets(mesRel: string): string {
  const [ano, mes] = mesRel.split('-')
  return `${REL_TO_ABREV[mes] || mes}/${ano}`
}

export function useFilteredSheets() {
  const { clientes, colaboradores, modoFiltro, mesSelecionado, mesInicio, mesFim } = useSheetsStore()
  const { equipe, fixos, variaveis } = useCustosStore()
  const { params } = useConfigStore()
  const { relatorios, mapeamentosColaboradores, colaboradoresIgnorados } = useRelatorioStore()
  // useIClipsStore é lido apenas para status (Header/Configurações); dados vêm de useRelatorioStore

  // Meses disponíveis: Sheets + meses cobertos pelos relatórios (iClips incluso)
  const todosOsMeses = useMemo(() => {
    const sheetsMonths = clientes.map(c => c.mesAno)
    const relMeses = relatorios.flatMap(r => r.mesesCobertos).map(relMesToSheets)
    return sortMesAno([...new Set([...sheetsMonths, ...relMeses])])
  }, [clientes, relatorios])

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

  // iClips já está em relatorios (salvo via addRelatorio em useIClipsData).
  // iClips tem prioridade: para os meses que cobre, exclui dados de XLS manuais.
  const todosRelatorios = useMemo(() => {
    const iclipsRel = relatorios.find(r => r.id === 'iclips-live')
    if (!iclipsRel || iclipsRel.mesesCobertos.length === 0) return relatorios
    const mesesIClips = new Set(iclipsRel.mesesCobertos)
    return relatorios.map(r => {
      if (r.id === 'iclips-live') return r
      const resumosFiltrados = r.resumos.filter(rs => !mesesIClips.has(rs.mesAno))
      return { ...r, resumos: resumosFiltrados, mesesCobertos: r.mesesCobertos.filter(m => !mesesIClips.has(m)) }
    }).filter(r => r.resumos.length > 0 || r.id === 'iclips-live')
  }, [relatorios])

  // Relatórios filtrados ao período selecionado
  const relatoriosFiltrados = useMemo(() => {
    if (todosRelatorios.length === 0) return []
    if (mesesRelatorioNoFiltro.length === 0) return todosRelatorios
    return todosRelatorios
      .map(r => ({ ...r, resumos: r.resumos.filter(rs => mesesRelatorioNoFiltro.includes(rs.mesAno)) }))
      .filter(r => r.resumos.length > 0)
  }, [todosRelatorios, mesesRelatorioNoFiltro])

  // Mapa nome → custo/hora do store, augmentado com mapeamentos manuais do usuário.
  // Exemplo: "giovana silva" → custo/hora da "Giovana" do store.
  const custoHoraMapa = useMemo(() => {
    const mapa = buildCustoHoraMapa(equipe, params.horasMes, params.aproveitamentoPct)
    for (const { nomeIClips, nomeStore } of mapeamentosColaboradores) {
      const custoH = mapa.get(normalizarNome(nomeStore))
      if (custoH !== undefined) {
        const chave = normalizarNome(nomeIClips)
        if (!mapa.has(chave)) mapa.set(chave, custoH)
      }
    }
    return mapa
  }, [equipe, params.horasMes, params.aproveitamentoPct, mapeamentosColaboradores])

  // Custo/hora médio da empresa como fallback para colaboradores sem cadastro no store
  const custoHoraMedia = useMemo(() => {
    const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
    return horasFat > 0 ? custoMensal / horasFat : 0
  }, [equipe, params.horasMes, params.aproveitamentoPct, custoMensal])

  // Colaboradores presentes no relatório mas sem custo no store (usam custo médio).
  // Exclui os que foram marcados como ignorados pelo usuário.
  const naoEncontradosRelatorio = useMemo(() => {
    if (relatoriosFiltrados.length === 0) return []
    const ignoradosSet = new Set(colaboradoresIgnorados)
    const naoEncontrados = new Set<string>()
    for (const rel of relatoriosFiltrados) {
      for (const resumo of rel.resumos) {
        if (resumo.isOverhead || resumo.clienteCanônico === '__NAO_MAPEADO__') continue
        const nome = resumo.colaborador.trim()
        if (!ignoradosSet.has(nome) && !buscarCustoHoraPorNome(custoHoraMapa, nome)) {
          naoEncontrados.add(nome)
        }
      }
    }
    return [...naoEncontrados]
  }, [relatoriosFiltrados, custoHoraMapa, colaboradoresIgnorados])

  // Custo real por cliente via relatório (iClips + XLS).
  // Usa custo/hora do store — ignora employeeHourlyCost do iClips.
  // Inclui clientes presentes no iClips mesmo sem dados na aba Sheets (ex: mês mais recente).
  const custoXLSPorCliente = useMemo(() => {
    const mapa = new Map<string, CustoClienteRelatorio>()
    if (relatoriosFiltrados.length === 0) return mapa

    const clientesSheets = clientesFiltrados.map(c => c.cliente)
    const clientesRelatorio = relatoriosFiltrados
      .flatMap(r => r.resumos)
      .filter(rs => !rs.isOverhead && rs.clienteCanônico !== '__NAO_MAPEADO__')
      .map(rs => rs.clienteCanônico)
    const clientesUnicos = [...new Set([...clientesSheets, ...clientesRelatorio])]

    for (const nome of clientesUnicos) {
      const info = calcCustoClienteRelatorio(nome, null, relatoriosFiltrados, custoHoraMapa, custoHoraMedia)
      if (info.horasTotal > 0) mapa.set(nome, info)
    }
    return mapa
  }, [relatoriosFiltrados, clientesFiltrados, custoHoraMapa, custoHoraMedia])

  // LOG DE DIAGNÓSTICO — remover após confirmar que os dados chegam corretamente
  useEffect(() => {
    console.group('[useFilteredSheets] diagnóstico')
    console.log('mesSelecionado:', mesSelecionado)
    console.log('mesesRelatorioNoFiltro:', mesesRelatorioNoFiltro)
    console.log('relatorios no store:', relatorios.map(r => ({
      id: r.id,
      meses: r.mesesCobertos,
      resumos: r.resumos.length,
      tarefas: r.totalTarefas,
    })))
    console.log('relatoriosFiltrados:', relatoriosFiltrados.map(r => ({
      id: r.id,
      resumos: r.resumos.length,
    })))
    console.log('custoXLSPorCliente:', [...custoXLSPorCliente.keys()])
    console.groupEnd()
  }, [mesSelecionado, relatorios, relatoriosFiltrados, custoXLSPorCliente, mesesRelatorioNoFiltro])

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

  // Loga colaboradores não encontrados no store para facilitar diagnóstico
  useEffect(() => {
    if (naoEncontradosRelatorio.length === 0) return
    console.warn(
      '[iClips] Colaboradores usando custo/hora médio (não encontrados no store):',
      naoEncontradosRelatorio.map(n => `"${n}"`).join(', ')
    )
    console.warn(
      `[iClips] Custo/hora médio aplicado: R$${custoHoraMedia.toFixed(0)}/h — ` +
      'cadastre em Custos → Equipe para cálculo preciso.'
    )
  }, [naoEncontradosRelatorio, custoHoraMedia])

  // Há relatório (XLS ou iClips) com dados para o período atual
  const temRelatorioNoPeriodo = relatoriosFiltrados.length > 0

  // iClips conectado e com dados no período selecionado
  const temDadosIClips = relatoriosFiltrados.some(r => r.id === 'iclips-live')

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
    temDadosIClips,
    naoEncontradosRelatorio,
  }
}
