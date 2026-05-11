import { useState, Fragment } from 'react'
import { Trash2, Plus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MetricCard } from '@/components/shared/MetricCard'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { useCustosStore } from '@/store/useCustosStore'
import { useConfigStore } from '@/store/useConfigStore'
import { useSheetsStore } from '@/store/useSheetsStore'
import { sortMesAno } from '@/lib/aggregation'
import {
  calcTotalFolha,
  calcTotalFixos,
  calcTotalVariaveis,
  calcCustoTotalMensal,
  calcCustoBackendEquipe,
  calcCustoBackendFixos,
  calcTotalBackend,
  calcHorasFaturaveisTotal,
  calcCustoPorHoraReal,
  calcPctBackend,
  membroFaturavelPct,
  membroBackendPct,
  somaAlocacoes,
} from '@/lib/calculations'
import { formatCurrency, formatPercent, formatHours } from '@/lib/formatters'
import { CHART_COLORS, SETOR_COLORS, TODOS_SETORES, SETORES_BACKEND_LIST } from '@/lib/constants'
import type { EquipeMembro, CustoFixo, CustoVariavel, Alocacao } from '@/types'

type TabId = 'equipe' | 'fixos' | 'variaveis' | 'resumo'

const BACKEND_SET = new Set<string>(SETORES_BACKEND_LIST)

export function Custos() {
  const [activeTab, setActiveTab] = useState<TabId>('equipe')
  const {
    equipe, fixos, variaveis,
    addMembro, updateMembro, removeMembro, toggleStatus,
    addFixo, updateFixo, removeFixo,
    addVariavel, updateVariavel, removeVariavel,
  } = useCustosStore()
  const { params } = useConfigStore()
  const { clientes } = useSheetsStore()
  const mesesDisponiveis = sortMesAno([...new Set(clientes.map(c => c.mesAno))])

  const totalFolha = calcTotalFolha(equipe)
  const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const totalBackend = calcTotalBackend(equipe, fixos)
  const pctBackend = calcPctBackend(equipe, fixos)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'equipe', label: 'Equipe' },
    { id: 'fixos', label: 'Fixos' },
    { id: 'variaveis', label: 'Variáveis' },
    { id: 'resumo', label: 'Resumo' },
  ]

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral">Custos</h1>
        <p className="text-sm text-muted mt-1">Equipe, custos fixos e variáveis</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.id
                ? 'bg-white border border-border border-b-white text-primary'
                : 'text-muted hover:text-neutral'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'equipe'    && <TabEquipe equipe={equipe} totalFolha={totalFolha} horasFat={horasFat} totalBackend={totalBackend} pctBackend={pctBackend} updateMembro={updateMembro} removeMembro={removeMembro} toggleStatus={toggleStatus} addMembro={addMembro} />}
      {activeTab === 'fixos'     && <TabFixos fixos={fixos} addFixo={addFixo} updateFixo={updateFixo} removeFixo={removeFixo} mesesDisponiveis={mesesDisponiveis} />}
      {activeTab === 'variaveis' && <TabVariaveis variaveis={variaveis} addVariavel={addVariavel} updateVariavel={updateVariavel} removeVariavel={removeVariavel} mesesDisponiveis={mesesDisponiveis} />}
      {activeTab === 'resumo'    && <TabResumo equipe={equipe} fixos={fixos} variaveis={variaveis} params={params} />}
    </PageWrapper>
  )
}

// ─── Pill de setor ─────────────────────────────────────────────────────────────

function SetorPill({ setor, pct }: { setor: string; pct: number }) {
  const bg = SETOR_COLORS[setor] || '#888'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bg }}
    >
      {setor} <span className="opacity-80">{pct}%</span>
    </span>
  )
}

// ─── Editor de alocações inline ────────────────────────────────────────────────

function AlocacoesEditor({
  alocacoes,
  onChange,
  onSave,
  onCancel,
}: {
  alocacoes: Alocacao[]
  onChange: (a: Alocacao[]) => void
  onSave: () => void
  onCancel: () => void
}) {
  const soma = somaAlocacoes(alocacoes)
  const somaOk = Math.round(soma) === 100

  function addRow() {
    const usados = new Set(alocacoes.map(a => a.setor))
    const proximo = TODOS_SETORES.find(s => !usados.has(s)) || TODOS_SETORES[0]
    onChange([...alocacoes, { setor: proximo, pct: 0 }])
  }

  function updateRow(idx: number, field: keyof Alocacao, value: string | number) {
    const next = alocacoes.map((a, i) =>
      i === idx ? { ...a, [field]: field === 'pct' ? Number(value) : value } : a
    )
    onChange(next)
  }

  function removeRow(idx: number) {
    onChange(alocacoes.filter((_, i) => i !== idx))
  }

  return (
    <div className="bg-neutral/5 rounded-lg p-4 space-y-3">
      <p className="text-xs font-medium text-neutral uppercase tracking-wide">Alocações por setor</p>

      <div className="space-y-2">
        {alocacoes.map((a, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={a.setor}
              onChange={e => updateRow(idx, 'setor', e.target.value)}
              className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {TODOS_SETORES.map(s => (
                <option key={s} value={s}>{s}{BACKEND_SET.has(s) ? ' (backend)' : ''}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="100"
              value={a.pct}
              onChange={e => updateRow(idx, 'pct', e.target.value)}
              className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-muted">%</span>
            <button
              onClick={() => removeRow(idx)}
              className="text-muted hover:text-danger transition-colors"
              disabled={alocacoes.length === 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={12} /> Adicionar setor
        </button>
        <span className="ml-auto text-xs">
          Soma:{' '}
          <span className={somaOk ? 'text-success font-semibold' : 'text-danger font-semibold'}>
            {soma}%
          </span>
          {!somaOk && <span className="text-danger ml-1">— deve ser 100%</span>}
        </span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-border">
        <button
          onClick={onSave}
          disabled={!somaOk}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted hover:text-neutral transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Tab Equipe ────────────────────────────────────────────────────────────────

function TabEquipe({ equipe, totalFolha, horasFat, totalBackend, pctBackend, updateMembro, removeMembro, toggleStatus, addMembro }: {
  equipe: EquipeMembro[]
  totalFolha: number
  horasFat: number
  totalBackend: number
  pctBackend: number
  updateMembro: (id: string, m: Partial<EquipeMembro>) => void
  removeMembro: (id: string) => void
  toggleStatus: (id: string) => void
  addMembro: (m: Omit<EquipeMembro, 'id'>) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlocs, setEditAlocs] = useState<Alocacao[]>([])
  const [novo, setNovo] = useState<Omit<EquipeMembro, 'id'>>({
    nome: '', cargo: '', salario: 0,
    alocacoes: [{ setor: 'Tráfego', pct: 100 }],
    socio: false, metaSalarial: 0, status: 'Ativo',
  })
  const [novoAlocs, setNovoAlocs] = useState<Alocacao[]>([{ setor: 'Tráfego', pct: 100 }])

  function openEditAlocs(m: EquipeMembro) {
    setEditingId(m.id)
    setEditAlocs(m.alocacoes.map(a => ({ ...a })))
  }

  function saveAlocs(id: string) {
    updateMembro(id, { alocacoes: editAlocs })
    setEditingId(null)
  }

  function handleAdd() {
    if (!novo.nome.trim()) return
    addMembro({ ...novo, alocacoes: novoAlocs })
    setNovo({ nome: '', cargo: '', salario: 0, alocacoes: [{ setor: 'Tráfego', pct: 100 }], socio: false, metaSalarial: 0, status: 'Ativo', cargaHorariaMes: undefined })
    setNovoAlocs([{ setor: 'Tráfego', pct: 100 }])
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {pctBackend > 0.3 && (
        <AlertBanner type="warn" message={`Backend representa ${formatPercent(pctBackend)} do custo total (acima de 30%). Considere revisar a estrutura de custos.`} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Folha" value={formatCurrency(totalFolha)} subtext="membros ativos" />
        <MetricCard label="Horas Faturáveis" value={formatHours(horasFat)} subtext="mês estimado" variant="info" />
        <MetricCard label="Backend (inv.)" value={formatCurrency(totalBackend)} subtext={formatPercent(pctBackend)} variant={pctBackend > 0.3 ? 'warning' : 'default'} />
        <MetricCard label="Membros" value={String(equipe.filter(m => m.status === 'Ativo').length)} subtext={`${equipe.length} total`} />
      </div>

      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Cargo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Salário</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Setores / Alocação</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Fat.%</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Back.%</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Sócio</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Meta Sal.</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Carga h/mês</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {equipe.map(m => (
              <Fragment key={m.id}>
                <tr className={`border-b border-border ${editingId === m.id ? '' : 'last:border-0'} ${m.status === 'Inativo' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2">
                    <input
                      className="w-full text-sm text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={m.nome}
                      onBlur={e => updateMembro(m.id, { nome: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full text-sm text-muted bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={m.cargo}
                      onBlur={e => updateMembro(m.id, { cargo: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      className="w-24 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={m.salario}
                      onBlur={e => updateMembro(m.id, { salario: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {m.alocacoes.map((a, i) => (
                        <SetorPill key={i} setor={a.setor} pct={a.pct} />
                      ))}
                      <button
                        onClick={() => editingId === m.id ? setEditingId(null) : openEditAlocs(m)}
                        className="ml-1 text-muted hover:text-primary transition-colors"
                        title="Editar alocações"
                      >
                        {editingId === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-neutral">
                    {Math.round(membroFaturavelPct(m) * 100)}%
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-neutral">
                    {Math.round(membroBackendPct(m) * 100)}%
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={m.socio}
                      onChange={e => updateMembro(m.id, { socio: e.target.checked })}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      className="w-24 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={m.metaSalarial}
                      onBlur={e => updateMembro(m.id, { metaSalarial: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min={1}
                      placeholder="—"
                      className="w-16 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={m.cargaHorariaMes ?? ''}
                      onBlur={e => {
                        const v = e.target.value.trim()
                        updateMembro(m.id, { cargaHorariaMes: v === '' ? undefined : Number(v) })
                      }}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggleStatus(m.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        m.status === 'Ativo'
                          ? 'bg-success-bg text-success'
                          : 'bg-danger-bg text-danger'
                      }`}
                    >
                      {m.status}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeMembro(m.id)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>

                {editingId === m.id && (
                  <tr className="border-b border-border">
                    <td colSpan={10} className="px-4 py-3">
                      <AlocacoesEditor
                        alocacoes={editAlocs}
                        onChange={setEditAlocs}
                        onSave={() => saveAlocs(m.id)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={16} /> Adicionar membro
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-medium text-neutral text-sm">Novo Membro</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Nome</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Cargo</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.cargo} onChange={e => setNovo(p => ({ ...p, cargo: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Salário (R$)</label>
              <input type="number" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.salario} onChange={e => setNovo(p => ({ ...p, salario: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Meta Salarial (R$)</label>
              <input type="number" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.metaSalarial} onChange={e => setNovo(p => ({ ...p, metaSalarial: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Carga h/mês (opcional)</label>
              <input type="number" min={1} placeholder="Padrão global" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.cargaHorariaMes ?? ''} onChange={e => { const v = e.target.value.trim(); setNovo(p => ({ ...p, cargaHorariaMes: v === '' ? undefined : Number(v) })) }} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer">
                <input type="checkbox" checked={novo.socio} onChange={e => setNovo(p => ({ ...p, socio: e.target.checked }))} className="w-4 h-4 accent-primary" />
                Sócio
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-2 block">Alocações por setor (soma deve ser 100%)</label>
            <div className="space-y-2 mb-2">
              {novoAlocs.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={a.setor}
                    onChange={e => setNovoAlocs(prev => prev.map((x, i) => i === idx ? { ...x, setor: e.target.value } : x))}
                    className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {TODOS_SETORES.map(s => (
                      <option key={s} value={s}>{s}{BACKEND_SET.has(s) ? ' (backend)' : ''}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0" max="100"
                    value={a.pct}
                    onChange={e => setNovoAlocs(prev => prev.map((x, i) => i === idx ? { ...x, pct: Number(e.target.value) } : x))}
                    className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-sm text-muted">%</span>
                  <button
                    onClick={() => setNovoAlocs(prev => prev.filter((_, i) => i !== idx))}
                    className="text-muted hover:text-danger"
                    disabled={novoAlocs.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const usados = new Set(novoAlocs.map(a => a.setor))
                  const proximo = TODOS_SETORES.find(s => !usados.has(s)) || TODOS_SETORES[0]
                  setNovoAlocs(prev => [...prev, { setor: proximo, pct: 0 }])
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
              >
                <Plus size={12} /> Adicionar setor
              </button>
              <span className="ml-auto text-xs">
                Soma:{' '}
                <span className={Math.round(somaAlocacoes(novoAlocs)) === 100 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                  {somaAlocacoes(novoAlocs)}%
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={Math.round(somaAlocacoes(novoAlocs)) !== 100}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-neutral transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Fixos ─────────────────────────────────────────────────────────────────

function TabFixos({ fixos, addFixo, updateFixo, removeFixo, mesesDisponiveis }: {
  fixos: CustoFixo[]
  addFixo: (f: Omit<CustoFixo, 'id'>) => void
  updateFixo: (id: string, f: Partial<CustoFixo>) => void
  removeFixo: (id: string) => void
  mesesDisponiveis: string[]
}) {
  const defaultMes = mesesDisponiveis[mesesDisponiveis.length - 1] || ''
  const [showForm, setShowForm] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(defaultMes)
  const [novo, setNovo] = useState<Omit<CustoFixo, 'id'>>({
    mesAno: defaultMes, descricao: '', valor: 0, tipo: 'Backend', observacao: '',
  })

  // Fixos sem mesAno são recorrentes (legado): aparecem em qualquer filtro de mês
  const filtradas = mesFiltro
    ? fixos.filter(f => !f.mesAno || f.mesAno === mesFiltro)
    : fixos

  const totalBackend = filtradas.filter(f => f.tipo === 'Backend').reduce((s, f) => s + f.valor, 0)
  const totalOp      = filtradas.filter(f => f.tipo === 'Operacional').reduce((s, f) => s + f.valor, 0)
  const totalGeral   = totalBackend + totalOp

  const pieData = [
    { name: 'Backend', value: totalBackend },
    { name: 'Operacional', value: totalOp },
  ]

  function handleAdd() {
    if (!novo.mesAno || !novo.descricao.trim() || novo.valor <= 0) return
    addFixo(novo)
    setNovo({ mesAno: defaultMes, descricao: '', valor: 0, tipo: 'Backend', observacao: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Filtrar mês:</label>
          <select
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          >
            <option value="">Todos</option>
            {mesesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Backend" value={formatCurrency(totalBackend)} variant="warning" />
        <MetricCard label="Total Operacional" value={formatCurrency(totalOp)} variant="info" />
        <MetricCard label="Total Geral" value={formatCurrency(totalGeral)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Mês</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Observação</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Nenhum custo fixo{mesFiltro ? ` em ${mesFiltro}` : ''} cadastrado.
                  </td>
                </tr>
              )}
              {filtradas.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <select
                      className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={f.mesAno || ''}
                      onChange={e => updateFixo(f.id, { mesAno: e.target.value || undefined })}
                    >
                      <option value="">Recorrente</option>
                      {mesesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full text-sm text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={f.descricao}
                      onBlur={e => updateFixo(f.id, { descricao: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      className="w-28 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={f.valor}
                      onBlur={e => updateFixo(f.id, { valor: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <select
                      className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={f.tipo}
                      onChange={e => updateFixo(f.id, { tipo: e.target.value as CustoFixo['tipo'] })}
                    >
                      <option value="Backend">Backend</option>
                      <option value="Operacional">Operacional</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full text-sm text-muted bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                      defaultValue={f.observacao || ''}
                      onBlur={e => updateFixo(f.id, { observacao: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeFixo(f.id)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-neutral text-sm mb-3">Distribuição</h3>
          {totalGeral > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  <Cell fill={CHART_COLORS.warning} />
                  <Cell fill={CHART_COLORS.secondary} />
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted text-sm">Sem dados</div>
          )}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS.warning }}></span>Backend</span>
              <span className="font-medium text-neutral">{formatCurrency(totalBackend)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS.secondary }}></span>Operacional</span>
              <span className="font-medium text-neutral">{formatCurrency(totalOp)}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={16} /> Adicionar custo fixo
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-medium text-neutral text-sm">Novo Custo Fixo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Mês/Ano <span className="text-danger">*</span></label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={novo.mesAno || ''}
                onChange={e => setNovo(p => ({ ...p, mesAno: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {mesesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted mb-1 block">Descrição <span className="text-danger">*</span></label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.descricao} onChange={e => setNovo(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Valor (R$) <span className="text-danger">*</span></label>
              <input type="number" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.valor} onChange={e => setNovo(p => ({ ...p, valor: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Tipo</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.tipo} onChange={e => setNovo(p => ({ ...p, tipo: e.target.value as CustoFixo['tipo'] }))}>
                <option value="Backend">Backend</option>
                <option value="Operacional">Operacional</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-muted mb-1 block">Observação (opcional)</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.observacao || ''} onChange={e => setNovo(p => ({ ...p, observacao: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={!novo.mesAno || !novo.descricao.trim() || novo.valor <= 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-neutral transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Variáveis ─────────────────────────────────────────────────────────────

function TabVariaveis({ variaveis, addVariavel, updateVariavel, removeVariavel, mesesDisponiveis }: {
  variaveis: CustoVariavel[]
  addVariavel: (v: Omit<CustoVariavel, 'id'>) => void
  updateVariavel: (id: string, v: Partial<CustoVariavel>) => void
  removeVariavel: (id: string) => void
  mesesDisponiveis: string[]
}) {
  // Meses que já têm variáveis + todos da planilha, em ordem cronológica
  const meses = sortMesAno([...new Set([
    ...mesesDisponiveis,
    ...variaveis.map(v => v.mesAno).filter(Boolean),
  ])])
  const [mesFiltro, setMesFiltro] = useState(meses[meses.length - 1] || '')
  const [showForm, setShowForm] = useState(false)
  const defaultMes = meses[meses.length - 1] || ''
  const [novo, setNovo] = useState<Omit<CustoVariavel, 'id'>>({ mesAno: defaultMes, descricao: '', valor: 0, categoria: '' })

  const filtradas = mesFiltro ? variaveis.filter(v => v.mesAno === mesFiltro) : variaveis
  const totalMes = filtradas.reduce((s, v) => s + v.valor, 0)

  function handleAdd() {
    if (!novo.descricao.trim() || novo.valor <= 0) return
    addVariavel(novo)
    setNovo(p => ({ ...p, descricao: '', valor: 0, categoria: '' }))
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Filtrar mês:</label>
          <select
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          >
            <option value="">Todos</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <MetricCard label="Total do filtro" value={formatCurrency(totalMes)} className="!py-2 !px-4" />
      </div>

      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Mês</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Descrição</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Categoria</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                  Nenhuma despesa variável{mesFiltro ? ` em ${mesFiltro}` : ''} cadastrada.
                </td>
              </tr>
            )}
            {filtradas.map(v => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted text-sm whitespace-nowrap">{v.mesAno}</td>
                <td className="px-4 py-2">
                  <input
                    className="w-full text-sm text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                    defaultValue={v.descricao}
                    onBlur={e => updateVariavel(v.id, { descricao: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    className="w-28 text-sm text-right text-neutral bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                    defaultValue={v.valor}
                    onBlur={e => updateVariavel(v.id, { valor: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className="w-full text-sm text-muted bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                    defaultValue={v.categoria}
                    onBlur={e => updateVariavel(v.id, { categoria: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => removeVariavel(v.id)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={16} /> Adicionar despesa variável
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-medium text-neutral text-sm">Nova Despesa Variável</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Mês/Ano <span className="text-danger">*</span></label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={novo.mesAno}
                onChange={e => setNovo(p => ({ ...p, mesAno: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted mb-1 block">Descrição <span className="text-danger">*</span></label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.descricao} onChange={e => setNovo(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Valor (R$) <span className="text-danger">*</span></label>
              <input type="number" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.valor} onChange={e => setNovo(p => ({ ...p, valor: Number(e.target.value) }))} />
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-muted mb-1 block">Categoria</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={novo.categoria} onChange={e => setNovo(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: Marketing, Serviços…" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={!novo.mesAno || !novo.descricao.trim() || novo.valor <= 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-neutral transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Resumo ────────────────────────────────────────────────────────────────

function TabResumo({ equipe, fixos, variaveis, params }: {
  equipe: EquipeMembro[]
  fixos: CustoFixo[]
  variaveis: CustoVariavel[]
  params: import('@/types').ConfigParams
}) {
  const meses = sortMesAno([...new Set(variaveis.map(v => v.mesAno))])
  const ultimoMes = meses[meses.length - 1]

  const totalFolha = calcTotalFolha(equipe)
  const totalFixos = calcTotalFixos(fixos)
  const totalVar = calcTotalVariaveis(variaveis, ultimoMes)
  const totalGeral = calcCustoTotalMensal(equipe, fixos, variaveis, ultimoMes)
  const horasFat = calcHorasFaturaveisTotal(equipe, params.horasMes, params.aproveitamentoPct)
  const custoH = calcCustoPorHoraReal(totalGeral, horasFat)
  const backendEquipe = calcCustoBackendEquipe(equipe)
  const backendFixos = calcCustoBackendFixos(fixos)
  const totalBack = backendEquipe + backendFixos
  const pctBack = totalGeral > 0 ? totalBack / totalGeral : 0

  const breakdown = [
    { categoria: 'Folha de pagamento', valor: totalFolha, pct: totalGeral > 0 ? totalFolha / totalGeral : 0 },
    { categoria: 'Custos fixos operacionais', valor: totalFixos, pct: totalGeral > 0 ? totalFixos / totalGeral : 0 },
    { categoria: 'Custos variáveis (mês atual)', valor: totalVar, pct: totalGeral > 0 ? totalVar / totalGeral : 0 },
    { categoria: 'Backend — equipe', valor: backendEquipe, pct: totalGeral > 0 ? backendEquipe / totalGeral : 0 },
    { categoria: 'Backend — fixos', valor: backendFixos, pct: totalGeral > 0 ? backendFixos / totalGeral : 0 },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Folha" value={formatCurrency(totalFolha)} />
        <MetricCard label="Total Fixos" value={formatCurrency(totalFixos)} />
        <MetricCard label="Total Variáveis" value={formatCurrency(totalVar)} subtext={ultimoMes || 'sem dados'} />
        <MetricCard label="Custo Total Mensal" value={formatCurrency(totalGeral)} variant="info" />
        <MetricCard label="Custo/Hora Real" value={formatCurrency(custoH)} subtext={`${formatHours(horasFat)} faturáveis`} variant="warning" />
        <MetricCard label="Backend invisível" value={formatCurrency(totalBack)} subtext={formatPercent(pctBack)} variant={pctBack > 0.3 ? 'danger' : 'default'} />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold text-neutral text-sm mb-4">Composição do custo</h3>
        <div className="space-y-3">
          {breakdown.map(b => (
            <div key={b.categoria}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral">{b.categoria}</span>
                <span className="font-medium text-neutral">{formatCurrency(b.valor)} <span className="text-muted font-normal">({formatPercent(b.pct)})</span></span>
              </div>
              <div className="h-1.5 bg-neutral/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${b.pct * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary-bg border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-primary">
            <p className="font-medium mb-1">Como o custo/hora real é calculado</p>
            <p>Custo total ÷ horas faturáveis = {formatCurrency(totalGeral)} ÷ {formatHours(horasFat)} = <strong>{formatCurrency(custoH)}/h</strong></p>
            <p className="mt-1 text-xs opacity-80">Horas faturáveis = Σ(horas/mês × aproveitamento × % faturável de cada membro ativo). O % faturável é derivado automaticamente das alocações: setores Financeiro, Comercial e RH contam como backend.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
