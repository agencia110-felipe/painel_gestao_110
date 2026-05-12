export interface ClienteSheet {
  mesAno: string;
  cluster: string;
  cliente: string;
  tempoTrabalhado: number;
  entradaContratual: number;
  semReceita: boolean;
}

export interface ColaboradorSheet {
  mesAno: string;
  colaborador: string;
  tempoTrabalhado: number;
  totalJobs: number;
  percentualEntregas: number;
  semDados: boolean;
}

export interface Alocacao {
  setor: string;
  pct: number; // 0–100
}

export interface EquipeMembro {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  /** Distribuição por setor: pct soma 100. Setores backend: Financeiro, Comercial, RH. */
  alocacoes: Alocacao[];
  socio: boolean;
  metaSalarial: number;
  status: 'Ativo' | 'Inativo';
  cargaHorariaMes?: number;
}

export interface CustoFixo {
  id: string;
  mesAno?: string;
  descricao: string;
  valor: number;
  tipo: 'Backend' | 'Operacional';
  observacao?: string;
}

export interface CustoVariavel {
  id: string;
  mesAno: string;
  descricao: string;
  valor: number;
  categoria: string;
}

export interface ClienteManual {
  id: string;
  nome: string;
  cluster: string;
  receita: number;
  status: 'Ativo' | 'Inativo' | 'Pausado';
}

export interface ConfigParams {
  horasMes: number;
  aproveitamentoPct: number;
  gatilhoContratacaoPct: number;
  margemDesejadaPct: number;
  fatorComplexidadePct: number;
  trafegoPctPacote: number;
  socialMediaPctPacote: number;
  smAtendimentoPct: number;
  smCriacaoPct: number;
  smRevisaoPct: number;
}

export interface ClienteAnalise {
  nome: string;
  cluster: string;
  receita: number;
  horasMes: number;
  custoRateado: number;
  lucroReal: number;
  margemReal: number;
  breakEven: number;           // receita mínima para lucro zero = custoRateado
  concentracao: number;        // receita(cliente) / receitaTotal
  receitaPorHora: number;
  custoPorHora: number;
  status: 'Saudável' | 'Atenção' | 'Deficitário' | 'Prejuízo';
}

export interface ColaboradorAnalise {
  nome: string;
  area: string;
  horasTrabalhadas: number;
  cargaEsperada: number;
  percentualOcupacao: number;
  percentualEntregas: number;
  totalJobs: number;
  eficiencia: number;
  produtividadePorHora: number;  // totalJobs / horasTrabalhadas
  status: 'Alta performance' | 'Disponível' | 'Regular' | 'Sobrecarregado' | 'Atenção' | 'Crítico';
}

export interface SetorCapacidade {
  setor: string;
  capacidadeTotal: number;
  consumoAtual: number;
  ocupacaoPct: number;
  limitGatilho: number;
  folga: number;
  statusCapacidade: 'Livre' | 'Atenção' | 'No gatilho' | 'Acima do limite';
}

export interface PacoteBase {
  nome: string;
  horas: number;
  precoAntigo: number;
}

export interface PacoteCalculado extends PacoteBase {
  custoReal: number;
  precoMinimo: number;
  precoRecomendado: number;
  lucroMes: number;
  margemAntiga: number;
  margemNova: number;
  destaque: boolean;
}

export interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  autoRefresh: boolean;
}
