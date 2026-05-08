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

// Tipos de despesa fixa reconhecidos (inclui variações que o Procfy possa usar)
const TIPOS_FIXO = new Set([
  'fixed_expense',
  'despesa_fixa',
  'custo_fixo',
  'fixed',
])

// Tipos de despesa variável reconhecidos
const TIPOS_VARIAVEL = new Set([
  'variable_expense',
  'despesa_variavel',
  'variable',
])

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

    // Log diagnóstico no servidor: mostra que tipos existem nos dados reais
    const tiposUnicos = [...new Set(all.map(t => t.transaction_type))]
    console.log(`[Procfy] ${all.length} transações encontradas. Tipos: ${tiposUnicos.join(', ')}`)

    const fixedRaw = all.filter(t => TIPOS_FIXO.has(t.transaction_type))
    const variableRaw = all.filter(t => TIPOS_VARIAVEL.has(t.transaction_type))

    console.log(`[Procfy] Fixas: ${fixedRaw.length} | Variáveis: ${variableRaw.length}`)

    // Deduplica despesas fixas por nome — mantém o de maior valor entre os meses
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
      observacao: `Procfy · ${resolveDataCompetencia(t) || t.due_date || '—'}`,
    }))

    const variaveis = variableRaw.map(t => ({
      id: `procfy-${t.id}`,
      mesAno: isoToPtBrMes(resolveDataCompetencia(t)),
      descricao: t.name || t.description || 'Sem descrição',
      valor: Math.abs(t.amount_cents) / 100,
      categoria: 'Despesas variáveis',
    }))

    res.json({
      fixos,
      variaveis,
      syncedAt: new Date().toISOString(),
      _debug: {
        totalTransacoes: all.length,
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
