import { create } from 'zustand'
import type { EquipeMembro, CustoFixo, CustoVariavel, ColaboradorSheet } from '@/types'
import { equipeApi, fixosApi, variaveisApi, procfyApi } from '@/lib/api'

const PROCFY_CACHE_KEY = 'procfy_cache'

interface ProcfyCache {
  fixos: CustoFixo[]
  variaveis: CustoVariavel[]
  syncedAt: string
}

function loadProcfyCache(): ProcfyCache | null {
  try {
    const raw = localStorage.getItem(PROCFY_CACHE_KEY)
    return raw ? (JSON.parse(raw) as ProcfyCache) : null
  } catch {
    return null
  }
}

function saveProcfyCache(cache: ProcfyCache) {
  try {
    localStorage.setItem(PROCFY_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

interface CustosStore {
  equipe: EquipeMembro[]
  fixos: CustoFixo[]
  variaveis: CustoVariavel[]
  initialized: boolean
  loading: boolean
  error: string | null
  // Procfy
  hasProcfy: boolean
  procfyLastSync: string | null
  procfyLoading: boolean
  procfyError: string | null
  // Actions
  initialize: () => Promise<void>
  syncFromProcfy: () => Promise<void>
  syncEquipeFromSheets: (cols: ColaboradorSheet[]) => Promise<void>
  addMembro: (m: Omit<EquipeMembro, 'id'>) => Promise<void>
  updateMembro: (id: string, m: Partial<EquipeMembro>) => Promise<void>
  removeMembro: (id: string) => Promise<void>
  toggleStatus: (id: string) => Promise<void>
  addFixo: (f: Omit<CustoFixo, 'id'>) => Promise<void>
  updateFixo: (id: string, f: Partial<CustoFixo>) => Promise<void>
  removeFixo: (id: string) => Promise<void>
  addVariavel: (v: Omit<CustoVariavel, 'id'>) => Promise<void>
  updateVariavel: (id: string, v: Partial<CustoVariavel>) => Promise<void>
  removeVariavel: (id: string) => Promise<void>
}

export const useCustosStore = create<CustosStore>((set, get) => ({
  equipe: [],
  fixos: [],
  variaveis: [],
  initialized: false,
  loading: false,
  error: null,
  hasProcfy: false,
  procfyLastSync: null,
  procfyLoading: false,
  procfyError: null,

  initialize: async () => {
    if (get().initialized) return
    set({ loading: true, error: null })
    try {
      const [equipe, fixos, variaveis] = await Promise.all([
        equipeApi.list(),
        fixosApi.list(),
        variaveisApi.list(),
      ])
      // Sobrepõe com cache do Procfy se existir
      const cache = loadProcfyCache()
      if (cache) {
        set({
          equipe,
          fixos: cache.fixos,
          variaveis: cache.variaveis,
          hasProcfy: true,
          procfyLastSync: cache.syncedAt,
          initialized: true,
        })
      } else {
        set({ equipe, fixos, variaveis, initialized: true })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erro ao carregar dados' })
    } finally {
      set({ loading: false })
    }
  },

  syncFromProcfy: async () => {
    if (get().procfyLoading) return
    set({ procfyLoading: true, procfyError: null })
    try {
      const { fixos, variaveis, syncedAt } = await procfyApi.sync()
      saveProcfyCache({ fixos, variaveis, syncedAt })
      set({ fixos, variaveis, hasProcfy: true, procfyLastSync: syncedAt, procfyLoading: false })
    } catch (err) {
      set({
        procfyError: err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar',
        procfyLoading: false,
      })
    }
  },

  // ── Sync equipe com planilha ───────────────────────────────────────────────
  // Adiciona colaboradores novos (que existem na planilha mas não no store).
  // Nunca remove nem sobrescreve membros existentes.

  syncEquipeFromSheets: async (cols: ColaboradorSheet[]) => {
    if (!get().initialized) return

    const equipeAtual = get().equipe
    const nomesExistentes = new Set(equipeAtual.map(m => m.nome.toLowerCase().trim()))

    // Coleta colaboradores únicos (primeira ocorrência define a área)
    const unicos = new Map<string, { nome: string; area: string }>()
    for (const c of cols) {
      const key = c.colaborador.toLowerCase().trim()
      if (key && !unicos.has(key)) {
        unicos.set(key, { nome: c.colaborador, area: c.area })
      }
    }

    const novos: Array<Omit<EquipeMembro, 'id'>> = []
    for (const { nome, area } of unicos.values()) {
      if (nomesExistentes.has(nome.toLowerCase().trim())) continue
      novos.push({
        nome,
        cargo: area,
        salario: 0,
        alocacoes: [{ setor: area, pct: 100 }],
        socio: false,
        metaSalarial: 0,
        status: 'Ativo',
      })
    }

    if (novos.length === 0) return

    const criados = await Promise.all(
      novos.map(m => equipeApi.create(m).catch(() => null))
    )
    const validos = criados.filter((m): m is EquipeMembro => m !== null)
    if (validos.length > 0) {
      set(s => ({ equipe: [...s.equipe, ...validos] }))
    }
  },

  // ── Equipe ─────────────────────────────────────────────────────────────────

  addMembro: async (m) => {
    const novo = await equipeApi.create(m)
    set(s => ({ equipe: [...s.equipe, novo] }))
  },

  updateMembro: async (id, m) => {
    const updated = await equipeApi.update(id, m)
    set(s => ({ equipe: s.equipe.map(x => x.id === id ? { ...x, ...updated } : x) }))
  },

  removeMembro: async (id) => {
    await equipeApi.remove(id)
    set(s => ({ equipe: s.equipe.filter(x => x.id !== id) }))
  },

  toggleStatus: async (id) => {
    const membro = get().equipe.find(x => x.id === id)
    if (!membro) return
    const newStatus = membro.status === 'Ativo' ? 'Inativo' : 'Ativo'
    await equipeApi.update(id, { status: newStatus })
    set(s => ({
      equipe: s.equipe.map(x => x.id === id ? { ...x, status: newStatus } : x),
    }))
  },

  // ── Fixos (mantidos para importação manual via Configurações) ──────────────

  addFixo: async (f) => {
    const novo = await fixosApi.create(f)
    set(s => ({ fixos: [...s.fixos, novo] }))
  },

  updateFixo: async (id, f) => {
    const updated = await fixosApi.update(id, f)
    set(s => ({ fixos: s.fixos.map(x => x.id === id ? { ...x, ...updated } : x) }))
  },

  removeFixo: async (id) => {
    await fixosApi.remove(id)
    set(s => ({ fixos: s.fixos.filter(x => x.id !== id) }))
  },

  // ── Variáveis (mantidos para importação manual via Configurações) ──────────

  addVariavel: async (v) => {
    const novo = await variaveisApi.create(v)
    set(s => ({ variaveis: [...s.variaveis, novo] }))
  },

  updateVariavel: async (id, v) => {
    const updated = await variaveisApi.update(id, v)
    set(s => ({ variaveis: s.variaveis.map(x => x.id === id ? { ...x, ...updated } : x) }))
  },

  removeVariavel: async (id) => {
    await variaveisApi.remove(id)
    set(s => ({ variaveis: s.variaveis.filter(x => x.id !== id) }))
  },
}))
