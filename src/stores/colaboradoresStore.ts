import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Colaborador, HistoricoSalario, AlocacaoSetor } from '@/types'

interface ColaboradoresStore {
  colaboradores: Colaborador[]
  addColaborador: (dados: Omit<Colaborador, 'id'>) => string
  updateColaborador: (id: string, dados: Partial<Omit<Colaborador, 'id'>>) => void
  deleteColaborador: (id: string) => void
  addNomeIClips: (id: string, nome: string) => void
  removeNomeIClips: (id: string, nome: string) => void
  addHistoricoSalario: (id: string, registro: Omit<HistoricoSalario, 'id'>) => void
  updateHistoricoSalario: (colaboradorId: string, registroId: string, dados: Partial<Omit<HistoricoSalario, 'id'>>) => void
  deleteHistoricoSalario: (colaboradorId: string, registroId: string) => void
  setAlocacoes: (id: string, alocacoes: AlocacaoSetor[]) => void
}

function genId(prefix = 'c') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useColaboradoresStore = create<ColaboradoresStore>()(
  persist(
    (set) => ({
      colaboradores: [],

      addColaborador: (dados) => {
        const id = genId('col')
        set((s) => ({ colaboradores: [...s.colaboradores, { id, ...dados }] }))
        return id
      },

      updateColaborador: (id, dados) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === id ? { ...c, ...dados } : c
          ),
        })),

      deleteColaborador: (id) =>
        set((s) => ({ colaboradores: s.colaboradores.filter((c) => c.id !== id) })),

      addNomeIClips: (id, nome) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === id && !c.nomesIClips.includes(nome)
              ? { ...c, nomesIClips: [...c.nomesIClips, nome] }
              : c
          ),
        })),

      removeNomeIClips: (id, nome) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === id
              ? { ...c, nomesIClips: c.nomesIClips.filter((n) => n !== nome) }
              : c
          ),
        })),

      addHistoricoSalario: (id, registro) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === id
              ? {
                  ...c,
                  historicoSalarial: [
                    ...c.historicoSalarial,
                    { id: genId('sal'), ...registro },
                  ],
                }
              : c
          ),
        })),

      updateHistoricoSalario: (colaboradorId, registroId, dados) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === colaboradorId
              ? {
                  ...c,
                  historicoSalarial: c.historicoSalarial.map((h) =>
                    h.id === registroId ? { ...h, ...dados } : h
                  ),
                }
              : c
          ),
        })),

      deleteHistoricoSalario: (colaboradorId, registroId) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === colaboradorId
              ? {
                  ...c,
                  historicoSalarial: c.historicoSalarial.filter(
                    (h) => h.id !== registroId
                  ),
                }
              : c
          ),
        })),

      setAlocacoes: (id, alocacoes) =>
        set((s) => ({
          colaboradores: s.colaboradores.map((c) =>
            c.id === id ? { ...c, alocacoes } : c
          ),
        })),
    }),
    { name: 'ag110-colaboradores' }
  )
)
