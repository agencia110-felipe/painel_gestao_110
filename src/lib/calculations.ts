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
} from '@/types'

// Setores que contam como custo de backend (não faturável)
const BACKEND_SET = new Set(['Financeiro', 'Comercial', 'RH'])

// ─── Helpers de alocação ─────────────────────────────────────────────────────

export function membroFaturavelPct(m: Pick<EquipeMembro, 'alocacoes'>): number {
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

export function calcTotalFolha(equipe: EquipeMembro[]): number {
  return equipe.filter(m => m.status === 'Ativo').reduce((s, m) => s + m.salario, 0)
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

export function calcCustoTotalMensal(
  equipe: EquipeMembro[],
  fixos: CustoFixo[],
  variaveis: CustoVariavel[] = [],
  mesAno?: string
): number {
  return calcTotalFolha(equipe) + calcTotalFixos(fixos, mesAno) + calcTotalVariaveis(variaveis, mesAno)
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
  return equipe
    .filter(m => m.status === 'Ativo')
    .reduce((s, m) => s + horasMes * aproveitamentoPct * membroFaturavelPct(m), 0)
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

export function calcTicketMedioReceita(clientes: ClienteSheet[]): number {
  if (clientes.length === 0) return 0
  return clientes.reduce((s, c) => s + c.entradaContratual, 0) / clientes.length
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
  const custoEfetivoTotal = clientes.reduce((s, c) => s + c.custoEfetivoOp, 0)
  // Overhead = custo que não está alocado diretamente em nenhum cliente
  const custoOverhead = Math.max(custoTotal - custoEfetivoTotal, 0)
  const totalHoras = clientes.reduce((s, c) => s + c.tempoTrabalhado, 0)

  return clientes.map(c => {
    // Custo direto do cliente + parcela de overhead proporcional às horas
    const overheadCliente = totalHoras > 0
      ? custoOverhead * (c.tempoTrabalhado / totalHoras)
      : custoOverhead / Math.max(clientes.length, 1)
    const custoRateado = c.custoEfetivoOp + overheadCliente
    const lucroReal = calcLucroRealCliente(c.entradaContratual, custoRateado)
    const margemReal = calcMargemRealCliente(lucroReal, c.entradaContratual)
    const margemContribuicao = c.entradaContratual > 0
      ? (c.entradaContratual - c.custoEfetivoOp) / c.entradaContratual
      : 0
    return {
      nome: c.cliente,
      cluster: c.cluster,
      receita: c.entradaContratual,
      horasMes: c.tempoTrabalhado,
      custoRateado,
      lucroReal,
      margemReal,
      margemContribuicao,
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

export function calcColaboradoresAnalise(
  colaboradores: ColaboradorSheet[]
): ColaboradorAnalise[] {
  return colaboradores.map(c => {
    const ocupacao = calcOcupacaoColaborador(c.tempoTrabalhado, c.cargaHorariaMes)
    return {
      nome: c.colaborador,
      area: c.area,
      horasTrabalhadas: c.tempoTrabalhado,
      cargaEsperada: c.cargaHorariaMes,
      percentualOcupacao: ocupacao,
      percentualEntregas: c.percentualEntregas,
      totalJobs: c.totalJobs,
      custoEfetivo: c.custoEfetivoOp,
      eficiencia: calcEficienciaColaborador(c.percentualEntregas, ocupacao),
      produtividadePorHora: c.tempoTrabalhado > 0 ? c.totalJobs / c.tempoTrabalhado : 0,
      custoPortJob: c.totalJobs > 0 ? c.custoEfetivoOp / c.totalJobs : 0,
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
      return s + horasMes * aproveitamentoPct * (aloc.pct / 100)
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
    return s + horasMes * aproveitamentoPct * pct
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
