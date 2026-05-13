import * as XLSX from 'xlsx'
import type { RelatorioImportado, ResumoColaboradorCliente, TarefaRelatorio } from '@/types'

// ---------------------------------------------------------------------------
// MAPA DE CLIENTES
// ---------------------------------------------------------------------------
// Chave = nome exato como aparece no relatório APÓS decodificação HTML
// Valor = nome canônico usado no painel
//
// Como descobrir nomes novos:
//   1. Importe o relatório
//   2. Abra o console do navegador e execute:
//      const s = JSON.parse(localStorage.getItem('ag110-relatorios') || '{}')
//      const r = s?.state?.relatorios?.[0]
//      console.table(r?.resumos?.map(x => ({ raw: x.clienteRaw, canonico: x.clienteCanônico }))
//        .filter(x => x.canonico === '__NAO_MAPEADO__')
//        .filter((v,i,a) => a.findIndex(t => t.raw === v.raw) === i))
//   3. Adicione cada "raw" como chave neste mapa
// ---------------------------------------------------------------------------

export const MAPA_CLIENTES_RELATORIO: Record<string, string> = {
  // Servopa — sub-clientes agrupam no cliente pai
  'Servopa':            'Servopa',
  'Servopa Sign':       'Servopa',
  'Servopa Seminovos':  'Servopa',
  'Servopa Caminhões':  'Servopa',
  'Honda Servopa':      'Servopa',
  'Servopa Geral':      'Servopa',

  // Bom Jesus — unidades agrupam no cliente pai
  'Bom Jesus':                          'Bom Jesus',
  'Bom Jesus Aldeia':                   'Bom Jesus',
  'Bom Jesus Centro':                   'Bom Jesus',
  'Bom Jesus São José':                 'Bom Jesus',
  'Bom Jesus Nossa Senhora de Lourdes': 'Bom Jesus',
  'Bom Jesus Nossa Senhora do Rosário': 'Bom Jesus',
  'Bom Jesus Seminário':                'Bom Jesus',
  'Bom Jesus Aurora':                   'Bom Jesus',
  'Bom Jesus Coração de Jesus':         'Bom Jesus',

  // Honda
  'Honda Motocar': 'Honda Motocar',
  'Honda Blokton': 'Honda Motocar',

  // FPP
  'Faculdades Pequeno Príncipe': 'FPP',
  'FPP': 'FPP',

  // Overhead interno — não é cliente, vai para rateio
  'Processos':   '__OVERHEAD__',
  'Agência 110': '__OVERHEAD__',
  'Agencia 110': '__OVERHEAD__',

  // Demais clientes
  'Virage':              'Virage',
  'Realiza Arquitetura': 'Realiza',
  'Panorâmico':          'Panorâmico',
  'A.Gonçalves Imóveis': 'A.Gonçalves',
  'ANJUSS':              'ANJUSS',
  'J17 BANK':            'J17 BANK',
  'HOSPITAL PARANAGUA':  'Hospital Paranaguá',
  'Soluagro':            'Soluagro',
  'Ace Revestimentos':   'ACE',
}

export function mapearCliente(
  nomeRelatorio: string,
  mapeamentoCustom: Record<string, string> = {}
): string {
  const nome = nomeRelatorio?.trim()
  if (!nome) return '__NAO_MAPEADO__'
  return mapeamentoCustom[nome]
    ?? MAPA_CLIENTES_RELATORIO[nome]
    ?? '__NAO_MAPEADO__'
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function decodeHTMLEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // IMPORTANTE: &#160; decodifica para   (espaço não-quebrável),
    // que NÃO casa com ' ' (espaço ASCII) nos separadores. Normaliza aqui.
    .replace(/ /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const AREAS_CONHECIDAS = [
  'Tráfego', 'Gestão', 'Atendimento', 'Criação', 'Redação', 'Revisão',
  'Mídia', 'Inbound', 'Financeiro', 'RH', 'Monitoramento', 'Comercial',
]

function parseColaborador(raw: string): { nome: string; area: string } {
  const regex = new RegExp(`^(.*?)(${AREAS_CONHECIDAS.join('|')})\\s*$`, 'i')
  const match = raw.match(regex)
  if (match) {
    return { nome: match[1].trim(), area: match[2].trim() }
  }
  return { nome: raw.trim(), area: '' }
}

// Tenta extrair o nome do cliente usando múltiplas estratégias.
// Prioridade: col1 → col2 → último segmento de col0 após separadores → col0 inteiro
function extrairCliente(col0: string, col1: string, col2: string): string {
  // Estratégia 1: col1 como coluna "Projeto" (Toggl, Clockify, etc.)
  if (col1 && col1 !== col0) return col1.trim()

  // Estratégia 2: col2 como coluna "Cliente"
  if (col2 && col2 !== col0) return col2.trim()

  // Estratégia 3: último segmento após separadores comuns na descrição
  const SEPARADORES = [' - ', ' – ', ' — ', ' | ', ': ', ' / ']
  for (const sep of SEPARADORES) {
    const partes = col0.split(sep).map(s => s.trim()).filter(Boolean)
    if (partes.length > 1) {
      return partes[partes.length - 1]
    }
  }

  // Estratégia 4: separadores sem espaços (ex: "TaskDescription-Client")
  const SEPARADORES_SEM_ESPACO = ['-', '/', '|']
  for (const sep of SEPARADORES_SEM_ESPACO) {
    const partes = col0.split(sep).map(s => s.trim()).filter(Boolean)
    if (partes.length > 1) {
      return partes[partes.length - 1]
    }
  }

  // Fallback: usa col0 inteiro como nome do cliente
  return col0.trim() || 'Cliente não identificado'
}

function parseHHMMSS(s: string): number {
  if (!s?.trim()) return 0
  const p = s.trim().split(':')
  return parseInt(p[0] || '0') + parseInt(p[1] || '0') / 60 + parseInt(p[2] || '0') / 3600
}

function parseBRL(s: string): number {
  if (!s?.trim()) return 0
  const n = parseFloat(
    s.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  )
  return isNaN(n) ? 0 : n
}

function parseDateBR(s: string): Date | null {
  if (!s?.trim()) return null
  const match = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return null
  return new Date(
    parseInt(match[3]),
    parseInt(match[2]) - 1,
    parseInt(match[1]),
    parseInt(match[4]),
    parseInt(match[5]),
    parseInt(match[6])
  )
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export async function parseRelatorioXLS(
  file: File,
  mapeamentoCustom: Record<string, string> = {}
): Promise<RelatorioImportado> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: false,
  })

  // ---- DEBUG: estrutura bruta do arquivo ----
  console.group('[parseRelatorio] Diagnóstico de estrutura')
  console.log('Total de linhas:', rows.length)
  console.log('Linha 0 (header?):', rows[0])
  console.log('Linha 1:', rows[1])
  console.log('Linha 2:', rows[2])
  console.log('Linha 3:', rows[3])
  console.groupEnd()
  // -------------------------------------------

  const mapaResumos = new Map<string, ResumoColaboradorCliente>()
  const clientesNaoMapeados = new Set<string>()
  const tarefas: TarefaRelatorio[] = []
  let colaboradorAtual = ''
  let areaAtual = ''
  let totalTarefas = 0
  const colaboradoresVistos = new Set<string>()
  let debugTarefaCount = 0

  for (const row of rows) {
    const col0 = decodeHTMLEntities((row[0] as string | null)?.trim() ?? '')
    const col1 = decodeHTMLEntities((row[1] as string | null)?.trim() ?? '')
    const col2 = decodeHTMLEntities((row[2] as string | null)?.trim() ?? '')
    const col3 = (row[3] as string | null)?.trim() ?? ''
    const col4 = (row[4] as string | null)?.trim() ?? ''
    const col5 = (row[5] as string | null)?.trim() ?? ''
    const col6 = (row[6] as string | null)?.trim() ?? ''

    // Tipo A: cabeçalho global
    if (col0 === 'Projeto/Atividade') continue
    // Tipo D: separador / linha vazia
    if (!col0 && col3 === 'Início') continue
    if (!col0 && !col3) continue

    // Tipo B: linha de profissional (subtotal por colaborador)
    // Identifica por: col0 preenchido, sem datas (col3/col4), com duração e custo
    const isProfissional =
      col0 !== '' && col3 === '' && col4 === '' &&
      col5.includes(':') && col5 !== 'Duração' &&
      (col6.includes('R$') || col6.includes(',') || /^\d/.test(col6))
    if (isProfissional) {
      const { nome, area } = parseColaborador(col0)
      colaboradorAtual = nome
      areaAtual = area
      colaboradoresVistos.add(nome)
      continue
    }

    // Tipo C: linha de tarefa
    if (col0 !== '' && col3 !== '' && col4 !== '' && colaboradorAtual !== '') {
      const clienteRaw = extrairCliente(col0, col1, col2)

      // ---- DEBUG: primeiras 10 tarefas ----
      if (debugTarefaCount < 10) {
        console.group(`[parseRelatorio] Tarefa #${debugTarefaCount + 1}`)
        console.log('col0 (desc):', JSON.stringify(col0))
        console.log('col1:', JSON.stringify(col1))
        console.log('col2:', JSON.stringify(col2))
        console.log('col3 (início):', col3)
        console.log('col5 (dur):', col5)
        console.log('col6 (custo):', col6)
        console.log('split " - ":', col0.split(' - '))
        console.log('→ clienteRaw extraído:', JSON.stringify(clienteRaw))
        console.groupEnd()
        debugTarefaCount++
      }
      // --------------------------------------

      const clienteCanônico = mapearCliente(clienteRaw, mapeamentoCustom)

      if (clienteCanônico === '__NAO_MAPEADO__') clientesNaoMapeados.add(clienteRaw)

      const dataInicio = parseDateBR(col3)
      const mesAno = dataInicio
        ? `${dataInicio.getFullYear()}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}`
        : ''

      if (!mesAno) continue

      const horas = parseHHMMSS(col5)
      const custo = parseBRL(col6)
      const isOverhead = clienteCanônico === '__OVERHEAD__'

      totalTarefas++

      tarefas.push({
        colaborador: colaboradorAtual,
        area: areaAtual,
        clienteRaw,
        clienteCanônico,
        isOverhead,
        mesAno,
        duracaoHoras: horas,
        custo,
        descricao: col0,
      })

      const chave = `${mesAno}__${colaboradorAtual}__${clienteCanônico}`
      if (!mapaResumos.has(chave)) {
        mapaResumos.set(chave, {
          mesAno,
          colaborador: colaboradorAtual,
          clienteRaw,
          clienteCanônico,
          isOverhead,
          horasTotais: 0,
          custoTotal: 0,
          nTarefas: 0,
        })
      }
      const r = mapaResumos.get(chave)!
      r.horasTotais += horas
      r.custoTotal += custo
      r.nTarefas += 1
    }
  }

  // ---- DEBUG: resumo dos clientes encontrados ----
  const clientesResumo: Record<string, { horas: number; custo: number }> = {}
  for (const r of mapaResumos.values()) {
    const k = r.clienteCanônico === '__NAO_MAPEADO__' ? `[NÃO MAPEADO] ${r.clienteRaw}` : r.clienteCanônico
    if (!clientesResumo[k]) clientesResumo[k] = { horas: 0, custo: 0 }
    clientesResumo[k].horas += r.horasTotais
    clientesResumo[k].custo += r.custoTotal
  }
  console.group('[parseRelatorio] Clientes encontrados')
  console.table(
    Object.entries(clientesResumo).map(([cliente, d]) => ({
      Cliente: cliente,
      Horas: Math.round(d.horas * 100) / 100,
      Custo: Math.round(d.custo * 100) / 100,
    }))
  )
  console.log('Não mapeados:', [...clientesNaoMapeados])
  console.groupEnd()
  // -------------------------------------------------

  const mesesCobertos = [...new Set([...mapaResumos.values()].map(r => r.mesAno))].sort()

  return {
    id: crypto.randomUUID(),
    nomeArquivo: file.name,
    periodoInicio: mesesCobertos[0] ?? '',
    periodoFim: mesesCobertos[mesesCobertos.length - 1] ?? '',
    dataImport: new Date().toISOString(),
    mesesCobertos,
    totalTarefas,
    totalColaboradores: colaboradoresVistos.size,
    clientesNaoMapeados: [...clientesNaoMapeados],
    resumos: [...mapaResumos.values()],
    tarefas,
  }
}
