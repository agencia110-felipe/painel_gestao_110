import type {
  EquipeMembro,
  Alocacao,
  CustoFixo,
  CustoVariavel,
  ClienteSheet,
  ConfigParams,
  ClienteAnalise,
  ColaboradorSheet,
  ColaboradorAnalise,
  SetorCapacidade,
  PacoteBase,
  PacoteCalculado,
  RelatorioImportado,
  CustoClienteRelatorio,
} from '@/types'
import { mesAnoToIndex } from '@/lib/aggregation'

// Setores que contam como custo de backend (não faturável)
const BACKEND_SET = new Set(['Financeiro', 'Comercial', 'RH'])

// ─── Helpers de alocação ─────────────────────────────────────────────────────

export function membroFaturavelPct(m: Pick<EquipeMembro, 'alocacoes'>): number {
  // Sem alocações configuradas → assume 100% faturável (fallback seguro)
  if (!m.alocacoes || m.alocacoes.length === 0) return 1
  return m.alocacoes
    .filter(a => !BACKEND_SET.has(a.setor))
    .reduce((s, a) => s + a.pct, 0) / 100
}

export function membroBackendPct(m: Pick<EquipeMembro, 'alocacoes'>): number {
  return m.alocacoes
    .filter(a => BACKEND_SET.has(a.setor))
    .reduce((s, a) => s + a.pct, 0) / 100
}

export function somaAlocacoes(alocacoes: Alocacao[]): number {
  return alocacoes.reduce((s, a) => s + a.pct, 0)
}

// ─── Custos base ─────────────────────────────────────────────────────────────

export function calcTotalFolha(equipe: EquipeMembro[], mesAno?: string): number {
  return equipe.filter(m => {
    if (m.status === 'Ativo') return true
    if (mesAno && m.mesDesligamento) {
      return mesAnoToIndex(mesAno) <= mesAnoToIndex(m.mesDesligamento)
    }
    return false
  }).reduce((s, m) => s + m.salario, 0)
}

// fixos sem mesAno = recorrentes (legado): valem para qualquer mês
export function calcTotalFixos(fixos: CustoFixo[], mesAno?: string): number {
  const list = mesAno ? fixos.filter(f => !f.mesAno || f.mesAno === mesAno) : fixos
  return list.reduce((s, f) => s + f.valor, 0)
}

export function calcTotalVariaveis(variaveis: CustoVariavel[], mesAno?: string): number {
  const list = mesAno ? variaveis.filter(v => v.mesAno === mesAno) : variaveis
  return list.reduce((s, v) => s + v.valor, 0)
}

export function calcTotalImpostos(variaveis: CustoVariavel[], mesAno?: string): number {
  return calcTotalVariaveis(variaveis.filter(v => v.categoria === 'Imposto'), mesAno)
}

export function calcTotalComissoes(variaveis: CustoVariavel[], mesAno?: string): number {
  return calcTotalVariaveis(variaveis.filter(v => v.categoria === 'Comissão'), mesAno)
}

export function calcCustoTotalMensal(
  equipe: EquipeMembro[],
  fixos: CustoFixo[],
  variaveis: CustoVariavel[] = [],
  mesAno?: string
): number {
  // Impostos (categoria='Imposto') são custo; comissões (categoria='Comissão') reduzem o custo
  const varSemComissoes = variaveis.filter(v => v.categoria !== 'Comissão')
  return calcTotalFolha(equipe)
    + calcTotalFixos(fixos, mesAno)
    + calcTotalVariaveis(varSemComissoes, mesAno)
    - calcTotalComissoes(variaveis, mesAno)
}

// ─── Backend ─────────────────────────────────────────────────────────────────

export function calcCustoBackendEquipe(equipe: EquipeMembro[]): number {
  return equipe
    .filter(m => m.status === 'Ativo')
    .reduce((s, m) => s + m.salario * membroBackendPct(m), 0)
}

export function calcCustoBackendFixos(fixos: CustoFixo[]): number {
  return fixos.filter(f => f.tipo === 'Backend').reduce((s, f) => s + f.valor, 0)
}

export function calcTotalBackend(equipe: EquipeMembro[], fixos: CustoFixo[]): number {
  return calcCustoBackendEquipe(equipe) + calcCustoBackendFixos(fixos)
}

export function calcPctBackend(equipe: EquipeMembro[], fixos: CustoFixo[]): number {
  const total = calcCustoTotalMensal(equipe, fixos)
  if (total === 0) return 0
  return calcTotalBackend(equipe, fixos) / total
}

// ─── Horas e custo/hora ──────────────────────────────────────────────────────

export function calcHorasFaturaveisTotal(
  equipe: EquipeMembro[],
  horasMes: number,
  aproveitamentoPct: number
): number {
  // Only count members with configured salary (>0) — auto-synced "shell" members
  // from sheets have salary=0 and would inflate the hour count if included.
  return equipe
    .filter(m => m.status === 'Ativo' && m.salario > 0)
    .reduce((s, m) => {
      const carga = m.cargaHorariaMes ?? horasMes
      return s + carga * aproveitamentoPct * membroFaturavelPct(m)
    }, 0)
}

export function calcCustoPorHoraReal(custoTotal: number, horasFaturaveis: number): number {
  if (horasFaturaveis === 0) return 0
  return custoTotal / horasFaturaveis
}

export function calcPrecoPorHoraMinimo(custoH: number, margemPct: number): number {
  if (margemPct >= 1) return custoH
  return custoH / (1 - margemPct)
}

export function calcPrecoPorHoraRecomendado(precoMin: number, fatorComplexidade: number): number {
  return precoMin * (1 + fatorComplexidade)
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export function calcCustoRateadoCliente(
  cliente: ClienteSheet,
  todosClientes: ClienteSheet[],
  custoTotal: number,
  criterio: 'horas' | 'receita' | 'igual' = 'horas'
): number {
  if (criterio === 'igual') {
    return custoTotal / Math.max(todosClientes.length, 1)
  }
  const totalRef =
    criterio === 'horas'
      ? todosClientes.reduce((s, c) => s + c.tempoTrabalhado, 0)
      : todosClientes.reduce((s, c) => s + c.entradaContratual, 0)
  if (totalRef === 0) return 0
  const proporcao =
    criterio === 'horas'
      ? cliente.tempoTrabalhado / totalRef
      : cliente.entradaContratual / totalRef
  return custoTotal * proporcao
}

export function calcLucroRealCliente(receita: number, custoRateado: number): number {
  return receita - custoRateado
}

export function calcMargemRealCliente(lucro: number, receita: number): number {
  if (receita === 0) return 0
  return lucro / receita
}

export function calcStatusCliente(margem: number): ClienteAnalise['status'] {
  if (margem >= 0.20) return 'Saudável'
  if (margem >= 0.10) return 'Atenção'
  if (margem >= 0) return 'Deficitário'
  return 'Prejuízo'
}

export function calcTicketMedioReceita(clientes: ClienteSheet[], nMeses: number = 1): number {
  if (clientes.length === 0) return 0
  return clientes.reduce((s, c) => s + c.entradaContratual, 0) / (clientes.length * Math.max(nMeses, 1))
}

export function calcReceitaMinimaCliente(
  horas: number,
  custoH: number,
  margemDesejada: number
): number {
  return calcPrecoPorHoraMinimo(custoH, margemDesejada) * horas
}

export function calcClientesAnalise(
  clientes: ClienteSheet[],
  custoTotal: number
): ClienteAnalise[] {
  const receitaTotal = clientes.reduce((s, c) => s + c.entradaContratual, 0)
  const totalHoras = clientes.reduce((s, c) => s + c.tempoTrabalhado, 0)

  return clientes.map(c => {
    // Pure overhead rateio by hours (no direct cost column available)
    const custoRateado = totalHoras > 0
      ? custoTotal * (c.tempoTrabalhado / totalHoras)
      : custoTotal / Math.max(clientes.length, 1)
    const lucroReal = calcLucroRealCliente(c.entradaContratual, custoRateado)
    const margemReal = calcMargemRealCliente(lucroReal, c.entradaContratual)
    return {
      nome: c.cliente,
      cluster: c.cluster,
      receita: c.entradaContratual,
      horasMes: c.tempoTrabalhado,
      custoRateado,
      lucroReal,
      margemReal,
      breakEven: custoRateado,
      concentracao: receitaTotal > 0 ? c.entradaContratual / receitaTotal : 0,
      receitaPorHora: c.tempoTrabalhado > 0 ? c.entradaContratual / c.tempoTrabalhado : 0,
      custoPorHora: c.tempoTrabalhado > 0 ? custoRateado / c.tempoTrabalhado : 0,
      status: calcStatusCliente(margemReal),
    }
  })
}

// ─── Colaboradores ───────────────────────────────────────────────────────────

export function calcOcupacaoColaborador(horasTrabalhadas: number, cargaEsperada: number): number {
  if (cargaEsperada === 0) return 0
  return horasTrabalhadas / cargaEsperada
}

export function calcStatusColaborador(
  percentualEntregas: number,
  ocupacao: number
): ColaboradorAnalise['status'] {
  if (percentualEntregas >= 0.85 && ocupacao >= 0.80) return 'Alta performance'
  if (percentualEntregas < 0.40) return 'Crítico'
  if (percentualEntregas < 0.60 || (ocupacao < 0.50 && percentualEntregas < 0.70)) return 'Atenção'
  if (ocupacao > 1.10) return 'Sobrecarregado'
  if (ocupacao < 0.50) return 'Disponível'
  return 'Regular'
}

export function calcEficienciaColaborador(
  percentualEntregas: number,
  ocupacao: number
): number {
  return percentualEntregas * ocupacao
}

// Retorna o setor principal do membro (maior % alocação), ou cargo como fallback
function primarySetor(m: EquipeMembro): string {
  if (!m.alocacoes || m.alocacoes.length === 0) return m.cargo || '—'
  return [...m.alocacoes].sort((a, b) => b.pct - a.pct)[0].setor
}

export function calcColaboradoresAnalise(
  colaboradores: ColaboradorSheet[],
  equipe: EquipeMembro[],
  horasMesGlobal: number,
  nMeses: number = 1
): ColaboradorAnalise[] {
  const equipeMap = new Map(equipe.map(m => [m.nome.trim().toLowerCase(), m]))
  return colaboradores.map(c => {
    const membro = equipeMap.get(c.colaborador.trim().toLowerCase())
    const cargaEsperada = (membro?.cargaHorariaMes ?? horasMesGlobal) * nMeses
    const ocupacao = calcOcupacaoColaborador(c.tempoTrabalhado, cargaEsperada)
    const area = membro ? primarySetor(membro) : '—'
    return {
      nome: c.colaborador,
      area,
      horasTrabalhadas: c.tempoTrabalhado,
      cargaEsperada,
      percentualOcupacao: ocupacao,
      percentualEntregas: c.percentualEntregas,
      totalJobs: c.totalJobs,
      eficiencia: calcEficienciaColaborador(c.percentualEntregas, ocupacao),
      produtividadePorHora: c.tempoTrabalhado > 0 ? c.totalJobs / c.tempoTrabalhado : 0,
      status: calcStatusColaborador(c.percentualEntregas, ocupacao),
    }
  })
}

// ─── Capacidade por setor ────────────────────────────────────────────────────

/**
 * Calcula horas faturáveis disponíveis para um setor específico,
 * somando a alocação de cada membro ativo naquele setor.
 */
export function calcCapacidadeSetor(
  equipe: EquipeMembro[],
  setor: string,
  horasMes: number,
  aproveitamentoPct: number
): number {
  return equipe
    .filter(m => m.status === 'Ativo')
    .reduce((s, m) => {
      const aloc = m.alocacoes.find(a => a.setor === setor)
      if (!aloc || aloc.pct === 0) return s
      const carga = m.cargaHorariaMes ?? horasMes
      return s + carga * aproveitamentoPct * (aloc.pct / 100)
    }, 0)
}

export function calcStatusSetor(
  consumo: number,
  capacidade: number,
  gatilhoPct: number
): SetorCapacidade['statusCapacidade'] {
  if (capacidade === 0) return 'Acima do limite'
  const pct = consumo / capacidade
  if (pct > 1) return 'Acima do limite'
  if (pct >= gatilhoPct) return 'No gatilho'
  if (pct >= 0.75) return 'Atenção'
  return 'Livre'
}

// ─── Custo/hora por setor ────────────────────────────────────────────────────

/**
 * Calcula custo/hora ponderado para um conjunto de setores.
 * Cada membro contribui proporcional ao seu salário × % alocado no setor.
 * O overhead (fixos + backend) é rateado pelo peso salarial do grupo.
 */
export function calcCustoHoraSetor(
  equipe: EquipeMembro[],
  fixos: CustoFixo[],
  variaveis: CustoVariavel[],
  setores: string[],
  horasMes: number,
  aproveitamentoPct: number,
  mesAno?: string
): number {
  const ativos = equipe.filter(m => m.status === 'Ativo')
  const setorSet = new Set(setores)

  // Salário alocado no grupo de setores
  const salarioGrupo = ativos.reduce((s, m) => {
    const pct = m.alocacoes.filter(a => setorSet.has(a.setor)).reduce((p, a) => p + a.pct, 0) / 100
    return s + m.salario * pct
  }, 0)

  const salarioTotal = ativos.reduce((s, m) => s + m.salario, 0)
  if (salarioTotal === 0 || salarioGrupo === 0) return 0

  const custoTotalMes = calcCustoTotalMensal(equipe, fixos, variaveis, mesAno)
  const custoGrupo = custoTotalMes * (salarioGrupo / salarioTotal)

  const horasGrupo = ativos.reduce((s, m) => {
    const pct = m.alocacoes.filter(a => setorSet.has(a.setor)).reduce((p, a) => p + a.pct, 0) / 100
    const carga = m.cargaHorariaMes ?? horasMes
    return s + carga * aproveitamentoPct * pct
  }, 0)

  if (horasGrupo === 0) return 0
  return custoGrupo / horasGrupo
}

// ─── Pacotes ──────────────────────────────────────────────────────────────────

export function calcPacote(
  pacote: PacoteBase,
  custoH: number,
  margemPct: number,
  fatorComplexidade: number
): PacoteCalculado {
  const custoReal = pacote.horas * custoH
  const precoMinimo = calcPrecoPorHoraMinimo(custoH, margemPct) * pacote.horas
  const precoRecomendado = calcPrecoPorHoraRecomendado(precoMinimo, fatorComplexidade)
  const lucroMes = precoRecomendado - custoReal
  const margemAntiga = pacote.precoAntigo > 0 ? (pacote.precoAntigo - custoReal) / pacote.precoAntigo : 0
  const margemNova = precoRecomendado > 0 ? lucroMes / precoRecomendado : 0
  return {
    ...pacote,
    custoReal,
    precoMinimo,
    precoRecomendado,
    lucroMes,
    margemAntiga,
    margemNova,
    destaque: pacote.nome === 'Média',
  }
}

// ─── Crescimento ─────────────────────────────────────────────────────────────

export function calcReceitaNecessaria(custoTotal: number, margemDesejada: number): number {
  if (margemDesejada >= 1) return custoTotal
  return custoTotal / (1 - margemDesejada)
}

export function calcDeltaReceita(receitaNecessaria: number, receitaAtual: number): number {
  return receitaNecessaria - receitaAtual
}

export function calcClientesNecessarios(deltaReceita: number, ticketMedio: number): number {
  if (ticketMedio === 0) return 0
  return Math.ceil(deltaReceita / ticketMedio)
}

export function calcImpactoContratacao(
  custoNovoProfissional: number,
  horasFatur: number,
  precoH: number
) {
  const receitaGerada = horasFatur * precoH
  const lucroIncremental = receitaGerada - custoNovoProfissional
  const paybackMeses = custoNovoProfissional > 0 ? Math.ceil(custoNovoProfissional / Math.max(lucroIncremental, 1)) : 0
  return { receitaGerada, lucroIncremental, paybackMeses }
}

// ─── DRE (Demonstração do Resultado do Exercício) ────────────────────────────

export interface DREResult {
  receitaBruta: number
  impostos: number
  lucroBruto: number
  despesasVariaveis: number
  lucroOperacional: number
  despesasFixas: number
  gastosComPessoal: number
  comissoes: number
  resultadoLiquido: number
  margemLiquida: number
}

// ─── Custo direto por cliente (via relatório de atividades) ──────────────────

export function calcCustoClienteRelatorio(
  cliente: string,
  mesAno: string | null,
  relatorios: RelatorioImportado[]
): CustoClienteRelatorio {
  const resumos = relatorios.flatMap(r => r.resumos).filter(r =>
    mesAno ? r.mesAno === mesAno : true
  )

  const diretos = resumos.filter(r => r.clienteCanônico === cliente && !r.isOverhead)
  const overheads = resumos.filter(r => r.isOverhead)
  const todosClientes = resumos.filter(
    r => !r.isOverhead && r.clienteCanônico !== '__NAO_MAPEADO__'
  )

  const horasDiretas = diretos.reduce((a, r) => a + r.horasTotais, 0)
  const custoDireto  = diretos.reduce((a, r) => a + r.custoTotal, 0)
  const totalHorasTodosClientes = todosClientes.reduce((a, r) => a + r.horasTotais, 0)
  const totalHorasOverhead = overheads.reduce((a, r) => a + r.horasTotais, 0)
  const totalCustoOverhead = overheads.reduce((a, r) => a + r.custoTotal, 0)

  const proporcao = totalHorasTodosClientes > 0 ? horasDiretas / totalHorasTodosClientes : 0
  const horasOverhead = totalHorasOverhead * proporcao
  const custoOverhead = totalCustoOverhead * proporcao

  const mapaColabs = new Map<string, { horas: number; custo: number }>()
  diretos.forEach(r => {
    const nome = r.colaborador
      .replace(/\s+(Tráfego|Gestão|Atendimento|Criação|Redação|Revisão|Mídia|Inbound|Financeiro|Monitoramento)\s*$/i, '')
      .trim()
    if (!mapaColabs.has(nome)) mapaColabs.set(nome, { horas: 0, custo: 0 })
    const c = mapaColabs.get(nome)!
    c.horas += r.horasTotais
    c.custo += r.custoTotal
  })

  return {
    cliente,
    mesAno: mesAno ?? 'periodo',
    horasDiretas,
    custoDireto,
    horasOverhead,
    custoOverhead,
    horasTotal: horasDiretas + horasOverhead,
    custoTotal: custoDireto + custoOverhead,
    colaboradores: [...mapaColabs.entries()]
      .map(([nome, v]) => ({
        nome,
        horas: v.horas,
        custo: v.custo,
        custoHora: v.horas > 0 ? v.custo / v.horas : 0,
      }))
      .sort((a, b) => b.horas - a.horas),
  }
}

export function calcMargemClienteComRelatorio(
  receitaPeriodo: number,
  custoClienteRelatorio: CustoClienteRelatorio,
  custosAdicionaisPeriodo: number,
  horasTotalTodosClientes: number
): {
  margemContribuicao: number
  margemLiquida: number
  lucroContribuicao: number
  lucroLiquido: number
} {
  const proporcaoHoras = horasTotalTodosClientes > 0
    ? custoClienteRelatorio.horasDiretas / horasTotalTodosClientes
    : 0
  const custosAdicionaisCliente = custosAdicionaisPeriodo * proporcaoHoras
  const custoTotalCliente = custoClienteRelatorio.custoTotal + custosAdicionaisCliente
  const lucroContribuicao = receitaPeriodo - custoClienteRelatorio.custoDireto
  const lucroLiquido = receitaPeriodo - custoTotalCliente
  return {
    margemContribuicao: receitaPeriodo > 0 ? lucroContribuicao / receitaPeriodo : 0,
    margemLiquida: receitaPeriodo > 0 ? lucroLiquido / receitaPeriodo : 0,
    lucroContribuicao,
    lucroLiquido,
  }
}

// ─── Custo integrado por cliente (XLS + custos restantes do store) ───────────

export interface CustoClienteIntegrado {
  custoXLS: number            // horas × custo/hora dos colaboradores (direto + overhead) do relatório
  custosAdicionais: number    // (custoTotalEmpresa − XLSTotal) × proporção horas diretas
  custoTotalIntegrado: number // XLS + adicionais — soma = custoTotalEmpresa sobre todos os clientes
  margemOperacional: number   // (receita − custoXLS) / receita — custo puro do trabalho
  margemFinanceira: number    // (receita − custoTotalIntegrado) / receita — visão completa
}

/**
 * Integra o custo do relatório XLS com os custos não capturados do store
 * (folha não rastreada + fixos + variáveis + impostos − comissões), garantindo
 * que a soma de custoTotalIntegrado sobre todos os clientes = custoTotalEmpresa.
 *
 * Fórmula: custosAdicionais = (custoTotalEmpresa − totalXLSAllClients) × proporcao
 * onde proporcao = horasDiretasCliente / horasDiretasTotal
 */
export function calcCustoTotalClienteComRelatorio(
  receita: number,
  custoXLSCliente: number,
  horasXLSDiretasCliente: number,
  horasXLSDiretasTotal: number,
  custoTotalEmpresa: number,      // folha + fixos + variáveis + impostos − comissões
  totalXLSAllClients: number,     // soma de infoRelatorio.custoTotal de todos os clientes
): CustoClienteIntegrado {
  const proporcao = horasXLSDiretasTotal > 0
    ? horasXLSDiretasCliente / horasXLSDiretasTotal
    : 0

  const custosAdicionaisPool = custoTotalEmpresa - totalXLSAllClients
  const custosAdicionais     = custosAdicionaisPool * proporcao
  const custoTotalIntegrado  = custoXLSCliente + custosAdicionais

  return {
    custoXLS: custoXLSCliente,
    custosAdicionais,
    custoTotalIntegrado,
    margemOperacional: receita > 0 ? (receita - custoXLSCliente)     / receita : 0,
    margemFinanceira:  receita > 0 ? (receita - custoTotalIntegrado) / receita : 0,
  }
}

// ─── Diagnóstico cruzado por cenário ─────────────────────────────────────────

export type CenarioCliente = 'A' | 'B' | 'C' | 'D'

export interface DiagnosticoCliente {
  cenario: CenarioCliente
  label: string
  cor: string
  bgCor: string
  conclusao: string
  urgencia: 'ok' | 'monitorar' | 'reajuste' | 'critico'
}

function fmtPct(v: number): string {
  return Math.round(v * 100) + '%'
}

/**
 * Classifica um cliente em cenário A/B/C/D cruzando margem operacional
 * (custo real do relatório) com margem financeira (rateio completo).
 */
export function classificarCliente(
  margemOperacional: number,
  margemFinanceira: number,
  metaMargem: number = 0.25
): DiagnosticoCliente {
  const opOk   = margemOperacional >= metaMargem
  const finOk  = margemFinanceira  >= metaMargem
  const finPos = margemFinanceira  >= 0

  if (opOk && finOk) return {
    cenario: 'A',
    label: 'Saudável — manter e crescer',
    cor: '#2D8A45',
    bgCor: '#EAF3DE',
    conclusao: 'Nenhuma ação urgente. Este é o perfil ideal de cliente. Replique na prospecção.',
    urgencia: 'ok',
  }

  if (opOk && finPos && !finOk) return {
    cenario: 'B',
    label: 'Operacional OK — reajuste moderado',
    cor: '#E69500',
    bgCor: '#FFF3CC',
    conclusao: `Margem operacional saudável (${fmtPct(margemOperacional)}). Cobre custos diretos com folga, mas contribuição para os custos fixos da empresa está abaixo da meta. Reajuste de 15–25% resolve.`,
    urgencia: 'monitorar',
  }

  if (opOk && !finPos) return {
    cenario: 'C',
    label: 'Operacional OK — não cobre os fixos',
    cor: '#E69500',
    bgCor: '#FAEEDA',
    conclusao: `O trabalho executado cobre seus próprios custos (${fmtPct(margemOperacional)} de margem operacional), mas o cliente não está pagando sua parte dos custos fixos da empresa. Precisa de reajuste no contrato ou redução de escopo.`,
    urgencia: 'reajuste',
  }

  return {
    cenario: 'D',
    label: 'Deficitário — ação imediata',
    cor: '#C0392B',
    bgCor: '#FCEBEB',
    conclusao: `Não cobre nem os custos operacionais diretos (${fmtPct(margemOperacional)} de margem operacional). O preço contratado está abaixo do custo real de execução, independente dos fixos. Reajuste urgente ou encerramento.`,
    urgencia: 'critico',
  }
}

/**
 * Calcula o DRE para um período.
 * Todos os totais devem ser pré-calculados pelo caller com a lógica de período.
 * totalVariaveisOp = variáveis operacionais (excluindo Imposto e Comissão).
 * totalImpostos = soma dos lançamentos da aba Impostos.
 * totalComissoes = soma dos lançamentos da aba Comissão (valor positivo = reduz custo).
 */
export function calcDRE(
  receitaBruta: number,
  totalFolha: number,
  totalFixos: number,
  totalVariaveisOp: number,
  totalImpostos: number,
  totalComissoes: number,
): DREResult {
  const lucroBruto = receitaBruta - totalImpostos
  const lucroOperacional = lucroBruto - totalVariaveisOp
  const resultadoLiquido = lucroOperacional - totalFixos - totalFolha + totalComissoes
  return {
    receitaBruta,
    impostos: totalImpostos,
    lucroBruto,
    despesasVariaveis: totalVariaveisOp,
    lucroOperacional,
    despesasFixas: totalFixos,
    gastosComPessoal: totalFolha,
    comissoes: totalComissoes,
    resultadoLiquido,
    margemLiquida: receitaBruta > 0 ? resultadoLiquido / receitaBruta : 0,
  }
}
