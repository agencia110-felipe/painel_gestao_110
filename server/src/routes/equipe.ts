import { Router } from 'express'
import { eq } from 'drizzle-orm'
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
  const [row] = await db.insert(equipe).values({ id, ...req.body }).returning()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
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
