import { prisma } from './prisma'

const MAX_ACTIVE = 5           // 동시 활성 최대 인원
const INTERVAL_MS = 10_000    // 10초 간격
const CONFIRMED_TTL_MS = 10 * 60 * 1000  // CONFIRMED 유효 시간 10분

export function startQueueScheduler() {
  setInterval(async () => {
    try {
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

      // 1. 만료 처리: CONFIRMED 상태에서 10분 초과한 항목 → EXPIRED
      const expireThreshold = new Date(Date.now() - CONFIRMED_TTL_MS)
      const expired = await prisma.queue.updateMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { lt: expireThreshold },
        },
        data: { status: 'EXPIRED' },
      })
      if (expired.count > 0) {
        console.log(`[Queue] ${expired.count}명 만료 처리 (EXPIRED)`)
      }

      // 2. 현재 CONFIRMED 수 확인
      const confirmedCount = await prisma.queue.count({
        where: { status: 'CONFIRMED' },
      })

      const slots = MAX_ACTIVE - confirmedCount
      if (slots <= 0) return

      // 3. 가장 오래 기다린 TEMP 유저 선택 (선착순)
      const toActivate = await prisma.queue.findMany({
        where: { status: 'TEMP' },
        orderBy: { enteredAt: 'asc' },
        take: slots,
        select: { id: true },
      })
      if (toActivate.length === 0) return

      // 4. CONFIRMED로 일괄 업데이트 + confirmedAt 기록
      await prisma.queue.updateMany({
        where: { id: { in: toActivate.map((q) => q.id) } },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })

      console.log(`[Queue] ${toActivate.length}명 활성화 (CONFIRMED: ${confirmedCount + toActivate.length}/${MAX_ACTIVE})`)
    } catch (err) {
      console.error('[Queue Scheduler Error]', err)
    }
  }, INTERVAL_MS)

  console.log(`[Queue] 스케줄러 시작 — ${INTERVAL_MS / 1000}초 간격, 최대 ${MAX_ACTIVE}명`)
}
