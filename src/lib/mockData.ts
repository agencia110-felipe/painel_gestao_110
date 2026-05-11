import type { ClienteSheet, ColaboradorSheet } from '@/types'

export const mockClientes: ClienteSheet[] = [
  { mesAno: 'Jan/2026', cluster: 'Saturno',  cliente: 'Virage',        tempoTrabalhado: 322.8, entradaContratual: 14078, semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',     tempoTrabalhado: 178.4, entradaContratual: 20647, semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'Honda Motocar',  tempoTrabalhado: 111.9, entradaContratual: 10584, semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'Realiza',        tempoTrabalhado: 108.7, entradaContratual: 11262, semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',     tempoTrabalhado: 29.7,  entradaContratual: 3500,  semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',   tempoTrabalhado: 26.6,  entradaContratual: 8500,  semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Terra',    cliente: 'J17 Bank',       tempoTrabalhado: 7.3,   entradaContratual: 7508,  semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Ace',            tempoTrabalhado: 0.2,   entradaContratual: 3754,  semReceita: false },
  { mesAno: 'Jan/2026', cluster: 'Mercúrio', cliente: 'Soluagro',       tempoTrabalhado: 0.2,   entradaContratual: 704,   semReceita: false },
  // Fev/2026
  { mesAno: 'Fev/2026', cluster: 'Saturno',  cliente: 'Virage',        tempoTrabalhado: 310.0, entradaContratual: 14078, semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',     tempoTrabalhado: 185.0, entradaContratual: 20647, semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'Honda Motocar',  tempoTrabalhado: 120.0, entradaContratual: 10584, semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'Realiza',        tempoTrabalhado: 100.0, entradaContratual: 11262, semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',     tempoTrabalhado: 32.0,  entradaContratual: 3500,  semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',   tempoTrabalhado: 28.0,  entradaContratual: 8500,  semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Terra',    cliente: 'J17 Bank',       tempoTrabalhado: 8.0,   entradaContratual: 7508,  semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Ace',            tempoTrabalhado: 0.3,   entradaContratual: 3754,  semReceita: false },
  { mesAno: 'Fev/2026', cluster: 'Mercúrio', cliente: 'Soluagro',       tempoTrabalhado: 0.2,   entradaContratual: 704,   semReceita: false },
  // Mar/2026
  { mesAno: 'Mar/2026', cluster: 'Saturno',  cliente: 'Virage',        tempoTrabalhado: 298.0, entradaContratual: 14078, semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Júpiter',  cliente: 'Bom Jesus',     tempoTrabalhado: 190.0, entradaContratual: 20647, semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'Honda Motocar',  tempoTrabalhado: 115.0, entradaContratual: 10584, semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'Realiza',        tempoTrabalhado: 105.0, entradaContratual: 11262, semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Panorâmico',     tempoTrabalhado: 25.0,  entradaContratual: 3500,  semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'A. Gonçalves',   tempoTrabalhado: 30.0,  entradaContratual: 8500,  semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Terra',    cliente: 'J17 Bank',       tempoTrabalhado: 6.0,   entradaContratual: 7508,  semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Ace',            tempoTrabalhado: 0.5,   entradaContratual: 3754,  semReceita: false },
  { mesAno: 'Mar/2026', cluster: 'Mercúrio', cliente: 'Soluagro',       tempoTrabalhado: 0.2,   entradaContratual: 704,   semReceita: false },
]

export const mockColaboradores: ColaboradorSheet[] = [
  { mesAno: 'Jan/2026', colaborador: 'Jana Fonseca',   tempoTrabalhado: 177, totalJobs: 0, percentualEntregas: 0.698, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Rebeca Mileski',  tempoTrabalhado: 160, totalJobs: 0, percentualEntregas: 0.619, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Matheus Valle',   tempoTrabalhado: 166, totalJobs: 0, percentualEntregas: 0.700, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Maichel Bueno',   tempoTrabalhado: 95,  totalJobs: 0, percentualEntregas: 0.546, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Marina Braune',   tempoTrabalhado: 88,  totalJobs: 0, percentualEntregas: 0.762, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Evelyn Korber',   tempoTrabalhado: 149, totalJobs: 0, percentualEntregas: 0.891, semDados: false },
  { mesAno: 'Jan/2026', colaborador: 'Felipe Mariot',   tempoTrabalhado: 66,  totalJobs: 0, percentualEntregas: 0.489, semDados: false },
  // Fev/2026
  { mesAno: 'Fev/2026', colaborador: 'Jana Fonseca',   tempoTrabalhado: 168, totalJobs: 0, percentualEntregas: 0.720, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Rebeca Mileski',  tempoTrabalhado: 155, totalJobs: 0, percentualEntregas: 0.650, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Matheus Valle',   tempoTrabalhado: 170, totalJobs: 0, percentualEntregas: 0.730, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Maichel Bueno',   tempoTrabalhado: 100, totalJobs: 0, percentualEntregas: 0.580, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Marina Braune',   tempoTrabalhado: 92,  totalJobs: 0, percentualEntregas: 0.790, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Evelyn Korber',   tempoTrabalhado: 155, totalJobs: 0, percentualEntregas: 0.910, semDados: false },
  { mesAno: 'Fev/2026', colaborador: 'Felipe Mariot',   tempoTrabalhado: 72,  totalJobs: 0, percentualEntregas: 0.520, semDados: false },
  // Mar/2026
  { mesAno: 'Mar/2026', colaborador: 'Jana Fonseca',   tempoTrabalhado: 175, totalJobs: 0, percentualEntregas: 0.750, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Rebeca Mileski',  tempoTrabalhado: 162, totalJobs: 0, percentualEntregas: 0.680, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Matheus Valle',   tempoTrabalhado: 158, totalJobs: 0, percentualEntregas: 0.710, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Maichel Bueno',   tempoTrabalhado: 90,  totalJobs: 0, percentualEntregas: 0.560, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Marina Braune',   tempoTrabalhado: 85,  totalJobs: 0, percentualEntregas: 0.800, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Evelyn Korber',   tempoTrabalhado: 145, totalJobs: 0, percentualEntregas: 0.870, semDados: false },
  { mesAno: 'Mar/2026', colaborador: 'Felipe Mariot',   tempoTrabalhado: 70,  totalJobs: 0, percentualEntregas: 0.510, semDados: false },
]
