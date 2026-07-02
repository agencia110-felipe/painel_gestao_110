import { useCallback } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { useSheetsStore } from '@/stores/sheetsStore'
import { parseHHMMSS, parseDateToMesAno } from '@/lib/formatters'
import type { TarefaIClips } from '@/types'

// GID da aba de tarefas no Google Sheets
const SHEET_GID = '775283929'

interface RawRow {
  clientName: string
  executionResponsible: string
  slaTime: string
  playEndDate: string
  nomeDepartamento: string
}

function parseRows(values: string[][]): TarefaIClips[] {
  if (!values || values.length < 2) return []

  const headers = values[0].map((h) => h.trim())
  const idxClientName = headers.findIndex((h) => h === 'clientName')
  const idxExecResp = headers.findIndex((h) => h === 'executionResponsible')
  const idxSlaTime = headers.findIndex((h) => h === 'slaTime')
  const idxPlayEnd = headers.findIndex((h) => h === 'playEndDate')
  const idxDepto = headers.findIndex((h) => h === 'nomeDepartamento')

  if (idxClientName === -1 || idxExecResp === -1 || idxSlaTime === -1 || idxPlayEnd === -1) {
    throw new Error(
      `Colunas esperadas não encontradas na planilha. Colunas encontradas: ${headers.join(', ')}`
    )
  }

  const tarefas: TarefaIClips[] = []

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const clientName = row[idxClientName]?.trim() ?? ''
    const executionResponsible = row[idxExecResp]?.trim() ?? ''
    const slaTime = row[idxSlaTime]?.trim() ?? ''
    const playEndDate = row[idxPlayEnd]?.trim() ?? ''
    const nomeDepartamento = idxDepto >= 0 ? (row[idxDepto]?.trim() ?? '') : ''

    if (!clientName || !executionResponsible || !slaTime || !playEndDate) continue

    const horas = parseHHMMSS(slaTime)
    const mesAno = parseDateToMesAno(playEndDate)

    if (!mesAno || horas <= 0) continue

    tarefas.push({
      clientName,
      executionResponsible,
      slaTime,
      playEndDate,
      nomeDepartamento,
      horas,
      mesAno,
    })
  }

  return tarefas
}

export function useGoogleSheets() {
  const { spreadsheetId, sheetsApiKey } = useConfigStore()
  const { setTarefas, setLoading, setError, setLastSync } = useSheetsStore()

  const fetchTarefas = useCallback(async () => {
    if (!spreadsheetId || !sheetsApiKey) {
      setError('Configure o Spreadsheet ID e a API Key nas Configurações antes de sincronizar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10000?key=${sheetsApiKey}&gid=${SHEET_GID}`
      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error?.message ?? `Erro HTTP ${res.status}`
        throw new Error(msg)
      }

      const data = await res.json()
      const values: string[][] = data.values ?? []
      const tarefas = parseRows(values)

      setTarefas(tarefas)
      setLastSync(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar planilha.')
    } finally {
      setLoading(false)
    }
  }, [spreadsheetId, sheetsApiKey, setTarefas, setLoading, setError, setLastSync])

  return { fetchTarefas }
}
