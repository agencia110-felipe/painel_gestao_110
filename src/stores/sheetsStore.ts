import { create } from 'zustand'
import type { TarefaIClips } from '@/types'

interface SheetsStore {
  tarefas: TarefaIClips[]
  lastSync: string | null
  loading: boolean
  error: string | null
  setTarefas: (tarefas: TarefaIClips[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (ts: string) => void
}

export const useSheetsStore = create<SheetsStore>((set) => ({
  tarefas: [],
  lastSync: null,
  loading: false,
  error: null,

  setTarefas: (tarefas) => set({ tarefas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLastSync: (lastSync) => set({ lastSync }),
}))
