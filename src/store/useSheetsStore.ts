import { create } from 'zustand'
import type { ClienteSheet, ColaboradorSheet } from '@/types'
import { mockClientes, mockColaboradores } from '@/lib/mockData'

interface SheetsStore {
  clientes: ClienteSheet[]
  colaboradores: ColaboradorSheet[]
  loading: boolean
  error: string | null
  lastSync: Date | null
  mesSelecionado: string
  setMesSelecionado: (mes: string) => void
  setData: (clientes: ClienteSheet[], colaboradores: ColaboradorSheet[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (date: Date) => void
  useMockData: () => void
}

const mesesDisponiveis = [...new Set(mockClientes.map(c => c.mesAno))]
const ultimoMes = mesesDisponiveis[mesesDisponiveis.length - 1] || 'Jan/2026'

export const useSheetsStore = create<SheetsStore>((set) => ({
  clientes: mockClientes,
  colaboradores: mockColaboradores,
  loading: false,
  error: null,
  lastSync: new Date(),
  mesSelecionado: ultimoMes,
  setMesSelecionado: (mes) => set({ mesSelecionado: mes }),
  setData: (clientes, colaboradores) => set({ clientes, colaboradores }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLastSync: (date) => set({ lastSync: date }),
  useMockData: () => set({ clientes: mockClientes, colaboradores: mockColaboradores, lastSync: new Date(), error: null }),
}))
