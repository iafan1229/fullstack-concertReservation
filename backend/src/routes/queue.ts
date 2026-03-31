import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/authMiddleware'

export const queueRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ESTIMATED_SECONDS_PER_PERSON = 10 // 1인당 예상 대기 시간(초)

const tokenSchema = z.object({
  scheduleId: z.number().int().positive(),
})

// POST /api/queue/token — 대기열 토큰 발급
queueRouter.post('/token', authMiddleware, async (req: Request, res: Response) => {
  const parsed = tokenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: '입력값이 올바르지 않습니다.', errors: parsed.error.flatten() })
    return
  }

  const { scheduleId } = parsed.data
  const userId = BigInt((req as any).user.id)

  // 스케줄 존재 확인
  const schedule = await prisma.concertSchedule.findUnique({ where: { id: BigInt(scheduleId) } })
  if (!schedule) {
    res.status(404).json({ message: '존재하지 않는 공연 스케줄입니다.' })
    return
  }

  // 기존 유효한 Queue가 있으면 재사용
  let queue = await prisma.queue.findFirst({
    where: {
      userId,
      scheduleId: BigInt(scheduleId),
      status: { in: ['TEMP', 'CONFIRMED'] },
    },
  })

  if (!queue) {
    const token = randomUUID()
    queue = await prisma.queue.create({
      data: {
        userId,
        scheduleId: BigInt(scheduleId),
        token,
        status: 'TEMP',
      },
    })
  }

  // 대기 순서 계산 (나보다 먼저 들어온 TEMP 상태의 수)
  const position = await prisma.queue.count({
    where: {
      scheduleId: BigInt(scheduleId),
      status: 'TEMP',
      enteredAt: { lt: queue.enteredAt },
    },
  })

  // Queue Token JWT 발급
  const queueToken = jwt.sign(
    {
      queueToken: queue.token,
      userId: (req as any).user.userId,
      scheduleId,
      status: queue.status,
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  )

  res.json({
    queueToken,
    status: queue.status,
    position,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  })
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
          scheduleId: queue.scheduleId,
          status: 'TEMP',
          enteredAt: { lt: queue.enteredAt },
        },
      })
    : 0

  res.json({
    status: queue.status,
    position,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  })
})
