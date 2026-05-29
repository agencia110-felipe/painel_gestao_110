import { useEffect, useCallback } from 'react'
import { useConfigStore } from '@/store/useConfigStore'
import { useIClipsStore } from '@/store/useIClipsStore'
import { useRelatorioStore } from '@/store/useRelatorioStore'
import { mapearCliente } from '@/lib/parseRelatorio'
import type { ResumoColaboradorCliente } from '@/types'

// Remove sufixo de área do nome do colaborador (ex: "Matheus Valle Tráfego" → "Matheus Valle")
const AREAS_REGEX = /\s+(Tráfego|Gestão|Atendimento|Criação|Redação|Revisão|Mídia|Inbound|Financeiro|Monitoramento|Comercial|RH)\s*$/i

function limparNomeColaborador(nome: string): string {
  return nome.trim().replace(AREAS_REGEX, '').trim()
}

// Encontra o índice de uma coluna pelo header normalizado, testando vários candidatos
function findCol(header: string[], candidates: string[]): number {
  const norm = header.map(h => h.toLowerCase().replace(/[\s_.-]/g, ''))
  for (const c of candidates) {
    const i = norm.indexOf(c.toLowerCase().replace(/[\s_.-]/g, ''))
    if (i >= 0) return i
  }
  return -1
}

// Suporta HH:MM:SS, H:MM:SS e decimal com vírgula ou ponto
function parseDuracao(s: string): number {
  if (!s?.trim()) return 0
  const partes = s.trim().split(':')
  if (partes.length >= 2) {
    return (
      parseInt(partes[0] || '0', 10) +
      parseInt(partes[1] || '0', 10) / 60 +
      parseInt(partes[2] || '0', 10) / 3600
    )
  }
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

// Extrai "YYYY-MM" da data da tarefa ou do campo periodoImportado
function extrairMesAno(dataStr: string, periodoStr: string): string {
  // ISO: "2026-04-15" ou "2026-04-15T10:00:00"
  const m1 = dataStr.match(/^(\d{4})-(\d{2})-\d{2}/)
  if (m1) return `${m1[1]}-${m1[2]}`
  // BR: "15/04/2026" ou "15/04/2026 10:00:00"
  const m2 = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2) return `${m2[3]}-${m2[2]}`
  // periodoImportado: "2026-04-01_2026-04-30"
  const m3 = periodoStr.match(/^(\d{4})-(\d{2})-\d{2}/)
  if (m3) return `${m3[1]}-${m3[2]}`
  return ''
}

export function useIClipsData() {
  const { sheets } = useConfigStore()
  const { setRelatorio, setLoading, setError, setLastSync } = useIClipsStore()
  const { addRelatorio } = useRelatorioStore()

  const fetchIClips = useCallback(async () => {
    const { iClipsSpreadsheetId, apiKey } = sheets
    if (!iClipsSpreadsheetId || !apiKey) {
      setRelatorio(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${iClipsSpreadsheetId}/values/A:Z?key=${apiKey}`
      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error?.message || `Erro HTTP ${res.status}`)
      }

      const json = await res.json()
      const rawRows: unknown[][] = json.values || []

      if (rawRows.length < 2) {
        setRelatorio(null)
        return
      }

      const header = rawRows[0].map(c => String(c ?? '').trim())

      // Detectar colunas pelas possíveis variações de nome
      const iClientName  = findCol(header, ['clientName', 'client_name', 'cliente', 'client', 'clientename'])
      const iExecutor    = findCol(header, ['executionResponsible', 'execution_responsible', 'colaborador', 'executor', 'responsible', 'executionresponsible'])
      const iDepto       = findCol(header, ['nomeDepartamento', 'nome_departamento', 'departamento', 'area', 'department'])
      const iSlaTime     = findCol(header, ['slaTime', 'sla_time', 'duracao', 'tempo', 'duration', 'time', 'slatimeinhours', 'sla'])
      const iDataInicio  = findCol(header, ['playStartDate', 'play_start_date', 'playEndDate', 'play_end_date', 'dataInicio', 'data_inicio', 'data', 'date', 'playstartdate'])
      const iPeriodo     = findCol(header, ['periodoImportado', 'periodo_importado', 'periodo', 'period', 'periodoimportado'])

      if (iClientName < 0 || iExecutor < 0 || iSlaTime < 0) {
        throw new Error(
          `Colunas obrigatórias não encontradas. Esperadas: clientName, executionResponsible, slaTime. ` +
          `Encontradas: ${header.slice(0, 10).join(', ')}`
        )
      }

      const get = (row: unknown[], i: number): string =>
        i >= 0 && i < row.length ? String(row[i] ?? '').trim() : ''

      const mapaResumos = new Map<string, ResumoColaboradorCliente>()
      const clientesNaoMapeados = new Set<string>()
      const colaboradoresVistos = new Set<string>()
      let totalTarefas = 0

      for (const row of rawRows.slice(1)) {
        const clienteRaw  = get(row, iClientName)
        const executorRaw = get(row, iExecutor)
        const slaRaw      = get(row, iSlaTime)
        const dataRaw     = get(row, iDataInicio)
        const periodoRaw  = get(row, iPeriodo)

        if (!clienteRaw || !executorRaw || !slaRaw) continue

        const horas = parseDuracao(slaRaw)
        if (horas <= 0) continue

        const mesAno = extrairMesAno(dataRaw, periodoRaw)
        if (!mesAno) continue

        const colaborador = limparNomeColaborador(executorRaw)
        colaboradoresVistos.add(colaborador)

        const clienteCanônico = mapearCliente(clienteRaw)
        if (clienteCanônico === '__NAO_MAPEADO__') clientesNaoMapeados.add(clienteRaw)
        const isOverhead = clienteCanônico === '__OVERHEAD__'

        totalTarefas++

        const chave = `${mesAno}__${colaborador}__${clienteCanônico}`
        if (!mapaResumos.has(chave)) {
          mapaResumos.set(chave, {
            mesAno,
            colaborador,
            clienteRaw,
            clienteCanônico,
            isOverhead,
            horasTotais: 0,
            custoTotal: 0, // recalculado via custoHoraMapa em calcCustoClienteRelatorio
            nTarefas: 0,
          })
        }
        const r = mapaResumos.get(chave)!
        r.horasTotais += horas
        r.nTarefas++
      }

      const resumos = [...mapaResumos.values()]
      const mesesCobertos = [...new Set(resumos.map(r => r.mesAno))].sort()

      const relatorio = {
        id: 'iclips-live',
        nomeArquivo: 'iClips (Google Sheets)',
        periodoInicio: mesesCobertos[0] ?? '',
        periodoFim: mesesCobertos[mesesCobertos.length - 1] ?? '',
        dataImport: new Date().toISOString(),
        mesesCobertos,
        totalTarefas,
        totalColaboradores: colaboradoresVistos.size,
        clientesNaoMapeados: [...clientesNaoMapeados],
        resumos,
      }
      // Salvar no store persistido (fonte universal lida por todos os componentes)
      addRelatorio(relatorio)
      // Salvar também no store em memória (status de sync no Header e Configurações)
      setRelatorio(relatorio)
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados do iClips')
      setRelatorio(null)
    } finally {
      setLoading(false)
    }
  }, [sheets.iClipsSpreadsheetId, sheets.apiKey, setRelatorio, setLoading, setError, setLastSync, addRelatorio])

  useEffect(() => {
    fetchIClips()
  }, [fetchIClips])

  return { refetch: fetchIClips }
}
