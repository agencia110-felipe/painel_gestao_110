import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConfigParams, PacoteBase, SheetsConfig } from '@/types'
import { DEFAULT_CONFIG, PACOTES_BASE } from '@/lib/constants'

interface ConfigStore {
  params: ConfigParams
  pacotes: PacoteBase[]
  sheets: SheetsConfig
  procfyAutoSync: boolean
  setParam: <K extends keyof ConfigParams>(key: K, value: ConfigParams[K]) => void
  resetParams: () => void
  updatePacote: (index: number, pacote: Partial<PacoteBase>) => void
  setSheetsConfig: (config: Partial<SheetsConfig>) => void
  setProcfyAutoSync: (v: boolean) => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      params: DEFAULT_CONFIG,
      pacotes: PACOTES_BASE,
      sheets: {
        spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID || '',
        apiKey: import.meta.env.VITE_SHEETS_API_KEY || '',
        autoRefresh: true,
      },
      procfyAutoSync: false,
      setParam: (key, value) =>
        set(s => ({ params: { ...s.params, [key]: value } })),
      resetParams: () => set({ params: DEFAULT_CONFIG }),
      updatePacote: (index, pacote) =>
        set(s => {
          const p = [...s.pacotes]
          p[index] = { ...p[index], ...pacote }
          return { pacotes: p }
        }),
      setSheetsConfig: (config) =>
        set(s => ({ sheets: { ...s.sheets, ...config } })),
      setProcfyAutoSync: (v) => set({ procfyAutoSync: v }),
    }),
    { name: 'agencia110-config' }
  )
)
