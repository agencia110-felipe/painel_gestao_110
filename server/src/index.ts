import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import equipeRouter from './routes/equipe'
import fixosRouter from './routes/fixos'
import variaveisRouter from './routes/variaveis'
import procfyRouter from './routes/procfy'
import { seedIfEmpty } from './seed'

const app = express()
const PORT = Number(process.env.PORT) || 3005

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://gestaopainel.agencia110.com.br',
  ],
  credentials: true,
}))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

app.use('/api/auth',      authRouter)
app.use('/api/equipe',    equipeRouter)
app.use('/api/fixos',     fixosRouter)
app.use('/api/variaveis', variaveisRouter)
app.use('/api/procfy',    procfyRouter)

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

async function start() {
  try {
    await seedIfEmpty()
    app.listen(PORT, () => {
      console.log(`✅ Servidor rodando em http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
