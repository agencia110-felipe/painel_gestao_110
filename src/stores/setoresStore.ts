import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Setor } from '@/types'

interface SetoresStore {
  setores: Setor[]
  addSetor: (setor: Omit<Setor, 'id'>) => void
  updateSetor: (id: string, dados: Partial<Omit<Setor, 'id'>>) => void
  deleteSetor: (id: string) => void
}

const SETORES_INICIAIS: Setor[] = [
  { id: 's1', nome: 'Tráfego', tipo: 'Operacional' },
  { id: 's2', nome: 'Mídia', tipo: 'Operacional' },
  { id: 's3', nome: 'Criação', tipo: 'Operacional' },
  { id: 's4', nome: 'Atendimento', tipo: 'Operacional' },
  { id: 's5', nome: 'Revisão', tipo: 'Operacional' },
  { id: 's6', nome: 'Redação', tipo: 'Operacional' },
  { id: 's7', nome: 'Inbound', tipo: 'Operacional' },
  { id: 's8', nome: 'Gestão', tipo: 'Operacional' },
  { id: 's9', nome: 'Financeiro', tipo: 'Backend' },
  { id: 's10', nome: 'Comercial', tipo: 'Backend' },
  { id: 's11', nome: 'RH', tipo: 'Backend' },
]

function genId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useSetoresStore = create<SetoresStore>()(
  persist(
    (set) => ({
      setores: SETORES_INICIAIS,

      addSetor: (dados) =>
        set((s) => ({ setores: [...s.setores, { id: genId(), ...dados }] })),

      updateSetor: (id, dados) =>
        set((s) => ({
          setores: s.setores.map((setor) =>
            setor.id === id ? { ...setor, ...dados } : setor
          ),
        })),

      deleteSetor: (id) =>
        set((s) => ({ setores: s.setores.filter((setor) => setor.id !== id) })),
    }),
    { name: 'ag110-setores' }
  )
)
