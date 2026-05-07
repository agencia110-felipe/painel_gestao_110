import { Menu, RefreshCw, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useGoogleSheets } from '@/hooks/useGoogleSheets'
import { mockClientes } from '@/lib/mockData'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { mesSelecionado, setMesSelecionado, lastSync, loading, error, clientes } = useSheetsStore()
  const { refetch } = useGoogleSheets()

  const mesesDisponiveis = [...new Set(clientes.map(c => c.mesAno))].sort((a, b) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const [mA, yA] = a.split('/')
    const [mB, yB] = b.split('/')
    if (yA !== yB) return parseInt(yA) - parseInt(yB)
    return meses.indexOf(mA) - meses.indexOf(mB)
  })

  const syncAgo = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : null

  const isMock = clientes === mockClientes || (clientes.length > 0 && clientes[0] === mockClientes[0])

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 gap-4 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="text-neutral hover:text-primary lg:hidden"
      >
        <Menu size={22} />
      </button>

      <h1 className="font-semibold text-neutral text-lg flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Seletor de mês */}
        <div className="relative">
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className="appearance-none bg-bg-page border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        {/* Status sync */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          {error ? (
            <>
              <AlertCircle size={14} className="text-danger" />
              <span className="text-danger">Erro · dados mock</span>
            </>
          ) : isMock ? (
            <>
              <AlertCircle size={14} className="text-warning" />
              <span className="text-warning">Dados de exemplo</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} className="text-success" />
              <span className="text-muted">
                {syncAgo === 0 ? 'Agora' : `${syncAgo}min atrás`}
              </span>
            </>
          )}
        </div>

        {/* Atualizar */}
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1.5 bg-primary text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>
    </header>
  )
}
