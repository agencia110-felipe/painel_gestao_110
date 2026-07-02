import { useMemo } from 'react'
import { useSheetsStore } from '@/stores/sheetsStore'
import { useColaboradoresStore } from '@/stores/colaboradoresStore'
import { useClientesStore } from '@/stores/clientesStore'
import { useSetoresStore } from '@/stores/setoresStore'
import { useCustoFixoStore } from '@/stores/custoFixoStore'
import { useConfigStore } from '@/stores/configStore'
import { runEngine } from '@/lib/calc/engine'
import type { Periodo } from '@/types'

export function useEngine(periodo: Periodo) {
  const tarefas = useSheetsStore((s) => s.tarefas)
  const colaboradores = useColaboradoresStore((s) => s.colaboradores)
  const clientes = useClientesStore((s) => s.clientes)
  const setores = useSetoresStore((s) => s.setores)
  const custosFixos = useCustoFixoStore((s) => s.custosFixos)
  const aproveitamentoPct = useConfigStore((s) => s.aproveitamentoPct)

  return useMemo(
    () =>
      runEngine(
        tarefas,
        colaboradores,
        clientes,
        setores,
        custosFixos,
        periodo,
        aproveitamentoPct
      ),
    [tarefas, colaboradores, clientes, setores, custosFixos, periodo, aproveitamentoPct]
  )
}
