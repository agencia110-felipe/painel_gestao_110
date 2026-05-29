import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RelatorioImportado } from '@/types'

interface MapeamentoColaborador {
  nomeIClips: string   // nome exato como aparece no iClips
  nomeStore: string    // nome exato cadastrado em Custos → Equipe
  vinculadoEm: string  // ISO timestamp
}

interface RelatorioStore {
  relatorios: RelatorioImportado[]
  mapeamentoCustom: Record<string, string>

  // Mapeamento iClips → store para nomes de colaboradores
  mapeamentosColaboradores: MapeamentoColaborador[]
  // Ex-colaboradores/freelancers para ignorar no alerta (usam custo médio silenciosamente)
  colaboradoresIgnorados: string[]

  addRelatorio: (r: RelatorioImportado) => void
  removeRelatorio: (id: string) => void
  addMapeamento: (nomeRaw: string, clienteCanônico: string) => void
  getMesesDisponiveis: () => string[]

  addMapeamentoColaborador: (nomeIClips: string, nomeStore: string) => void
  removeMapeamentoColaborador: (nomeIClips: string) => void
  addIgnorado: (nomeIClips: string) => void
  removeIgnorado: (nomeIClips: string) => void
}

export const useRelatorioStore = create<RelatorioStore>()(
  persist(
    (set, get) => ({
      relatorios: [],
      mapeamentoCustom: {},
      mapeamentosColaboradores: [],
      colaboradoresIgnorados: [],

      addRelatorio: (r) => {
        // Strip tarefas before persisting — can be 15k+ items per quarter
        const { tarefas: _, ...semTarefas } = r
        // Deduplication: ID takes priority (iClips live uses 'iclips-live' — always replace)
        const porId = get().relatorios.find(x => x.id === semTarefas.id)
        if (porId) {
          set(s => ({ relatorios: s.relatorios.map(x => x.id === semTarefas.id ? semTarefas : x) }))
          return
        }
        // XLS imports: deduplicate by nomeArquivo + periodoInicio
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

      addMapeamentoColaborador: (nomeIClips, nomeStore) =>
        set(s => ({
          mapeamentosColaboradores: [
            ...s.mapeamentosColaboradores.filter(m => m.nomeIClips !== nomeIClips),
            { nomeIClips, nomeStore, vinculadoEm: new Date().toISOString() },
          ],
        })),

      removeMapeamentoColaborador: (nomeIClips) =>
        set(s => ({
          mapeamentosColaboradores: s.mapeamentosColaboradores.filter(m => m.nomeIClips !== nomeIClips),
        })),

      addIgnorado: (nomeIClips) =>
        set(s => ({
          colaboradoresIgnorados: s.colaboradoresIgnorados.includes(nomeIClips)
            ? s.colaboradoresIgnorados
            : [...s.colaboradoresIgnorados, nomeIClips],
        })),

      removeIgnorado: (nomeIClips) =>
        set(s => ({
          colaboradoresIgnorados: s.colaboradoresIgnorados.filter(n => n !== nomeIClips),
        })),
    }),
    { name: 'ag110-relatorios' }
  )
)
