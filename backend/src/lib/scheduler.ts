import { prisma } from './prisma'
import { redis } from './redis'

const MAX_ACTIVE = 5
const INTERVAL_MS = 10_000
const CONFIRMED_TTL_MS = 10 * 60 * 1000

const QUEUE_WAITING = 'queue:waiting'
const QUEUE_ACTIVE = 'queue:active'
const SCHEDULER_LOCK = 'scheduler:lock'

export function startQueueScheduler() {
  setInterval(async () => {
    try {
      // 분산 락: 인스턴스 하나만 스케줄러 실행
      const lockAcquired = await redis.set(SCHEDULER_LOCK, '1', 'EX', 15, 'NX')
      if (!lockAcquired) return

      // 0. HELD 예약 만료 처리: expiredAt이 지난 HELD 예약 → EXPIRED + 잔액 환불
      const expiredHeld = await prisma.reservation.findMany({
        where: { status: 'HELD', expiredAt: { lt: new Date() } },
        include: { payment: true },
      })

      for (const reservation of expiredHeld) {
        await prisma.$transaction(async (tx) => {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: 'EXPIRED' },
          })

          if (reservation.payment && reservation.payment.status === 'PENDING') {
            await tx.payment.update({
              where: { id: reservation.payment.id },
              data: { status: 'REFUNDED' },
            })
            await tx.userBalance.update({
              where: { userId: reservation.userId },
              data: { balance: { increment: reservation.payment.amount } },
            })
            await tx.balanceHistory.create({
              data: {
                userId: reservation.userId,
                amount: reservation.payment.amount,
                type: 'REFUND',
              },
            })
          }
        })
      }

      if (expiredHeld.length > 0) {
        console.log(`[Reservation] ${expiredHeld.length}건 임시배정 만료 및 환불 처리`)
      }

      // 1. CONFIRMED 만료: Redis queue:active에서 TTL 초과 항목 제거
      const expireThreshold = Date.now() - CONFIRMED_TTL_MS
      const expiredMembers = await redis.zrangebyscore(QUEUE_ACTIVE, 0, expireThreshold)

      if (expiredMembers.length > 0) {
        await redis.zrem(QUEUE_ACTIVE, ...expiredMembers)

        // DB 동기화
        const expiredUserIds = expiredMembers.map((id) => BigInt(id))
        await prisma.queue.updateMany({
          where: {
            userId: { in: expiredUserIds },
            status: 'CONFIRMED',
          },
          data: { status: 'EXPIRED' },
        })
        console.log(`[Queue] ${expiredMembers.length}명 만료 처리 (EXPIRED)`)
      }

      // 2. 빈 슬롯 계산
      const confirmedCount = await redis.zcard(QUEUE_ACTIVE)
      const slots = MAX_ACTIVE - confirmedCount
      if (slots <= 0) return

      // 3. 대기열에서 선착순으로 승격 대상 꺼내기
      const toActivate = await redis.zrange(QUEUE_WAITING, 0, slots - 1)
      if (toActivate.length === 0) return

      // 4. Redis: waiting에서 제거 → active에 추가
      await redis.zrem(QUEUE_WAITING, ...toActivate)
      const now = Date.now()
      const activeEntries = toActivate.flatMap((userId) => [now, userId])
      await redis.zadd(QUEUE_ACTIVE, ...activeEntries)

      // 5. DB 동기화: TEMP → CONFIRMED
      const activateUserIds = toActivate.map((id) => BigInt(id))
      await prisma.queue.updateMany({
        where: {
          userId: { in: activateUserIds },
          status: 'TEMP',
        },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })

      // 승격된 유저에게 SSE 알림 (Redis Pub/Sub)
      for (const userId of toActivate) {
        await redis.publish(
          `queue:events:${userId}`,
          JSON.stringify({ status: 'CONFIRMED', position: 0, totalWaiting: 0, estimatedWaitSeconds: 0 })
        )
      }

      // 남은 대기자에게 순번 업데이트 SSE 알림
      const remaining = await redis.zrange(QUEUE_WAITING, 0, -1)
      for (let i = 0; i < remaining.length; i++) {
        await redis.publish(
          `queue:events:${remaining[i]}`,
          JSON.stringify({ status: 'TEMP', position: i, totalWaiting: remaining.length, estimatedWaitSeconds: i * 10 })
        )
      }

      console.log(`[Queue] ${toActivate.length}명 활성화 (CONFIRMED: ${confirmedCount + toActivate.length}/${MAX_ACTIVE})`)
    } catch (err) {
      console.error('[Queue Scheduler Error]', err)
    }
  }, INTERVAL_MS)

  console.log(`[Queue] 스케줄러 시작 — ${INTERVAL_MS / 1000}초 간격, 최대 ${MAX_ACTIVE}명`)
}
