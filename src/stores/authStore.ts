import { create } from 'zustand'

interface AuthStore {
  autenticado: boolean
  login: (senha: string, senhaCorreta: string) => boolean
  logout: () => void
  verificarSessao: () => void
}

const SESSION_KEY = 'ag110-session'
const SESSION_DURATION = 8 * 60 * 60 * 1000  // 8 horas em ms

export const useAuthStore = create<AuthStore>((set) => ({
  autenticado: false,

  verificarSessao: () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return set({ autenticado: false })
      const { expiry } = JSON.parse(raw)
      if (Date.now() > expiry) {
        sessionStorage.removeItem(SESSION_KEY)
        return set({ autenticado: false })
      }
      set({ autenticado: true })
    } catch {
      set({ autenticado: false })
    }
  },

  login: (senha, senhaCorreta) => {
    if (senha === senhaCorreta) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ expiry: Date.now() + SESSION_DURATION })
      )
      set({ autenticado: true })
      return true
    }
    return false
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ autenticado: false })
  },
}))
