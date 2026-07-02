// ─── SETOR ──────────────────────────────────────────────────────────────────

export interface Setor {
  id: string
  nome: string
  tipo: 'Operacional' | 'Backend'
}

// ─── COLABORADOR ────────────────────────────────────────────────────────────

export interface HistoricoSalario {
  id: string
  mesVigenciaInicio: string  // 'YYYY-MM'
  salarioBruto: number
}

export interface AlocacaoSetor {
  setorId: string
  percentual: number  // 0–100
}

export interface Colaborador {
  id: string
  nome: string
  nomesIClips: string[]         // aliases como aparecem em executionResponsible
  horasContratadasSemana: number
  alocacoes: AlocacaoSetor[]    // soma deve ser 100
  status: 'Ativo' | 'Inativo'
  mesDesligamento: string | null  // 'YYYY-MM'
  historicoSalarial: HistoricoSalario[]
}

// ─── CLIENTE ────────────────────────────────────────────────────────────────

export interface FaturamentoMes {
  mesAno: string  // 'YYYY-MM'
  valor: number
}

export interface Cliente {
  id: string
  nome: string
  nomesIClips: string[]       // aliases como aparecem em clientName
  isInterno: boolean          // true = jobs internos, não entra no ranking financeiro
  status: 'Ativo' | 'Inativo'
  mesDesligamento: string | null
  faturamentoMensal: FaturamentoMes[]
}

// ─── CUSTO FIXO ─────────────────────────────────────────────────────────────

export interface CustoFixo {
  id: string
  descricao: string
  mesAno: string  // 'YYYY-MM'
  valor: number
}

// ─── PARÂMETROS GLOBAIS ─────────────────────────────────────────────────────

export interface ConfigParams {
  aproveitamentoPct: number   // ex: 0.85
  margemDesejadaPct: number   // ex: 0.25
  spreadsheetId: string
  sheetsApiKey: string
  senha: string
}

// ─── DADOS BRUTOS DO iCLIPS (Google Sheets) ─────────────────────────────────

export interface TarefaIClips {
  clientName: string
  executionResponsible: string
  slaTime: string            // HH:MM:SS
  playEndDate: string        // YYYY-MM-DD HH:MM:SS
  nomeDepartamento: string
  // campos derivados
  horas: number              // slaTime convertido para decimal
  mesAno: string             // 'YYYY-MM' derivado de playEndDate
}

// ─── ESTADO DA SINCRONIZAÇÃO ─────────────────────────────────────────────────

export interface SheetsState {
  tarefas: TarefaIClips[]
  lastSync: string | null    // ISO timestamp
  loading: boolean
  error: string | null
}

// ─── PENDÊNCIAS DE VÍNCULO ───────────────────────────────────────────────────

export interface Pendencias {
  colaboradoresSemVinculo: string[]   // nomes do iClips sem colaborador mapeado
  clientesSemVinculo: string[]        // nomes do iClips sem cliente mapeado
  tarefasIgnoradas: number            // count total de tarefas excluídas
  horasIgnoradas: number              // total de horas excluídas
}

// ─── RESULTADOS DE CÁLCULO ───────────────────────────────────────────────────

export interface ResultadoCliente {
  clienteId: string
  nome: string
  faturamento: number
  horasDiretas: number
  custoDireto: number
  custoBackendRateado: number
  custoOverheadRateado: number
  custoFixoRateado: number
  custoTotal: number
  margem: number | null        // null se faturamento = 0
  temPendencias: boolean
}

export interface ResultadoDRE {
  receitaBruta: number
  custoDiretoTotal: number
  custoBackendTotal: number
  folhaTotalInformativo: number
  custoOverheadInterno: number
  custoFixoTotal: number
  resultadoLiquido: number
  margemLiquida: number | null
}

export interface ResultadoCapacidade {
  setorId: string
  setorNome: string
  capacidadeHoras: number
  consumoHoras: number
  ocupacaoPct: number
  status: 'Livre' | 'Atencao' | 'Estourado'
}

export interface ResultadoColaborador {
  colaboradorId: string
  nome: string
  setores: string[]
  horasContratadas: number    // por mês
  horasTrabalhadas: number    // do iClips no período
  ocupacaoPct: number
  custoHora: number
  status: 'Ativo' | 'Inativo'
}

// ─── PERÍODO FILTRADO ────────────────────────────────────────────────────────

export interface Periodo {
  inicio: string   // 'YYYY-MM'
  fim: string      // 'YYYY-MM'
}

// lista de meses 'YYYY-MM' no intervalo
export function mesesNoPeriodo(periodo: Periodo): string[] {
  const meses: string[] = []
  let [ano, mes] = periodo.inicio.split('-').map(Number)
  const [anoFim, mesFim] = periodo.fim.split('-').map(Number)
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes++
    if (mes > 12) { mes = 1; ano++ }
  }
  return meses
}
