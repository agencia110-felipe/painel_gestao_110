import { create } from 'zustand'
import type { ClienteSheet, ColaboradorSheet } from '@/types'
import { mockClientes, mockColaboradores } from '@/lib/mockData'
import { sortMesAno } from '@/lib/aggregation'

export type ModoFiltro = 'mensal' | 'personalizado'

interface SheetsStore {
  clientes: ClienteSheet[]
  colaboradores: ColaboradorSheet[]
  loading: boolean
  error: string | null
  lastSync: Date | null
  // filtro
  modoFiltro: ModoFiltro
  mesSelecionado: string
  mesInicio: string
  mesFim: string
  setModoFiltro: (modo: ModoFiltro) => void
  setMesSelecionado: (mes: string) => void
  setMesInicio: (mes: string) => void
  setMesFim: (mes: string) => void
  setData: (clientes: ClienteSheet[], colaboradores: ColaboradorSheet[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (date: Date) => void
  useMockData: () => void
}

const mesesDisponiveis = sortMesAno([...new Set(mockClientes.map(c => c.mesAno))])
const ultimoMes = mesesDisponiveis[mesesDisponiveis.length - 1] || 'Jan/2026'
const primeroMes = mesesDisponiveis[0] || 'Jan/2026'

export const useSheetsStore = create<SheetsStore>((set) => ({
  clientes: mockClientes,
  colaboradores: mockColaboradores,
  loading: false,
  error: null,
  lastSync: new Date(),
  modoFiltro: 'mensal',
  mesSelecionado: ultimoMes,
  mesInicio: primeroMes,
  mesFim: ultimoMes,
  setModoFiltro: (modo) => set({ modoFiltro: modo }),
  setMesSelecionado: (mes) => set({ mesSelecionado: mes }),
  setMesInicio: (mes) => set({ mesInicio: mes }),
  setMesFim: (mes) => set({ mesFim: mes }),
  setData: (clientes, colaboradores) => {
    const meses = sortMesAno([...new Set(clientes.map(c => c.mesAno))])
    const ultimo = meses[meses.length - 1] || ultimoMes
    const primeiro = meses[0] || primeroMes
    set({ clientes, colaboradores, mesSelecionado: ultimo, mesInicio: primeiro, mesFim: ultimo })
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLastSync: (date) => set({ lastSync: date }),
  useMockData: () => set({
    clientes: mockClientes,
    colaboradores: mockColaboradores,
    lastSync: new Date(),
    error: null,
  }),
}))
