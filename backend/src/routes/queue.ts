import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { redis } from '../lib/redis'
import { authMiddleware } from '../middleware/authMiddleware'
import * as queueService from '../services/queueService'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

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

// GET /api/queue/stream — SSE 연결
queueRouter.get('/stream', async (req: Request, res: Response) => {
  // EventSource는 커스텀 헤더 불가 → 쿼리 파라미터로 토큰 전달
  const token = req.query.token as string
  if (!token) {
    res.status(401).json({ message: '인증 토큰이 없습니다.' })
    return
  }

  let payload: any
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' })
    return
  }

  const userId = payload.id
  const channel = `queue:events:${userId}`

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Redis 구독용 별도 클라이언트 (Pub/Sub은 전용 연결 필요)
  const sub = redis.duplicate()
  await sub.subscribe(channel)

  sub.on('message', (_channel: string, message: string) => {
    res.write(`data: ${message}\n\n`)
  })

  // 연결 종료 시 정리
  req.on('close', () => {
    sub.unsubscribe(channel)
    sub.quit()
  })
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
