import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { equipe, custosFixos } from './db/schema'
import { count } from 'drizzle-orm'

const equipeInicial = [
  {
    id: '1', nome: 'Jana Fonseca', cargo: 'Gestão / Atendimento', salario: 10000,
    alocacoes: [{ setor: 'Atendimento', pct: 70 }, { setor: 'Comercial', pct: 30 }],
    socio: true, metaSalarial: 12000, status: 'Ativo',
  },
  {
    id: '2', nome: 'Felipe Mariot', cargo: 'Tráfego / Comercial', salario: 10000,
    alocacoes: [{ setor: 'Mídia', pct: 25 }, { setor: 'Comercial', pct: 25 }, { setor: 'Criação', pct: 25 }, { setor: 'Gestão', pct: 25 }],
    socio: true, metaSalarial: 15000, status: 'Ativo',
  },
  {
    id: '3', nome: 'Pedro Lima', cargo: 'Financeiro / Comercial', salario: 10000,
    alocacoes: [{ setor: 'Financeiro', pct: 70 }, { setor: 'Atendimento', pct: 30 }],
    socio: true, metaSalarial: 15000, status: 'Ativo',
  },
  {
    id: '4', nome: 'Matheus Valle', cargo: 'Tráfego pago', salario: 6059,
    alocacoes: [{ setor: 'Tráfego', pct: 100 }],
    socio: false, metaSalarial: 6059, status: 'Ativo',
  },
  {
    id: '5', nome: 'Rebeca Mileski', cargo: 'Atendimento', salario: 8322,
    alocacoes: [{ setor: 'Atendimento', pct: 100 }],
    socio: false, metaSalarial: 8322, status: 'Ativo',
  },
  {
    id: '6', nome: 'Maichel Bueno', cargo: 'Design / Coordenação', salario: 6700,
    alocacoes: [{ setor: 'Criação', pct: 100 }],
    socio: false, metaSalarial: 6700, status: 'Ativo',
  },
  {
    id: '7', nome: 'Marina Braune', cargo: 'Redação', salario: 4218,
    alocacoes: [{ setor: 'Redação', pct: 100 }],
    socio: false, metaSalarial: 4218, status: 'Ativo',
  },
  {
    id: '8', nome: 'Ana (RH)', cargo: 'RH', salario: 1500,
    alocacoes: [{ setor: 'RH', pct: 100 }],
    socio: false, metaSalarial: 1500, status: 'Ativo',
  },
]

const fixosIniciais = [
  { id: 'f1', descricao: 'Equilibrium (contabilidade)', valor: 1868, tipo: 'Backend',     observacao: 'Custo não faturável' },
  { id: 'f2', descricao: 'Studio Rock Content',         valor: 1984, tipo: 'Operacional', observacao: 'Ferramenta de conteúdo' },
  { id: 'f3', descricao: 'Unimed (plano de saúde)',     valor: 4142, tipo: 'Backend',     observacao: 'Benefício equipe' },
  { id: 'f4', descricao: 'Google Workspace / outros',   valor: 3121, tipo: 'Operacional', observacao: 'Ferramentas digitais' },
  { id: 'f5', descricao: 'TIM (telefone)',               valor: 555,  tipo: 'Backend',     observacao: 'Comunicação' },
  { id: 'f6', descricao: 'Home Stay / cloud',           valor: 377,  tipo: 'Operacional', observacao: 'Armazenamento' },
]

export async function seedIfEmpty() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida — verifique o arquivo server/.env')

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool)

  try {
    const [{ count: equipCount }] = await db.select({ count: count() }).from(equipe)
    if (Number(equipCount) > 0) return

    console.log('🌱 Banco vazio — inserindo dados iniciais...')
    await db.insert(equipe).values(equipeInicial)
    await db.insert(custosFixos).values(fixosIniciais)
    console.log('✅ Seed concluído')
  } finally {
    await pool.end()
  }
}

// Executar diretamente: tsx src/seed.ts
if (require.main === module) {
  seedIfEmpty()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1) })
}
