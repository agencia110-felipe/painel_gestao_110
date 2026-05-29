import { create } from 'zustand'
import type { RelatorioImportado } from '@/types'

interface IClipsStore {
  relatorio: RelatorioImportado | null
  loading: boolean
  error: string | null
  lastSync: Date | null
  setRelatorio: (r: RelatorioImportado | null) => void
  setLoading: (v: boolean) => void
  setError: (v: string | null) => void
  setLastSync: (d: Date) => void
}

// Store em memória — não persiste no localStorage (dados sempre buscados do Sheets)
export const useIClipsStore = create<IClipsStore>()((set) => ({
  relatorio: null,
  loading: false,
  error: null,
  lastSync: null,
  setRelatorio: (r) => set({ relatorio: r }),
  setLoading:   (v) => set({ loading: v }),
  setError:     (v) => set({ error: v }),
  setLastSync:  (d) => set({ lastSync: d }),
}))
