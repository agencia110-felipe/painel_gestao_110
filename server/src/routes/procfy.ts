import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

interface ProcfyTransaction {
  id: string
  name: string
  description: string
  amount_cents: number
  transaction_type: string
  due_date: string
  paid: boolean
  paid_at: string | null
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function isoToPtBrMes(dateStr: string): string {
  if (!dateStr) return 'Jan/2025'
  const [year, month] = dateStr.split('-')
  const idx = parseInt(month, 10) - 1
  return `${MESES_PT[idx] ?? 'Jan'}/${year}`
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
    throw new Error(`Procfy HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
  }
  const json = await res.json() as { data: ProcfyTransaction[]; page: { total_pages: number } }
  return {
    data: json.data ?? [],
    totalPages: json.page?.total_pages ?? 1,
  }
}

const router = Router()
router.use(requireAuth)

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

    const fixedRaw = all.filter(t => t.transaction_type === 'fixed_expense')
    const variableRaw = all.filter(t => t.transaction_type === 'variable_expense')

    // Deduplica despesas fixas por nome — mantém o maior valor entre duplicatas
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
      observacao: `Procfy · ${t.due_date ?? '—'}`,
    }))

    const variaveis = variableRaw.map(t => {
      const dateRef = t.due_date || (t.paid_at ? t.paid_at.slice(0, 10) : '')
      return {
        id: `procfy-${t.id}`,
        mesAno: isoToPtBrMes(dateRef),
        descricao: t.name || t.description || 'Sem descrição',
        valor: Math.abs(t.amount_cents) / 100,
        categoria: 'Despesas variáveis',
      }
    })

    res.json({ fixos, variaveis, syncedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[Procfy] Erro no sync:', err)
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar com Procfy',
    })
  }
})

export default router
