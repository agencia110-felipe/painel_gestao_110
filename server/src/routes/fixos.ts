import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { custosFixos } from '../db/schema'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/', async (_req, res) => {
  const rows = await db.select().from(custosFixos).orderBy(custosFixos.descricao)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const id = crypto.randomUUID()
  const [row] = await db.insert(custosFixos).values({ id, ...req.body }).returning()
  res.status(201).json(row)
})

router.put('/:id', async (req, res) => {
  const [row] = await db
    .update(custosFixos)
    .set(req.body)
    .where(eq(custosFixos.id, req.params.id))
    .returning()
  if (!row) { res.status(404).json({ error: 'Não encontrado' }); return }
  res.json(row)
})

router.delete('/:id', async (req, res) => {
  await db.delete(custosFixos).where(eq(custosFixos.id, req.params.id))
  res.status(204).send()
})

export default router
