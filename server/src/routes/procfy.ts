import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

// Todos os campos relevantes que o Procfy pode retornar por transação.
// Mantemos os opcionais como unknown para não quebrar se a API mudar.
interface ProcfyTransaction {
  id: string
  name: string
  description: string
  amount_cents: number
  transaction_type: string        // ex: 'fixed_expense', 'variable_expense', 'revenue', …
  competency_date: string | null  // data de COMPETÊNCIA — campo correto para mesAno
  date: string | null             // data de registro/emissão (fallback)
  due_date: string | null         // vencimento da parcela — NÃO usar para mesAno
  paid: boolean
  paid_at: string | null
  [key: string]: unknown          // campos extras que o Procfy possa adicionar
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Converte "YYYY-MM-DD" → "Mmm/YYYY" (ex: "2026-05-08" → "Mai/2026")
function isoToPtBrMes(dateStr: string | null | undefined): string {
  if (!dateStr) {
    // Fallback: mês atual
    const now = new Date()
    return `${MESES_PT[now.getMonth()]}/${now.getFullYear()}`
  }
  // Normaliza: aceita tanto "YYYY-MM-DD" quanto "YYYY-MM-DDTHH:mm:ss"
  const bare = dateStr.slice(0, 10)
  const parts = bare.split('-')
  if (parts.length !== 3) return isoToPtBrMes(null)
  const [year, month] = parts
  const idx = parseInt(month, 10) - 1
  return `${MESES_PT[idx] ?? 'Jan'}/${year}`
}

// Escolhe a melhor data de referência para o mês/ano da despesa.
// Prioridade: competency_date > date > paid_at > fallback mês atual
function resolveDataCompetencia(t: ProcfyTransaction): string {
  return (
    t.competency_date?.slice(0, 10) ||
    t.date?.slice(0, 10) ||
    (t.paid_at ? t.paid_at.slice(0, 10) : null) ||
    ''
  )
}

// Categorias que devem ser tratadas como CUSTO FIXO mesmo que o Procfy
// as classifique como variable_expense. Nomes em minúsculo para comparação case-insensitive.
const CATEGORIAS_FIXAS = new Set([
  'água e esgoto',
  'aluguel',
  'contabilidade',
  'energia elétrica',
  'ferramentas',
  'outros',
  'plano de saúde',
  'segurança',
  'telefone fixo',
])

// Tipos de transação que indicam despesa fixa por natureza (sem depender de categoria)
const TIPOS_FIXO = new Set([
  'fixed_expense',
  'despesa_fixa',
  'custo_fixo',
  'fixed',
])

// Tipos de transação que indicam despesa variável ou fixa por categoria
const TIPOS_DESPESA = new Set([
  'variable_expense',
  'fixed_expense',
  'despesa_fixa',
  'custo_fixo',
  'despesa_variavel',
  'variable',
  'fixed',
])

// Extrai o nome da categoria de uma transação de forma segura.
// O Procfy pode retornar category como string, objeto {name, id, …} ou nulo.
function getCategoryName(t: ProcfyTransaction): string {
  const raw = t.category
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    return String(obj.name ?? obj.title ?? obj.id ?? '').trim()
  }
  return String(raw).trim()
}

// Retorna true se a transação deve ser tratada como custo fixo.
// Critério: tipo explicitamente fixo OU categoria da transação está na lista CATEGORIAS_FIXAS.
function ehFixo(t: ProcfyTransaction): boolean {
  if (TIPOS_FIXO.has(t.transaction_type)) return true
  return CATEGORIAS_FIXAS.has(getCategoryName(t).toLowerCase())
}

async function fetchPage(
  apiKey: string,
  baseUrl: string,
  page: number
): Promise<{ data: ProcfyTransaction[]; totalPages: number }> {
  const url = `${baseUrl}/api/v1/transactions?page=${page}&items=50`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Procfy HTTP ${res.status}${body ? ': ' + body.slice(0, 200) : ''}`)
  }
  const json = await res.json() as { data: ProcfyTransaction[]; page: { total_pages: number } }
  return {
    data: json.data ?? [],
    totalPages: json.page?.total_pages ?? 1,
  }
}

const router = Router()
router.use(requireAuth)

// ─── GET /status ──────────────────────────────────────────────────────────────
// Verifica se a API Key está configurada e se a API responde.

router.get('/status', async (_req, res) => {
  const apiKey = process.env.PROCFY_API_KEY
  const baseUrl = process.env.PROCFY_BASE_URL || 'https://api.procfy.io'

  if (!apiKey) {
    res.json({ configured: false })
    return
  }

  try {
    const r = await fetch(`${baseUrl}/api/v1/transactions?items=1&page=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    res.json({ configured: true, ok: r.ok, httpStatus: r.status })
  } catch {
    res.json({ configured: true, ok: false, error: 'Falha de rede ao conectar com Procfy' })
  }
})

// ─── GET /raw ─────────────────────────────────────────────────────────────────
// Diagnóstico: retorna as primeiras 20 transações sem nenhum filtro,
// mais um resumo dos valores únicos de transaction_type encontrados.
// Útil para identificar como o Procfy classifica despesas fixas na conta.

router.get('/raw', async (_req, res) => {
  const apiKey = process.env.PROCFY_API_KEY
  const baseUrl = process.env.PROCFY_BASE_URL || 'https://api.procfy.io'

  if (!apiKey) {
    res.status(503).json({ error: 'PROCFY_API_KEY não configurada.' })
    return
  }

  try {
    const { data } = await fetchPage(apiKey, baseUrl, 1)

    // Resumo: valores únicos dos campos mais relevantes para diagnóstico
    const tiposEncontrados = [...new Set(data.map(t => t.transaction_type))]
    const camposDePrimeira = data[0] ? Object.keys(data[0]) : []

    res.json({
      totalNaPagina: data.length,
      transaction_types_encontrados: tiposEncontrados,
      campos_disponiveis: camposDePrimeira,
      primeiras_20: data.slice(0, 20).map(t => ({
        id: t.id,
        name: t.name,
        transaction_type: t.transaction_type,
        amount_cents: t.amount_cents,
        competency_date: t.competency_date,
        date: t.date,
        due_date: t.due_date,
        paid_at: t.paid_at,
      })),
    })
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro ao buscar dados brutos do Procfy',
    })
  }
})

// ─── GET /diagnostico ────────────────────────────────────────────────────────
// Percorre TODAS as páginas do Procfy e retorna:
//   - valores únicos de transaction_type e category encontrados
//   - contagem de transações por tipo e por categoria
//   - 3 exemplos de transação para cada combinação tipo+categoria
// Não salva nada. Serve para descobrir como as despesas fixas estão classificadas.

router.get('/diagnostico', async (_req, res) => {
  const apiKey = process.env.PROCFY_API_KEY
  const baseUrl = process.env.PROCFY_BASE_URL || 'https://api.procfy.io'

  if (!apiKey) {
    res.status(503).json({ error: 'PROCFY_API_KEY não configurada.' })
    return
  }

  try {
    // Busca todas as páginas
    const all: ProcfyTransaction[] = []
    const { data: first, totalPages } = await fetchPage(apiKey, baseUrl, 1)
    all.push(...first)
    for (let p = 2; p <= totalPages; p++) {
      const { data } = await fetchPage(apiKey, baseUrl, p)
      all.push(...data)
    }

    // Contagem por transaction_type
    const porTipo: Record<string, number> = {}
    for (const t of all) {
      const tipo = t.transaction_type ?? '(nulo)'
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1
    }

    // Contagem por category — o Procfy pode retornar category como objeto ou string
    const porCategoria: Record<string, number> = {}
    for (const t of all) {
      const raw = t.category
      let nome: string
      if (!raw) {
        nome = '(sem categoria)'
      } else if (typeof raw === 'string') {
        nome = raw
      } else if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>
        nome = String(obj.name ?? obj.title ?? obj.id ?? JSON.stringify(raw))
      } else {
        nome = String(raw)
      }
      porCategoria[nome] = (porCategoria[nome] ?? 0) + 1
    }

    // Contagem por combinação tipo+categoria e exemplos de transações
    const porTipoCategoria: Record<string, {
      count: number
      exemplos: Array<{ id: string; name: string; amount_cents: number; competency_date: unknown; date: unknown; due_date: unknown }>
    }> = {}

    for (const t of all) {
      const tipo = t.transaction_type ?? '(nulo)'
      const raw = t.category
      let cat: string
      if (!raw) {
        cat = '(sem categoria)'
      } else if (typeof raw === 'string') {
        cat = raw
      } else if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>
        cat = String(obj.name ?? obj.title ?? obj.id ?? '?')
      } else {
        cat = String(raw)
      }

      const chave = `${tipo} | ${cat}`
      if (!porTipoCategoria[chave]) {
        porTipoCategoria[chave] = { count: 0, exemplos: [] }
      }
      porTipoCategoria[chave].count++
      if (porTipoCategoria[chave].exemplos.length < 3) {
        porTipoCategoria[chave].exemplos.push({
          id: t.id,
          name: t.name || t.description || '?',
          amount_cents: t.amount_cents,
          competency_date: t.competency_date,
          date: t.date,
          due_date: t.due_date,
        })
      }
    }

    // Campos presentes na primeira transação (para saber o schema real)
    const camposDisponiveis = all[0] ? Object.keys(all[0]).sort() : []

    res.json({
      totalTransacoes: all.length,
      totalPaginas: totalPages,
      camposDisponiveis,
      porTransactionType: porTipo,
      porCategoria,
      porTipoECategoria: porTipoCategoria,
    })
  } catch (err) {
    console.error('[Procfy] Erro no diagnóstico:', err)
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro ao buscar dados do Procfy',
    })
  }
})

// ─── POST /sync ───────────────────────────────────────────────────────────────
// Busca todas as transações do Procfy, filtra despesas fixas e variáveis,
// normaliza para os tipos internos e retorna pronto para o store.

router.post('/sync', async (_req, res) => {
  const apiKey = process.env.PROCFY_API_KEY
  const baseUrl = process.env.PROCFY_BASE_URL || 'https://api.procfy.io'

  if (!apiKey) {
    res.status(503).json({
      error: 'PROCFY_API_KEY não configurada. Adicione a chave em server/.env e reinicie o servidor.',
    })
    return
  }

  try {
    // Busca todas as páginas
    const all: ProcfyTransaction[] = []
    const { data: first, totalPages } = await fetchPage(apiKey, baseUrl, 1)
    all.push(...first)
    for (let p = 2; p <= totalPages; p++) {
      const { data } = await fetchPage(apiKey, baseUrl, p)
      all.push(...data)
    }

    // Log: tipos únicos presentes nos dados reais
    const tiposUnicos = [...new Set(all.map(t => t.transaction_type))]
    console.log(`[Procfy] ${all.length} transações. Tipos: ${tiposUnicos.join(', ')}`)

    // Considera apenas transações que são algum tipo de despesa
    const despesas = all.filter(t => TIPOS_DESPESA.has(t.transaction_type))

    // Separa pelo critério composto: fixo por tipo OU por categoria
    const fixedRaw   = despesas.filter(t => ehFixo(t))
    const variableRaw = despesas.filter(t => !ehFixo(t))

    console.log(`[Procfy] Fixas: ${fixedRaw.length} | Variáveis: ${variableRaw.length}`)

    // Deduplica fixas por nome — entre vários meses mantém o maior valor
    const fixedByName = new Map<string, ProcfyTransaction>()
    for (const t of fixedRaw) {
      const key = (t.name || t.description || '').toLowerCase().trim()
      const existing = fixedByName.get(key)
      if (!existing || Math.abs(t.amount_cents) >= Math.abs(existing.amount_cents)) {
        fixedByName.set(key, t)
      }
    }

    const fixos = Array.from(fixedByName.values()).map(t => ({
      id: `procfy-${t.id}`,
      descricao: t.name || t.description || 'Sem descrição',
      valor: Math.abs(t.amount_cents) / 100,
      tipo: 'Backend' as const,
      observacao: `Procfy · ${getCategoryName(t) || resolveDataCompetencia(t) || '—'}`,
    }))

    const variaveis = variableRaw.map(t => ({
      id: `procfy-${t.id}`,
      mesAno: isoToPtBrMes(resolveDataCompetencia(t)),
      descricao: t.name || t.description || 'Sem descrição',
      valor: Math.abs(t.amount_cents) / 100,
      categoria: getCategoryName(t) || 'Despesas variáveis',
    }))

    res.json({
      fixos,
      variaveis,
      syncedAt: new Date().toISOString(),
      _debug: {
        totalTransacoes: all.length,
        totalDespesas: despesas.length,
        tiposEncontrados: tiposUnicos,
        fixasEncontradas: fixedRaw.length,
        variaveisEncontradas: variableRaw.length,
      },
    })
  } catch (err) {
    console.error('[Procfy] Erro no sync:', err)
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar com Procfy',
    })
  }
})

export default router
