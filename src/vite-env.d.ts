/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCESS_PASSWORD: string
  readonly VITE_SPREADSHEET_ID: string
  readonly VITE_SHEETS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
