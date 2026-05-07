import type { ClienteSheet, ColaboradorSheet } from '@/types'

export const mockClientes: ClienteSheet[] = [
  { mesAno: 'Jan/2026', cluster: 'Saturno',  cliente: 'Virage',       tempoTrabalhado: 322.8, custoEfetivoOp: 6883,  entradaContratual: 14078, custoOperacionalPct: 0.489 },
  { mesAno: 'Jan/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',    tempoTrabalhado: 178.4, custoEfetivoOp: 4720,  entradaContratual: 20647, custoOperacionalPct: 0.229 },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'Honda Motocar', tempoTrabalhado: 111.9, custoEfetivoOp: 1562,  entradaContratual: 10584, custoOperacionalPct: 0.148 },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'Realiza',       tempoTrabalhado: 108.7, custoEfetivoOp: 2990,  entradaContratual: 11262, custoOperacionalPct: 0.265 },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',    tempoTrabalhado: 29.7,  custoEfetivoOp: 360,   entradaContratual: 3500,  custoOperacionalPct: 0.103 },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',  tempoTrabalhado: 26.6,  custoEfetivoOp: 1027,  entradaContratual: 8500,  custoOperacionalPct: 0.121 },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'J17 Bank',      tempoTrabalhado: 7.3,   custoEfetivoOp: 357,   entradaContratual: 7508,  custoOperacionalPct: 0.048 },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Ace',           tempoTrabalhado: 0.2,   custoEfetivoOp: 2,     entradaContratual: 3754,  custoOperacionalPct: 0.001 },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Soluagro',      tempoTrabalhado: 0.2,   custoEfetivoOp: 3,     entradaContratual: 704,   custoOperacionalPct: 0.004 },
  // Fev/2026
  { mesAno: 'Fev/2026', cluster: 'Saturno',  cliente: 'Virage',       tempoTrabalhado: 310.0, custoEfetivoOp: 6600,  entradaContratual: 14078, custoOperacionalPct: 0.469 },
  { mesAno: 'Fev/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',    tempoTrabalhado: 185.0, custoEfetivoOp: 4900,  entradaContratual: 20647, custoOperacionalPct: 0.237 },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'Honda Motocar', tempoTrabalhado: 120.0, custoEfetivoOp: 1680,  entradaContratual: 10584, custoOperacionalPct: 0.159 },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'Realiza',       tempoTrabalhado: 100.0, custoEfetivoOp: 2750,  entradaContratual: 11262, custoOperacionalPct: 0.244 },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',    tempoTrabalhado: 32.0,  custoEfetivoOp: 388,   entradaContratual: 3500,  custoOperacionalPct: 0.111 },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',  tempoTrabalhado: 28.0,  custoEfetivoOp: 1080,  entradaContratual: 8500,  custoOperacionalPct: 0.127 },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'J17 Bank',      tempoTrabalhado: 8.0,   custoEfetivoOp: 390,   entradaContratual: 7508,  custoOperacionalPct: 0.052 },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Ace',           tempoTrabalhado: 0.3,   custoEfetivoOp: 3,     entradaContratual: 3754,  custoOperacionalPct: 0.001 },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Soluagro',      tempoTrabalhado: 0.2,   custoEfetivoOp: 3,     entradaContratual: 704,   custoOperacionalPct: 0.004 },
  // Mar/2026
  { mesAno: 'Mar/2026', cluster: 'Saturno',  cliente: 'Virage',       tempoTrabalhado: 298.0, custoEfetivoOp: 6350,  entradaContratual: 14078, custoOperacionalPct: 0.451 },
  { mesAno: 'Mar/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',    tempoTrabalhado: 190.0, custoEfetivoOp: 5020,  entradaContratual: 20647, custoOperacionalPct: 0.243 },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'Honda Motocar', tempoTrabalhado: 115.0, custoEfetivoOp: 1607,  entradaContratual: 10584, custoOperacionalPct: 0.152 },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'Realiza',       tempoTrabalhado: 105.0, custoEfetivoOp: 2889,  entradaContratual: 11262, custoOperacionalPct: 0.257 },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',    tempoTrabalhado: 25.0,  custoEfetivoOp: 302,   entradaContratual: 3500,  custoOperacionalPct: 0.086 },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',  tempoTrabalhado: 30.0,  custoEfetivoOp: 1157,  entradaContratual: 8500,  custoOperacionalPct: 0.136 },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'J17 Bank',      tempoTrabalhado: 6.0,   custoEfetivoOp: 293,   entradaContratual: 7508,  custoOperacionalPct: 0.039 },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Ace',           tempoTrabalhado: 0.5,   custoEfetivoOp: 5,     entradaContratual: 3754,  custoOperacionalPct: 0.001 },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Soluagro',      tempoTrabalhado: 0.2,   custoEfetivoOp: 3,     entradaContratual: 704,   custoOperacionalPct: 0.004 },
]

export const mockColaboradores: ColaboradorSheet[] = [
  { mesAno: 'Jan/2026', colaborador: 'Jana Fonseca',   area: 'Gestão',      tempoTrabalhado: 177, tempoArredondado: 177, custoEfetivoOp: 4250, totalJobs: 0,  percentualEntregas: 0.698, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Rebeca Mileski',  area: 'Atendimento', tempoTrabalhado: 160, tempoArredondado: 160, custoEfetivoOp: 4780, totalJobs: 0,  percentualEntregas: 0.619, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Matheus Valle',   area: 'Mídia',       tempoTrabalhado: 166, tempoArredondado: 166, custoEfetivoOp: 3721, totalJobs: 0,  percentualEntregas: 0.700, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Maichel Bueno',   area: 'Criação',     tempoTrabalhado: 95,  tempoArredondado: 95,  custoEfetivoOp: 3197, totalJobs: 0,  percentualEntregas: 0.546, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Marina Braune',   area: 'Redação',     tempoTrabalhado: 88,  tempoArredondado: 88,  custoEfetivoOp: 1259, totalJobs: 0,  percentualEntregas: 0.762, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Evelyn Korber',   area: 'Tráfego',     tempoTrabalhado: 149, tempoArredondado: 149, custoEfetivoOp: 3504, totalJobs: 0,  percentualEntregas: 0.891, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Jan/2026', colaborador: 'Felipe Mariot',   area: 'Gestão',      tempoTrabalhado: 66,  tempoArredondado: 66,  custoEfetivoOp: 4755, totalJobs: 0,  percentualEntregas: 0.489, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  // Fev/2026
  { mesAno: 'Fev/2026', colaborador: 'Jana Fonseca',   area: 'Gestão',      tempoTrabalhado: 168, tempoArredondado: 168, custoEfetivoOp: 4250, totalJobs: 0,  percentualEntregas: 0.720, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Rebeca Mileski',  area: 'Atendimento', tempoTrabalhado: 155, tempoArredondado: 155, custoEfetivoOp: 4780, totalJobs: 0,  percentualEntregas: 0.650, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Matheus Valle',   area: 'Mídia',       tempoTrabalhado: 170, tempoArredondado: 170, custoEfetivoOp: 3721, totalJobs: 0,  percentualEntregas: 0.730, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Maichel Bueno',   area: 'Criação',     tempoTrabalhado: 100, tempoArredondado: 100, custoEfetivoOp: 3197, totalJobs: 0,  percentualEntregas: 0.580, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Marina Braune',   area: 'Redação',     tempoTrabalhado: 92,  tempoArredondado: 92,  custoEfetivoOp: 1259, totalJobs: 0,  percentualEntregas: 0.790, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Evelyn Korber',   area: 'Tráfego',     tempoTrabalhado: 155, tempoArredondado: 155, custoEfetivoOp: 3504, totalJobs: 0,  percentualEntregas: 0.910, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Fev/2026', colaborador: 'Felipe Mariot',   area: 'Gestão',      tempoTrabalhado: 72,  tempoArredondado: 72,  custoEfetivoOp: 4755, totalJobs: 0,  percentualEntregas: 0.520, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  // Mar/2026
  { mesAno: 'Mar/2026', colaborador: 'Jana Fonseca',   area: 'Gestão',      tempoTrabalhado: 175, tempoArredondado: 175, custoEfetivoOp: 4250, totalJobs: 0,  percentualEntregas: 0.750, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Rebeca Mileski',  area: 'Atendimento', tempoTrabalhado: 162, tempoArredondado: 162, custoEfetivoOp: 4780, totalJobs: 0,  percentualEntregas: 0.680, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Matheus Valle',   area: 'Mídia',       tempoTrabalhado: 158, tempoArredondado: 158, custoEfetivoOp: 3721, totalJobs: 0,  percentualEntregas: 0.710, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Maichel Bueno',   area: 'Criação',     tempoTrabalhado: 90,  tempoArredondado: 90,  custoEfetivoOp: 3197, totalJobs: 0,  percentualEntregas: 0.560, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Marina Braune',   area: 'Redação',     tempoTrabalhado: 85,  tempoArredondado: 85,  custoEfetivoOp: 1259, totalJobs: 0,  percentualEntregas: 0.800, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Evelyn Korber',   area: 'Tráfego',     tempoTrabalhado: 145, tempoArredondado: 145, custoEfetivoOp: 3504, totalJobs: 0,  percentualEntregas: 0.870, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
  { mesAno: 'Mar/2026', colaborador: 'Felipe Mariot',   area: 'Gestão',      tempoTrabalhado: 70,  tempoArredondado: 70,  custoEfetivoOp: 4755, totalJobs: 0,  percentualEntregas: 0.510, cargaHoraria80pct: 128, cargaHorariaMes: 160 },
]
