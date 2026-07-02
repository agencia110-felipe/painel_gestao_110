import { useState } from 'react'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useSetoresStore } from '@/stores/setoresStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatMesAno, formatCurrency } from '@/lib/formatters'
import { genId } from '@/lib/utils'
import type { Colaborador, AlocacaoSetor } from '@/types'

function ColaboradorModal({
  colaborador,
  onClose,
}: {
  colaborador: Colaborador | null
  onClose: () => void
}) {
  const { addColaborador, updateColaborador, addNomeIClips, removeNomeIClips, addHistoricoSalario, deleteHistoricoSalario, setAlocacoes } =
    useColaboradoresStore()
  const { setores } = useSetoresStore()

  const isNew = colaborador === null
  const [nome, setNome] = useState(colaborador?.nome ?? '')
  const [horas, setHoras] = useState(String(colaborador?.horasContratadasSemana ?? 40))
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>(colaborador?.status ?? 'Ativo')
  const [mesDesligamento, setMesDesligamento] = useState(colaborador?.mesDesligamento ?? '')
  const [novoAlias, setNovoAlias] = useState('')
  const [novoSalMes, setNovoSalMes] = useState('')
  const [novoSalValor, setNovoSalValor] = useState('')
  const [alocacoes, setAlocacoesState] = useState<AlocacaoSetor[]>(
    colaborador?.alocacoes ?? []
  )

  // Used only when creating (before we have an id)
  const [colId] = useState(() => (isNew ? genId('col') : colaborador!.id))

  const totalAlocacao = alocacoes.reduce((s, a) => s + a.percentual, 0)

  function save() {
    const data = {
      nome: nome.trim(),
      horasContratadasSemana: Number(horas) || 40,
      status,
      mesDesligamento: mesDesligamento || null,
    }
    if (isNew) {
      addColaborador({ ...data, nomesIClips: [], historicoSalarial: [], alocacoes })
    } else {
      updateColaborador(colaborador!.id, data)
      setAlocacoes(colaborador!.id, alocacoes)
    }
    onClose()
  }

  function addAlias() {
    if (!novoAlias.trim() || isNew) return
    addNomeIClips(colaborador!.id, novoAlias.trim())
    setNovoAlias('')
  }

  function addSalario() {
    if (!novoSalMes || !novoSalValor || isNew) return
    addHistoricoSalario(colaborador!.id, { mesVigenciaInicio: novoSalMes, salarioBruto: Number(novoSalValor) })
    setNovoSalMes('')
    setNovoSalValor('')
  }

  function setAlocacaoSetor(setorId: string, pct: number) {
    setAlocacoesState((prev) => {
      const exists = prev.find((a) => a.setorId === setorId)
      if (pct === 0) return prev.filter((a) => a.setorId !== setorId)
      if (exists) return prev.map((a) => (a.setorId === setorId ? { ...a, percentual: pct } : a))
      return [...prev, { setorId, percentual: pct }]
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-2" />
        <Input label="Horas/semana" type="number" value={horas} onChange={(e) => setHoras(e.target.value)} />
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

      {/* Alocações por setor */}
      <div>
        <p className="text-sm font-semibold text-neutral-700 mb-2">
          Alocação por setor{' '}
          <span className={totalAlocacao !== 100 ? 'text-danger' : 'text-success'}>
            ({totalAlocacao}%)
          </span>
        </p>
        <div className="space-y-1.5">
          {setores.map((s) => {
            const val = alocacoes.find((a) => a.setorId === s.id)?.percentual ?? 0
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm text-neutral-700 w-32 truncate">{s.nome}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={val || ''}
                  placeholder="0"
                  onChange={(e) => setAlocacaoSetor(s.id, Number(e.target.value))}
                  className="w-20 text-sm border border-border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-sm text-muted">%</span>
                <Badge variant={s.tipo === 'Backend' ? 'warning' : 'default'} className="text-xs">
                  {s.tipo}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aliases (só em edição) */}
      {!isNew && (
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
            {colaborador!.nomesIClips.map((n) => (
              <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-xs text-neutral-700">
                {n}
                <button onClick={() => removeNomeIClips(colaborador!.id, n)} className="text-danger hover:opacity-70">
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Histórico salarial (só em edição) */}
      {!isNew && (
        <div>
          <p className="text-sm font-semibold text-neutral-700 mb-2">Histórico Salarial</p>
          <div className="flex gap-2 mb-2">
            <input
              type="month"
              value={novoSalMes}
              onChange={(e) => setNovoSalMes(e.target.value)}
              className="text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="number"
              value={novoSalValor}
              onChange={(e) => setNovoSalValor(e.target.value)}
              placeholder="Salário bruto"
              className="flex-1 text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button size="sm" onClick={addSalario}><Plus size={14} /></Button>
          </div>
          <div className="space-y-1">
            {[...colaborador!.historicoSalarial]
              .sort((a, b) => b.mesVigenciaInicio.localeCompare(a.mesVigenciaInicio))
              .map((h) => (
                <div key={h.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-neutral-50 text-sm">
                  <span className="text-muted">{formatMesAno(h.mesVigenciaInicio)}</span>
                  <span className="font-medium">{formatCurrency(h.salarioBruto)}</span>
                  <button onClick={() => deleteHistoricoSalario(colaborador!.id, h.id)} className="text-danger hover:opacity-70">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} disabled={!nome.trim() || totalAlocacao !== 100}>
          {isNew ? 'Criar Colaborador' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}

export function TabColaboradores() {
  const { colaboradores, deleteColaborador } = useColaboradoresStore()
  const [modalCol, setModalCol] = useState<Colaborador | null | undefined>(undefined)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalCol(null)}>
          <Plus size={16} /> Novo Colaborador
        </Button>
      </div>

      <div className="space-y-1.5">
        {colaboradores.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800">{c.nome}</p>
              <p className="text-xs text-muted">
                {c.horasContratadasSemana}h/sem · {c.nomesIClips.length} alias · {c.historicoSalarial.length} salário(s)
              </p>
            </div>
            <Badge variant={c.status === 'Ativo' ? 'success' : 'neutral'}>{c.status}</Badge>
            <button onClick={() => setModalCol(c)} className="text-neutral-400 hover:text-primary">
              <Pencil size={15} />
            </button>
            <button onClick={() => deleteColaborador(c.id)} className="text-neutral-400 hover:text-danger">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {colaboradores.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhum colaborador cadastrado.</p>
        )}
      </div>

      <Modal
        open={modalCol !== undefined}
        onClose={() => setModalCol(undefined)}
        title={modalCol === null ? 'Novo Colaborador' : `Editar: ${modalCol?.nome}`}
        size="xl"
      >
        {modalCol !== undefined && (
          <ColaboradorModal colaborador={modalCol} onClose={() => setModalCol(undefined)} />
        )}
      </Modal>
    </div>
  )
}
