import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cliente, FaturamentoMes } from '@/types'

interface ClientesStore {
  clientes: Cliente[]
  addCliente: (dados: Omit<Cliente, 'id'>) => string
  updateCliente: (id: string, dados: Partial<Omit<Cliente, 'id'>>) => void
  deleteCliente: (id: string) => void
  addNomeIClips: (id: string, nome: string) => void
  removeNomeIClips: (id: string, nome: string) => void
  setFaturamento: (id: string, mesAno: string, valor: number) => void
  removeFaturamento: (id: string, mesAno: string) => void
}

function genId() {
  return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useClientesStore = create<ClientesStore>()(
  persist(
    (set) => ({
      clientes: [],

      addCliente: (dados) => {
        const id = genId()
        set((s) => ({ clientes: [...s.clientes, { id, ...dados }] }))
        return id
      },

      updateCliente: (id, dados) =>
        set((s) => ({
          clientes: s.clientes.map((c) =>
            c.id === id ? { ...c, ...dados } : c
          ),
        })),

      deleteCliente: (id) =>
        set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) })),

      addNomeIClips: (id, nome) =>
        set((s) => ({
          clientes: s.clientes.map((c) =>
            c.id === id && !c.nomesIClips.includes(nome)
              ? { ...c, nomesIClips: [...c.nomesIClips, nome] }
              : c
          ),
        })),

      removeNomeIClips: (id, nome) =>
        set((s) => ({
          clientes: s.clientes.map((c) =>
            c.id === id
              ? { ...c, nomesIClips: c.nomesIClips.filter((n) => n !== nome) }
              : c
          ),
        })),

      setFaturamento: (id, mesAno, valor) =>
        set((s) => ({
          clientes: s.clientes.map((c) => {
            if (c.id !== id) return c
            const semEsse = c.faturamentoMensal.filter((f) => f.mesAno !== mesAno)
            const novo: FaturamentoMes[] =
              valor > 0 ? [...semEsse, { mesAno, valor }] : semEsse
            return { ...c, faturamentoMensal: novo }
          }),
        })),

      removeFaturamento: (id, mesAno) =>
        set((s) => ({
          clientes: s.clientes.map((c) =>
            c.id === id
              ? {
                  ...c,
                  faturamentoMensal: c.faturamentoMensal.filter(
                    (f) => f.mesAno !== mesAno
                  ),
                }
              : c
          ),
        })),
    }),
    { name: 'ag110-clientes' }
  )
)
