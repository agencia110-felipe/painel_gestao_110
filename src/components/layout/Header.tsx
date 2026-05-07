import { Menu, RefreshCw, CheckCircle, AlertCircle, Calendar, CalendarRange } from 'lucide-react'
import { useSheetsStore } from '@/store/useSheetsStore'
import { useGoogleSheets } from '@/hooks/useGoogleSheets'
import { mockClientes } from '@/lib/mockData'
import { sortMesAno } from '@/lib/aggregation'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const {
    clientes, loading, error, lastSync,
    modoFiltro, setModoFiltro,
    mesSelecionado, setMesSelecionado,
    mesInicio, setMesInicio,
    mesFim, setMesFim,
  } = useSheetsStore()
  const { refetch } = useGoogleSheets()

  const mesesDisponiveis = sortMesAno([...new Set(clientes.map(c => c.mesAno))])

  const syncAgo = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : null

  const isMock = clientes === mockClientes || (clientes.length > 0 && clientes[0] === mockClientes[0])

  const selectClass =
    'bg-bg-page border border-border rounded-lg px-3 py-1.5 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <header className="h-auto min-h-16 bg-white border-b border-border flex flex-wrap items-center px-4 gap-3 py-2 sticky top-0 z-20">
      <button onClick={onMenuClick} className="text-neutral hover:text-primary lg:hidden">
        <Menu size={22} />
      </button>

      <h1 className="font-semibold text-neutral text-lg flex-1 min-w-0 truncate">{title}</h1>

      <div className="flex items-center flex-wrap gap-2">
        {/* Toggle modo */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setModoFiltro('mensal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              modoFiltro === 'mensal'
                ? 'bg-primary text-white'
                : 'bg-white text-muted hover:text-neutral'
            }`}
          >
            <Calendar size={13} />
            <span className="hidden sm:inline">Mensal</span>
          </button>
          <button
            onClick={() => setModoFiltro('personalizado')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              modoFiltro === 'personalizado'
                ? 'bg-primary text-white'
                : 'bg-white text-muted hover:text-neutral'
            }`}
          >
            <CalendarRange size={13} />
            <span className="hidden sm:inline">Período</span>
          </button>
        </div>

        {/* Seletores de mês */}
        {modoFiltro === 'mensal' ? (
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className={selectClass}
          >
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1.5">
            <select
              value={mesInicio}
              onChange={e => setMesInicio(e.target.value)}
              className={selectClass}
            >
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-muted text-xs">até</span>
            <select
              value={mesFim}
              onChange={e => setMesFim(e.target.value)}
              className={selectClass}
            >
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status sync */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          {error ? (
            <><AlertCircle size={14} className="text-danger" /><span className="text-danger">Erro · mock</span></>
          ) : isMock ? (
            <><AlertCircle size={14} className="text-warning" /><span className="text-warning">Dados de exemplo</span></>
          ) : (
            <><CheckCircle size={14} className="text-success" /><span className="text-muted">{syncAgo === 0 ? 'Agora' : `${syncAgo}min`}</span></>
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
