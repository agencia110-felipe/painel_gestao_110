import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Briefcase,
  Activity,
  BarChart2,
  Calculator,
  Settings,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSheetsStore } from '@/stores/sheetsStore'
import { useGoogleSheets } from '@/hooks/useGoogleSheets'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dre', label: 'DRE', icon: TrendingUp },
  { to: '/clientes', label: 'Clientes', icon: Briefcase },
  { to: '/colaboradores', label: 'Colaboradores', icon: Users },
  { to: '/capacidade', label: 'Capacidade', icon: BarChart2 },
  { to: '/atividade-interna', label: 'At. Interna', icon: Activity },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
]

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const { loading, lastSync } = useSheetsStore()
  const { fetchTarefas } = useGoogleSheets()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-neutral-900 text-white h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight text-white">
          Ag<span className="text-primary">110</span>
        </span>
        <p className="text-xs text-white/40 mt-0.5">Painel de Gestão</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
        <button
          onClick={fetchTarefas}
          disabled={loading}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Sincronizando…' : 'Sincronizar'}
        </button>

        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-primary text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            )
          }
        >
          <Settings size={16} />
          Configurações
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>

        {lastSync && (
          <p className="text-xs text-white/25 px-3 pt-1">
            Sync: {new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </aside>
  )
}
