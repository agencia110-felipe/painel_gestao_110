import { useState, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/pages/Dashboard'
import { Clientes } from '@/pages/Clientes'
import { Colaboradores } from '@/pages/Colaboradores'
import { Custos } from '@/pages/Custos'
import { Capacidade } from '@/pages/Capacidade'
import { Pacotes } from '@/pages/Pacotes'
import { Crescimento } from '@/pages/Crescimento'
import { Configuracoes } from '@/pages/Configuracoes'
import { useCustosStore } from '@/store/useCustosStore'
import { authApi } from '@/lib/api'

const PAGE_TITLES: Record<string, string> = {
  '/':              'Dashboard',
  '/clientes':      'Clientes',
  '/colaboradores': 'Colaboradores',
  '/custos':        'Custos',
  '/capacidade':    'Capacidade',
  '/pacotes':       'Pacotes',
  '/crescimento':   'Crescimento',
  '/configuracoes': 'Configurações',
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function isAuthed(): boolean {
  return !!localStorage.getItem('auth_token')
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token } = await authApi.login(pass)
      localStorage.setItem('auth_token', token)
      onLogin()
    } catch {
      setError('Senha incorreta')
      setPass('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">110</span>
          </div>
          <h1 className="font-semibold text-neutral text-xl">Agência 110</h1>
          <p className="text-muted text-sm mt-1">Painel de Gestão Interna</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setError('') }}
            placeholder="Senha de acesso"
            autoFocus
            disabled={loading}
            className={`w-full border rounded-lg px-4 py-3 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              error ? 'border-danger bg-danger-bg' : 'border-border'
            }`}
          />
          {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary text-white rounded-lg py-3 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Data initializer ─────────────────────────────────────────────────────────
// Carrega equipe/fixos/variáveis do backend assim que o usuário está autenticado

function DataInitializer({ children }: { children: ReactNode }) {
  const { initialize, initialized, loading, error } = useCustosStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!initialized && loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!initialized && error) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-danger font-medium mb-2">Erro ao conectar ao servidor</p>
          <p className="text-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => initialize()}
            className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-light"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ─── Private route ────────────────────────────────────────────────────────────

function PrivateRoute({ children }: { children: ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return <DataInitializer>{children}</DataInitializer>
}

// ─── App layout ───────────────────────────────────────────────────────────────

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Dashboard'

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/colaboradores" element={<Colaboradores />} />
          <Route path="/custos" element={<Custos />} />
          <Route path="/capacidade" element={<Capacidade />} />
          <Route path="/pacotes" element={<Pacotes />} />
          <Route path="/crescimento" element={<Crescimento />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(isAuthed)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          authed
            ? <Navigate to="/" replace />
            : <LoginPage onLogin={() => setAuthed(true)} />
        } />
        <Route path="/*" element={
          authed
            ? <PrivateRoute><AppLayout /></PrivateRoute>
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}
