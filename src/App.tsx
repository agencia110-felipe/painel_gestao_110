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

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const correct = import.meta.env.VITE_ACCESS_PASSWORD || '110agencia'
    if (pass === correct) {
      sessionStorage.setItem('auth110', '1')
      onLogin()
    } else {
      setError(true)
      setPass('')
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
            onChange={e => { setPass(e.target.value); setError(false) }}
            placeholder="Senha de acesso"
            autoFocus
            className={`w-full border rounded-lg px-4 py-3 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              error ? 'border-danger bg-danger-bg' : 'border-border'
            }`}
          />
          {error && <p className="text-danger text-xs mt-1.5">Senha incorreta</p>}
          <button
            type="submit"
            className="w-full mt-4 bg-primary text-white rounded-lg py-3 text-sm font-medium hover:bg-primary-light transition-colors"
          >
            Entrar
          </button>
        </form>
        <p className="text-center text-muted text-xs mt-6">Senha padrão: 110agencia</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const auth = sessionStorage.getItem('auth110')
  if (!auth) return <Navigate to="/login" replace />
  return <>{children}</>
}

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

export default function App() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('auth110'))

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
