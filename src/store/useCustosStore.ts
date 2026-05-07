import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EquipeMembro, CustoFixo, CustoVariavel } from '@/types'

const equipeInicial: EquipeMembro[] = [
  { id: '1', nome: 'Jana Fonseca',   cargo: 'Gestão / Atendimento',   salario: 10000, faturavelPct: 0.70, backendPct: 0.30, setor: 'Atendimento', socio: true,  metaSalarial: 12000, status: 'Ativo' },
  { id: '2', nome: 'Felipe Mariot',  cargo: 'Tráfego / Comercial',    salario: 10000, faturavelPct: 0.70, backendPct: 0.30, setor: 'Tráfego',     socio: true,  metaSalarial: 15000, status: 'Ativo' },
  { id: '3', nome: 'Pedro Lima',     cargo: 'Financeiro / Comercial', salario: 10000, faturavelPct: 0.30, backendPct: 0.70, setor: 'Backend',     socio: true,  metaSalarial: 15000, status: 'Ativo' },
  { id: '4', nome: 'Matheus Valle',  cargo: 'Tráfego pago',           salario: 6059,  faturavelPct: 1.00, backendPct: 0.00, setor: 'Tráfego',     socio: false, metaSalarial: 6059,  status: 'Ativo' },
  { id: '5', nome: 'Rebeca Mileski', cargo: 'Atendimento',            salario: 8322,  faturavelPct: 1.00, backendPct: 0.00, setor: 'Atendimento', socio: false, metaSalarial: 8322,  status: 'Ativo' },
  { id: '6', nome: 'Maichel Bueno',  cargo: 'Design / Coordenação',   salario: 6700,  faturavelPct: 1.00, backendPct: 0.00, setor: 'Criação',     socio: false, metaSalarial: 6700,  status: 'Ativo' },
  { id: '7', nome: 'Marina Braune',  cargo: 'Redação',                salario: 4218,  faturavelPct: 1.00, backendPct: 0.00, setor: 'Criação',     socio: false, metaSalarial: 4218,  status: 'Ativo' },
  { id: '8', nome: 'Ana (RH)',        cargo: 'RH',                     salario: 1500,  faturavelPct: 0.00, backendPct: 1.00, setor: 'Backend',     socio: false, metaSalarial: 1500,  status: 'Ativo' },
]

const fixosIniciais: CustoFixo[] = [
  { id: 'f1', descricao: 'Equilibrium (contabilidade)', valor: 1868, tipo: 'Backend',     observacao: 'Custo não faturável' },
  { id: 'f2', descricao: 'Studio Rock Content',         valor: 1984, tipo: 'Operacional', observacao: 'Ferramenta de conteúdo' },
  { id: 'f3', descricao: 'Unimed (plano de saúde)',     valor: 4142, tipo: 'Backend',     observacao: 'Benefício equipe' },
  { id: 'f4', descricao: 'Google Workspace / outros',   valor: 3121, tipo: 'Operacional', observacao: 'Ferramentas digitais' },
  { id: 'f5', descricao: 'TIM (telefone)',               valor: 555,  tipo: 'Backend',     observacao: 'Comunicação' },
  { id: 'f6', descricao: 'Home Stay / cloud',           valor: 377,  tipo: 'Operacional', observacao: 'Armazenamento' },
]

interface CustosStore {
  equipe: EquipeMembro[]
  fixos: CustoFixo[]
  variaveis: CustoVariavel[]
  addMembro: (m: Omit<EquipeMembro, 'id'>) => void
  updateMembro: (id: string, m: Partial<EquipeMembro>) => void
  removeMembro: (id: string) => void
  toggleStatus: (id: string) => void
  addFixo: (f: Omit<CustoFixo, 'id'>) => void
  updateFixo: (id: string, f: Partial<CustoFixo>) => void
  removeFixo: (id: string) => void
  addVariavel: (v: Omit<CustoVariavel, 'id'>) => void
  updateVariavel: (id: string, v: Partial<CustoVariavel>) => void
  removeVariavel: (id: string) => void
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useCustosStore = create<CustosStore>()(
  persist(
    (set) => ({
      equipe: equipeInicial,
      fixos: fixosIniciais,
      variaveis: [],
      addMembro: (m) => set(s => ({ equipe: [...s.equipe, { ...m, id: uid() }] })),
      updateMembro: (id, m) => set(s => ({ equipe: s.equipe.map(x => x.id === id ? { ...x, ...m } : x) })),
      removeMembro: (id) => set(s => ({ equipe: s.equipe.filter(x => x.id !== id) })),
      toggleStatus: (id) => set(s => ({
        equipe: s.equipe.map(x => x.id === id ? { ...x, status: x.status === 'Ativo' ? 'Inativo' : 'Ativo' } : x)
      })),
      addFixo: (f) => set(s => ({ fixos: [...s.fixos, { ...f, id: uid() }] })),
      updateFixo: (id, f) => set(s => ({ fixos: s.fixos.map(x => x.id === id ? { ...x, ...f } : x) })),
      removeFixo: (id) => set(s => ({ fixos: s.fixos.filter(x => x.id !== id) })),
      addVariavel: (v) => set(s => ({ variaveis: [...s.variaveis, { ...v, id: uid() }] })),
      updateVariavel: (id, v) => set(s => ({ variaveis: s.variaveis.map(x => x.id === id ? { ...x, ...v } : x) })),
      removeVariavel: (id) => set(s => ({ variaveis: s.variaveis.filter(x => x.id !== id) })),
    }),
    { name: 'agencia110-custos' }
  )
)
