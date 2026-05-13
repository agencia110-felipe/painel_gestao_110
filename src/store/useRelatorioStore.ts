import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RelatorioImportado } from '@/types'

interface RelatorioStore {
  relatorios: RelatorioImportado[]
  mapeamentoCustom: Record<string, string>

  addRelatorio: (r: RelatorioImportado) => void
  removeRelatorio: (id: string) => void
  addMapeamento: (nomeRaw: string, clienteCanônico: string) => void
  getMesesDisponiveis: () => string[]
}

export const useRelatorioStore = create<RelatorioStore>()(
  persist(
    (set, get) => ({
      relatorios: [],
      mapeamentoCustom: {},

      addRelatorio: (r) => {
        // Strip tarefas before persisting — can be 15k+ items per quarter
        const { tarefas: _, ...semTarefas } = r
        const existe = get().relatorios.find(
          x => x.nomeArquivo === semTarefas.nomeArquivo && x.periodoInicio === semTarefas.periodoInicio
        )
        if (existe) {
          set(s => ({ relatorios: s.relatorios.map(x => x.id === existe.id ? semTarefas : x) }))
        } else {
          set(s => ({ relatorios: [...s.relatorios, semTarefas] }))
        }
      },

      removeRelatorio: (id) =>
        set(s => ({ relatorios: s.relatorios.filter(r => r.id !== id) })),

      addMapeamento: (raw, canonico) =>
        set(s => ({ mapeamentoCustom: { ...s.mapeamentoCustom, [raw]: canonico } })),

      getMesesDisponiveis: () => {
        const meses = new Set(get().relatorios.flatMap(r => r.mesesCobertos))
        return [...meses].sort()
      },
    }),
    { name: 'ag110-relatorios' }
  )
)
