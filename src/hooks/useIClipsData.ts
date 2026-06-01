import { useEffect, useCallback } from 'react'
import { useConfigStore } from '@/store/useConfigStore'
import { useIClipsStore } from '@/store/useIClipsStore'
import { useRelatorioStore } from '@/store/useRelatorioStore'
import { resolverCliente } from '@/lib/parseRelatorio'
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

// Extrai "YYYY-MM" de uma string de data. Retorna '' se a data for inválida
// (ano < 2000 — ex: "1800-01-01" que o iClips usa como sentinel de "sem data").
function parseDateToMesAno(dataStr: string): string {
  if (!dataStr) return ''
  // ISO: "2026-04-15" ou "2026-04-15T10:00:00"
  const m1 = dataStr.match(/^(\d{4})-(\d{2})-\d{2}/)
  if (m1 && parseInt(m1[1]) >= 2000) return `${m1[1]}-${m1[2]}`
  // BR: "15/04/2026" ou "15/04/2026 10:00:00"
  const m2 = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2 && parseInt(m2[3]) >= 2000) return `${m2[3]}-${m2[2]}`
  return ''
}

// Extrai "YYYY-MM" priorizando playEndDate (data real de conclusão).
// playStartDate do iClips frequentemente contém "1800-01-01" (sentinel inválido).
// Fallback final: periodoImportado (campo do relatório mensal).
function extrairMesAno(endDate: string, startDate: string, periodoStr: string): string {
  return (
    parseDateToMesAno(endDate) ||
    parseDateToMesAno(startDate) ||
    (() => {
      const m = periodoStr.match(/^(\d{4})-(\d{2})-\d{2}/)
      return m && parseInt(m[1]) >= 2000 ? `${m[1]}-${m[2]}` : ''
    })()
  )
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
      // Etapa 1: descobre o nome da aba pelo gid (mais estável que assumir a ordem)
      const ICLIPS_GID = 775283929
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${iClipsSpreadsheetId}?key=${apiKey}&fields=sheets.properties`
      const metaRes = await fetch(metaUrl)
      if (!metaRes.ok) {
        const metaData = await metaRes.json().catch(() => ({}))
        throw new Error(metaData.error?.message || `Erro ao ler metadados HTTP ${metaRes.status}`)
      }
      const metaJson = await metaRes.json()
      const sheets_list: { properties: { title: string; sheetId: number } }[] = metaJson.sheets ?? []
      const abaAlvo = sheets_list.find(s => s.properties.sheetId === ICLIPS_GID)
      const nomeAba = abaAlvo?.properties.title ?? sheets_list[0]?.properties.title ?? 'Sheet1'

      // Etapa 2: busca os valores da aba correta
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${iClipsSpreadsheetId}/values/${encodeURIComponent(nomeAba)}?key=${apiKey}`
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
      // Datas separadas: playEndDate é a data real de conclusão (preferida).
      // playStartDate frequentemente vale "1800-01-01" no iClips (sentinel de "sem data").
      const iPlayEndDate   = findCol(header, ['playEndDate', 'play_end_date', 'playenddate'])
      const iPlayStartDate = findCol(header, ['playStartDate', 'play_start_date', 'playstartdate', 'dataInicio', 'data_inicio', 'data', 'date'])
      const iPeriodo       = findCol(header, ['periodoImportado', 'periodo_importado', 'periodo', 'period', 'periodoimportado'])

      if (iClientName < 0 || iExecutor < 0 || iSlaTime < 0) {
        throw new Error(
          `Colunas obrigatórias não encontradas. Esperadas: clientName, executionResponsible, slaTime. ` +
          `Encontradas: ${header.slice(0, 10).join(', ')}`
        )
      }

      const get = (row: unknown[], i: number): string =>
        i >= 0 && i < row.length ? String(row[i] ?? '').trim() : ''

      // Lê mapeamentos no momento do fetch (getState garante os mais recentes)
      const { mapeamentosClientes } = useRelatorioStore.getState()

      const mapaResumos = new Map<string, ResumoColaboradorCliente>()
      const clientesNaoMapeados = new Set<string>()
      const colaboradoresVistos = new Set<string>()
      let totalTarefas = 0

      for (const row of rawRows.slice(1)) {
        const clienteRaw   = get(row, iClientName)
        const executorRaw  = get(row, iExecutor)
        const slaRaw       = get(row, iSlaTime)
        const endDateRaw   = get(row, iPlayEndDate)
        const startDateRaw = get(row, iPlayStartDate)
        const periodoRaw   = get(row, iPeriodo)

        if (!clienteRaw || !executorRaw || !slaRaw) continue

        const horas = parseDuracao(slaRaw)
        if (horas <= 0) continue

        // playEndDate tem prioridade — playStartDate é frequentemente "1800-01-01" no iClips
        const mesAno = extrairMesAno(endDateRaw, startDateRaw, periodoRaw)
        if (!mesAno) continue

        const colaborador = limparNomeColaborador(executorRaw)
        colaboradoresVistos.add(colaborador)

        const clienteCanônico = resolverCliente(clienteRaw, mapeamentosClientes)

        // Tarefa marcada para ignorar — não conta nos cálculos
        if (clienteCanônico === '__IGNORAR__') continue

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
