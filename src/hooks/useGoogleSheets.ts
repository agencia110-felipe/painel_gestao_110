import { useEffect, useCallback } from 'react'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useCustosStore } from '@/store/useCustosStore'
import type { ClienteSheet, ColaboradorSheet } from '@/types'
import { mockClientes, mockColaboradores } from '@/lib/mockData'
import { parseCurrencyBR, parsePercentBR } from '@/lib/formatters'

const CACHE_KEY = 'agencia110-sheets-cache'
const CACHE_TTL = 30 * 60 * 1000

function parseNumBR(v: string): number {
  if (!v || v.trim() === '') return 0
  // Remove thousand separators (dots) then convert decimal comma to dot
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

function parseRow(row: string[]): ClienteSheet | null {
  if (!row[0]) return null
  return {
    mesAno: row[0] || '',
    cluster: row[1] || '',
    cliente: row[2] || '',
    tempoTrabalhado: parseNumBR(row[3]),
    custoEfetivoOp: parseCurrencyBR(row[4]),
    entradaContratual: parseCurrencyBR(row[5]),
    custoOperacionalPct: parsePercentBR(row[6]),
  }
}

function parseColRow(row: string[]): ColaboradorSheet | null {
  if (!row[0]) return null
  return {
    mesAno: row[0] || '',
    colaborador: row[1] || '',
    area: row[2] || '',
    tempoTrabalhado: parseNumBR(row[3]),
    tempoArredondado: parseNumBR(row[4]),
    custoEfetivoOp: parseCurrencyBR(row[5]),
    totalJobs: parseNumBR(row[6]),
    percentualEntregas: parsePercentBR(row[7]),
    cargaHoraria80pct: parseNumBR(row[8]),
    cargaHorariaMes: parseNumBR(row[9]),
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
        fetch(`${base}/Clientes!A:G${key}`),
        fetch(`${base}/Colaboradores!A:J${key}`),
      ])

      if (!r1.ok || !r2.ok) throw new Error('Erro ao buscar dados do Google Sheets')

      const [d1, d2] = await Promise.all([r1.json(), r2.json()])

      const clientes: ClienteSheet[] = (d1.values || [])
        .slice(1)
        .map(parseRow)
        .filter(Boolean) as ClienteSheet[]

      const colaboradores: ColaboradorSheet[] = (d2.values || [])
        .slice(1)
        .map(parseColRow)
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
