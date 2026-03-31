import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Queue Token 검증 — status가 CONFIRMED인 경우에만 통과
export async function queueAuth(req: Request, res: Response, next: NextFunction) {
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

  if (queue.status !== 'CONFIRMED') {
    res.status(403).json({ message: '아직 대기 중입니다.', status: queue.status })
    return
  }

  ;(req as any).queue = queue
  next()
}
