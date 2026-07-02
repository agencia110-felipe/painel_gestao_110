import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TabSetores } from './TabSetores'
import { TabColaboradores } from './TabColaboradores'
import { TabClientes } from './TabClientes'
import { TabCustosFixos } from './TabCustosFixos'
import { TabParams } from './TabParams'
import { TabVinculos } from './TabVinculos'

const TABS = [
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'setores', label: 'Setores' },
  { id: 'custos', label: 'Custos Fixos' },
  { id: 'vinculos', label: 'Vínculos iClips' },
  { id: 'params', label: 'Parâmetros' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('colaboradores')

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900 mb-6">Configurações</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-neutral-700 hover:border-neutral-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'colaboradores' && <TabColaboradores />}
        {activeTab === 'clientes' && <TabClientes />}
        {activeTab === 'setores' && <TabSetores />}
        {activeTab === 'custos' && <TabCustosFixos />}
        {activeTab === 'vinculos' && <TabVinculos />}
        {activeTab === 'params' && <TabParams />}
      </div>
    </div>
  )
}
