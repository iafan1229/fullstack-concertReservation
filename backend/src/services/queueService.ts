import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ESTIMATED_SECONDS_PER_PERSON = 10

function signQueueToken(queueToken: string, userId: string, status: string) {
  return jwt.sign({ queueToken, userId, status }, JWT_SECRET, { expiresIn: '10m' })
}

export async function getOrCreateToken(userDbId: bigint, userPublicId: string) {
  let queue = await prisma.queue.findFirst({
    where: {
      userId: userDbId,
      status: { in: ['TEMP', 'CONFIRMED'] },
    },
  })

  if (!queue) {
    queue = await prisma.queue.create({
      data: {
        userId: userDbId,
        token: randomUUID(),
        status: 'TEMP',
      },
    })
  }

  const position = await prisma.queue.count({
    where: {
      status: 'TEMP',
      enteredAt: { lt: queue.enteredAt },
    },
  })

  const totalWaiting = await prisma.queue.count({
    where: { status: 'TEMP' },
  })

  const queueToken = signQueueToken(queue.token!, userPublicId, queue.status)

  return {
    queueToken,
    status: queue.status,
    position,
    totalWaiting,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  }
}

export async function refreshToken(userDbId: bigint, userPublicId: string) {
  const queue = await prisma.queue.findFirst({
    where: { userId: userDbId, status: 'CONFIRMED' },
  })

  if (!queue) {
    throw Object.assign(new Error('활성화된 대기열이 없습니다.'), { statusCode: 403 })
  }

  const queueToken = signQueueToken(queue.token!, userPublicId, queue.status)
  return { queueToken }
}

export async function getStatus(rawToken: string) {
  let payload: any
  try {
    payload = jwt.verify(rawToken, JWT_SECRET)
  } catch {
    throw Object.assign(new Error('유효하지 않거나 만료된 Queue 토큰입니다.'), { statusCode: 401 })
  }

  const queue = await prisma.queue.findUnique({ where: { token: payload.queueToken } })
  if (!queue) {
    throw Object.assign(new Error('대기열 정보를 찾을 수 없습니다.'), { statusCode: 404 })
  }

  const position = queue.status === 'TEMP'
    ? await prisma.queue.count({
        where: { status: 'TEMP', enteredAt: { lt: queue.enteredAt } },
      })
    : 0

  const totalWaiting = queue.status === 'TEMP'
    ? await prisma.queue.count({ where: { status: 'TEMP' } })
    : 0

  return {
    status: queue.status,
    position,
    totalWaiting,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  }
}
