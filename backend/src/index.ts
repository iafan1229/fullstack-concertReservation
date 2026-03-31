import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.SERVER_PORT || 4000

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

import { authRouter } from './routes/auth'
import { queueRouter } from './routes/queue'
import { concertsRouter } from './routes/concerts'
import { startQueueScheduler } from './lib/scheduler'

app.use('/api/auth', authRouter)
app.use('/api/queue', queueRouter)
app.use('/api/concerts', concertsRouter)

app.listen(PORT, () => {
  console.log(`[backend] http://localhost:${PORT} 에서 실행 중`)
  startQueueScheduler()
})

export default app
