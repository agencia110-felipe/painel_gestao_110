import { Router } from 'express'
import jwt from 'jsonwebtoken'

const ADMIN_PASSWORD = '110agencia'
const JWT_SECRET = 'gestao110-jwt-secret-fixo'

const router = Router()

router.post('/login', (req, res) => {
  const { password } = req.body as { password?: string }

const ADMIN_PASSWORD = '110agencia';
if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Senha incorreta' })
    return
  }

  const token = jwt.sign(
    { sub: 'admin' },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  res.json({ token })
})

export default router
