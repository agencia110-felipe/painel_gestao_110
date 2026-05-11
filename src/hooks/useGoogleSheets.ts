import { useEffect, useCallback } from 'react'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import type { ClienteSheet, ColaboradorSheet } from '@/types'
import { mockClientes, mockColaboradores } from '@/lib/mockData'
import { parseCurrencyBR, normalizeMesAno, parseHHMMSS } from '@/lib/formatters'

const CACHE_KEY = 'agencia110-sheets-cache'
const CACHE_TTL = 30 * 60 * 1000

function parseNumBR(v: string): number {
  if (!v || v.trim() === '') return 0
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

// Handles "69,8%", "73,33", "x" (→0), empty (→0)
function parsePct(value: string): number {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'x') return 0
  const cleaned = value.replace('%', '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  if (isNaN(n)) return 0
  return n > 1 ? n / 100 : n
}

function parseClienteRow(row: string[]): ClienteSheet | null {
  // Cols: A=mesAno, B=cluster, C=cliente, D=tempo (HH:MM:SS), E=receita
  if (!row[0] || !row[2]) return null
  const semReceita = !row[4] || row[4].trim() === ''
  return {
    mesAno: normalizeMesAno(row[0]) || row[0],
    cluster: row[1] || '',
    cliente: row[2] || '',
    tempoTrabalhado: parseHHMMSS(row[3] || ''),
    entradaContratual: semReceita ? 0 : parseCurrencyBR(row[4]),
    semReceita,
  }
}

// Two rows for same client in same month:
// - Both have receita → sum hours + sum receita
// - One has receita, one doesn't → sum hours, use the receita row's value
function agruparClientesPorMes(rows: ClienteSheet[]): ClienteSheet[] {
  const mapa = new Map<string, ClienteSheet>()

  for (const c of rows) {
    const key = `${c.mesAno}|${c.cliente}`
    if (!mapa.has(key)) {
      mapa.set(key, { ...c })
    } else {
      const agg = mapa.get(key)!
      agg.tempoTrabalhado += c.tempoTrabalhado
      if (!c.semReceita) {
        // This row has revenue — add it
        agg.entradaContratual += c.entradaContratual
        agg.semReceita = false
      }
    }
  }

  return Array.from(mapa.values())
}

function parseColaboradorRow(row: string[]): ColaboradorSheet | null {
  // Cols: A=mesAno, B=colaborador, C=área, D=tempo (HH:MM:SS), E=totalJobs, F=% entregas
  if (!row[0] || !row[1]) return null
  const semDados = !row[3] || row[3].trim() === ''
  return {
    mesAno: normalizeMesAno(row[0]) || row[0],
    colaborador: row[1] || '',
    area: row[2] || '',
    tempoTrabalhado: semDados ? 0 : parseHHMMSS(row[3]),
    totalJobs: semDados ? 0 : parseNumBR(row[4] || ''),
    percentualEntregas: semDados ? 0 : parsePct(row[5] || ''),
    semDados,
  }
}

export function useGoogleSheets() {
  const { sheets } = useConfigStore()
  const { setData, setLoading, setError, setLastSync, useMockData } = useSheetsStore()
  const syncEquipeFromSheets = useCustosStore(s => s.syncEquipeFromSheets)

  const fetchSheets = useCallback(async () => {
    if (!sheets.spreadsheetId || !sheets.apiKey) {
      useMockData()
      return
    }

    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_TTL) {
          setData(data.clientes, data.colaboradores)
          setLastSync(new Date(timestamp))
          syncEquipeFromSheets(data.colaboradores)
          return
        }
      } catch {
        // cache inválido, busca de novo
      }
    }

    setLoading(true)
    setError(null)

    try {
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheets.spreadsheetId}/values`
      const key = `?key=${sheets.apiKey}`

      const [r1, r2] = await Promise.all([
        fetch(`${base}/Clientes!A:E${key}`),
        fetch(`${base}/Colaboradores!A:F${key}`),
      ])

      if (!r1.ok || !r2.ok) throw new Error('Erro ao buscar dados do Google Sheets')

      const [d1, d2] = await Promise.all([r1.json(), r2.json()])

      const clientesRaw: ClienteSheet[] = (d1.values || [])
        .slice(1)
        .map(parseClienteRow)
        .filter(Boolean) as ClienteSheet[]

      const clientes = agruparClientesPorMes(clientesRaw)

      const colaboradores: ColaboradorSheet[] = (d2.values || [])
        .slice(1)
        .map(parseColaboradorRow)
        .filter(Boolean) as ColaboradorSheet[]

      setData(clientes, colaboradores)
      syncEquipeFromSheets(colaboradores)
      const now = new Date()
      setLastSync(now)

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { clientes, colaboradores },
        timestamp: now.getTime(),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg)
      useMockData()
      syncEquipeFromSheets(mockColaboradores)
    } finally {
      setLoading(false)
    }
  }, [sheets.spreadsheetId, sheets.apiKey, setData, setLoading, setError, setLastSync, useMockData, syncEquipeFromSheets])

  useEffect(() => {
    fetchSheets()
    if (!sheets.autoRefresh) return
    const interval = setInterval(fetchSheets, CACHE_TTL)
    return () => clearInterval(interval)
  }, [fetchSheets, sheets.autoRefresh])

  return { refetch: fetchSheets }
}
