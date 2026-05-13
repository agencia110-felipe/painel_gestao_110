import * as XLSX from 'xlsx'
import type { RelatorioImportado, ResumoColaboradorCliente, TarefaRelatorio } from '@/types'

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

  // Overhead interno — não é cliente, vai para rateio
  'Processos':   '__OVERHEAD__',
  'Agência 110': '__OVERHEAD__',

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
  return mapeamentoCustom[nomeRelatorio]
    ?? MAPA_CLIENTES_RELATORIO[nomeRelatorio]
    ?? '__NAO_MAPEADO__'
}

function decodeHTMLEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
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

  const mapaResumos = new Map<string, ResumoColaboradorCliente>()
  const clientesNaoMapeados = new Set<string>()
  const tarefas: TarefaRelatorio[] = []
  let colaboradorAtual = ''
  let areaAtual = ''
  let totalTarefas = 0
  const colaboradoresVistos = new Set<string>()

  for (const row of rows) {
    const col0 = decodeHTMLEntities((row[0] as string | null)?.trim() ?? '')
    const col3 = (row[3] as string | null)?.trim() ?? ''
    const col4 = (row[4] as string | null)?.trim() ?? ''
    const col5 = (row[5] as string | null)?.trim() ?? ''
    const col6 = (row[6] as string | null)?.trim() ?? ''

    // Tipo A: cabeçalho global
    if (col0 === 'Projeto/Atividade') continue
    // Tipo D: separador
    if (!col0 && col3 === 'Início') continue
    if (!col0 && !col3) continue

    // Tipo B: linha de profissional (subtotal)
    const isProfissional =
      col0 && !col3 && !col4 &&
      col5.includes(':') && col6.includes('R$') &&
      col5 !== 'Duração'
    if (isProfissional) {
      const { nome, area } = parseColaborador(col0)
      colaboradorAtual = nome
      areaAtual = area
      colaboradoresVistos.add(nome)
      continue
    }

    // Tipo C: linha de tarefa
    if (col0 && col3 && col4 && colaboradorAtual) {
      const partes = col0.split(' - ')
      const clienteRaw = partes.length > 1 ? partes[partes.length - 1].trim() : col0
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
