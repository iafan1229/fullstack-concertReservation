import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ESTIMATED_SECONDS_PER_PERSON = 10

const QUEUE_WAITING = 'queue:waiting'

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

    // Redis Sorted Set에 추가 (점수 = 타임스탬프)
    await redis.zadd(QUEUE_WAITING, queue.enteredAt.getTime(), userDbId.toString())
  }

  // 순번/대기인원을 Redis에서 조회
  const rank = await redis.zrank(QUEUE_WAITING, userDbId.toString())
  const position = rank !== null ? rank : 0
  const totalWaiting = await redis.zcard(QUEUE_WAITING)

  const queueToken = signQueueToken(queue.token!, userPublicId, queue.status)

  return {
    queueToken,
    status: queue.status,
    position,기
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

  // Redis에서 순번 조회 (TEMP일 때만)
  let position = 0
  let totalWaiting = 0

  if (queue.status === 'TEMP') {
    const rank = await redis.zrank(QUEUE_WAITING, queue.userId.toString())
    position = rank !== null ? rank : 0
    totalWaiting = await redis.zcard(QUEUE_WAITING)
  }

  return {
    status: queue.status,
    position,
    totalWaiting,
    estimatedWaitSeconds: position * ESTIMATED_SECONDS_PER_PERSON,
  }
}
