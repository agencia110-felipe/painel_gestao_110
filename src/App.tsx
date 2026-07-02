import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { DREPage } from '@/pages/DRE'
import { ClientesPage } from '@/pages/Clientes'
import { ColaboradoresPage } from '@/pages/Colaboradores'
import { CapacidadePage } from '@/pages/Capacidade'
import { AtividadeInternaPage } from '@/pages/AtividadeInterna'
import { CalculadoraPage } from '@/pages/Calculadora'
import { ConfiguracoesPage } from '@/pages/Configuracoes'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado)
  const location = useLocation()
  if (!autenticado) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function AppRoutes() {
  const autenticado = useAuthStore((s) => s.autenticado)
  const verificarSessao = useAuthStore((s) => s.verificarSessao)

  useEffect(() => {
    verificarSessao()
  }, [verificarSessao])

  return (
    <Routes>
      <Route
        path="/login"
        element={autenticado ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dre" element={<DREPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/capacidade" element={<CapacidadePage />} />
        <Route path="/atividade-interna" element={<AtividadeInternaPage />} />
        <Route path="/calculadora" element={<CalculadoraPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
