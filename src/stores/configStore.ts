import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConfigParams } from '@/types'

interface ConfigStore extends ConfigParams {
  setAproveitamento: (v: number) => void
  setMargemDesejada: (v: number) => void
  setSpreadsheetId: (v: string) => void
  setSheetsApiKey: (v: string) => void
  setSenha: (v: string) => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      aproveitamentoPct: 0.85,
      margemDesejadaPct: 0.25,
      spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID || '',
      sheetsApiKey: import.meta.env.VITE_SHEETS_API_KEY || '',
      senha: import.meta.env.VITE_ACCESS_PASSWORD || '110agencia',

      setAproveitamento: (aproveitamentoPct) => set({ aproveitamentoPct }),
      setMargemDesejada: (margemDesejadaPct) => set({ margemDesejadaPct }),
      setSpreadsheetId: (spreadsheetId) => set({ spreadsheetId }),
      setSheetsApiKey: (sheetsApiKey) => set({ sheetsApiKey }),
      setSenha: (senha) => set({ senha }),
    }),
    { name: 'ag110-config' }
  )
)
