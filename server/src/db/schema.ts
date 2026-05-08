import { pgTable, text, real, boolean } from 'drizzle-orm/pg-core'

export const equipe = pgTable('equipe', {
  id:           text('id').primaryKey(),
  nome:         text('nome').notNull(),
  cargo:        text('cargo').notNull(),
  salario:      real('salario').notNull(),
  faturavelPct: real('faturavel_pct').notNull(),
  backendPct:   real('backend_pct').notNull(),
  setor:        text('setor').notNull(),
  socio:        boolean('socio').notNull().default(false),
  metaSalarial: real('meta_salarial').notNull(),
  status:       text('status').notNull().default('Ativo'),
})

export const custosFixos = pgTable('custos_fixos', {
  id:         text('id').primaryKey(),
  descricao:  text('descricao').notNull(),
  valor:      real('valor').notNull(),
  tipo:       text('tipo').notNull(),
  observacao: text('observacao'),
})

export const custosVariaveis = pgTable('custos_variaveis', {
  id:        text('id').primaryKey(),
  mesAno:    text('mes_ano').notNull(),
  descricao: text('descricao').notNull(),
  valor:     real('valor').notNull(),
  categoria: text('categoria').notNull(),
})

// Tipos inferidos para uso nas rotas
export type Membro    = typeof equipe.$inferSelect
export type MembroNew = typeof equipe.$inferInsert
export type Fixo      = typeof custosFixos.$inferSelect
export type FixoNew   = typeof custosFixos.$inferInsert
export type Variavel  = typeof custosVariaveis.$inferSelect
export type VariavelNew = typeof custosVariaveis.$inferInsert
