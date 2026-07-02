import { useState, useMemo } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useClientesStore } from '@/stores/clientesStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatMesAno, formatCurrency } from '@/lib/formatters'
import type { Cliente } from '@/types'

function ClienteModal({
  cliente,
  onClose,
}: {
  cliente: Cliente | null
  onClose: () => void
}) {
  const { clientes, addCliente, updateCliente, addNomeIClips, removeNomeIClips, setFaturamento, removeFaturamento } =
    useClientesStore()

  const isNew = cliente === null
  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [isInterno, setIsInterno] = useState(cliente?.isInterno ?? false)
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>(cliente?.status ?? 'Ativo')
  const [mesDesligamento, setMesDesligamento] = useState(cliente?.mesDesligamento ?? '')
  const [novoAlias, setNovoAlias] = useState('')
  const [fatMes, setFatMes] = useState('')
  const [fatValor, setFatValor] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  function save() {
    const data = {
      nome: nome.trim(),
      isInterno,
      status,
      mesDesligamento: mesDesligamento || null,
    }
    if (isNew) {
      const id = addCliente({ ...data, nomesIClips: [], faturamentoMensal: [] })
      setSavedId(id)
    } else {
      updateCliente(cliente!.id, data)
      onClose()
    }
  }

  const currentId = savedId ?? cliente?.id

  function addAlias() {
    if (!novoAlias.trim() || !currentId) return
    addNomeIClips(currentId, novoAlias.trim())
    setNovoAlias('')
  }

  function addFaturamento() {
    if (!fatMes || !fatValor || !currentId) return
    setFaturamento(currentId, fatMes, Number(fatValor))
    setFatMes('')
    setFatValor('')
  }

  const currentCliente = useMemo(
    () => (savedId ? clientes.find((c) => c.id === savedId) : cliente),
    [savedId, clientes, cliente]
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-2" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Tipo</label>
          <select
            value={isInterno ? 'interno' : 'comercial'}
            onChange={(e) => setIsInterno(e.target.value === 'interno')}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="comercial">Comercial</option>
            <option value="interno">Interno (sem financeiro)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
        {status === 'Inativo' && (
          <Input
            label="Mês desligamento (YYYY-MM)"
            value={mesDesligamento}
            onChange={(e) => setMesDesligamento(e.target.value)}
            placeholder="2025-06"
          />
        )}
      </div>

      {isNew && !savedId && (
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!nome.trim()}>Criar Cliente</Button>
        </div>
      )}

      {currentId && (
        <>
          {/* Aliases */}
          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-2">Nomes no iClips</p>
            <div className="flex gap-2 mb-2">
              <input
                value={novoAlias}
                onChange={(e) => setNovoAlias(e.target.value)}
                placeholder="Nome exato do iClips"
                className="flex-1 text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === 'Enter' && addAlias()}
              />
              <Button size="sm" onClick={addAlias}><Plus size={14} /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {currentCliente?.nomesIClips.map((n) => (
                <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-xs text-neutral-700">
                  {n}
                  <button onClick={() => removeNomeIClips(currentId, n)} className="text-danger hover:opacity-70">
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Faturamento mensal */}
          {!isInterno && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-2">Faturamento Mensal</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="month"
                  value={fatMes}
                  onChange={(e) => setFatMes(e.target.value)}
                  className="text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  value={fatValor}
                  onChange={(e) => setFatValor(e.target.value)}
                  placeholder="Valor (R$)"
                  className="flex-1 text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button size="sm" onClick={addFaturamento}><Plus size={14} /></Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {[...(currentCliente?.faturamentoMensal ?? [])]
                  .sort((a, b) => b.mesAno.localeCompare(a.mesAno))
                  .map((f) => (
                    <div key={f.mesAno} className="flex items-center justify-between px-3 py-1.5 rounded bg-neutral-50 text-sm">
                      <span className="text-muted">{formatMesAno(f.mesAno)}</span>
                      <span className="font-medium">{formatCurrency(f.valor)}</span>
                      <button onClick={() => removeFaturamento(currentId, f.mesAno)} className="text-danger hover:opacity-70">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
            {!isNew && <Button onClick={save}>Salvar</Button>}
          </div>
        </>
      )}
    </div>
  )
}

export function TabClientes() {
  const { clientes, deleteCliente } = useClientesStore()
  const [modalCli, setModalCli] = useState<Cliente | null | undefined>(undefined)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalCli(null)}>
          <Plus size={16} /> Novo Cliente
        </Button>
      </div>

      <div className="space-y-1.5">
        {clientes.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800">{c.nome}</p>
              <p className="text-xs text-muted">
                {c.nomesIClips.length} alias · {c.faturamentoMensal.length} meses com faturamento
              </p>
            </div>
            {c.isInterno && <Badge variant="neutral">Interno</Badge>}
            <Badge variant={c.status === 'Ativo' ? 'success' : 'neutral'}>{c.status}</Badge>
            <button onClick={() => setModalCli(c)} className="text-neutral-400 hover:text-primary">
              <Pencil size={15} />
            </button>
            <button onClick={() => deleteCliente(c.id)} className="text-neutral-400 hover:text-danger">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {clientes.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhum cliente cadastrado.</p>
        )}
      </div>

      <Modal
        open={modalCli !== undefined}
        onClose={() => setModalCli(undefined)}
        title={modalCli === null ? 'Novo Cliente' : `Editar: ${modalCli?.nome}`}
        size="lg"
      >
        {modalCli !== undefined && (
          <ClienteModal cliente={modalCli} onClose={() => setModalCli(undefined)} />
        )}
      </Modal>
    </div>
  )
}
