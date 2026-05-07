export interface ClienteSheet {
  mesAno: string;
  cluster: string;
  cliente: string;
  tempoTrabalhado: number;
  custoEfetivoOp: number;
  entradaContratual: number;
  custoOperacionalPct: number;
}

export interface ColaboradorSheet {
  mesAno: string;
  colaborador: string;
  area: string;
  tempoTrabalhado: number;
  tempoArredondado: number;
  custoEfetivoOp: number;
  totalJobs: number;
  percentualEntregas: number;
  cargaHoraria80pct: number;
  cargaHorariaMes: number;
}

export interface EquipeMembro {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  faturavelPct: number;
  backendPct: number;
  setor: 'Tráfego' | 'Atendimento' | 'Criação' | 'Backend';
  socio: boolean;
  metaSalarial: number;
  status: 'Ativo' | 'Inativo';
}

export interface CustoFixo {
  id: string;
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
  custoEfetivo: number;
  eficiencia: number;
  status: 'Alta performance' | 'Regular' | 'Atenção' | 'Crítico';
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
