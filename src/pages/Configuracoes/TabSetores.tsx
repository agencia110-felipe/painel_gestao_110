import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useSetoresStore } from '@/stores/setoresStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import type { Setor } from '@/types'

const TIPO_OPTIONS = [
  { value: 'Operacional', label: 'Operacional' },
  { value: 'Backend', label: 'Backend' },
]

interface EditState {
  nome: string
  tipo: 'Operacional' | 'Backend'
}

export function TabSetores() {
  const { setores, addSetor, updateSetor, deleteSetor } = useSetoresStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ nome: '', tipo: 'Operacional' })
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<'Operacional' | 'Backend'>('Operacional')

  function startEdit(s: Setor) {
    setEditingId(s.id)
    setEditState({ nome: s.nome, tipo: s.tipo })
  }

  function confirmEdit() {
    if (!editingId || !editState.nome.trim()) return
    updateSetor(editingId, { nome: editState.nome.trim(), tipo: editState.tipo })
    setEditingId(null)
  }

  function handleAdd() {
    if (!novoNome.trim()) return
    addSetor({ nome: novoNome.trim(), tipo: novoTipo })
    setNovoNome('')
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <Input
          label="Novo setor"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do setor"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="w-48"
        />
        <Select
          label="Tipo"
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value as 'Operacional' | 'Backend')}
          options={TIPO_OPTIONS}
          className="w-36"
        />
        <Button onClick={handleAdd} size="md">
          <Plus size={16} /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {setores.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
            {editingId === s.id ? (
              <>
                <input
                  autoFocus
                  value={editState.nome}
                  onChange={(e) => setEditState((p) => ({ ...p, nome: e.target.value }))}
                  className="text-sm border border-border rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingId(null) }}
                />
                <select
                  value={editState.tipo}
                  onChange={(e) => setEditState((p) => ({ ...p, tipo: e.target.value as 'Operacional' | 'Backend' }))}
                  className="text-sm border border-border rounded px-2 py-1 focus:outline-none"
                >
                  {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={confirmEdit} className="text-success hover:opacity-80"><Check size={15} /></button>
                <button onClick={() => setEditingId(null)} className="text-neutral-400 hover:opacity-80"><X size={15} /></button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-neutral-800 flex-1">{s.nome}</span>
                <Badge variant={s.tipo === 'Backend' ? 'warning' : 'default'}>{s.tipo}</Badge>
                <button onClick={() => startEdit(s)} className="text-neutral-400 hover:text-primary"><Pencil size={14} /></button>
                <button onClick={() => deleteSetor(s.id)} className="text-neutral-400 hover:text-danger"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
