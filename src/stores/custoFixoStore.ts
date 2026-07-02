import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustoFixo } from '@/types'

interface CustoFixoStore {
  custosFixos: CustoFixo[]
  addCustoFixo: (dados: Omit<CustoFixo, 'id'>) => void
  updateCustoFixo: (id: string, dados: Partial<Omit<CustoFixo, 'id'>>) => void
  deleteCustoFixo: (id: string) => void
}

function genId() {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useCustoFixoStore = create<CustoFixoStore>()(
  persist(
    (set) => ({
      custosFixos: [],

      addCustoFixo: (dados) =>
        set((s) => ({ custosFixos: [...s.custosFixos, { id: genId(), ...dados }] })),

      updateCustoFixo: (id, dados) =>
        set((s) => ({
          custosFixos: s.custosFixos.map((c) =>
            c.id === id ? { ...c, ...dados } : c
          ),
        })),

      deleteCustoFixo: (id) =>
        set((s) => ({ custosFixos: s.custosFixos.filter((c) => c.id !== id) })),
    }),
    { name: 'ag110-custos-fixos' }
  )
)
