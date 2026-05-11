import type { EquipeMembro, CustoFixo, CustoVariavel } from '@/types'

const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('auth_token')
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const t = token()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
    throw new Error('Não autorizado')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Erro ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (password: string) =>
    req<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
}

// ─── Equipe ───────────────────────────────────────────────────────────────────

export const equipeApi = {
  list: () => req<EquipeMembro[]>('/equipe'),

  create: (data: Omit<EquipeMembro, 'id'>) =>
    req<EquipeMembro>('/equipe', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<EquipeMembro>) =>
    req<EquipeMembro>(`/equipe/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    req<void>(`/equipe/${id}`, { method: 'DELETE' }),
}

// ─── Fixos ────────────────────────────────────────────────────────────────────

export const fixosApi = {
  list: () => req<CustoFixo[]>('/fixos'),

  create: (data: Omit<CustoFixo, 'id'>) =>
    req<CustoFixo>('/fixos', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CustoFixo>) =>
    req<CustoFixo>(`/fixos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    req<void>(`/fixos/${id}`, { method: 'DELETE' }),
}

// ─── Variáveis ────────────────────────────────────────────────────────────────

export const variaveisApi = {
  list: () => req<CustoVariavel[]>('/variaveis'),

  create: (data: Omit<CustoVariavel, 'id'>) =>
    req<CustoVariavel>('/variaveis', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CustoVariavel>) =>
    req<CustoVariavel>(`/variaveis/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    req<void>(`/variaveis/${id}`, { method: 'DELETE' }),
}

