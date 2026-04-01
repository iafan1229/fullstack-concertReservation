import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/authMiddleware'

export const queueRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ESTIMATED_SECONDS_PER_PERSON = 10

// POST /api/queue/token — 대기열 토큰 발급 (scheduleId 불필요)
queueRouter.post('/token', authMiddleware, async (req: Request, res: Response) => {
  const userId = BigInt((req as any).user.id)

  // 기존 유효한 Queue가 있으면 재사용
  let queue = await prisma.queue.findFirst({
    where: {
      userId,
      status: { in: ['TEMP', 'CONFIRMED'] },
    },
  })

  if (!queue) {
    queue = await prisma.queue.create({
      data: {
        userId,
        token: randomUUID(),
        status: 'TEMP',
      },
    })
  }

  // 대기 순서 계산 (나보다 먼저 들어온 TEMP 수)
  const position = await prisma.queue.count({
    where: {
      status: 'TEMP',
      enteredAt: { lt: queue.enteredAt },
    },
  })

  const totalWaiting = await prisma.queue.count({
    where: { status: 'TEMP' },
  })

  const queueToken = jwt.sign(
    {
      queueToken: queue.token,
      userId: (req as any).user.userId,
      status: queue.status,
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  )

  res.json({
    queueToken,
    status: queue.status,
    position,
    totalWaiting,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  })
})

// POST /api/queue/refresh-token — queueToken 갱신 (만료 시 재발급)
queueRouter.post('/refresh-token', authMiddleware, async (req: Request, res: Response) => {
  const userId = BigInt((req as any).user.id)

  const queue = await prisma.queue.findFirst({
    where: { userId, status: 'CONFIRMED' },
  })

  if (!queue) {
    res.status(403).json({ message: '활성화된 대기열이 없습니다.' })
    return
  }

  const queueToken = jwt.sign(
    { queueToken: queue.token, userId: (req as any).user.userId, status: queue.status },
    JWT_SECRET,
    { expiresIn: '10m' }
  )

  res.json({ queueToken })
})

// GET /api/queue/status — 대기열 상태 조회 (폴링용)
queueRouter.get('/status', async (req: Request, res: Response) => {
  const header = req.headers['x-queue-token'] as string
  if (!header) {
    res.status(401).json({ message: 'Queue 토큰이 없습니다.' })
    return
  }

  let payload: any
  try {
    payload = jwt.verify(header, JWT_SECRET)
  } catch {
    res.status(401).json({ message: '유효하지 않거나 만료된 Queue 토큰입니다.' })
    return
  }

  const queue = await prisma.queue.findUnique({ where: { token: payload.queueToken } })
  if (!queue) {
    res.status(404).json({ message: '대기열 정보를 찾을 수 없습니다.' })
    return
  }

  const position = queue.status === 'TEMP'
    ? await prisma.queue.count({
        where: {
          status: 'TEMP',
          enteredAt: { lt: queue.enteredAt },
        },
      })
    : 0

  const totalWaiting = queue.status === 'TEMP'
    ? await prisma.queue.count({ where: { status: 'TEMP' } })
    : 0

  res.json({
    status: queue.status,
    position,
    totalWaiting,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  })
})
