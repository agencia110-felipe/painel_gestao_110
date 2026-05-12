import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, DollarSign,
  Activity, Package, TrendingUp, Settings, X, ChevronRight, LogOut,
} from 'lucide-react'

const NAV = [
  { to: '/',              label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/clientes',      label: 'Clientes',        icon: Users },
  { to: '/colaboradores', label: 'Colaboradores',   icon: UserCheck },
  { to: '/custos',        label: 'Custos',          icon: DollarSign },
  { to: '/capacidade',    label: 'Capacidade',      icon: Activity },
  { to: '/pacotes',       label: 'Pacotes',         icon: Package },
  { to: '/crescimento',   label: 'Crescimento',     icon: TrendingUp },
  { to: '/configuracoes', label: 'Configurações',   icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  onLogout?: () => void
}

export function Sidebar({ open, onClose, onLogout }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-primary flex flex-col z-40
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <span className="text-white font-semibold text-lg tracking-tight">Agência 110</span>
            <p className="text-white/50 text-xs mt-0.5">Gestão Interna</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-colors group ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/65 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-white/65 group-hover:text-white'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="text-white/50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          )}
          <p className="text-white/30 text-xs text-center">v1.0 · 2026</p>
        </div>
      </aside>
    </>
  )
}
