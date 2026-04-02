import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import * as queueService from '../services/queueService'

export const queueRouter = Router()

// POST /api/queue/token — 대기열 토큰 발급
queueRouter.post('/token', authMiddleware, async (req: Request, res: Response) => {
  const { id, userId } = (req as any).user

  try {
    const result = await queueService.getOrCreateToken(BigInt(id), userId)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// POST /api/queue/refresh-token — queueToken 갱신
queueRouter.post('/refresh-token', authMiddleware, async (req: Request, res: Response) => {
  const { id, userId } = (req as any).user

  try {
    const result = await queueService.refreshToken(BigInt(id), userId)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})

// GET /api/queue/status — 대기열 상태 조회 (폴링용)
queueRouter.get('/status', async (req: Request, res: Response) => {
  const header = req.headers['x-queue-token'] as string
  if (!header) {
    res.status(401).json({ message: 'Queue 토큰이 없습니다.' })
    return
  }

  try {
    const result = await queueService.getStatus(header)
    res.json(result)
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message })
  }
})
