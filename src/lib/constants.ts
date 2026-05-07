import type { ConfigParams, PacoteBase } from '@/types'

export const DEFAULT_CONFIG: ConfigParams = {
  horasMes: 160,
  aproveitamentoPct: 0.85,
  gatilhoContratacaoPct: 0.85,
  margemDesejadaPct: 0.25,
  fatorComplexidadePct: 0.10,
  trafegoPctPacote: 0.60,
  socialMediaPctPacote: 0.40,
  smAtendimentoPct: 0.50,
  smCriacaoPct: 0.30,
  smRevisaoPct: 0.20,
}

export const PACOTES_BASE: PacoteBase[] = [
  { nome: 'Micro',    horas: 20,  precoAntigo: 2500  },
  { nome: 'Start',    horas: 40,  precoAntigo: 4500  },
  { nome: 'Média',    horas: 80,  precoAntigo: 8500  },
  { nome: 'Grande',   horas: 120, precoAntigo: 12000 },
  { nome: 'Gigante',  horas: 200, precoAntigo: 18000 },
]

export const STATUS_COLORS = {
  'Saudável':         { bg: '#EBF8EF', text: '#2D8A45', border: '#2D8A45' },
  'Atenção':          { bg: '#FFF3CC', text: '#E69500', border: '#E69500' },
  'Deficitário':      { bg: '#FAD9D9', text: '#C0392B', border: '#C0392B' },
  'Prejuízo':         { bg: '#FAD9D9', text: '#C0392B', border: '#C0392B' },
  'Alta performance': { bg: '#EBF8EF', text: '#2D8A45', border: '#2D8A45' },
  'Regular':          { bg: '#EBF4FB', text: '#2D6A9F', border: '#2D6A9F' },
  'Crítico':          { bg: '#FAD9D9', text: '#C0392B', border: '#C0392B' },
  'Livre':            { bg: '#EBF8EF', text: '#2D8A45', border: '#2D8A45' },
  'No gatilho':       { bg: '#FFF3CC', text: '#E69500', border: '#E69500' },
  'Acima do limite':  { bg: '#FAD9D9', text: '#C0392B', border: '#C0392B' },
} as const

export const CHART_COLORS = {
  primary:   '#1A3A5C',
  secondary: '#2D6A9F',
  success:   '#2D8A45',
  warning:   '#E69500',
  danger:    '#C0392B',
  purple:    '#7C3AED',
  teal:      '#0D9488',
  orange:    '#EA580C',
  pink:      '#DB2777',
  indigo:    '#4338CA',
}

export const SETOR_COLORS: Record<string, string> = {
  'Tráfego':     '#1A3A5C',
  'Atendimento': '#2D6A9F',
  'Criação':     '#7C3AED',
  'Backend':     '#888888',
  'Gestão':      '#0D9488',
  'Mídia':       '#1A3A5C',
  'Redação':     '#DB2777',
}

export const CLUSTER_COLORS: Record<string, string> = {
  'Júpiter': '#EA580C',
  'Saturno': '#1A3A5C',
  'Terra':   '#2D8A45',
  'Mercúrio':'#7C3AED',
  'Marte':   '#C0392B',
  'Vênus':   '#DB2777',
}
