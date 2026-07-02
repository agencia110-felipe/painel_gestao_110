import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useCustoFixoStore } from '@/stores/custoFixoStore'
import type { CustoFixo } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatMesAno, formatCurrency } from '@/lib/formatters'

export function TabCustosFixos() {
  const { custosFixos, addCustoFixo, deleteCustoFixo } = useCustoFixoStore()
  const [descricao, setDescricao] = useState('')
  const [mesAno, setMesAno] = useState('')
  const [valor, setValor] = useState('')

  function handleAdd() {
    if (!descricao.trim() || !mesAno || !valor) return
    addCustoFixo({ descricao: descricao.trim(), mesAno, valor: Number(valor) })
    setDescricao('')
    setValor('')
  }

  const porMes = [...custosFixos]
    .sort((a, b) => b.mesAno.localeCompare(a.mesAno))
    .reduce((acc, c) => {
      const list = acc.get(c.mesAno) ?? []
      list.push(c)
      acc.set(c.mesAno, list)
      return acc
    }, new Map<string, CustoFixo[]>())

  return (
    <div className="space-y-5">
      <div className="flex gap-2 items-end flex-wrap">
        <Input
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Aluguel, software…"
          className="w-48"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Mês</label>
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Input
          label="Valor (R$)"
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="w-32"
        />
        <Button onClick={handleAdd} size="md">
          <Plus size={16} /> Adicionar
        </Button>
      </div>

      <div className="space-y-4">
        {[...porMes.entries()].map(([mes, items]) => (
          <div key={mes}>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              {formatMesAno(mes)} — Total: {formatCurrency(items.reduce((s, i) => s + i.valor, 0))}
            </p>
            <div className="space-y-1">
              {items.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-white">
                  <span className="flex-1 text-sm text-neutral-800">{c.descricao}</span>
                  <span className="text-sm font-medium text-neutral-900">{formatCurrency(c.valor)}</span>
                  <button onClick={() => deleteCustoFixo(c.id)} className="text-neutral-400 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {custosFixos.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhum custo fixo cadastrado.</p>
        )}
      </div>
    </div>
  )
}
