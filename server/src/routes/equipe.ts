import { Router } from 'express'
import { eq, and, ne } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { equipe } from '../db/schema'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/', async (_req, res) => {
  const rows = await db.select().from(equipe).orderBy(equipe.nome)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const id = crypto.randomUUID()
  const rows = await db.insert(equipe).values({ id, ...req.body }).onConflictDoNothing().returning()
  if (rows.length > 0) {
    res.status(201).json(rows[0])
    return
  }
  // Conflict with existing name — return the existing row
  const [existing] = await db.select().from(equipe)
    .where(sql`lower(trim(${equipe.nome})) = lower(trim(${req.body.nome}))`)
  if (existing) { res.status(200).json(existing); return }
  res.status(500).json({ error: 'Conflito inesperado ao inserir membro' })
})

router.put('/:id', async (req, res) => {
  // If renaming, check that no other member has the same normalised name
  if (req.body.nome) {
    const [conflict] = await db.select().from(equipe)
      .where(and(
        sql`lower(trim(${equipe.nome})) = lower(trim(${req.body.nome}))`,
        ne(equipe.id, req.params.id),
      ))
    if (conflict) {
      res.status(409).json({ error: `Já existe um membro com o nome "${req.body.nome}"` })
      return
    }
  }
  const [row] = await db
    .update(equipe)
    .set(req.body)
    .where(eq(equipe.id, req.params.id))
    .returning()
  if (!row) { res.status(404).json({ error: 'Não encontrado' }); return }
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db.delete(equipe).where(eq(equipe.id, req.params.id))
  res.status(204).send()
})

export default router
